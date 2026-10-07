// =====================================================================================
//  PalComposeBrowser - controllo ActiveX per FactoryTalk View SE
//
//  Contiene il browser Edge (WebView2) e permette al VBA di parlare direttamente con la
//  pagina, senza file su disco:
//    VBA -> pagina : proprieta' PageData (JSON disponibile alla pagina come
//                    window.PalComposeHost.data, anche dopo la navigazione 2D <-> 3D)
//                    oppure SendToPage(testo) per messaggi in tempo reale
//    pagina -> VBA : window.PalComposeHost.send(testo) -> evento MessageReceived(testo)
//
//  La cartella dell'applicazione e' servita come https://palcompose.local/ : moduli
//  JavaScript, file .glb/.obj e fetch funzionano senza server.
// =====================================================================================
using System;
using System.IO;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;
using Microsoft.Win32;

[assembly: ComVisible(false)]
[assembly: Guid("B3F7CF83-624C-49A7-B498-E668FD8D0118")]   // type library

namespace System.Runtime.CompilerServices
{
    [AttributeUsage(AttributeTargets.Method)]
    internal sealed class ModuleInitializerAttribute : Attribute { }
}

namespace PalCompose
{
    /// <summary>
    /// Il controllo e' caricato dentro DisplayClient.exe: .NET cercherebbe le DLL di WebView2 nella cartella
    /// di FactoryTalk. Questo risolutore le carica dalla cartella del controllo.
    /// </summary>
    internal static class DependencyLoader
    {
        private static bool _loaderPathSet;

        internal static string Folder { get { return Path.GetDirectoryName(typeof(DependencyLoader).Assembly.Location); } }

        [System.Runtime.CompilerServices.ModuleInitializer]
        internal static void Init()
        {
            AppDomain.CurrentDomain.AssemblyResolve += (sender, args) =>
            {
                string file = Path.Combine(Folder, new AssemblyName(args.Name).Name + ".dll");
                return File.Exists(file) ? Assembly.LoadFrom(file) : null;
            };
        }

        /// <summary>Indica a WebView2 dove trovare WebView2Loader.dll per l'architettura del processo.</summary>
        internal static void SetWebView2LoaderPath()
        {
            if (_loaderPathSet) return;
            _loaderPathSet = true;
            string arch = Environment.Is64BitProcess ? "win-x64" : "win-x86";
            string dir = Path.Combine(Folder, "runtimes", arch, "native");
            if (File.Exists(Path.Combine(dir, "WebView2Loader.dll")))
                CoreWebView2Environment.SetLoaderDllFolderPath(dir);
        }
    }

    /// <summary>Metodi e proprieta' visibili dal VBA.</summary>
    [ComVisible(true)]
    [Guid("93BD2E2B-AC7D-4F16-8E04-892D3CE63E97")]
    [InterfaceType(ComInterfaceType.InterfaceIsDual)]
    public interface IPalComposeBrowser
    {
        /// <summary>Cartella con Index.html, servita come https://palcompose.local/</summary>
        [DispId(1)] string AppFolder { get; set; }
        /// <summary>Pagina iniziale relativa ad AppFolder (es. "Index.html")</summary>
        [DispId(2)] string StartPage { get; set; }
        /// <summary>JSON passato alla pagina (window.PalComposeHost.data) prima che i suoi script partano</summary>
        [DispId(3)] string PageData { get; set; }
        /// <summary>Indirizzo attualmente visualizzato</summary>
        [DispId(4)] string CurrentUrl { get; }
        /// <summary>True quando il browser e' inizializzato</summary>
        [DispId(5)] bool IsReady { get; }
        /// <summary>Ultimo errore (vuoto se nessuno)</summary>
        [DispId(6)] string LastError { get; }
        /// <summary>Consente la navigazione verso siti esterni (default False)</summary>
        [DispId(7)] bool AllowExternalNavigation { get; set; }

        /// <summary>Imposta AppFolder e StartPage e apre la pagina</summary>
        [DispId(20)] void LoadApp(string appFolder, string startPage);
        /// <summary>Apre un indirizzo qualsiasi (file:///, https://palcompose.local/...)</summary>
        [DispId(21)] void Navigate(string url);
        /// <summary>Invia un testo alla pagina (evento "message" di window.chrome.webview)</summary>
        [DispId(22)] void SendToPage(string message);
        /// <summary>Esegue uno script nella pagina (senza attendere il risultato)</summary>
        [DispId(23)] void ExecuteScript(string script);
        /// <summary>Ricarica la pagina</summary>
        [DispId(24)] void Reload();
        /// <summary>Apre gli strumenti di sviluppo (F12) per la diagnosi</summary>
        [DispId(25)] void ShowDevTools();
    }

