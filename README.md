# Coach Ontológico

App personal de coaching ontológico **por voz en tiempo real**. La misma app funciona
en la PC y en el móvil, cada una por su cuenta. Entras con tu cuenta de Google y
**comparten el progreso**: si avanzas en el móvil, la PC lo muestra al instante.

| Nivel | Nombre | Qué se trabaja |
|---|---|---|
| 1 | El Observador Inicial | Hechos (afirmaciones) vs. juicios |
| 2 | El Diseñador de Realidades | Actos lingüísticos y declaraciones |
| 3 | El Maestro de la Coherencia Corporal | Lenguaje, emoción y cuerpo (con cámara opcional) |

## Cómo funciona

```
 PC (app instalada)        Móvil (app instalada)
        └──── Entrar con Google ────┘
                     │
            Firebase (Google)
            • Hosting: publica la app
            • Auth: tu cuenta de Google (solo tu correo tiene acceso)
            • Firestore: tu progreso, sincronizado en vivo
            • Functions: crean el token de Gemini y aplican las reglas de los niveles
                     │
            Gemini Live: la conversación de voz va directo del aparato a Google
```

- **Tu clave de Gemini nunca llega al aparato:** la guarda Firebase como secreto y la
  función `crearSesion` entrega un token temporal de un solo uso por sesión.
- **Solo tu cuenta:** las funciones rechazan cualquier correo distinto de
  `EMAIL_PERMITIDO`, y la base de datos solo deja leer tu propio progreso.
- **Niveles justos:** el servidor decide si subes (aprobado + mínimo 70/100).
- **Memoria:** al cerrar cada sesión el coach guarda un resumen y la siguiente retoma desde ahí.

## Puesta en marcha (una sola vez)

Necesitas **Node.js 22 o superior** ([nodejs.org](https://nodejs.org)).

### 1. Crear el proyecto en Firebase

1. Entra a [console.firebase.google.com](https://console.firebase.google.com) →
   **Crear un proyecto** (por ejemplo `coach-ontologico`). Google Analytics no hace falta.
2. **Actualizar al plan Blaze** (abajo a la izquierda). Lo exigen las Functions.
   Para uso personal el gasto de Firebase es prácticamente cero; pon un
   **presupuesto con alerta** (por ejemplo 5 USD) en la consola de facturación.
3. **Authentication** → Comenzar → **Google** → Habilitar → Guardar.
4. **Firestore Database** → Crear base de datos → modo producción → la región que
   prefieras (por ejemplo `southamerica-east1` o `us-central1`).
5. **Configuración del proyecto → Tus apps → Web (`</>`)** → registra una app web
   (sin marcar Hosting). Solo hace falta que exista.

### 2. Instalar y publicar con doble clic (Windows)

Descarga el código (en GitHub: **Code → Download ZIP**, y descomprímelo) y haz doble
clic en **`Instalar y publicar.cmd`**. Hace todo solo; tú únicamente:

1. Inicias sesión con tu cuenta de Google cuando se abre el navegador.
2. Escribes el correo con el que vas a entrar a la app.
3. Pegas tu clave de Google AI Studio cuando la pide.

Al terminar muestra la dirección de la app (`Hosting URL`). Para publicar cambios más
adelante, vuelve a abrirlo: lo que ya está configurado no lo pregunta de nuevo.

### Alternativa: paso a paso por consola

```bash
git clone https://github.com/Jgabrielbazan/coach-ontologico.git
cd coach-ontologico
npm install
npm --prefix functions install
npx firebase login
npx firebase use --add          # elige tu proyecto y ponle el alias "default"
```

Crea `functions/.env` copiando `functions/.env.example` y pon tu correo:

```
EMAIL_PERMITIDO=tu-correo@gmail.com
```

Guarda la clave de Google AI Studio como secreto (te la pedirá por consola, no
queda en ningún archivo):

```bash
npx firebase functions:secrets:set GEMINI_API_KEY
```

#### Publicar

```bash
npm run deploy
```

Al terminar te muestra la dirección de la app: `https://TU-PROYECTO.web.app`.

## Instalarla en la PC y en el móvil

- **PC (Chrome o Edge):** abre la dirección → icono de instalar en la barra de
  direcciones → **Instalar**.
- **Android (Chrome):** abre la dirección → menú ⋮ → **Instalar app** (o *Añadir a
  pantalla de inicio*).
- **iPhone (Safari):** compartir → **Añadir a pantalla de inicio**.

En cada aparato entra con tu cuenta de Google. Con auriculares la conversación fluye
mejor.

## Actualizar

### Publicación automática (recomendado)

Una sola vez, en tu PC: doble clic en **`Activar publicación automática.cmd`**. Crea en tu
proyecto de Google la cuenta `publicador-github` (solo con permisos para publicar), copia
su llave al portapapeles y abre GitHub: en **Name** escribe `FIREBASE_SERVICE_ACCOUNT`,
pega con Ctrl + V y pulsa **Add secret**.

Desde entonces, cada cambio que se sube al repo se publica solo
(`.github/workflows/publicar.yml`); el avance se ve en la pestaña **Actions** de GitHub.
Para revocar el acceso, borra el secreto en GitHub y la cuenta `publicador-github` en
Google Cloud → IAM → Cuentas de servicio.

### A mano

`git pull` (o bajar el ZIP) y `npm run deploy`, o doble clic en `Instalar y publicar.cmd`.
Las apps instaladas se actualizan solas al volver a abrirlas.

## Configuración opcional (`functions/.env`)

| Variable | Por defecto | Para qué |
|---|---|---|
| `GEMINI_MODEL` | `gemini-3.8-live` | Modelo de Gemini Live |
| `GEMINI_VOZ_FEMENINA` | `Kore` | Voz de Sofía, la coach (puedes oír las voces en AI Studio) |
| `GEMINI_VOZ_MASCULINA` | `Charon` | Voz de Tomás, el coach |
| `SILENCIO_MS` | `1000` | Silencio que espera antes de responder (pausas reflexivas) |

Después de cambiarlas, vuelve a publicar con `npm run deploy`.

## Desarrollo local (sin tocar la nube)

Los emuladores de Firebase necesitan Java instalado.

```bash
cp functions/.env.example functions/.env          # pon tu correo
echo "GEMINI_API_KEY=tu-clave" > functions/.secret.local
npm run emuladores    # compila y levanta todo en http://localhost:5000
npm test              # pruebas de la lógica de niveles
```

En `localhost` la app usa los emuladores automáticamente: el inicio de sesión de
Google es simulado y los datos no salen de tu PC.

- `functions/coach.js`: instrucciones del coach, base de conocimiento, herramientas y
  configuración de voz. **Aquí se ajusta el programa.**
- `functions/progreso.js`: reglas de niveles, evaluaciones y resúmenes.
- `functions/index.js`: funciones en la nube (token de Gemini, guardar progreso).
- `web/`: la app (PWA): inicio de sesión, micrófono, audio, cámara e interfaz.
