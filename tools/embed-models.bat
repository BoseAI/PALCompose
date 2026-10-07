@echo off
rem Doppio clic per rigenerare Assets\3D\models.js
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0embed-models.ps1"
pause
