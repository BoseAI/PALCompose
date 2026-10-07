@echo off
setlocal EnableExtensions
rem Disinstallazione controllo ActiveX PalCompose.Browser

net session >nul 2>&1
if errorlevel 1 (
    powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

set "DEST=%ProgramFiles%\PalCompose\ActiveX"
set "DLL=%DEST%\PalComposeBrowser.dll"
set "TLB=%DEST%\PalComposeBrowser.tlb"

echo Chiudere FactoryTalk View (Studio e Client) prima di continuare.
pause

if exist "%DLL%" (
    "%WINDIR%\Microsoft.NET\Framework\v4.0.30319\RegAsm.exe" "%DLL%" /unregister /tlb:"%TLB%" /nologo /silent
    if exist "%WINDIR%\Microsoft.NET\Framework64\v4.0.30319\RegAsm.exe" "%WINDIR%\Microsoft.NET\Framework64\v4.0.30319\RegAsm.exe" "%DLL%" /unregister /tlb:"%TLB%" /nologo /silent
)
rmdir /S /Q "%DEST%" 2>nul
echo Disinstallazione terminata.
pause