    /// <summary>Eventi ricevuti dal VBA (Private Sub NomeControllo_MessageReceived(...)).</summary>
    [ComVisible(true)]
    [Guid("0D5AEC71-4039-49D5-BF79-6BA682535678")]
    [InterfaceType(ComInterfaceType.InterfaceIsIDispatch)]
    public interface IPalComposeBrowserEvents
    {
        /// <summary>La pagina ha inviato un messaggio con window.PalComposeHost.send(testo)</summary>
        [DispId(1)] void MessageReceived(string message);
        /// <summary>Caricamento pagina terminato</summary>
        [DispId(2)] void NavigationCompleted(bool success, string url);
        /// <summary>Errore del browser (inizializzazione, runtime WebView2 mancante, ...)</summary>
        [DispId(3)] void BrowserError(string description);
    }

    [ComVisible(false)] public delegate void MessageReceivedHandler(string message);
    [ComVisible(false)] public delegate void NavigationCompletedHandler(bool success, string url);
    [ComVisible(false)] public delegate void BrowserErrorHandler(string description);

    [ComVisible(true)]
    [Guid("9AA737C5-1508-43A6-B33A-6DB753030F33")]
    [ProgId("PalCompose.Browser")]
    [ClassInterface(ClassInterfaceType.None)]
    [ComDefaultInterface(typeof(IPalComposeBrowser))]
    [ComSourceInterfaces(typeof(IPalComposeBrowserEvents))]
    public class PalComposeBrowser : UserControl, IPalComposeBrowser
    {
        public const string HostName = "palcompose.local";

        public event MessageReceivedHandler MessageReceived;
        public event NavigationCompletedHandler NavigationCompleted;
        public event BrowserErrorHandler BrowserError;

        private readonly WebView2 _web;
        private CoreWebView2 _core;
        private bool _initStarted;
        private string _appFolder = "";
        private string _startPage = "Index.html";
        private string _pageData = "";
        private string _pendingUrl;
        private string _hostScriptId;
        private string _lastError = "";
        private bool _firstNavigationDone;
        private readonly System.Collections.Generic.List<string> _pendingMessages = new System.Collections.Generic.List<string>();

        public PalComposeBrowser()
        {
            _web = new WebView2 { Dock = DockStyle.Fill };
            Controls.Add(_web);
            BackColor = System.Drawing.Color.White;
        }

        // ---------------------------------------------------------------- proprieta'
        public string AppFolder
        {
            get { return _appFolder; }
            set { _appFolder = value ?? ""; ApplyFolderMapping(); }
        }

        public string StartPage
        {
            get { return _startPage; }
            set { _startPage = string.IsNullOrEmpty(value) ? "Index.html" : value; }
        }

        public string PageData
        {
            get { return _pageData; }
            set { _pageData = value ?? ""; UpdateHostScript(); }
        }

        public string CurrentUrl { get { return _core != null ? _core.Source : (_pendingUrl ?? ""); } }

        public bool IsReady { get { return _core != null; } }

        public string LastError { get { return _lastError; } }

        public bool AllowExternalNavigation { get; set; }

        // ---------------------------------------------------------------- metodi
        public void LoadApp(string appFolder, string startPage)
        {
            AppFolder = appFolder;
            StartPage = startPage;
            Navigate("https://" + HostName + "/" + _startPage.TrimStart('/').Replace('\\', '/'));
        }

        public void Navigate(string url)
        {
            if (_core == null) { _pendingUrl = url; EnsureInitialized(); return; }
            try { _core.Navigate(url); }
            catch (Exception ex) { ReportError("Navigate: " + ex.Message); }
        }

        public void SendToPage(string message)
        {
            // prima del primo caricamento la pagina non ha ancora il gestore: il messaggio va in coda
            if (_core == null || !_firstNavigationDone) { _pendingMessages.Add(message ?? ""); EnsureInitialized(); return; }
            try { _core.PostWebMessageAsString(message ?? ""); }
            catch (Exception ex) { ReportError("SendToPage: " + ex.Message); }
        }

