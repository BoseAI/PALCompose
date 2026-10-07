@echo off
setlocal EnableExtensions EnableDelayedExpansion
rem =====================================================================
rem  Installazione controllo ActiveX PalCompose.Browser
rem  Doppio clic: chiede i permessi di amministratore, copia i file in una
rem  cartella NUOVA "%ProgramFiles%\PalCompose\ActiveX\<data_ora>" e registra
rem  il controllo da li' (32 e 64 bit).
rem  Non sovrascrive mai i file di un'installazione precedente: se sono ancora
rem  in uso (FactoryTalk aperto) non c'e' "Sharing violation". Le cartelle
rem  vecchie non piu' in uso vengono cancellate.
rem =====================================================================

net session >nul 2>&1
if errorlevel 1 (
    echo Richiesta permessi di amministratore...
    powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

set "SRC=%~dp0bin"
set "BASE=%ProgramFiles%\PalCompose\ActiveX"
set "REGASM32=%WINDIR%\Microsoft.NET\Framework\v4.0.30319\RegAsm.exe"
set "REGASM64=%WINDIR%\Microsoft.NET\Framework64\v4.0.30319\RegAsm.exe"
set "ERR=0"

echo.
echo === Installazione PalCompose.Browser ===
echo.

if not exist "%SRC%\PalComposeBrowser.dll" (
    echo ERRORE: non trovo "%SRC%\PalComposeBrowser.dll"
    echo Lanciare install.bat dalla cartella ActiveX che contiene la cartella bin.
    set "ERR=1"
    goto :fine
)

rem --- .NET Framework 4.8 (Release >= 528040) ---
set "NETREL="
for /f "tokens=3" %%a in ('reg query "HKLM\SOFTWARE\Microsoft\NET Framework Setup\NDP\v4\Full" /v Release 2^>nul ^| find "Release"') do set /a NETREL=%%a
if not defined NETREL set "NETREL=0"
if !NETREL! LSS 528040 (
    echo ERRORE: serve .NET Framework 4.8. Installarlo e rilanciare.
    set "ERR=1"
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

rem --- Cartella nuova con data e ora ---
for /f %%t in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd_HHmmss"') do set "STAMP=%%t"
set "DEST=%BASE%\%STAMP%"
set "DLL=%DEST%\PalComposeBrowser.dll"
set "TLB=%DEST%\PalComposeBrowser.tlb"

mkdir "%DEST%" 2>nul
xcopy "%SRC%\*" "%DEST%\" /E /I /Y /Q >nul
if errorlevel 1 ( echo ERRORE: copia file non riuscita in %DEST% & set "ERR=1" & goto :fine )
powershell -NoProfile -Command "Get-ChildItem -LiteralPath '%DEST%' -Recurse | Unblock-File" >nul 2>&1
echo [OK] File copiati in %DEST%

rem --- Registrazione COM (sostituisce quella precedente) ---
"%REGASM32%" "%DLL%" /codebase /tlb:"%TLB%" /nologo /silent
if errorlevel 1 ( echo ERRORE: registrazione 32 bit non riuscita & set "ERR=1" ) else ( echo [OK] Registrato per programmi a 32 bit )
if exist "%REGASM64%" (
    "%REGASM64%" "%DLL%" /codebase /tlb:"%TLB%" /nologo /silent
    if errorlevel 1 ( echo ERRORE: registrazione 64 bit non riuscita & set "ERR=1" ) else ( echo [OK] Registrato per programmi a 64 bit )
)

rem --- Pulizia: installazioni precedenti non piu' in uso ---
rem (file sciolti della vecchia installazione direttamente in ActiveX, poi le cartelle data_ora)
del /q "%BASE%\*.dll" "%BASE%\*.tlb" >nul 2>&1
if exist "%BASE%\runtimes" rmdir /s /q "%BASE%\runtimes" >nul 2>&1
for /d %%d in ("%BASE%\*") do (
    if /i not "%%~nxd"=="%STAMP%" if /i not "%%~nxd"=="runtimes" rmdir /s /q "%%d" >nul 2>&1
)
set "VECCHIE=0"
for /d %%d in ("%BASE%\*") do if /i not "%%~nxd"=="%STAMP%" set /a VECCHIE+=1
if exist "%BASE%\PalComposeBrowser.dll" set /a VECCHIE+=1
if !VECCHIE! GTR 0 (
    echo [i] Una versione precedente e' ancora in uso: verra' cancellata alla prossima installazione.
    echo     Riavviare Display Client e Studio per usare la versione nuova.
)

:fine
echo.
if "%ERR%"=="0" (
    echo Installazione terminata. In FactoryTalk View Studio: Objects - ActiveX Control - "PalCompose.Browser".
) else (
    echo Installazione terminata CON ERRORI: vedere i messaggi sopra.
)
echo.
pause
