# PalCompose.Browser – controllo ActiveX

Il controllo sostituisce `SEWebBrowserControl1` nel display 777. Contiene lo stesso motore Edge (WebView2) e permette al VBA di scambiare i dati con la pagina **senza file**:

| Direzione | Prima | Con PalCompose.Browser |
|-----------|-------|------------------------|
| PLC → pagina | il VBA scrive `RuntimeLayerData.js` | `PalBrowser1.PageData = json` → nella pagina `window.PalComposeHost.data` |
| pagina → PLC | download di `RuntimeData.csv` in Download + attesa | `PalComposeHost.send(csv)` → evento VBA `PalBrowser1_MessageReceived` |
| Vista 3D | solo modelli incorporati | la cartella è servita come `https://palcompose.local/`, quindi i `.glb`/`.obj` si caricano direttamente |

La pagina riconosce da sola in quale browser gira: con il browser Rockwell continua a usare i file.

## Contenuto

```
ActiveX/
  install.bat      installazione automatica (doppio clic)
  uninstall.bat    disinstallazione
  bin/             controllo già compilato (.NET Framework 4.8, AnyCPU)
  src/             sorgente C# (dotnet build -c Release)
```

## Requisiti sul PC HMI

- .NET Framework 4.8 (presente in Windows 10/11 aggiornati)
- Microsoft Edge WebView2 Runtime (di norma già presente con FactoryTalk View SE v15; `install.bat` lo verifica)

## Installazione

1. Copiare l'intera cartella `ActiveX` sul PC (anche il disco locale va bene).
2. **Chiudere FactoryTalk View Studio e Client.**
3. Doppio clic su `install.bat` e accettare la richiesta di amministratore.
   Lo script:
   - copia i file in `C:\Program Files\PalCompose\ActiveX`;
   - li sblocca (file scaricati da internet);
   - registra il controllo sia a 32 sia a 64 bit.

   Va bene qualunque sia l'architettura di FactoryTalk.
4. Per aggiornare il controllo basta rilanciare `install.bat` con la nuova cartella `bin`.

## Inserimento nel display 777

1. In FactoryTalk View Studio aprire il display **777 - PalCompose**.
2. Eliminare (o spostare fuori vista) `SEWebBrowserControl1`.
3. Inserire il nuovo controllo: *Objects → ActiveX Control…*, scegliere **PalCompose.Browser** (o `PalCompose.PalComposeBrowser`) e disegnarlo a tutto schermo (0,0 – 1016×760).
4. Nelle proprietà del controllo:
   - **Name** = `PalBrowser1`
   - **Expose to VBA** = *VBA Control*
5. Nell'editor VBA del display (Alt+F11), sostituire il codice di ThisDisplay con `VBA/ThisDisplay_777_PalCompose_ActiveX.vb`. `Module1.bas` resta quello aggiornato.
6. Controllare in cima al codice la costante `APP_FOLDER`: deve essere la cartella che contiene `Index.html`.

Le proprietà vanno impostate dal VBA (come fa già il codice fornito), non dal pannello proprietà di Studio: i controlli .NET non salvano le proprietà nel display.

## Riferimento per il VBA

| Membro | Tipo | Uso |
|--------|------|-----|
| `LoadApp(cartella, pagina)` | metodo | serve la cartella come `https://palcompose.local/` e apre la pagina |
| `PageData` | proprietà | JSON con i dati PLC, letto dalla pagina con `PalComposeHost.data` (vale anche dopo 2D ↔ 3D) |
| `SendToPage(testo)` | metodo | messaggio in tempo reale (`window.chrome.webview` evento `message`) |
| `Navigate(url)` / `Reload()` | metodo | navigazione |
| `ExecuteScript(js)` | metodo | esegue codice nella pagina |
| `ShowDevTools()` | metodo | apre gli strumenti di sviluppo (F12) per la diagnosi |
| `IsReady`, `CurrentUrl`, `LastError` | proprietà | stato |
| `AllowExternalNavigation` | proprietà | default `False`: siti esterni bloccati |
| `MessageReceived(message)` | evento | testo inviato dalla pagina |
| `NavigationCompleted(success, url)` | evento | pagina caricata |
| `BrowserError(description)` | evento | errori (es. runtime WebView2 mancante) |

I dati del browser (cache, `sessionStorage`) stanno in `%LOCALAPPDATA%\PalCompose\WebView2`.

## Se qualcosa non va

- **Il controllo non compare nell'elenco ActiveX:** rilanciare `install.bat` e controllare che non ci siano righe "ERRORE".
- **Area bianca, nessuna pagina:** cercare "browser:" nella Diagnostics List (evento `BrowserError`), oppure chiamare `PalBrowser1.ShowDevTools` da un pulsante.
- **"Microsoft Edge WebView2 Runtime non installato":** installare l'Evergreen Standalone Installer di Microsoft.
- **Tornare al vecchio browser:** rimettere `SEWebBrowserControl1` e il codice `VBA/ThisDisplay_777_PalCompose.vb`. La pagina funziona con entrambi.

## Compilare dal sorgente

```
cd ActiveX\src
dotnet build -c Release -o ..\bin
```

Serve il .NET SDK (6 o successivo), oppure Visual Studio 2022. Il progetto scarica da NuGet `Microsoft.Web.WebView2`.
