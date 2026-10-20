package server

import (
	"net/http"
	"strings"
	"time"

	"github.com/dgrijalva/jwt-go"
	"github.com/labstack/echo/v4"
	"github.com/spf13/viper"

	"github.com/mgeri/volley-scoreboard-plus/pkg/api"
)

const SessionErrorCode = 10
const ScoreboardStatusErrorCode = 20
const ScoreboardPrefsErrorCode = 30
const ScoreboardCommandErrorCode = 50

// jwtCustomClaims are custom claims extending default ones.
type jwtCustomClaims struct {
	Username string `json:"username"`
	jwt.StandardClaims
}

// Login by username and password returning session with JWT token.// (POST /session)
func (app *application) SessionPost(ctx echo.Context) error {
	c := new(api.Credentials)
	if err := ctx.Bind(c); err != nil {
		ctx.Logger().Warnf("Error binding Creadentials: %v", err)
		return ctx.JSON(http.StatusBadRequest, api.ErrorResponse{Error: api.Error{Code: SessionErrorCode, Subcode: 1,
			Message: "Invalid username or password"}})
	}

	if (viper.GetString("server.username") != "" && !strings.EqualFold(c.Username, viper.GetString("server.username"))) ||
		c.Password != viper.GetString("server.password") {
		ctx.Logger().Warnf("Invalid username or password [%s][%s]", c.Username, c.Password)
		return ctx.JSON(http.StatusBadRequest, api.ErrorResponse{Error: api.Error{Code: SessionErrorCode, Subcode: 1,
			Message: "Invalid credetials"}})
	}

	// Set custom claims
	claims := &jwtCustomClaims{
		c.Username,
		jwt.StandardClaims{
			ExpiresAt: time.Now().Add(time.Hour * 8).Unix(),
		},
	}

	// Create token with claims
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	// Generate encoded token and send it as response.
	t, err := token.SignedString([]byte(viper.GetString("server.jwtSigningKey")))
	if err != nil {
		ctx.Logger().Errorf("JWT code generation error: %v", err)
		return ctx.JSON(http.StatusBadRequest, api.ErrorResponse{Error: api.Error{Code: SessionErrorCode, Subcode: 2,
			Message: "Server error"}})
	}

	expireIn := int(time.Hour * 8 / time.Second)

	return ctx.JSON(http.StatusOK, api.Session{Username: c.Username, Token: t, ExpiresIn: &expireIn})
}

// Server heartbeat operation// (GET /ping)
func (app *application) PingGet(ctx echo.Context) error {
	return ctx.NoContent(http.StatusNoContent)
}

func (app *application) LogoGet(ctx echo.Context) error {
	return ctx.File(viper.GetString("server.logoFile"))
}

// Return the scoreboard status (points, set, timeouts).// (GET /scoreboard/status)
func (app *application) ScoreboardStatusGet(ctx echo.Context) error {
	var status = new(api.ScoreboardStatus)
	err := app.statusStore.Get(status)

	if err != nil {
		return err
	}

	return ctx.JSON(http.StatusOK, status)
}

// Update scoreboard status (points, set, timeouts).// (PUT /scoreboard/status)
func (app *application) ScoreboardStatusPut(ctx echo.Context) error {
	status := new(api.ScoreboardStatus)
	if err := ctx.Bind(status); err != nil {
		ctx.Logger().Warnf("Error binding ScoreboardStatus: %v", err)
		return ctx.JSON(http.StatusBadRequest, api.ErrorResponse{Error: api.Error{Code: ScoreboardStatusErrorCode, Subcode: 1,
			Message: "Invalid status"}})
	}

	if err := ValidateScoreboardStatus(status); err != nil {
		ctx.Logger().Warnf("Error validating ScoreboardStatus: %v", err)
		return ctx.JSON(http.StatusBadRequest, api.ErrorResponse{Error: api.Error{Code: ScoreboardStatusErrorCode, Subcode: 1,
			Message: err.Error()}})
	}

	app.statusMu.Lock()
	err := app.statusStore.Update(status)
	if err == nil {
		// set won: close it automatically after a while
		app.scheduleAutoSet(status)
	}
	app.statusMu.Unlock()

	if err != nil {
		ctx.Logger().Warnf("Error Updating ScoreboardStatus: %v", err)
		return ctx.JSON(http.StatusBadRequest, api.ErrorResponse{Error: api.Error{Code: ScoreboardStatusErrorCode, Subcode: 1,
			Message: err.Error()}})
	}

	// websocket broadcast
	app.BroadcastStatusUpdate()

	return ctx.JSON(http.StatusOK, status)
}

