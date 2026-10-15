@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
title Coach Ontologico - cambiar clave de Gemini

echo.
echo  ==========================================
echo     Cambiar la clave de Gemini
echo  ==========================================
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo No encontre Node.js. Instalalo desde https://nodejs.org y vuelve a abrir este archivo.
  goto fin
)
if not exist node_modules (
  echo Primero ejecuta "Instalar y publicar.cmd".
  goto fin
)
if not exist .firebaserc (
  echo Primero ejecuta "Instalar y publicar.cmd".
  goto fin
)

echo La clave se verifica con Google antes de guardarla.
echo.
node herramientas\guardar-clave.js
if errorlevel 1 goto error

echo.
echo  ==========================================
echo   LISTO. Recarga la app y prueba "Empezar sesion".
echo  ==========================================
goto fin

:error
echo.
echo  Algo fallo. Copia el mensaje de error de arriba y mandaselo a Claude.

:fin
echo.
pause
