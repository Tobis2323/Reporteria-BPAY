@echo off
chcp 65001 > nul
title Bot Dedicado SIRTAC / SIRCREB - Bezza Pay
cd /d "%~dp0"

echo =====================================================
echo   Iniciando Bot Dedicado en tu PC...
echo   (Deja esta ventana abierta mientras trabajes)
echo =====================================================
echo.

node start-host.js

echo.
echo =====================================================
echo   El Bot se ha detenido.
echo =====================================================
pause
