import os
import sys
import base64
import json
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')

OUTPUT_WORKSPACE = r"c:\Users\mcominardi\Desktop\Progetti\Rasberry-pi 5\Guida-Volley-Scoreboard.pdf"
OUTPUT_DESKTOP = r"c:\Users\mcominardi\Desktop\Guida-Volley-Scoreboard.pdf"
QR_PATH = r"c:\Users\mcominardi\Desktop\Progetti\Rasberry-pi 5\scripts\wifi_qr.png"

# Valori di rete e password: file locale fuori dal repository (vedi README)
SECRETS_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "totem_secrets.json")
if not os.path.exists(SECRETS_PATH):
    sys.exit("Manca " + os.path.abspath(SECRETS_PATH) + " (wifi_ssid, wifi_password, gateway, backup_ssid, backup_password, pi_ip, camera_rtsp)")
with open(SECRETS_PATH, encoding="utf-8") as f:
    S = json.load(f)

# Read QR Code in base64
qr_b64 = ""
if os.path.exists(QR_PATH):
    with open(QR_PATH, "rb") as f:
        qr_b64 = base64.b64encode(f.read()).decode("ascii")

html_content = f"""<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <title>Manuale Operativo - Volley Scoreboard Plus</title>
  <style>
    @page {{
      size: A4;
      margin: 10mm 13mm 10mm 13mm;
      @bottom-right {{
        content: counter(page) " / " counter(pages);
      }}
    }}

    * {{
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }}

    body {{
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      line-height: 1.35;
      font-size: 9.8pt;
      background: #ffffff;
    }}

    .cover-header {{
      background: linear-gradient(135deg, #0b1528 0%, #1e3a8a 100%);
      color: #ffffff;
      padding: 12px 16px;
      border-radius: 6px;
      margin-bottom: 10px;
      border-bottom: 3.5px solid #f59e0b;
    }}

    .cover-header h1 {{
      font-size: 16pt;
      font-weight: 800;
      letter-spacing: -0.5px;
      margin-bottom: 2px;
      color: #ffffff;
    }}

    .cover-header .subtitle {{
      font-size: 9.5pt;
      color: #93c5fd;
      font-weight: 500;
    }}

    .badge-row {{
      margin-top: 5px;
      display: flex;
      gap: 6px;
    }}

    .badge {{
      display: inline-block;
      background: rgba(255, 255, 255, 0.15);
      border: 1px solid rgba(255, 255, 255, 0.25);
      color: #ffffff;
      padding: 2px 7px;
      border-radius: 4px;
      font-size: 8pt;
      font-weight: 600;
    }}

    .card {{
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 9px 12px;
      margin-bottom: 9px;
      page-break-inside: avoid;
    }}

    .card.highlight {{
      border-left: 4px solid #0055b8;
      background: #f0f7ff;
    }}

    .card.amber {{
      border-left: 4px solid #f59e0b;
      background: #fffbeb;
    }}

    h2 {{
      font-size: 12pt;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 6px;
      padding-bottom: 3px;
      border-bottom: 1.5px solid #cbd5e1;
      display: flex;
      align-items: center;
      gap: 6px;
    }}

    h3 {{
      font-size: 10.5pt;
      font-weight: 600;
      color: #1e3a8a;
      margin-top: 6px;
      margin-bottom: 4px;
    }}

    p {{
      margin-bottom: 4px;
    }}

    table {{
      width: 100%;
      border-collapse: collapse;
      margin: 6px 0 8px 0;
      font-size: 9pt;
    }}

    th, td {{
      border: 1px solid #cbd5e1;
      padding: 5px 8px;
      text-align: left;
    }}

    th {{
      background: #e2e8f0;
      color: #0f172a;
      font-weight: 700;
    }}

    tr:nth-child(even) td {{
      background: #f8fafc;
    }}

    .key-badge {{
      display: inline-block;
      background: #0f172a;
      color: #ffffff;
      font-family: monospace;
      font-weight: bold;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 8.5pt;
    }}

    .grid-2 {{
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 8px;
    }}

    .wifi-flex {{
      display: flex;
      gap: 12px;
      align-items: center;
    }}

    .wifi-qr-box {{
      text-align: center;
      background: #ffffff;
      padding: 6px;
      border-radius: 6px;
      border: 1px solid #cbd5e1;
      flex-shrink: 0;
    }}

    .wifi-qr-box img {{
      width: 96px;
      height: 96px;
      display: block;
      margin: 0 auto;
    }}

    .wifi-qr-box span {{
      display: block;
      font-size: 7.5pt;
      font-weight: bold;
      color: #0f172a;
      margin-top: 3px;
    }}

    .theme-box {{
      border: 1px solid #cbd5e1;
      border-radius: 5px;
      padding: 6px 8px;
      background: #ffffff;
      font-size: 8.5pt;
    }}

    .theme-color-dots {{
      display: flex;
      gap: 5px;
      margin-top: 3px;
      align-items: center;
    }}

    .dot {{
      width: 12px;
      height: 12px;
      border-radius: 3px;
      border: 1px solid rgba(0,0,0,0.2);
    }}

    .page-break {{
      page-break-before: always;
    }}

    .footer-note {{
      font-size: 8pt;
      color: #64748b;
      text-align: center;
      margin-top: 10px;
      border-top: 1px solid #e2e8f0;
      padding-top: 6px;
    }}

    ul, ol {{
      margin-left: 18px;
      margin-bottom: 6px;
    }}

    li {{
      margin-bottom: 2px;
    }}
  </style>
</head>
<body>

  <!-- HEADER COPERTINA -->
  <div class="cover-header">
    <h1>VOLLEY SCOREBOARD PLUS & VIDEO DELAY</h1>
    <div class="subtitle">Guida Operativa Rapida da Tavolo per Ufficiali di Campo e Segnapunti</div>
    <div class="badge-row">
      <span class="badge">Palasport DDN</span>
      <span class="badge">Raspberry Pi 5</span>
      <span class="badge">FRITZ!Box 7530</span>
      <span class="badge">FIPAV / Superlega Grade</span>
    </div>
  </div>

  <!-- SEZIONE 1: RETE WI-FI E ACCESSO RAPIDO -->
  <div class="card highlight">
    <h2>1. Rete Wi-Fi Palasport (FRITZ!Box 7530) & Accesso da Smartphone / Tablet</h2>
    
    <div class="wifi-flex">
      <div style="flex-grow: 1;">
        <p>Connettere lo smartphone o il tablet alla rete Wi-Fi del palazzetto per gestire il segnapunti:</p>
        <table>
          <thead>
            <tr>
              <th>Rete Wi-Fi</th>
              <th>Nome Rete (SSID)</th>
              <th>Password (Chiave)</th>
              <th>Dettagli / Router</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>FRITZ!Box (Ufficiale)</strong></td>
              <td><strong style="color:#0055b8; font-size:10.5pt;">{S["wifi_ssid"]}</strong></td>
              <td><code style="font-size:10pt; font-weight:bold;">{S["wifi_password"]}</code></td>
              <td>2.4 / 5 GHz • Gateway: <code>{S["gateway"]}</code></td>
            </tr>
            <tr>
              <td><strong>Modem 4G (Riserva)</strong></td>
              <td><strong style="color:#0055b8;">{S["backup_ssid"]}</strong></td>
              <td><code>{S["backup_password"]}</code></td>
              <td>Access Point portatile di backup</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="wifi-qr-box">
        <img src="data:image/png;base64,{qr_b64}" alt="QR Wi-Fi Segnapunti">
        <span>Inquadra per connetterti</span>
      </div>
    </div>

    <p style="margin-top:4px;">Una volta connessi al Wi-Fi, aprire Google Chrome o Safari all'indirizzo:</p>
    <table>
      <thead>
        <tr>
          <th>Pannello</th>
          <th>Indirizzo Web (URL)</th>
          <th>Credenziali</th>
          <th>Descrizione</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Pannello Controllo</strong></td>
          <td><code>http://segnapunti.local/admin</code> (o <code>{S["pi_ip"]}/admin</code>)</td>
          <td><strong>Auto-Login</strong> (admin/admin)</td>
          <td>Punti, set, timeout, cambi campo e temi.</td>
        </tr>
        <tr>
          <td><strong>Schermo Tabellone</strong></td>
          <td><code>http://segnapunti.local</code> (o <code>{S["pi_ip"]}</code>)</td>
          <td>Nessuna</td>
          <td>Solo visualizzazione (proiettata su TV).</td>
        </tr>
        <tr>
          <td><strong>Video Delay Replay</strong></td>
          <td><code>http://{S["pi_ip"]}:4000</code></td>
          <td>Nessuna</td>
          <td>Replay stream telecamera campo.</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- SEZIONE 2: GUIDA DA TAVOLO SEGNAPUNTI -->
  <h2>2. Scheda Rapida di Gara (Comandi e Gesti)</h2>

  <div class="grid-2">
    <div class="card">
      <h3>Controllo Touch / Mouse</h3>
      <ul>
        <li><strong>Aggiungi Punto (+1):</strong> Tap/Click sul riquadro grande dei punti.</li>
        <li><strong>Correggi Errore (-1):</strong> <em>Swipe verso il basso</em> sul riquadro dei punti.</li>
        <li><strong>Assegnazione Servizio:</strong> Automatica a chi segna il punto (oppure tap sul pallino centrale del Set).</li>
        <li><strong>Aggiungi Set (+1):</strong> Tap sul riquadro in basso dei set vinti.</li>
        <li><strong>Timeout (1 o 2):</strong> Tap sui quadratini Timeout (si colorano col colore della squadra).</li>
      </ul>
    </div>

    <div class="card">
      <h3>Scorciatoie da Tastiera</h3>
      <ul>
        <li><span class="key-badge">B</span> : <strong>Inversione Campo (Side Swap)</strong></li>
        <li><span class="key-badge">S</span> : <strong>Nuovo Set</strong> (salva il parziale e azzera i punti)</li>
        <li><span class="key-badge">M</span> : <strong>Nuova Partita</strong> (apre il modulo squadre)</li>
        <li><span class="key-badge">1</span> / <span class="key-badge">2</span> : Punti Squadra Casa (+ / -)</li>
        <li><span class="key-badge">9</span> / <span class="key-badge">0</span> : Punti Squadra Ospiti (+ / -)</li>
        <li><span class="key-badge">3</span> / <span class="key-badge">7</span> : Timeout Casa / Ospiti</li>
      </ul>
    </div>
  </div>

  <!-- SEZIONE 3: INVERSIONE CAMPO -->
  <div class="card amber">
    <h2>3. Cambio Campo Intelligente (Side Swap)</h2>
    <p>A fine set o al raggiungimento degli 8 punti nel tie-break del 5° set, è possibile scambiare istantaneamente campo e colori in <strong>3 modalità</strong> senza perdere il punteggio:</p>
    <ol>
      <li>Premere il tasto <span class="key-badge">B</span> sulla tastiera wireless.</li>
      <li>Toccare direttamente con il dito il <strong>Nome di una delle squadre</strong> sul display.</li>
      <li>Cliccare sul pulsante centrale con l'icona dello scambio (<strong>doppia freccia</strong>) nel pannello admin.</li>
    </ol>
  </div>

  <div class="page-break"></div>

  <!-- SEZIONE 4: TEMI ARENA PREIMPOSTATI -->
  <h2>4. I 6 Temi Grafici Ufficiali (Selezione 1-Click in Preferenze)</h2>
  <p>Cliccando sul pulsante <strong>Preferenze</strong> nel pannello admin, è possibile applicare all'istante una delle 6 palette grafiche omologate Superlega/FIPAV con cifre in bianco puro ad altissima visibilità:</p>

  <div class="grid-2">
    <div class="theme-box">
      <strong>1. FIPAV (Blu Notte & Oro)</strong>
      <p>Stile federale classico italiano per gare ufficiali.</p>
      <div class="theme-color-dots">
        Casa: <span class="dot" style="background:#004bbb;"></span> #004bbb |
        Ospiti: <span class="dot" style="background:#f59e0b;"></span> #f59e0b |
        Fondo: <span class="dot" style="background:#070c16;"></span>
      </div>
    </div>

    <div class="theme-box">
      <strong>2. Superlega Derby (Rosso & Blu)</strong>
      <p>Ispirato ai grandi derby di Serie A (Lube, Perugia, Trento).</p>
      <div class="theme-color-dots">
        Casa: <span class="dot" style="background:#c51d24;"></span> #c51d24 |
        Ospiti: <span class="dot" style="background:#1d4ed8;"></span> #1d4ed8 |
        Fondo: <span class="dot" style="background:#0b0e14;"></span>
      </div>
    </div>

    <div class="theme-box">
      <strong>3. Smeraldo & Oro</strong>
      <p>Tonalità elegante per società con colori sociali verde/oro.</p>
      <div class="theme-color-dots">
        Casa: <span class="dot" style="background:#059669;"></span> #059669 |
        Ospiti: <span class="dot" style="background:#d97706;"></span> #d97706 |
        Fondo: <span class="dot" style="background:#061210;"></span>
      </div>
    </div>

    <div class="theme-box">
      <strong>4. Showdown Night (Viola & Giallo)</strong>
      <p>Palette moderna ad alta carica per eventi e serali.</p>
      <div class="theme-color-dots">
        Casa: <span class="dot" style="background:#7c3aed;"></span> #7c3aed |
        Ospiti: <span class="dot" style="background:#eab308;"></span> #eab308 |
        Fondo: <span class="dot" style="background:#0b0716;"></span>
      </div>
    </div>

    <div class="theme-box">
      <strong>5. Azzurri Italia (Azzurro & Rosso)</strong>
      <p>Grafica da diretta televisiva stile Nazionale Italiana.</p>
      <div class="theme-color-dots">
        Casa: <span class="dot" style="background:#0055b8;"></span> #0055b8 |
        Ospiti: <span class="dot" style="background:#dc2626;"></span> #dc2626 |
        Fondo: <span class="dot" style="background:#060f1c;"></span>
      </div>
    </div>

    <div class="theme-box">
      <strong>6. OLED Stealth (Nero Assoluto)</strong>
      <p>Nero puro per TV OLED (spegne i pixel e azzera riflessi).</p>
      <div class="theme-color-dots">
        Casa: <span class="dot" style="background:#0284c7;"></span> #0284c7 |
        Ospiti: <span class="dot" style="background:#e11d48;"></span> #e11d48 |
        Fondo: <span class="dot" style="background:#000000;"></span>
      </div>
    </div>
  </div>

  <!-- SEZIONE 5: VIDEO DELAY REPLAY -->
  <div class="card">
    <h2>5. Video Delay Replay (RTSP Telecamera Campo)</h2>
    <p>Il sistema acquisisce in continuo il flusso della telecamera panoramica posizionata in palestra:</p>
    <ul>
      <li><strong>Sorgente Telecamera:</strong> <code>{S["camera_rtsp"]}</code></li>
      <li><strong>Accesso Replay su Monitor / Tablet:</strong> Aprire nel browser <code>http://{S["pi_ip"]}:4000</code></li>
      <li><strong>Regolazione Ritardo:</strong> Dalla barra a scorrimento è possibile impostare un buffer di ritardo fisso (es. <strong>6-8 secondi</strong>) per consentire all'allenatore o all'arbitro di rivedere immediatamente ogni azione dopo la caduta della palla.</li>
    </ul>
  </div>

  <!-- SEZIONE 6: RISOLUZIONE PROBLEMI -->
  <div class="card">
    <h2>6. Risoluzione Problemi Rapida da Palazzetto (FAQ)</h2>
    <table>
      <thead>
        <tr>
          <th>Problema</th>
          <th>Causa</th>
          <th>Soluzione Immediata</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>La pagina non carica / Schermata nera</strong></td>
          <td>Browser bloccato o TV accesa in ritardo</td>
          <td>Ricaricare la pagina con <code>F5</code> o <code>Ctrl+F5</code> dal tablet. Dalla TV premere <code>Ctrl+R</code> o spegnere e riaccendere il Pi.</td>
        </tr>
        <tr>
          <td><strong>I numeri sono sfasati dopo un cambio rete</strong></td>
          <td>Cache del browser locale</td>
          <td>Aprire la pagina in modalità Incognito oppure fare aggiornamento forzato della pagina.</td>
        </tr>
        <tr>
          <td><strong>Schermo TV non a tutto schermo</strong></td>
          <td>Finestra Kiosk non massimizzata</td>
          <td>Premere <span class="key-badge">F11</span> sulla tastiera collegata al Raspberry Pi.</td>
        </tr>
        <tr>
          <td><strong>Riavvio del servizio via SSH</strong></td>
          <td>Manutenzione rapida da terminale</td>
          <td>Eseguire: <code>sudo systemctl restart scoreboard-plus.service</code></td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="footer-note">
    Documento redatto per ASD Multisports DDN • Volley Scoreboard Plus su Raspberry Pi 5 • FRITZ!Box 7530 • Repository: github.com/m1rk0z/volley-scoreboard-plus
  </div>

</body>
</html>
"""

print("Rendering printable PDF with official FRITZ!Box Segnapunti QR Code...")
with sync_playwright() as p:
    browser = p.chromium.launch(channel="chrome")
    page = browser.new_page()
    page.set_content(html_content, wait_until="networkidle")
    
    pdf_bytes = page.pdf(
        format="A4",
        print_background=True,
        margin={"top": "10mm", "bottom": "10mm", "left": "12mm", "right": "12mm"}
    )
    
    with open(OUTPUT_WORKSPACE, "wb") as f:
        f.write(pdf_bytes)
    print(f"Saved: {OUTPUT_WORKSPACE} ({len(pdf_bytes)} bytes)")
    
    try:
        with open(OUTPUT_DESKTOP, "wb") as f:
            f.write(pdf_bytes)
        print(f"Saved copy on Desktop: {OUTPUT_DESKTOP}")
    except Exception as e:
        print(f"Could not save copy on Desktop: {e}")
        
    browser.close()

print("PDF GENERATION COMPLETED SUCCESSFULLY!")
