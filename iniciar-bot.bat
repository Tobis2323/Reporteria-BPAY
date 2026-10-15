@echo off
title Bot SIRTAC / SIRCREB - Bezza Pay (Tu PC)
cd /d "%~dp0"

node start-host.js
if %errorlevel% neq 0 (
  echo.
  echo [ERROR] Hubo un problema al iniciar el bot.
  pause
)
