@echo off
setlocal EnableExtensions
rem =====================================================================
rem  Installazione controllo ActiveX PalCompose.Browser
rem  Doppio clic: chiede i permessi di amministratore, copia i file in
rem  "%ProgramFiles%\PalCompose\ActiveX" e registra il controllo sia per
rem  i programmi a 32 bit sia per quelli a 64 bit.
rem =====================================================================

rem --- Permessi di amministratore ---
net session >nul 2>&1
if errorlevel 1 (
    echo Richiesta permessi di amministratore...
    powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

set "SRC=%~dp0bin"
set "DEST=%ProgramFiles%\PalCompose\ActiveX"
set "DLL=%DEST%\PalComposeBrowser.dll"
set "TLB=%DEST%\PalComposeBrowser.tlb"
set "REGASM32=%WINDIR%\Microsoft.NET\Framework\v4.0.30319\RegAsm.exe"
set "REGASM64=%WINDIR%\Microsoft.NET\Framework64\v4.0.30319\RegAsm.exe"
set "ERR=0"

echo.
echo === Installazione PalCompose.Browser ===
echo.

if not exist "%SRC%\PalComposeBrowser.dll" (
    echo ERRORE: non trovo "%SRC%\PalComposeBrowser.dll"
    echo Lanciare install.bat dalla cartella ActiveX che contiene la cartella bin.
    goto :fine
)

rem --- .NET Framework 4.8 (Release >= 528040) ---
set "NETREL="
for /f "tokens=3" %%a in ('reg query "HKLM\SOFTWARE\Microsoft\NET Framework Setup\NDP\v4\Full" /v Release 2^>nul ^| find "Release"') do set /a NETREL=%%a
if not defined NETREL set "NETREL=0"
if %NETREL% LSS 528040 (
    echo ERRORE: serve .NET Framework 4.8. Installarlo e rilanciare.
    goto :fine
)
echo [OK] .NET Framework 4.8

rem --- Runtime Microsoft Edge WebView2 ---
set "WV2="
for %%k in ("HKLM\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}" "HKLM\SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}" "HKCU\SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}") do (
    reg query %%k /v pv >nul 2>&1 && set "WV2=1"
)
if defined WV2 (
    echo [OK] Runtime WebView2
) else (
    echo ATTENZIONE: runtime Microsoft Edge WebView2 non trovato.
    echo            Installare "Evergreen Standalone Installer" da Microsoft prima di usare il controllo.
)

rem --- Programmi che stanno usando il controllo (impedirebbero la sovrascrittura) ---
:checkInUso
set "INUSO="
for /f "tokens=1,2 delims=," %%a in ('tasklist /m PalComposeBrowser.dll /fo csv /nh 2^>nul ^| find /i ".exe"') do (
    if not defined INUSO echo.& echo Il controllo e' in uso da questi programmi:
    set "INUSO=1"
    echo    %%~a  ^(PID %%~b^)
)
if defined INUSO (
    echo.
    echo Chiudere i programmi elencati ^(FactoryTalk View Studio, Display Client^),
    echo poi premere un tasto per riprovare. Ctrl+C per annullare.
    pause >nul
    goto :checkInUso
)

rem --- Copia file ---
if not exist "%DEST%" mkdir "%DEST%"
xcopy "%SRC%\*" "%DEST%\" /E /I /Y /Q >nul
if errorlevel 1 ( echo ERRORE: copia file non riuscita & set "ERR=1" & goto :fine )
rem file scaricati da internet: senza sblocco .NET si rifiuta di caricarli
powershell -NoProfile -Command "Get-ChildItem -LiteralPath '%DEST%' -Recurse | Unblock-File" >nul 2>&1
echo [OK] File copiati in %DEST%

rem --- Registrazione COM 32 bit ---
"%REGASM32%" "%DLL%" /codebase /tlb:"%TLB%" /nologo /silent
if errorlevel 1 ( echo ERRORE: registrazione 32 bit non riuscita & set "ERR=1" ) else ( echo [OK] Registrato per programmi a 32 bit )

rem --- Registrazione COM 64 bit ---
if exist "%REGASM64%" (
    "%REGASM64%" "%DLL%" /codebase /tlb:"%TLB%" /nologo /silent
    if errorlevel 1 ( echo ERRORE: registrazione 64 bit non riuscita & set "ERR=1" ) else ( echo [OK] Registrato per programmi a 64 bit )
)

:fine
echo.
if "%ERR%"=="0" (
    echo Installazione terminata. In FactoryTalk View Studio: Oggetti - ActiveX Control - "PalCompose.Browser".
) else (
    echo Installazione terminata CON ERRORI: vedere i messaggi sopra.
)
echo.
pause
