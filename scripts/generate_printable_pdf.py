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
    sys.exit("Manca " + os.path.abspath(SECRETS_PATH) + " (wifi_ssid, wifi_password, gateway, backup_ssid, backup_password, backup_gateway, pi_ip, camera_rtsp)")
with open(SECRETS_PATH, encoding="utf-8") as f:
    S = json.load(f)

# QR Code Wi-Fi della rete del Totem (modem), generato dai valori locali
qr_b64 = ""
try:
    import io
    import qrcode
    buf = io.BytesIO()
    qrcode.make(f"WIFI:T:WPA;S:{S['backup_ssid']};P:{S['backup_password']};;", box_size=8, border=1).save(buf, format="PNG")
    qr_b64 = base64.b64encode(buf.getvalue()).decode("ascii")
except ImportError:
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
      h2 {{ break-after: avoid; page-break-after: avoid; }}
    table.keys td {{ padding: 2px 6px; }}
    .grid-3 {{
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 6px;
      margin-bottom: 10px;
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
      <span class="badge">Modem 5G</span>
      <span class="badge">FIPAV / Superlega Grade</span>
    </div>
  </div>

  <!-- SEZIONE 1: RETE WI-FI E ACCESSO RAPIDO -->
  <div class="card highlight">
    <h2>1. Rete Wi-Fi del Totem & Accesso da Smartphone / Tablet</h2>
    
    <div class="wifi-flex">
      <div style="flex-grow: 1;">
        <p>Connettere lo smartphone o il tablet alla <strong>stessa rete Wi-Fi del Totem</strong> per gestire il segnapunti:</p>
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
              <td><strong>Modem 5G (Rete del Totem)</strong></td>
              <td><strong style="color:#0055b8; font-size:10.5pt;">{S["backup_ssid"]}</strong></td>
              <td><code style="font-size:10pt; font-weight:bold;">{S["backup_password"]}</code></td>
              <td>Totem: <code>{S["pi_ip"]}</code> (fisso) • Gateway: <code>{S["backup_gateway"]}</code></td>
            </tr>
            <tr>
              <td><strong>FRITZ!Box (Collegamento a distanza)</strong></td>
              <td><strong style="color:#0055b8;">{S["wifi_ssid"]}</strong></td>
              <td><code>{S["wifi_password"]}</code></td>
              <td>2.4 / 5 GHz</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="wifi-qr-box">
        <img src="data:image/png;base64,{qr_b64}" alt="QR Wi-Fi del Totem">
        <span>Inquadra per connetterti al Totem</span>
      </div>
    </div>

    <p style="margin-top:4px;">Una volta connessi al Wi-Fi, aprire Google Chrome o Safari all'indirizzo (se <code>segnapunti.local</code> non si apre, usare l'indirizzo numerico):</p>
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
      <h3>Controllo Touch / Mouse (pannello admin)</h3>
      <ul>
        <li><strong>Punto +1:</strong> tap sul numero grande dei punti.</li>
        <li><strong>Correggi (-1):</strong> <em>swipe verso il basso</em> sul numero dei punti.</li>
        <li><strong>Battuta:</strong> automatica a chi fa punto; tap sul riquadro centrale dei set per cambiarla.</li>
        <li><strong>Set +1 / -1:</strong> swipe in alto / in basso sul numero dei set della squadra.</li>
        <li><strong>Timeout:</strong> tap sulle pastiglie <em>T.O.</em> (parte il timer di 30" sulla TV).</li>
        <li><strong>Inverti campo:</strong> tap sul nome di una squadra.</li>
      </ul>
    </div>

    <div class="card">
      <h3>Tastiera del Totem (wireless)</h3>
      <table class="keys">
        <tbody>
          <tr><td><span class="key-badge">1</span> / <span class="key-badge">2</span></td><td>Punto Casa +1 / -1</td></tr>
          <tr><td><span class="key-badge">9</span> / <span class="key-badge">0</span></td><td>Punto Ospiti +1 / -1</td></tr>
          <tr><td><span class="key-badge">3</span> / <span class="key-badge">4</span></td><td>Set Casa +1 / -1</td></tr>
          <tr><td><span class="key-badge">7</span> / <span class="key-badge">8</span></td><td>Set Ospiti +1 / -1</td></tr>
          <tr><td><span class="key-badge">Q</span> / <span class="key-badge">P</span></td><td>Timeout Casa / Ospiti</td></tr>
          <tr><td><span class="key-badge">Spazio</span></td><td>Cambia battuta</td></tr>
          <tr><td><span class="key-badge">B</span></td><td>Inverti campo</td></tr>
          <tr><td><span class="key-badge">S</span> / <span class="key-badge">E</span> / <span class="key-badge">M</span></td><td>Nuovo set / Fine partita / Nuova partita (premere <strong>2 volte</strong>)</td></tr>
          <tr><td><span class="key-badge">L</span> / <span class="key-badge">T</span></td><td>Layout / Tema successivo</td></tr>
          <tr><td><span class="key-badge">F1</span> / <span class="key-badge">F2</span></td><td>Segnapunti / Video replay</td></tr>
          <tr><td><span class="key-badge">H</span></td><td>Mostra la legenda dei tasti sulla TV</td></tr>
        </tbody>
      </table>
      <p style="margin-top:4px;">Funziona anche il tastierino numerico. Ogni comando compare per un attimo in basso sulla TV.</p>
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

  <!-- SEZIONE 4: LAYOUT E TEMI -->
  <h2>4. Layout e Temi del Tabellone</h2>
  <p>Dal pannello admin, <strong>Preferenze</strong>: si sceglie il <strong>layout</strong> e si applica un <strong>tema</strong> con un clic. Dalla tastiera del Totem: <span class="key-badge">L</span> layout successivo, <span class="key-badge">T</span> tema successivo.</p>
  <p><strong>Layout:</strong> Broadcast (predefinito) • Blocchi squadra • Arena • Metà campo • Classico. I layout nuovi mostrano anche i <strong>parziali dei set</strong>, il <strong>timer di 30"</strong> del timeout, gli avvisi <strong>SET POINT / MATCH POINT</strong> e <strong>CAMBIO CAMPO</strong> a 8 punti del tie-break.</p>

  <div class="grid-3">
    <div class="theme-box">
      <strong>1. Notte Palasport</strong>
      <div class="theme-color-dots">
        Casa: <span class="dot" style="background:#2563eb;"></span> | Ospiti: <span class="dot" style="background:#f97316;"></span> | Fondo: <span class="dot" style="background:#0b0d10;"></span>
      </div>
    </div>
    <div class="theme-box">
      <strong>2. LED Classico</strong>
      <div class="theme-color-dots">
        Casa: <span class="dot" style="background:#c81e1e;"></span> | Ospiti: <span class="dot" style="background:#1d4ed8;"></span> | Fondo: <span class="dot" style="background:#000000;"></span>
      </div>
    </div>
    <div class="theme-box">
      <strong>3. Bianco Gara</strong>
      <div class="theme-color-dots">
        Casa: <span class="dot" style="background:#0b3d91;"></span> | Ospiti: <span class="dot" style="background:#c8102e;"></span> | Fondo: <span class="dot" style="background:#e9edf2;"></span>
      </div>
    </div>
    <div class="theme-box">
      <strong>4. Contrasto Massimo</strong>
      <div class="theme-color-dots">
        Casa: <span class="dot" style="background:#ffd400;"></span> | Ospiti: <span class="dot" style="background:#00b3ff;"></span> | Fondo: <span class="dot" style="background:#000000;"></span>
      </div>
    </div>
    <div class="theme-box">
      <strong>5. Ardesia e Corallo</strong>
      <div class="theme-color-dots">
        Casa: <span class="dot" style="background:#14b8a6;"></span> | Ospiti: <span class="dot" style="background:#fb7185;"></span> | Fondo: <span class="dot" style="background:#111827;"></span>
      </div>
    </div>
    <div class="theme-box">
      <strong>6. Tricolore</strong>
      <div class="theme-color-dots">
        Casa: <span class="dot" style="background:#009246;"></span> | Ospiti: <span class="dot" style="background:#ce2b37;"></span> | Fondo: <span class="dot" style="background:#06101f;"></span>
      </div>
    </div>
    <div class="theme-box">
      <strong>7. Superlega Oro</strong>
      <div class="theme-color-dots">
        Casa: <span class="dot" style="background:#1e40af;"></span> | Ospiti: <span class="dot" style="background:#b91c1c;"></span> | Fondo: <span class="dot" style="background:#070b18;"></span>
      </div>
    </div>
    <div class="theme-box">
      <strong>8. Volt Neon</strong>
      <div class="theme-color-dots">
        Casa: <span class="dot" style="background:#8b5cf6;"></span> | Ospiti: <span class="dot" style="background:#06b6d4;"></span> | Fondo: <span class="dot" style="background:#050505;"></span>
      </div>
    </div>
    <div class="theme-box">
      <strong>9. Parquet</strong>
      <div class="theme-color-dots">
        Casa: <span class="dot" style="background:#e07a1f;"></span> | Ospiti: <span class="dot" style="background:#2f80c9;"></span> | Fondo: <span class="dot" style="background:#1a120b;"></span>
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
          <td><strong>Android non apre segnapunti.local</strong></td>
          <td>Alcuni Android non riconoscono i nomi <code>.local</code></td>
          <td>Usare l'indirizzo numerico <code>http://{S["pi_ip"]}</code></td>
        </tr>
        <tr>
          <td><strong>Il telefono non trova il Totem</strong></td>
          <td>Il telefono è passato ai dati mobili (rete senza internet)</td>
          <td>Spegnere i dati mobili oppure scegliere "Resta connesso" all'avviso di Android.</td>
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
    Documento redatto per ASD Multisports DDN • Volley Scoreboard Plus su Raspberry Pi 5 • Modem 5G • Repository: github.com/m1rk0z/volley-scoreboard-plus
  </div>

</body>
</html>
"""

print("Rendering printable PDF...")
with sync_playwright() as p:
    try:
        browser = p.chromium.launch(channel="chrome")
    except Exception:
        browser = p.chromium.launch(channel="msedge")
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
