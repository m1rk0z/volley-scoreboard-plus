package server

import (
	"time"

	"github.com/mgeri/volley-scoreboard-plus/pkg/api"
)

// Delay between the winning point and the automatic close of the set,
// so that the final score stays visible on the scoreboard.
const autoSetDelay = 4 * time.Second

// Volleyball rules
const (
	setPoints      = 25 // points to win a set
	tieBreakPoints = 15 // points to win the 5th set
	setsToWin      = 3  // sets to win the match
)

// autoSet is the pending automatic close of a won set.
// All fields are guarded by application.statusMu.
type autoSet struct {
	delay   time.Duration
	timer   *time.Timer
	seq     uint64                // incremented on every cancel: a fired timer with an old seq does nothing
	pending *api.ScoreboardStatus // status that armed the timer
}

// setWinner returns "home" or "away" when the current set is won (25 points,
// 15 in the 5th set, with at least 2 points of advantage), "" otherwise or
// when the match is already over.
func setWinner(s *api.ScoreboardStatus) string {
	if s.ShowWinner || s.Home.Sets >= setsToWin || s.Away.Sets >= setsToWin {
		return ""
	}

	target := setPoints
	if s.Home.Sets+s.Away.Sets == 2*(setsToWin-1) {
		target = tieBreakPoints
	}

	h, a := s.Home.Points, s.Away.Points
	switch {
	case h >= target && h-a >= 2:
		return "home"
	case a >= target && a-h >= 2:
		return "away"
	}
	return ""
}

// closeSet closes the won set like the manual "Nuovo set": partials of both
// teams, +1 set to the winner, points, timeouts and video checks reset.
// When the winner reaches the sets of the match the winner is shown instead.
func closeSet(s *api.ScoreboardStatus, winner string) {
	s.Home.SetScores = append(s.Home.SetScores, s.Home.Points)
	s.Away.SetScores = append(s.Away.SetScores, s.Away.Points)

	if winner == "home" {
		s.Home.Sets++
	} else {
		s.Away.Sets++
	}

	for _, t := range []*api.ScoreboardTeamStatus{&s.Home, &s.Away} {
		t.Points = 0
		t.Timeouts = 0
		t.VideoChecks = 0
	}
	s.BallOwner = "none"
	s.ShowWinner = s.Home.Sets >= setsToWin || s.Away.Sets >= setsToWin
}

// sameScore reports whether two statuses have the same score (points, sets and
// partials of both teams): timeouts or ball owner don't change who won the set.
func sameScore(a, b *api.ScoreboardStatus) bool {
	return sameTeamScore(&a.Home, &b.Home) && sameTeamScore(&a.Away, &b.Away)
}

func sameTeamScore(a, b *api.ScoreboardTeamStatus) bool {
	if a.Points != b.Points || a.Sets != b.Sets || len(a.SetScores) != len(b.SetScores) {
		return false
	}
	for i := range a.SetScores {
		if a.SetScores[i] != b.SetScores[i] {
			return false
		}
	}
	return true
}

func cloneStatus(s *api.ScoreboardStatus) *api.ScoreboardStatus {
	c := *s
	c.Home.SetScores = append([]int(nil), s.Home.SetScores...)
	c.Away.SetScores = append([]int(nil), s.Away.SetScores...)
	return &c
}

func (as *autoSet) cancel() {
	if as.timer != nil {
		as.timer.Stop()
		as.timer = nil
	}
	as.pending = nil
	as.seq++
}

// scheduleAutoSet arms, keeps or cancels the automatic close of the set after
// the status has been stored. Must be called with app.statusMu held.
func (app *application) scheduleAutoSet(status *api.ScoreboardStatus) {
	as := &app.autoSet

	if setWinner(status) == "" {
		// no set won (es. point removed with -1, new set already closed by hand)
		as.cancel()
		return
	}
	if as.pending != nil && sameScore(as.pending, status) {
		// same score (timeout, ball owner, repeated PUT): keep the countdown
		return
	}

	as.cancel()
	as.pending = cloneStatus(status)
	seq := as.seq
	as.timer = time.AfterFunc(as.delay, func() {
		app.statusMu.Lock()
		closed := app.closeWonSet(seq)
		app.statusMu.Unlock()

		if closed {
			// websocket broadcast
			app.BroadcastStatusUpdate()
		}
	})
}

// closeWonSet closes the set if the status is still the one that armed the
// timer. Must be called with app.statusMu held.
func (app *application) closeWonSet(seq uint64) bool {
	as := &app.autoSet
	if seq != as.seq || as.pending == nil {
		// status changed meanwhile
		return false
	}
	pending := as.pending
	as.pending = nil
	as.timer = nil

	status := new(api.ScoreboardStatus)
	if err := app.statusStore.Get(status); err != nil {
		app.logger.Warnf("Auto set: error getting ScoreboardStatus: %v", err)
		return false
	}

	winner := setWinner(status)
	if winner == "" || !sameScore(status, pending) {
		return false
	}

	closeSet(status, winner)

	if err := ValidateScoreboardStatus(status); err != nil {
		app.logger.Warnf("Auto set: invalid ScoreboardStatus after closing the set: %v", err)
		return false
	}
	if err := app.statusStore.Update(status); err != nil {
		app.logger.Warnf("Auto set: error updating ScoreboardStatus: %v", err)
		return false
	}

	app.logger.Infof("Auto set: set won by %s, sets %d-%d, show winner %v",
		winner, status.Home.Sets, status.Away.Sets, status.ShowWinner)

	return true
}
