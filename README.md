# Volleyball Scoreboard Plus & Video Delay Replay (Raspberry Pi 5)

> Tabellone segnapunti professionale da palazzetto con replay video ritardato (RTSP), interfaccia di controllo wireless per smartphone/tablet e display TV Kiosk HDMI. Sviluppato in **Go** (backend) e **Angular** (web GUI).

---

## 📌 Panoramica del Sistema

Volleyball Scoreboard Plus trasforma qualsiasi TV o maxischermo HDMI collegato a un **Raspberry Pi 5** in un tabellone elettronico da volley conforme agli standard dei palazzetti (FIPAV / Superlega). Il tabellone viene controllato in tempo reale senza fili da qualsiasi smartphone, tablet o computer connesso alla rete locale.

Inoltre, integra un sistema di **Video Delay Replay** via RTSP su monitor dedicato per la revisione tecnica immediata delle azioni di gioco.

---

## 🏗️ Architettura Hardware e Servizi

```
                          ┌────────────────────────────────────────────────────────┐
                          │                    Raspberry Pi 5                      │
                          │                 (segnapunti.local)                     │
                          │                                                        │
    TV Palasport ◄────────┼── Firefox Kiosk Fullscreen (http://localhost/)         │
   (Uscita HDMI)          │                                                        │
                          │                                                        │
 Smartphone / PC ◄────────┼── Web App Angular 8 (/opt/scoreboard-plus/web/)        │
  (Pannello Admin)        │          ▲                                             │
                          │          │ (REST API /api/v1 + WebSockets /ws/v1)      │
                          │          ▼                                             │
                          │   scoreboard-plus (Backend Go - Porta 80)              │
                          │                                                        │
 Telecamera Campo ────────┼──► hub.service (Flask + FFmpeg - Porta 4000)           │
(RTSP)                    │    ↳ Stream Video Delay Replay su monitor palestra     │
                          └────────────────────────────────────────────────────────┘
```

### Parametri di Rete
- **Hostname Raspberry Pi 5:** `http://segnapunti.local`
- **Porta Scoreboard Principale:** `:80` (HTTP)
- **Porta Video Delay Hub:** `:4000` (HTTP / RTSP)
- **Utente Display Locale (TV):** Gnome Kiosk Wayland

IP, credenziali SSH, password Wi-Fi e URL della telecamera **non sono nel repository**: sono in un file locale
`totem_secrets.json`, nella cartella che contiene il repository, letto da `scripts/generate_printable_pdf.py`:

```json
{
  "wifi_ssid": "...", "wifi_password": "...", "gateway": "...",
  "backup_ssid": "...", "backup_password": "...",
  "pi_ip": "...", "camera_rtsp": "rtsp://..."
}
```

---

## 🎮 Funzionalità Operative del Segnapunti

### 1. Inversione Campo Intelligente (Side Swap)
Durante il cambio campo a fine set o al tie-break al cambio a 8 punti, è possibile scambiare istantaneamente squadre, punteggi correnti, set vinti, timeout e colori:
- **Tasto da tastiera:** premere `B` o `b`.
- **Tap a schermo:** toccare direttamente il nome della squadra (Casa o Ospiti).
- **Tasto Scambio:** cliccare sull'icona delle frecce di scambio (`fa-exchange`) al centro del pannello admin.
- **API dedicata:** `POST /api/v1/scoreboard/swap`.

### 2. Gestione Punti e Servizio Automatico (Ball Owner)
- **Assegnazione automatica del servizio:** quando viene assegnato un punto, il sistema rileva la variazione di punteggio e assegna automaticamente il pallino della battuta alla squadra che ha fatto punto.
- **Incremento/Decremento:**
  - Click/Tap sul riquadro punti: **+1 punto**.
  - Swipe verso il basso sul riquadro punti: **-1 punto**.
  - Click sul riquadro set vinti: **+1 set** (Swipe giù: **-1 set**).
  - Tasto **Nuovo Set** (`S`): archivia il set, incrementa i set della squadra vincente e azzera punti e timeout.
  - Tasto **Nuova Partita** (`M`): apre il modulo per iniziare un nuovo match.

### 3. Timeout Dinamici con Colore di Squadra
- Cliccando sui riquadri dei timeout, il contatore avanza (`1` -> `2` -> `0`).
- Le cornici e i riempimenti dei timeout assumono in tempo reale il **colore identificativo della squadra** corrispondente.
- Il modulo Video Check è stato completamente rimosso dall'interfaccia di gara, permettendo al box timeout di espandersi al 100% dell'altezza disponibile.

