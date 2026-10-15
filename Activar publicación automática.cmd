@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
title Coach Ontologico - activar publicacion automatica

echo.
echo  ==========================================
echo     Activar publicacion automatica
echo  ==========================================
echo.
echo Crea un acceso de publicacion en tu proyecto de Google y copia su llave
echo para pegarla UNA vez en GitHub. Despues, cada cambio se publica solo.
echo.
if not exist node_modules (
  echo Primero ejecuta "Instalar y publicar.cmd".
  goto fin
)
node herramientas\activar-publicacion.js
if errorlevel 1 goto error
goto fin

:error
echo.
echo  Algo fallo. Copia el mensaje de error de arriba y mandaselo a Claude.

:fin
echo.
pause
