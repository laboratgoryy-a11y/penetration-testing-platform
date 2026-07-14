@echo off
echo Killing pending processes...
taskkill /F /IM winget.exe 2>nul
taskkill /F /IM msiexec.exe 2>nul
taskkill /F /IM powershell.exe 2>nul
echo Done!
echo.
echo Now try running START.bat or START-DOCKER.bat
pause
