@echo off
echo ========================================
echo Starting Server with Existing Database
echo ========================================
echo.
echo Database: "web scanner" (with space)
echo Users: admin, user1, user2
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
echo Login with:
echo   Username: admin (or user1, user2)
echo   Password: any password
echo.

node server-existing-db.js

pause
