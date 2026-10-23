@echo off
setlocal
cd /d "%~dp0"
set "PORT=3001"
start "Molod Die server" cmd /k node server.js
timeout /t 2 /nobreak >nul
start "" "http://localhost:3001"
endlocal
