@echo off
rem Mostra come e' registrato il controllo PalCompose.Browser (32 e 64 bit)
set "CLSID={9AA737C5-1508-43A6-B33A-6DB753030F33}"
echo.
echo === Registrazione 64 bit ===
reg query "HKCR\CLSID\%CLSID%\InprocServer32" /reg:64 2>nul || echo NON REGISTRATO a 64 bit
echo.
echo === Registrazione 32 bit ===
reg query "HKCR\CLSID\%CLSID%\InprocServer32" /reg:32 2>nul || echo NON REGISTRATO a 32 bit
echo.
echo === File del controllo ===
dir /b "%ProgramFiles%\PalCompose\ActiveX\PalComposeBrowser.dll" 2>nul || echo PalComposeBrowser.dll NON TROVATO in %ProgramFiles%\PalCompose\ActiveX
echo.
pause
