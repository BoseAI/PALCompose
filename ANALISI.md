# PalCompose – Analisi e interventi

Sistema analizzato: FactoryTalk View SE v15, display `777 - PalCompose` con controllo
`SEWebBrowser` v14 (motore Edge/WebView2), pagina caricata da `file:///`.

Flusso attuale:

```
PLC ──(TagGroup VBA)──► RuntimeLayerData.js ──► Index.html (canvas 2D)
                                                     │  "Salva" = download
PLC ◄──(tag uno per uno)── VBA legge ◄── Downloads\RuntimeData.csv
```

## Interventi fatti

### JavaScript (`Functions/main.js`, `index.html`, `3D.html`, `robot.html`)

| # | Problema | Effetto | Correzione |
|---|----------|---------|------------|
| 1 | Ricerca posizione libera (`placeNextBox`, `autoFill`) provava ogni millimetro del pallet | Autofill 6,4 s e "pallet pieno" 5 s al decimo di mm (misurato su PC veloce; su HMI di più). Pagina bloccata | `findFirstFit`: prova solo 0 e i bordi delle casse esistenti. Risultato **identico** (verificato su 1500 casi casuali), tempo 1–3 ms |
| 2 | Trascinamento e D-pad (intervallo fino a 2 ms) ridisegnavano tutto e ricostruivano la sidebar a ogni evento | Scatti durante lo spostamento | `requestDraw()` raggruppa i ridisegni al frame successivo; la sidebar si aggiorna solo se cambia |
| 3 | `console.log` dell'intero layer per ogni cassa a ogni ridisegno (PickType 3) | Spreco di memoria/CPU | Rimossi i log nei percorsi frequenti |
| 4 | Valori salvati come `sideBoxW.value * 10` | Possibile `3683.0000000000005` nel CSV, letto male dal VBA | `Math.round` su tutte le variabili comuni |
| 5 | Più di 60 casse: il VBA le scartava in silenzio | Composizione salvata incompleta | Avviso in "Salva ed esci" (resta possibile uscire senza salvare) |
| 6 | Ritorno dalla vista 3D: bottoni A/B/AB, titolo e campi non ripristinati | Bottoni abilitati per tipi di presa non validi | `applyStateToUI()` richiamata anche al ritorno |
| 7 | Stato 2D↔3D in `localStorage` (permanente) | Se il display veniva chiuso dalla vista 3D, alla riapertura si vedeva la composizione vecchia invece dei dati PLC | `sessionStorage` (vale solo per la sessione del browser) |
| 8 | Vista 3D: due cicli `requestAnimationFrame` che fanno entrambi il rendering | GPU al doppio del necessario | Il rendering resta solo nel ciclo `animate()` |

### VBA (cartella `VBA/`)

Il codice nel file XML del display **non è stato modificato**. La versione corretta è in:

- `VBA/Module1.bas` → in Module1 (si può importare: tasto destro → *Import File*)
- `VBA/ThisDisplay_777_PalCompose.vb` → da incollare in ThisDisplay del display 777

| # | Problema | Effetto | Correzione |
|---|----------|---------|------------|
| 1 | `WaitMs` gira a vuoto con `DoEvents` | **Un core CPU al 100% per tutto il tempo** in cui l'operatore usa la pagina: rallenta FT View e il browser | `Sleep` di Windows (CPU ~0%) |
| 2 | Il CSV di una sessione precedente non viene cancellato prima di aprire la pagina | Il VBA lo legge subito e scrive nel PLC dati vecchi; il browser salva il nuovo come `RuntimeData (1).csv`, che non viene mai letto | Cancellazione del CSV prima della navigazione |
| 3 | `CStr` in `ToJSON` usa le impostazioni internazionali | Con un tag REAL `12.5` diventa `12,5` → JSON non valido → pagina vuota | `NumToText` (sempre il punto) |
| 4 | `CDbl` nella lettura del CSV | In italiano `CDbl("12.5")` = **125** | `TextToNum` (`Val`, sempre il punto) |
| 5 | Scrittura di ~600 tag uno alla volta | Salvataggio lento | Tentata la scrittura a blocchi (`PendingValue`/`WritePendingValues`): **non esiste in FactoryTalk View 13**, rimossa. Resta la scrittura tag per tag |
| 6 | Lettura PLC fallita → la pagina si apriva comunque con il file del giro precedente | Rischio di salvare nel PLC una composizione di un altro formato | Si torna al display del layer senza aprire l'editor, errore nel diagnostico |
| 7 | `oElement.Name` non definito | Errore runtime se il display `000 - VBA_code` non è caricato | Nome del display come costante |
| 8 | `Set tagItem` non azzerato prima di `On Error Resume Next` | Un tag mancante non veniva mai segnalato | `Set tagItem = Nothing` |
| 9 | `PickType` per cassa non passato alla pagina | Il controllo collisioni presa doppia (PickType 3) non scattava mai | Aggiunto `PickType` nel JSON |
| 10 | NBox > 60 dal PLC | Errore "indice fuori intervallo" | Limitato a 60 con messaggio |
| 11 | Chiave CSV sconosciuta o riga vuota | Errore VBA, operatore bloccato | Controlli con `.Exists`/`UBound` e gestore errori che riporta sempre al display del layer |