// Swap sides (Inversione Campo): teams status, names and colors.// (POST /scoreboard/swap)
func (app *application) ScoreboardSwapPost(ctx echo.Context) error {
	// 1. Swap status (points, sets, timeouts, ball owner)
	var status api.ScoreboardStatus
	app.statusMu.Lock()
	err := app.statusStore.Get(&status)
	if err == nil {
		status.Home, status.Away = status.Away, status.Home
		if status.BallOwner == "home" {
			status.BallOwner = "away"
		} else if status.BallOwner == "away" {
			status.BallOwner = "home"
		}
		if app.statusStore.Update(&status) == nil {
			// a pending close of the set is re-armed on the swapped teams
			app.scheduleAutoSet(&status)
		}
	}
	app.statusMu.Unlock()

	if err == nil {
		app.BroadcastStatusUpdate()
	}

	// 2. Swap prefs (team names, colors)
	var prefs api.ScoreboardPrefs
	if err := app.prefsStore.Get(&prefs); err == nil {
		prefs.HomeName, prefs.AwayName = prefs.AwayName, prefs.HomeName
		prefs.HomeBg, prefs.AwayBg = prefs.AwayBg, prefs.HomeBg
		prefs.HomeFg, prefs.AwayFg = prefs.AwayFg, prefs.HomeFg
		_ = app.prefsStore.Update(&prefs)
		app.BroadcastPrefsUpdate()
	}

	return ctx.NoContent(http.StatusOK)
}

// Return the scoreboard Prefs (colors, team names).// (GET /scoreboard/prefs)
func (app *application) ScoreboardPrefsGet(ctx echo.Context) error {
	var prefs = new(api.ScoreboardPrefs)
	err := app.prefsStore.Get(prefs)

	if err != nil {
		return err
	}

	return ctx.JSON(http.StatusOK, prefs)
}

// Return the scoreboard default Prefs (colors, team names).// (GET /scoreboard/prefs/default)
func (app *application) ScoreboardPrefsDefaultGet(ctx echo.Context) error {
	var prefs = new(api.ScoreboardPrefs)
	err := app.prefsStore.GetDefault(prefs)

	if err != nil {
		return err
	}

	return ctx.JSON(http.StatusOK, prefs)
}

// Update scoreboard Prefs.// (PUT /scoreboard/Prefs)
func (app *application) ScoreboardPrefsPut(ctx echo.Context) error {
	prefs := new(api.ScoreboardPrefs)

	if err := ctx.Bind(prefs); err != nil {
		ctx.Logger().Warnf("Error binding ScoreboardPrefs: %v", err)
		return ctx.JSON(http.StatusBadRequest, api.ErrorResponse{Error: api.Error{Code: ScoreboardPrefsErrorCode, Subcode: 1,
			Message: "Invalid status"}})
	}

	if err := ValidateScoreboardPrefs(prefs); err != nil {
		ctx.Logger().Warnf("Error validating ScoreboardPrefs: %v", err)
		return ctx.JSON(http.StatusBadRequest, api.ErrorResponse{Error: api.Error{Code: ScoreboardPrefsErrorCode, Subcode: 1,
			Message: err.Error()}})
	}

	if err := app.prefsStore.Update(prefs); err != nil {
		ctx.Logger().Warnf("Error Updating ScoreboardPrefs: %v", err)
		return ctx.JSON(http.StatusBadRequest, api.ErrorResponse{Error: api.Error{Code: ScoreboardPrefsErrorCode, Subcode: 1,
			Message: err.Error()}})
	}

	// websocket broadcast
	app.BroadcastPrefsUpdate()

	return ctx.JSON(http.StatusOK, prefs)
}

// Reset scoreboard Prefs.// (DELETE /scoreboard/Prefs)
func (app *application) ScoreboardPrefsDelete(ctx echo.Context) error {
	if err := app.prefsStore.Reset(); err != nil {
		ctx.Logger().Warnf("Error Resetting ScoreboardPrefs: %v", err)
		return ctx.JSON(http.StatusBadRequest, api.ErrorResponse{Error: api.Error{Code: ScoreboardPrefsErrorCode, Subcode: 1,
			Message: err.Error()}})
	}

	// websocket broadcast
	app.BroadcastPrefsUpdate()

	return app.ScoreboardPrefsGet(ctx)
}

// Send string command through websocket to all connected scoreboard
// (es. show video or animation).// (POST /scoreboard/command)
func (app *application) ScoreboardCommandPost(ctx echo.Context) error {
	cmd := new(api.ScoreboardCommand)

	if err := ctx.Bind(cmd); err != nil {
		ctx.Logger().Warnf("Error binding ScoreboardCommand: %v", err)
		return ctx.JSON(http.StatusBadRequest, api.ErrorResponse{Error: api.Error{Code: ScoreboardCommandErrorCode, Subcode: 1,
			Message: "Invalid command"}})
	}

	if err := ValidateScoreboardCommand(cmd); err != nil {
		ctx.Logger().Warnf("Error validating ScoreboardCommand: %v", err)
		return ctx.JSON(http.StatusBadRequest, api.ErrorResponse{Error: api.Error{Code: ScoreboardCommandErrorCode, Subcode: 1,
			Message: err.Error()}})
	}

	// websocket broadcast
	app.BroadcastCommand(cmd)

	return ctx.NoContent(http.StatusOK)
}
