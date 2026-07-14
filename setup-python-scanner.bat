@echo off
echo ========================================
echo Python IP Scanner - Quick Setup
echo ========================================
echo.

REM Check Python
echo [1/3] Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found!
    echo.
    echo Please install Python from:
    echo https://www.python.org/downloads/
    echo.
    echo Make sure to check "Add Python to PATH" during installation
    pause
    exit /b 1
)
echo OK: Python is installed
echo.

REM Install packages
echo [2/3] Installing required packages...
cd python-scanner
pip install -r requirements.txt
if errorlevel 1 (
    echo ERROR: Failed to install packages
    cd ..
    pause
    exit /b 1
)
cd ..
echo OK: Packages installed
echo.

REM Test scanner
echo [3/3] Testing scanner...
python python-scanner/ip_scanner.py 127.0.0.1 --type quick >nul 2>&1
if errorlevel 1 (
    echo WARNING: Scanner test failed
    echo This might be normal if localhost scan is blocked
) else (
    echo OK: Scanner is working
)
echo.

echo ========================================
echo Setup completed successfully!
echo ========================================
echo.
echo You can now:
echo   1. Start the server: node server-sqlite.js
echo   2. Open browser: http://localhost:3000
echo   3. Go to IP Scanner section
echo   4. Start scanning!
echo.
echo For more info, see: PYTHON_SCANNER_SETUP.md
echo.
pause
