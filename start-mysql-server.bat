@echo off
echo ========================================
echo Starting Web Scanner with MySQL
echo ========================================
echo.

echo Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js: OK
echo.

echo Starting server on port 3001...
echo.
echo Server will be available at: http://localhost:3001
echo Login page: http://localhost:3001/login.html
echo.

node server-mysql.js

pause
