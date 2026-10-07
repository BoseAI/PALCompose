@echo off
setlocal EnableExtensions
rem Disinstallazione controllo ActiveX PalCompose.Browser (tutte le versioni installate)

net session >nul 2>&1
if errorlevel 1 (
    powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

set "BASE=%ProgramFiles%\PalCompose\ActiveX"
set "REGASM32=%WINDIR%\Microsoft.NET\Framework\v4.0.30319\RegAsm.exe"
set "REGASM64=%WINDIR%\Microsoft.NET\Framework64\v4.0.30319\RegAsm.exe"

echo Chiudere FactoryTalk View (Studio e Client) prima di continuare.
pause

for /r "%BASE%" %%f in (PalComposeBrowser.dll) do (
    if exist "%%f" (
        "%REGASM32%" "%%f" /unregister /nologo /silent
        if exist "%REGASM64%" "%REGASM64%" "%%f" /unregister /nologo /silent
    )
)
rmdir /S /Q "%BASE%" 2>nul
if exist "%BASE%" (
    echo Alcuni file sono ancora in uso: riavviare il PC e rilanciare uninstall.bat per cancellarli.
) else (
    echo Disinstallazione terminata.
)
pause
