# Guida installazione PalCompose

Il lavoro si fa in due fasi:

- **Fase 1 (obbligatoria):** nuova pagina + nuovo VBA, con il browser Rockwell attuale. Si cambia poco.
- **Fase 2 (facoltativa):** controllo ActiveX PalCompose.Browser, senza file di scambio.

Fai la Fase 2 solo quando la Fase 1 funziona.

---

## 0. Scaricare il progetto

1. Apri https://github.com/BoseAI/PALCompose.
2. In alto a sinistra, nel menu dei branch (dice `main`), scegli **`claude/pallettizzazione-performance-4qe65h`**.
3. Pulsante verde **Code → Download ZIP**.
   In alternativa, il link diretto è https://github.com/BoseAI/PALCompose/archive/refs/heads/claude/pallettizzazione-performance-4qe65h.zip
4. **Prima di estrarlo:** tasto destro sullo ZIP → *Proprietà* → in basso spunta **Sblocca** → OK.
   Senza questo passaggio Windows può bloccare le DLL dell'ActiveX.
5. Estrai lo ZIP, per esempio in `C:\Temp\PALCompose_nuovo`.

## 1. Backup (non saltarlo)

1. Copia l'intera cartella attuale `C:\Users\IMA-1\Documents\IMA\PalCompose` in `PalCompose_backup_AAAAMMGG`.
2. In FactoryTalk View Studio: tasto destro sul display **777 - PalCompose** → *Export* (o *Duplicate*) per averne una copia.
3. Nell'editor VBA del display 777 (Alt+F11), copia tutto il codice di **ThisDisplay** e di **Module1** in un file di testo di backup.

## 2. Fase 1 – file della pagina

Copia dalla cartella scaricata a `C:\Users\IMA-1\Documents\IMA\PalCompose`, **sovrascrivendo**:

