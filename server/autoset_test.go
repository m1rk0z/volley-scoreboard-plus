package server

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/labstack/echo/v4"

	"github.com/mgeri/volley-scoreboard-plus/pkg/api"
	"github.com/mgeri/volley-scoreboard-plus/store"
)

const testDelay = 50 * time.Millisecond

func TestMain(m *testing.M) {
	// no websocket service in tests: drain the broadcast channel
	go func() {
		for range broadcast {
		}
	}()
	os.Exit(m.Run())
}

// memStore is an in memory status and prefs store (JSON copy like jsonstore).
type memStore struct {
	mu     sync.Mutex
	status []byte
	prefs  []byte
}

func (m *memStore) set(dst *[]byte, v interface{}) error {
	b, err := json.Marshal(v)
	if err != nil {
		return err
	}
	m.mu.Lock()
	*dst = b
	m.mu.Unlock()
	return nil
}

func (m *memStore) get(src *[]byte, v interface{}) error {
	m.mu.Lock()
	b := *src
	m.mu.Unlock()
	return json.Unmarshal(b, v)
}

type memStatusStore struct{ *memStore }

func (s memStatusStore) Update(status *api.ScoreboardStatus) error { return s.set(&s.status, status) }
func (s memStatusStore) Get(status *api.ScoreboardStatus) error    { return s.get(&s.status, status) }

type memPrefsStore struct{ *memStore }

func (s memPrefsStore) Update(prefs *api.ScoreboardPrefs) error { return s.set(&s.prefs, prefs) }
func (s memPrefsStore) Get(prefs *api.ScoreboardPrefs) error    { return s.get(&s.prefs, prefs) }
func (s memPrefsStore) GetDefault(prefs *api.ScoreboardPrefs) error {
	*prefs = *store.NewScoreboardPrefs()
	return nil
}
func (s memPrefsStore) Reset() error { return s.set(&s.prefs, store.NewScoreboardPrefs()) }

func newTestApp(t *testing.T) (*application, *echo.Echo) {
	m := &memStore{}
	e := echo.New()
	app := &application{
		logger:      e.Logger,
		statusStore: memStatusStore{m},
		prefsStore:  memPrefsStore{m},
		autoSet:     autoSet{delay: testDelay},
	}
	if err := app.statusStore.Update(store.NewScoreboardStatus()); err != nil {
		t.Fatal(err)
	}
	if err := app.prefsStore.Update(store.NewScoreboardPrefs()); err != nil {
		t.Fatal(err)
	}
	return app, e
}

func put(t *testing.T, app *application, e *echo.Echo, s *api.ScoreboardStatus) {
	b, _ := json.Marshal(s)
	req := httptest.NewRequest(http.MethodPut, "/api/v1/scoreboard/status", strings.NewReader(string(b)))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	if err := app.ScoreboardStatusPut(e.NewContext(req, rec)); err != nil || rec.Code != http.StatusOK {
		t.Fatalf("PUT status: err %v, code %d, body %s", err, rec.Code, rec.Body.String())
	}
}

func swap(t *testing.T, app *application, e *echo.Echo) {
	req := httptest.NewRequest(http.MethodPost, "/api/v1/scoreboard/swap", nil)
	rec := httptest.NewRecorder()
	if err := app.ScoreboardSwapPost(e.NewContext(req, rec)); err != nil || rec.Code != http.StatusOK {
		t.Fatalf("POST swap: err %v, code %d", err, rec.Code)
	}
}

func get(t *testing.T, app *application) *api.ScoreboardStatus {
	s := new(api.ScoreboardStatus)
	if err := app.statusStore.Get(s); err != nil {
		t.Fatal(err)
	}
	return s
}

// waitClosed waits for the automatic close of the set (sets total changes).
func waitClosed(t *testing.T, app *application, setsBefore int) *api.ScoreboardStatus {
	deadline := time.Now().Add(2 * time.Second)
	for time.Now().Before(deadline) {
		s := get(t, app)
		if s.Home.Sets+s.Away.Sets != setsBefore {
			return s
		}
		time.Sleep(5 * time.Millisecond)
	}
	t.Fatal("set not closed automatically")
	return nil
}