        public async void ExecuteScript(string script)
        {
            if (_core == null) { ReportError("ExecuteScript: browser non pronto"); return; }
            try { await _core.ExecuteScriptAsync(script ?? ""); }
            catch (Exception ex) { ReportError("ExecuteScript: " + ex.Message); }
        }

        public void Reload()
        {
            if (_core != null) _core.Reload();
        }

        public void ShowDevTools()
        {
            if (_core == null) return;
            _core.Settings.AreDevToolsEnabled = true;
            _core.OpenDevToolsWindow();
        }

        // ---------------------------------------------------------------- inizializzazione
        protected override void OnHandleCreated(EventArgs e)
        {
            base.OnHandleCreated(e);
            EnsureInitialized();
        }

        private async void EnsureInitialized()
        {
            if (_initStarted || !IsHandleCreated) return;
            _initStarted = true;
            try
            {
                // La cartella dati di WebView2 deve essere scrivibile: quella predefinita sarebbe accanto
                // a DisplayClient.exe (Program Files), dove l'utente non ha i permessi di scrittura.
                string userData = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "PalCompose", "WebView2");
                Directory.CreateDirectory(userData);
                DependencyLoader.SetWebView2LoaderPath();
                var env = await CoreWebView2Environment.CreateAsync(null, userData);
                await _web.EnsureCoreWebView2Async(env);
                _core = _web.CoreWebView2;

                var s = _core.Settings;
                s.AreDefaultContextMenusEnabled = false;
                s.AreDevToolsEnabled = false;
                s.IsStatusBarEnabled = false;
                s.IsZoomControlEnabled = false;
                s.AreBrowserAcceleratorKeysEnabled = false;
                s.IsPinchZoomEnabled = false;
                s.IsSwipeNavigationEnabled = false;

                _core.WebMessageReceived += OnWebMessageReceived;
                _core.NavigationStarting += OnNavigationStarting;
                _core.NavigationCompleted += OnNavigationCompleted;
                _core.NewWindowRequested += (o, a) => { a.Handled = true; };   // niente finestre popup

                ApplyFolderMapping();
                UpdateHostScript();

                if (!string.IsNullOrEmpty(_pendingUrl))
                {
                    string url = _pendingUrl;
                    _pendingUrl = null;
                    _core.Navigate(url);
                }
            }
            catch (WebView2RuntimeNotFoundException)
            {
                ReportError("Microsoft Edge WebView2 Runtime non installato");
            }
            catch (Exception ex)
            {
                ReportError("Inizializzazione WebView2: " + ex.Message);
            }
        }

        private void ApplyFolderMapping()
        {
            if (_core == null || string.IsNullOrEmpty(_appFolder)) return;
            try
            {
                _core.ClearVirtualHostNameToFolderMapping(HostName);
            }
            catch { /* nessuna mappatura precedente */ }
            try
            {
                _core.SetVirtualHostNameToFolderMapping(HostName, _appFolder, CoreWebView2HostResourceAccessKind.Allow);
            }
            catch (Exception ex) { ReportError("AppFolder non valida (" + _appFolder + "): " + ex.Message); }
        }

        // Script eseguito in ogni pagina prima dei suoi script: espone i dati e il canale verso il VBA
        private async void UpdateHostScript()
        {
            if (_core == null) return;
            try
            {
                if (_hostScriptId != null) { _core.RemoveScriptToExecuteOnDocumentCreated(_hostScriptId); _hostScriptId = null; }
                string script =
                    "(function(){var json=" + JsString(_pageData) + ";" +
                    "window.PalComposeHost=Object.freeze({version:1,dataJson:json," +
                    "get data(){try{return json?JSON.parse(json):null;}catch(e){return null;}}," +
                    "send:function(m){window.chrome.webview.postMessage(String(m));}});})();";
                _hostScriptId = await _core.AddScriptToExecuteOnDocumentCreatedAsync(script);
            }
            catch (Exception ex) { ReportError("PageData: " + ex.Message); }
        }

        // ---------------------------------------------------------------- eventi WebView2
        private bool IsTrustedSource(string url)
        {
            if (string.IsNullOrEmpty(url)) return false;
            return url.StartsWith("https://" + HostName + "/", StringComparison.OrdinalIgnoreCase)
                || url.StartsWith("file:///", StringComparison.OrdinalIgnoreCase);
        }