| Da copiare | Note |
|------------|------|
| `index.html` | |
| `3D.html` | |
| `Functions\main.js` | |
| `libs\three\three.bundle.js` | nuovo: serve alla vista 3D senza server |
| `Assets\Icon\` | le icone (se le hai già uguali, puoi saltare) |
| `tools\` | facoltativo: serve solo per il robot nel 3D |

Non serve copiare `ANALISI.md`, `GUIDA_INSTALLAZIONE.md`, `ActiveX\`, `VBA\`, `777 - PalCompose.xml` e `VBA.vb`. Il server Python non serve più.

**Prova veloce senza FactoryTalk:** fai doppio clic su `Index.html` (si apre in Edge).
- Deve comparire il pallet con le casse dell'ultimo `RuntimeLayerData.js`.
- Il pulsante **3D** deve aprire la vista 3D.

## 3. Fase 1 – VBA del display 777

Hai due modi: **3A importare il display** (consigliato) oppure **3B incollare il codice a mano**.

### 3A. Importare il display già pronto
Il file `FTView\v13\777 - PalCompose.xml` (per FactoryTalk View SE 13; per la v15 c'è `FTView\v15\`) è il tuo display 777 originale con dentro il VBA nuovo (ThisDisplay e Module1). Grafica e oggetti sono invariati. L'export originale è in `FTView\originale\`.

1. In FactoryTalk View Studio chiudi il display 777, se è aperto.
2. Menu **Tools → Graphics Import Export Wizard** (in alcune versioni: tasto destro su *Displays* → *Import and Export…*).
3. Scegli **Import graphic information into displays** → *Next*.
4. Seleziona il file `FTView\v13\777 - PalCompose.xml` dalla cartella scaricata.
   Se l'import segnala errori di formato, usa il metodo 3B: il codice VBA è lo stesso.
5. Quando chiede cosa fare con il display esistente, scegli di **sostituirlo** (Replace / overwrite).
6. Apri il display 777 → **Alt+F11** → controlla le costanti in cima a ThisDisplay (vedi punto 4 di 3B) → **Debug → Compile** → salva.

### 3B. Incollare il codice a mano

1. FactoryTalk View Studio → apri il display **777 - PalCompose** → **Alt+F11**.
2. **Module1:**
   - nella finestra Progetto, tasto destro su `Module1` → *Remove Module1* → alla domanda "esportare?" rispondi **No** (il backup l'hai già fatto);
   - tasto destro sul progetto → *Import File…* → scegli `VBA\Module1.bas` dalla cartella scaricata.
3. **ThisDisplay:**
   - doppio clic su `ThisDisplay`, seleziona tutto (Ctrl+A) e cancella;
   - apri `VBA\ThisDisplay_777_PalCompose.vb` con il Blocco note, copia tutto e incolla in ThisDisplay.
4. **Controlla le costanti in cima** al codice appena incollato:
   - `FILE_PATH_JS`, `FILE_PATH_CSV`, `BROWSER_URL`: devono corrispondere ai percorsi reali del PC;
   - `TAG_CORNER_LABELLING`: percorso completo del tag `SizeWork.Outfeed.CornerLabelling`. Se nel progetto è diverso, correggilo. Puoi verificarlo con il Tag Browser di Studio.
5. Menu **Debug → Compile** (Compila): non deve dare errori.
6. Salva il display.

## 4. Fase 1 – prova in runtime

1. Avvia il Client e apri PalCompose da un layer.
2. Verifica:
   - [ ] la pagina mostra la composizione letta dal PLC;
   - [ ] le etichette sono ad angolo se `CornerLabelling = 1`, laterali se `= 0`;
   - [ ] **3D** e ritorno al **2D** funzionano e la composizione resta quella modificata;
   - [ ] **Esci senza salvare** → torna al display del layer, nel PLC non cambia nulla;
   - [ ] **Salva ed esci** → torna al display del layer e i valori nel PLC sono quelli nuovi.
3. Apri la **Diagnostics List** e cerca le righe `PALCOMPOSE`:
   - "File valido: Saved = TRUE/FALSE" vuol dire che è andato tutto bene.
4. Controlla in Gestione attività che, mentre la pagina è aperta, la CPU **non** stia fissa al 25–100%.

Se qualcosa non va: rimetti il codice VBA del backup e i file del backup. Si torna esattamente a prima.

---

## 5. Fase 2 (facoltativa) – ActiveX PalCompose.Browser

### 5.1 Installazione del controllo
1. Chiudi **FactoryTalk View Studio e Client**.
2. Nella cartella scaricata apri `ActiveX` e fai doppio clic su **`install.bat`** → accetta la richiesta di amministratore.
3. Tutte le righe devono essere `[OK]`. Se compare "runtime WebView2 non trovato", installa il *Microsoft Edge WebView2 Runtime – Evergreen Standalone Installer* e rilancia.

### 5.2 Display 777
1. Riapri Studio. Prima fai di nuovo una copia del display 777.
2. Nel display 777 seleziona `SEWebBrowserControl1` ed eliminalo.
3. *Objects → ActiveX Control…* → scegli **PalCompose.Browser** → disegnalo a tutto il display (posizione 0,0, dimensione 1016 × 760).
4. Proprietà del nuovo controllo:
   - **Name:** `PalBrowser1`
   - **Expose to VBA:** *VBA Control*
5. Alt+F11 → in ThisDisplay sostituisci tutto il codice con `VBA\ThisDisplay_777_PalCompose_ActiveX.vb`. Module1 resta quello della Fase 1.
6. Controlla in cima `APP_FOLDER` (la cartella che contiene `Index.html`) e `TAG_CORNER_LABELLING`.
7. **Debug → Compile**, poi salva.

### 5.3 Prova
Ripeti le verifiche del punto 4. In più:
- nella cartella Download **non** deve più comparire `RuntimeData.csv`;
- se la pagina resta bianca, nella Diagnostics List cerca `PALCOMPOSE - browser:`.

### 5.4 Tornare indietro
Rimetti `SEWebBrowserControl1` e il codice VBA della Fase 1. Volendo, togli il controllo con `ActiveX\uninstall.bat`. La pagina funziona con entrambi i browser.
