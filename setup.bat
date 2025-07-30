@echo off
echo ========================================
echo Amazon BSR Checker - Keepa API Setup
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js chua duoc cai dat!
    echo Vui long cai dat Node.js tu: https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Node.js version:
node -v
echo.

REM Install dependencies
echo [INFO] Dang cai dat dependencies...
call npm install

echo.
echo [OK] Cai dat hoan tat!
echo.
echo HUONG DAN SU DUNG:
echo 1. Chay backend server: npm start
echo 2. Mo frontend React trong browser
echo 3. Server chay tai: http://localhost:3001
echo.
echo COMMANDS HUU ICH:
echo - npm start     : Chay server production
echo - npm run dev   : Chay server development (auto-reload)
echo.
echo FILE MAU DE TEST:
echo - sample-asins.csv
echo - sample-asins.txt
echo.
echo Happy checking!
echo.
pause