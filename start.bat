@echo off
setlocal
cd /d "%~dp0"

REM ==== CONFIG (per project) ====
set "BASE_PORT=5173"

REM ==== find free port ====
set "PORT="
for /f "usebackq delims=" %%P in (`powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\find-port.ps1" %BASE_PORT%`) do set "PORT=%%P"
if not defined PORT (
  echo [start.bat] No free port found from %BASE_PORT% upwards.
  pause
  exit /b 1
)

echo [start.bat] https://localhost:%PORT%  (Handy im WLAN: https://^<PC-IP^>:%PORT%, Zertifikatswarnung einmal akzeptieren)
REM open browser after a short delay (delete this line if not wanted)
start "" /b cmd /c "timeout /t 3 /nobreak >nul & start "" https://localhost:%PORT%"

REM ==== START COMMAND (per project) ====
call npm run dev -- --port %PORT% --strictPort

endlocal
