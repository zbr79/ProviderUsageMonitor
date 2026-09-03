@echo off
setlocal
cd /d "%~dp0"
start "" /min cmd /c "npm start"
endlocal