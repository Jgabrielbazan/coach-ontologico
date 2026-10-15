@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
title Coach Ontologico - instalar y publicar

echo.
echo  ==========================================
echo     Coach Ontologico - instalar y publicar
echo  ==========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo No encontre Node.js. Instalalo desde https://nodejs.org ^(version LTS^) y vuelve a abrir este archivo.
  goto fin
)
for /f "tokens=1 delims=." %%v in ('node -p "process.versions.node"') do set NODEV=%%v
if %NODEV% LSS 22 (
  echo Tienes Node %NODEV%. Hace falta la version 22 o superior: instala la LTS desde https://nodejs.org
  goto fin
)

echo [1/5] Instalando dependencias ^(puede tardar unos minutos^)...
call npm install --no-fund --no-audit
if errorlevel 1 goto error
call npm --prefix functions install --no-fund --no-audit
if errorlevel 1 goto error

echo.
echo [2/5] Iniciar sesion en Firebase: se abre el navegador, entra con tu cuenta de Google.
call npx firebase login
if errorlevel 1 goto error

echo.
echo [3/5] Eligiendo tu proyecto de Firebase...
if exist .firebaserc (
  echo Ya estaba elegido.
) else (
  call npx firebase projects:list --json > "%TEMP%\coach-proyectos.json"
  if errorlevel 1 goto error
  node herramientas\elegir-proyecto.js "%TEMP%\coach-proyectos.json"
  if errorlevel 1 goto error
)

echo.
echo [4/5] Tu correo y tu clave de Gemini
if exist functions\.env (
  echo El correo autorizado ya estaba guardado.
) else (
  node herramientas\guardar-correo.js
  if errorlevel 1 goto error
)
call npx firebase functions:secrets:access GEMINI_API_KEY >nul 2>nul
if errorlevel 1 (
  node herramientas\guardar-clave.js
  if errorlevel 1 goto error
) else (
  echo La clave de Gemini ya estaba guardada. Para cambiarla usa "Cambiar clave de Gemini.cmd".
)

echo.
echo [5/5] Publicando la app ^(la primera vez tarda varios minutos^).
echo       Si pregunta algo, responde Y o pulsa Enter.
call npm run deploy
if errorlevel 1 goto error

echo.
echo  ==========================================
echo   LISTO. Abre la direccion "Hosting URL" de arriba
echo   en la PC y en el movil, e instala la app.
echo  ==========================================
goto fin

:error
echo.
echo  Algo fallo. Copia el mensaje de error de arriba y mandaselo a Claude.

:fin
echo.
pause
