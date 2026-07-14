@echo off
echo ========================================
echo Installing Python IP Scanner
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed!
    echo Please install Python from: https://www.python.org/downloads/
    pause
    exit /b 1
)

echo Python found!
echo.

REM Install required packages
echo Installing required packages...
pip install -r requirements.txt

if errorlevel 1 (
    echo.
    echo ERROR: Failed to install packages!
    pause
    exit /b 1
)

echo.
echo ========================================
echo Installation completed successfully!
echo ========================================
echo.
echo You can now use the scanner:
echo   python ip_scanner.py 192.168.1.1
echo   python ip_scanner.py 192.168.1.0/24 --type full
echo.
pause
