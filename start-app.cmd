@echo off
setlocal
cd /d "%~dp0"

if not exist ".next\BUILD_ID" (
    echo First run: building the app...
    call npm run build
)

echo Starting OpenCode App server...
powershell -NoProfile -WindowStyle Hidden -Command "Start-Process -FilePath cmd -ArgumentList '/c npm run start' -WindowStyle Hidden"

set /a attempts=0
:wait
timeout /t 1 /nobreak >nul
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:3100' -UseBasicParsing -TimeoutSec 2; exit 0 } catch { exit 1 }" >nul 2>&1
if not errorlevel 1 goto open
set /a attempts+=1
if %attempts% lss 60 goto wait

echo Server did not start within 60 seconds. Check the OpenCode App server window.
pause
exit /b 1

:open
start "" "http://localhost:3100"
endlocal