        private void OnNavigationStarting(object sender, CoreWebView2NavigationStartingEventArgs e)
        {
            if (AllowExternalNavigation) return;
            if (IsTrustedSource(e.Uri) || e.Uri.StartsWith("about:", StringComparison.OrdinalIgnoreCase)
                || e.Uri.StartsWith("data:", StringComparison.OrdinalIgnoreCase)) return;
            e.Cancel = true;   // pannello operatore: niente siti esterni
        }

        private void OnWebMessageReceived(object sender, CoreWebView2WebMessageReceivedEventArgs e)
        {
            if (!IsTrustedSource(e.Source)) return;
            string message;
            try { message = e.TryGetWebMessageAsString(); }
            catch { message = e.WebMessageAsJson; }
            try { MessageReceived?.Invoke(message); }
            catch (Exception ex) { _lastError = "MessageReceived (VBA): " + ex.Message; }
        }

        private void OnNavigationCompleted(object sender, CoreWebView2NavigationCompletedEventArgs e)
        {
            if (e.IsSuccess && !_firstNavigationDone)
            {
                _firstNavigationDone = true;
                foreach (var m in _pendingMessages) _core.PostWebMessageAsString(m);
                _pendingMessages.Clear();
            }
            if (!e.IsSuccess) _lastError = "Navigazione non riuscita: " + e.WebErrorStatus;
            try { NavigationCompleted?.Invoke(e.IsSuccess, _core.Source); }
            catch (Exception ex) { _lastError = "NavigationCompleted (VBA): " + ex.Message; }
        }

        private void ReportError(string description)
        {
            _lastError = description;
            try { BrowserError?.Invoke(description); } catch { }
        }

        // Testo -> stringa JavaScript sicura
        private static string JsString(string s)
        {
            var sb = new StringBuilder("\"");
            foreach (char c in s ?? "")
            {
                switch (c)
                {
                    case '\\': sb.Append("\\\\"); break;
                    case '"': sb.Append("\\\""); break;
                    case '\n': sb.Append("\\n"); break;
                    case '\r': sb.Append("\\r"); break;
                    case '\t': sb.Append("\\t"); break;
                    case '<': sb.Append("\\u003c"); break;
                    case (char)0x2028: sb.Append("\\u2028"); break;
                    case (char)0x2029: sb.Append("\\u2029"); break;
                    default:
                        if (c < 0x20) sb.AppendFormat("\\u{0:x4}", (int)c); else sb.Append(c);
                        break;
                }
            }
            return sb.Append('"').ToString();
        }

        protected override void Dispose(bool disposing)
        {
            if (disposing) _web.Dispose();
            base.Dispose(disposing);
        }

        // ---------------------------------------------------------------- registrazione COM
        // Chiavi aggiuntive perche' FactoryTalk View riconosca la classe come controllo ActiveX inseribile
        [ComRegisterFunction]
        private static void RegisterControl(Type t)
        {
            using (var k = Registry.ClassesRoot.CreateSubKey(@"CLSID\" + t.GUID.ToString("B")))
            {
                k.CreateSubKey("Control").Close();
                using (var m = k.CreateSubKey("MiscStatus")) m.SetValue("", "131457");
                using (var tl = k.CreateSubKey("TypeLib")) tl.SetValue("", Marshal.GetTypeLibGuidForAssembly(t.Assembly).ToString("B"));
                var ver = t.Assembly.GetName().Version;
                using (var v = k.CreateSubKey("Version")) v.SetValue("", ver.Major + "." + ver.Minor);
                k.CreateSubKey(@"Implemented Categories\{40FC6ED4-2438-11CF-A3DB-080036F12502}").Close();
            }
        }

        [ComUnregisterFunction]
        private static void UnregisterControl(Type t)
        {
            string path = @"CLSID\" + t.GUID.ToString("B");
            using (var k = Registry.ClassesRoot.OpenSubKey(path, true))
            {
                if (k == null) return;
                foreach (var sub in new[] { "Control", "MiscStatus", "TypeLib", "Version" })
                    k.DeleteSubKeyTree(sub, false);
                k.DeleteSubKeyTree(@"Implemented Categories\{40FC6ED4-2438-11CF-A3DB-080036F12502}", false);
            }
        }
    }
}