// waitNotClosed checks that no close happens within some delays.
func waitNotClosed(t *testing.T, app *application, want *api.ScoreboardStatus) {
	time.Sleep(4 * testDelay)
	if s := get(t, app); !sameScore(s, want) || s.ShowWinner != want.ShowWinner {
		t.Fatalf("status changed: got %+v, want %+v", s, want)
	}
}

func status(hp, ap, hs, as int) *api.ScoreboardStatus {
	return &api.ScoreboardStatus{
		Home:      api.ScoreboardTeamStatus{Points: hp, Sets: hs},
		Away:      api.ScoreboardTeamStatus{Points: ap, Sets: as},
		BallOwner: "home",
	}
}

func TestSetWinner(t *testing.T) {
	tests := []struct {
		name           string
		hp, ap, hs, as int
		showWinner     bool
		want           string
	}{
		{"25-23 won", 25, 23, 0, 0, false, "home"},
		{"25-24 not won", 25, 24, 0, 0, false, ""},
		{"26-24 won", 26, 24, 1, 0, false, "home"},
		{"24-26 won by away", 24, 26, 0, 1, false, "away"},
		{"30-29 not won", 30, 29, 1, 1, false, ""},
		{"24-22 not won", 24, 22, 0, 0, false, ""},
		{"15-13 5th set won", 15, 13, 2, 2, false, "home"},
		{"13-15 5th set won by away", 13, 15, 2, 2, false, "away"},
		{"15-14 5th set not won", 15, 14, 2, 2, false, ""},
		{"15-13 4th set not won", 15, 13, 2, 1, false, ""},
		{"match over", 25, 10, 3, 1, false, ""},
		{"winner shown", 25, 10, 2, 1, true, ""},
	}
	for _, tt := range tests {
		s := status(tt.hp, tt.ap, tt.hs, tt.as)
		s.ShowWinner = tt.showWinner
		if got := setWinner(s); got != tt.want {
			t.Errorf("%s: setWinner = %q, want %q", tt.name, got, tt.want)
		}
	}
}

func TestAutoSetWon(t *testing.T) {
	app, e := newTestApp(t)

	s := status(25, 23, 0, 0)
	s.Home.Timeouts, s.Away.Timeouts, s.Away.VideoChecks = 2, 1, 1
	put(t, app, e, s)

	// the final point stays visible
	if got := get(t, app); got.Home.Points != 25 || got.Home.Sets != 0 {
		t.Fatalf("set closed too early: %+v", got)
	}

	got := waitClosed(t, app, 0)
	if got.Home.Sets != 1 || got.Away.Sets != 0 {
		t.Errorf("sets = %d-%d, want 1-0", got.Home.Sets, got.Away.Sets)
	}
	if got.Home.Points != 0 || got.Away.Points != 0 || got.Home.Timeouts != 0 || got.Away.Timeouts != 0 ||
		got.Away.VideoChecks != 0 || got.BallOwner != "none" || got.ShowWinner {
		t.Errorf("new set not reset: %+v", got)
	}
	if len(got.Home.SetScores) != 1 || got.Home.SetScores[0] != 25 || len(got.Away.SetScores) != 1 || got.Away.SetScores[0] != 23 {
		t.Errorf("setScores = %v-%v, want [25]-[23]", got.Home.SetScores, got.Away.SetScores)
	}
}

func TestAutoSetNotWon(t *testing.T) {
	app, e := newTestApp(t)

	s := status(25, 24, 0, 0)
	put(t, app, e, s)
	waitNotClosed(t, app, s)
}

func TestAutoSetAdvantage(t *testing.T) {
	app, e := newTestApp(t)

	put(t, app, e, status(25, 24, 1, 0))
	put(t, app, e, status(26, 24, 1, 0))

	got := waitClosed(t, app, 1)
	if got.Home.Sets != 2 || got.Home.SetScores[0] != 26 || got.Away.SetScores[0] != 24 {
		t.Errorf("got %+v, want sets 2-0 and partials 26-24", got)
	}
}

