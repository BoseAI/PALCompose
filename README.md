# PalCompose

Editor delle composizioni pallet per FactoryTalk View SE: pagina web (2D + 3D) nel display 777, collegata al PLC dal VBA.

## Struttura

| Percorso | Contenuto | Va sul PC HMI |
|----------|-----------|---------------|
| `index.html`, `3D.html` | pagine 2D e 3D | sì, in `C:\IMA\Tools\PalCompose` |
| `Functions/` | logica della pagina 2D, divisa per argomento (vedi sotto) | sì, tutta la cartella |
| `style/style.css` | grafica | sì |
| `Assets/` | icone, immagine pallet 2D, modelli 3D facoltativi | sì |
| `libs/three/three.bundle.js` | three.js per la vista 3D (funziona da `file:///`) | sì |
| `RuntimeLayerData.js` | dati di esempio; in impianto lo riscrive il VBA | (generato) |
| `tools/embed-models.bat` | incorpora i modelli 3D (robot) per l'uso senza ActiveX | facoltativo |
| `FTView/v13`, `v14`, `v15` | display 777 da importare: `WebBrowser/` (browser Rockwell) e `ActiveX/` (PalCompose.Browser) | si importano in Studio |
| `FTView/originale/` | export di riferimento da cui si generano i file sopra | no |
| `VBA/` | codice VBA del display (versione browser Rockwell e versione ActiveX) e `Module1.bas` | già dentro gli XML |
| `ActiveX/` | controllo PalCompose.Browser: `install.bat`, `verifica.bat`, `uninstall.bat`, `bin/`, sorgente in `src/` | `install.bat` su ogni PC Client |
| `tools/build_ftview_xml.py` | rigenera `FTView/v*/` dal VBA | no |

Guida passo passo: `GUIDA_INSTALLAZIONE.md`. Analisi e scelte tecniche: `ANALISI.md`. Dettagli ActiveX: `ActiveX/README.md`.

## Functions/ (caricati in questo ordine da `index.html`)

| File | Contenuto |
|------|-----------|
| `config.js` | **impostazioni**: `engineeringMode` (modalità tecnico) e dati di partenza senza PLC |
| `state.js` | stato dell'applicazione, riferimenti agli elementi della pagina, testi |
| `draw.js` | disegno 2D: pallet, depositi, casse, etichette, testi |
| `placement.js` | posizionamento casse, autoriempimento, collisioni |
| `interaction.js` | trascinamento, rotazione, frecce, allineamento, scambio ID |
| `ui.js` | sidebar, pulsanti, popup, caricamento, passaggio al 3D |
| `plc.js` | lettura dati PLC, dimensioni depositi, invio risultato |
| `layer-tools.js` | specchiature, simmetria, ottimizzazione e riordino presa |
| `engineering.js` | modalità tecnico: finestra "PLC data" |
| `save.js` | salvataggio e dati per il PLC |
| `inputs.js` | campi della sidebar Settings |
| `app.js` | collegamento eventi e avvio (per ultimo) |

## Modalità tecnico (uso senza PLC)

In `Functions/config.js` impostare `engineeringMode: true`, oppure aprire la pagina come `Index.html?eng=1`.
Compare il pulsante **PLC data** accanto a **Settings**: si modificano pallet, cassa, casse per deposito (X/Y),
tipo di presa (A, A+B, AB), casse nei canali A/B, ruota di presa, offset, approccio, etichetta ad angolo e layer.

- **Apply**: applica e mantiene i depositi dove sono (quelli che non stanno più vengono tolti e segnalati).
- **Apply & clear**: applica e svuota il pallet.

Senza PLC la pagina parte dai dati di `defaultPlcData`. In produzione `engineeringMode` deve restare `false`.
