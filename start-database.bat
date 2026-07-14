@echo off
echo ============================================================
echo   Starting Penetration Testing Platform with SQLite
echo ============================================================
echo.
echo Stopping any existing servers on port 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":3000" ^| find "LISTENING"') do taskkill /F /PID %%a 2>nul
timeout /t 2 /nobreak >nul
echo.
echo Starting server with SQLite database...
node server-sqlite.js