func TestAutoSetTieBreak(t *testing.T) {
	app, e := newTestApp(t)

	s := status(15, 13, 2, 2)
	s.Home.SetScores = []int{25, 20, 25, 23}
	s.Away.SetScores = []int{20, 25, 23, 25}
	put(t, app, e, s)

	got := waitClosed(t, app, 4)
	if got.Home.Sets != 3 || got.Away.Sets != 2 || !got.ShowWinner {
		t.Errorf("got sets %d-%d showWinner %v, want 3-2 true", got.Home.Sets, got.Away.Sets, got.ShowWinner)
	}
	if len(got.Home.SetScores) != 5 || got.Home.SetScores[4] != 15 || got.Away.SetScores[4] != 13 {
		t.Errorf("setScores = %v-%v, want last 15-13", got.Home.SetScores, got.Away.SetScores)
	}
}

func TestAutoSetMatchWon(t *testing.T) {
	app, e := newTestApp(t)

	s := status(25, 20, 2, 1)
	s.Home.SetScores = []int{25, 20, 25}
	s.Away.SetScores = []int{20, 25, 22}
	put(t, app, e, s)

	got := waitClosed(t, app, 3)
	if got.Home.Sets != 3 || got.Away.Sets != 1 || !got.ShowWinner {
		t.Errorf("got sets %d-%d showWinner %v, want 3-1 true", got.Home.Sets, got.Away.Sets, got.ShowWinner)
	}
	if len(got.Home.SetScores) != 4 || got.Home.SetScores[3] != 25 || got.Away.SetScores[3] != 20 {
		t.Errorf("setScores = %v-%v, want last 25-20", got.Home.SetScores, got.Away.SetScores)
	}

	// winner shown: nothing else happens
	waitNotClosed(t, app, got)
}

func TestAutoSetPointRemoved(t *testing.T) {
	app, e := newTestApp(t)

	put(t, app, e, status(25, 23, 0, 0))
	s := status(24, 23, 0, 0) // -1 before the delay
	put(t, app, e, s)
	waitNotClosed(t, app, s)
}

func TestAutoSetManualNewSet(t *testing.T) {
	app, e := newTestApp(t)

	put(t, app, e, status(25, 23, 0, 0))

	// "Nuovo set" (key S) pressed during the delay
	s := status(0, 0, 1, 0)
	s.BallOwner = "none"
	s.Home.SetScores = []int{25}
	s.Away.SetScores = []int{23}
	put(t, app, e, s)

	waitNotClosed(t, app, s)
}

func TestAutoSetSameScoreKeepsCountdown(t *testing.T) {
	app, e := newTestApp(t)

	put(t, app, e, status(25, 23, 0, 0))
	app.statusMu.Lock()
	seq := app.autoSet.seq
	app.statusMu.Unlock()

	// timeout and ball owner change: same score, same countdown
	s := status(25, 23, 0, 0)
	s.Away.Timeouts = 1
	s.BallOwner = "away"
	put(t, app, e, s)

	app.statusMu.Lock()
	same := app.autoSet.seq == seq && app.autoSet.pending != nil
	app.statusMu.Unlock()
	if !same {
		t.Error("countdown restarted on the same score")
	}

	if got := waitClosed(t, app, 0); got.Home.Sets != 1 {
		t.Errorf("got %+v, want set to home", got)
	}
}

func TestAutoSetSwap(t *testing.T) {
	app, e := newTestApp(t)

	put(t, app, e, status(25, 23, 0, 0))
	swap(t, app, e) // the team that won the set is now on the away side

	got := waitClosed(t, app, 0)
	if got.Away.Sets != 1 || got.Home.Sets != 0 {
		t.Errorf("sets = %d-%d, want 0-1", got.Home.Sets, got.Away.Sets)
	}
	if got.Away.SetScores[0] != 25 || got.Home.SetScores[0] != 23 {
		t.Errorf("setScores = %v-%v, want [23]-[25]", got.Home.SetScores, got.Away.SetScores)
	}

	// swap after the close: no set won, nothing happens
	swap(t, app, e)
	waitNotClosed(t, app, get(t, app))
	if got := get(t, app); got.Home.Sets != 1 || got.Away.Sets != 0 {
		t.Errorf("after second swap sets = %d-%d, want 1-0", got.Home.Sets, got.Away.Sets)
	}
}

func TestAutoSetSwapNoSetWon(t *testing.T) {
	app, e := newTestApp(t)

	s := status(24, 10, 1, 1)
	put(t, app, e, s)
	swap(t, app, e)
	waitNotClosed(t, app, status(10, 24, 1, 1))
}