**Da verificare in impianto:**

- **`PickType` per cassa.** Con questo dato, ora la pagina evidenzia in rosso le collisioni delle coppie A+B (PickType 3), come previsto dal codice originale.

## Problemi trovati e non ancora risolti

1. **Vista 3D da `file:///`: RISOLTO.**
   - `libs/three/three.bundle.js` è three.js r184 in versione classica (non modulo), con OrbitControls/GLTFLoader/OBJLoader. Non usa `import`, che WebView2 blocca da file.
   - Pallet e casse sono generati nel codice, perché anche la lettura di `.glb`/`.obj` da disco è bloccata.
   - Ogni deposito è diviso nelle casse reali (NBoxX × NBoxY), disegnate con una sola chiamata di disegno.
   - La scena si ridisegna solo quando si muove la vista.
   - Il robot è facoltativo: `tools/embed-models.bat` incorpora i `.obj`/`.glb` di `Assets/3D` in `Assets/3D/models.js`.
   - `VBA.vb` (server Python) non serve più.
2. **`robot.html` carica GSAP da internet** (`cdn.jsdelivr.net`). Su una rete di impianto senza internet non funziona: va copiato in `libs/`.
3. **Percorsi fissi `C:\Users\IMA-1\...`.** Ora sono costanti in cima al codice VBA, ma su un altro PC vanno cambiati a mano.
4. **Attesa del CSV nell'evento `AnimationStart`.** Se il display viene chiuso senza premere Salva/Esci, il ciclo continua ad aspettare (ora senza consumare CPU).
5. **File mancanti o fuori posto nel repository.**
   - Icone: RISOLTO, spostate in `Assets/Icon/` e corretti i nomi `_notpressed` → `_Notpressed` in `index.html`.
   - Mancano `Assets/3D/*.glb`/`.obj` e `libs/three/examples/jsm/`.
   - `libs/three/build` contiene 11 MB di build non usate: serve solo `three.module.js`.
   - `style3D.css` è identico a `style.css`.
6. **`sideCompositionW/H.onchange` confronta stringa con numero** (`value !== prevPallet.w`), quindi il confronto è sempre vero. Effetto minimo: il popup compare anche se il valore non è cambiato.

## Alternative al passaggio via file

| Soluzione | Come | Pro | Contro |
|-----------|------|-----|--------|
| **A. Attuale migliorata** (fatto) | File JS + download CSV | Nessuna installazione | Dipende dalla cartella Download e dal comportamento dei download di WebView2 |
| **B. Ponte diretto controllo ↔ VBA** | ~~Scartata~~ | | Verificato in impianto: `SEWebBrowser` v14 ha solo `Back`, `Forward`, `InitialURL`, `Refresh`, `ShowAddressBar`, `Stop`, `URL`, `UseParameter`, senza eventi né esecuzione di script; `URL` letta dal VBA resta quella impostata (non segue la navigazione della pagina), quindi non si può usare per il ritorno dei dati |
| **B2. ActiveX PalCompose.Browser** (fatto, cartella `ActiveX/`) | Controllo C# con WebView2: `PageData` verso la pagina, evento `MessageReceived` verso il VBA | Niente file, niente Download, 3D con modelli reali | Da installare con `install.bat` su ogni PC HMI; da provare in FactoryTalk |
| **C. Server locale** (Node-RED / Python / .NET) + OPC UA o FactoryTalk Linx | La pagina legge e scrive i tag via HTTP/WebSocket | Architettura pulita; risolve anche la vista 3D (pagina servita via http) | Un servizio da installare e mantenere |
| **D. FactoryTalk Optix** | Piattaforma Rockwell con web e OPC UA nativi | Moderna | È una migrazione |

Conclusione: con il controllo attuale il ritorno dati dalla pagina può avvenire solo tramite file (download) o tramite un server locale (C). La soluzione A, con le correzioni fatte, resta quella consigliata finché non si vuole installare un servizio.

## Etichette casse (CornerLabelling)

Il tag `SizeWork.Outfeed.CornerLabelling` viene letto dal VBA (costante `TAG_CORNER_LABELLING`, da verificare il percorso completo) e passato alla pagina.

- `1`: etichetta ad angolo, sullo spigolo destra/basso della cassa a 0° vista dall'alto.
- `0`: etichetta laterale, al centro del lato destro.

L'etichetta ruota con la cassa, sia nel 2D sia nel 3D. Il valore è solo letto: non viene riscritto nel PLC.