### 4. Layout e Temi (1-Click)
Nella finestra **Preferenze** si sceglie il **layout** del tabellone e si applica un **tema** con un clic. Layout e temi sono definiti in un unico file, `web/src/assets/scoreboard-styles.json`.

**Layout:** Broadcast (predefinito), Blocchi squadra, Arena, Metà campo, Classico.

**Temi:** Notte Palasport, LED Classico, Bianco Gara, Contrasto Massimo, Ardesia e Corallo, Tricolore, Superlega Oro, Volt Neon, Parquet.

I layout moderni mostrano anche i **parziali dei set**, il **timer di 30"** quando viene chiamato un timeout, gli avvisi **SET POINT / MATCH POINT** e **CAMBIO CAMPO** (a 8 punti del tie-break) e il pallone accanto alla squadra al servizio. Il font Barlow Condensed (SIL OFL) è incluso, così il tabellone funziona anche senza internet.

### 5. Accesso 0-Click & Tolleranza Errori JWT
- **Auto-Login:** Aprendo `/admin` da tablet o smartphone, il form esegue l'accesso automatico senza richiedere l'inserimento manuale delle credenziali.
- **Chiave JWT Persistente:** Il server Go adotta una chiave di firma fissa configurata in `config.yml`, evitando la scadenza improvvisa delle sessioni al riavvio del servizio.
- **AuthInterceptor (Angular):** Qualsiasi richiesta HTTP che dovesse incontrare un `401 Unauthorized` esegue automaticamente il rinnovo trasparente del token e ripete l'operazione in background senza allarmi a video.

---

## 🛠️ Comandi di Sviluppo, Build e Deploy

### 1. Compilazione del Frontend Angular
Dal PC di sviluppo (richiede Node.js con flag OpenSSL legacy):
```powershell
cd "c:\Users\mcominardi\Desktop\Progetti\Rasberry-pi 5\volley-scoreboard-plus\web"
$env:NODE_OPTIONS = "--openssl-legacy-provider"
cmd /c "npm run build -- --prod"
```

### 2. Deploy Automatico sul Raspberry Pi 5
Lo script Python dedicato inietta le utility personalizzate in `index.html`, impacchetta la directory di distribuzione, la carica via SFTP, aggiorna `/opt/scoreboard-plus/web/`, riavvia il servizio e ricarica il Kiosk sulla TV:
```powershell
cd "c:\Users\mcominardi\Desktop\Progetti\Rasberry-pi 5"
python scripts/deploy_themes_and_timeouts.py
```

### 3. Gestione Servizi via SSH (Terminale Pi)
```bash
# Verifica stato del tabellone
systemctl status scoreboard-plus.service

# Riavvio rapido del servizio Go
sudo systemctl restart scoreboard-plus.service

# Ricarica Firefox Kiosk sullo schermo TV
sudo -u mirko bash -c 'export DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/1000/bus && pkill -f firefox && nohup /usr/local/bin/start-gnome-kiosk.sh > /dev/null 2>&1 &'

# Controllo log in tempo reale
journalctl -u scoreboard-plus.service -f
```

---

## ⚙️ File di Configurazione (`config.yml`)

Posizione sul Raspberry Pi: `/opt/scoreboard-plus/conf/config.yml`

```yaml
logger:
  level: "INFO"
  file: "/opt/scoreboard-plus/log/volley-scoreboard.log"

server:
  address: ":80"
  user: "admin"
  username: "admin"
  password: "admin"
  jwtSigningKey: "<chiave-segreta-lunga-e-casuale>"
  webAppDir: "/opt/scoreboard-plus/web"
  storeDir: "/opt/scoreboard-plus/data"
  logoFile: "/opt/scoreboard-plus/data/logo.svg"
```

---

## 📂 Struttura della Repository

```
volley-scoreboard-plus/
├── api/                       # Specifiche OpenAPI 3 (volleyscoreboard.yaml)
├── conf/                      # Default e configurazione Go (defaults.go, config.sample.yaml)
├── pkg/                       # Codice client/server generato da oapi-codegen
├── server/                    # Logica HTTP Echo, routing e WebSocket
├── web/                       # Applicazione frontend Angular 8
│   ├── src/app/
│   │   ├── components/        # Componenti UI (scoreboard, admin, preferences, points...)
│   │   ├── interceptors/      # AuthInterceptor per auto-retry 401
│   │   └── services/          # ScoreboardService, WebSocketService, AlertService
│   └── dist/volley-gui/       # File compilati di produzione pronti al deploy
├── scripts/                   # Script Python di deploy, test e configurazione
└── README.md                  # Questo manuale operativo
```

---

## 📄 Licenza
Rilasciato sotto licenza [MIT](LICENSE).
