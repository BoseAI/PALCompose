# PalCompose

Editor delle composizioni pallet per FactoryTalk View SE: pagina web (2D + 3D) nel display 777, collegata al PLC dal VBA.

## Struttura

| Percorso | Contenuto | Va sul PC HMI |
|----------|-----------|---------------|
| `index.html`, `3D.html` | pagine 2D e 3D | sì, in `C:\IMA\Tools\PalCompose` |
| `Functions/main.js` | logica della pagina 2D | sì |
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
