@echo off
title Bot SIRCREB / SIRTAC - Reporteria Bezza Pay
color 0A
echo =========================================================
echo   Iniciando Bot de Consulta SIRTAC / SIRCREB / SIRCUPA
echo   Reporteria Bezza Pay
echo =========================================================
echo.
echo Comprobando entorno Node.js...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo ERROR: Node.js no esta instalado o no se encuentra en el PATH.
    echo Por favor instala Node.js desde https://nodejs.org
    pause
    exit /b
)

echo Iniciando servidor en http://127.0.0.1:3000 ...
echo Mantene esta ventana abierta mientras proceses reportes.
echo.
npm start
pause
