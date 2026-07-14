@echo off
echo ========================================
echo Testing Python IP Scanner
echo ========================================
echo.

REM Test localhost scan
echo Testing localhost scan...
python ip_scanner.py 127.0.0.1 --type quick

echo.
echo ========================================
echo Test completed!
echo ========================================
pause
