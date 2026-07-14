@echo off
echo Installing Node.js...
msiexec /i nodejs-installer.msi /qn /norestart
echo Waiting for installation to complete...
timeout /t 30 /nobreak
echo Installation complete!
echo Refreshing environment variables...
refreshenv
node --version
npm --version
pause
