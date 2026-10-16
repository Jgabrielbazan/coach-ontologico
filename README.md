# Coach Ontológico

App personal de coaching ontológico **por voz en tiempo real**. La misma app funciona
en la PC y en el móvil, cada una por su cuenta. Entras con tu cuenta de Google y
**comparten el progreso**: si avanzas en el móvil, la PC lo muestra al instante.

| Nivel | Nombre | Qué se trabaja |
|---|---|---|
| 1 | El Observador Inicial | Hechos (afirmaciones) vs. juicios |
| 2 | El Diseñador de Realidades | Actos lingüísticos y declaraciones |
| 3 | El Maestro de la Coherencia Corporal | Lenguaje, emoción y cuerpo (con cámara opcional) |

## Qué incluye

- **Programa de 5 niveles y 26 lecciones que se recorren en semanas** (`functions/programa.js`):
  1 El observador (hechos, juicios y juicios sobre uno mismo) · 2 Declaraciones (el "no",
  el perdón, el compromiso) · 3 Coherencia corporal (cuerpo, voz, miedo y vergüenza) ·
  4 Pedidos, ofertas y promesas · 5 Escucha y conversaciones difíciles.
  - Una lección nueva por día como máximo; el resto de la sesión se profundiza y practica.
  - La evaluación integradora de cada nivel se habilita recién con todas las lecciones y
    2 prácticas en la vida real con su reflexión; tras un intento no aprobado, se reintenta
    otro día. Lo controla el servidor, no el modelo.
- **Perfil psicológico:** en la lección 1.1 el coach hace una entrevista inicial (motivo,
  miedos, creencias, fortalezas, patrones, contexto) y la usa para personalizar todo. Se ve
  en la app y se puede borrar. El coach trabaja con principios informados en trauma,
  exposición gradual, autocompasión y reestructuración de juicios, con límites éticos y
  derivación profesional cuando hace falta (`functions/psicologia.js`).
- **Metodología del manual técnico de coaching ontológico para agentes de IA:** valores
  éticos (FICOP/ICF), acciones obligatorias y prohibidas, Regla de oro, levedad, kairos,
  preguntas internas y externas, OSAR con tres órdenes de aprendizaje, enemigos del
  aprendizaje, protocolo PEDAF, reclamo productivo, matriz de estados de ánimo, disposiciones
  corporales y protocolo de derivación clínica paso a paso (con líneas de ayuda en la app).
- **Cámara que mira de verdad:** al activarla el coach dice qué ve; el botón «Mirá mi postura»
  pide una devolución corporal en cualquier momento.
- **Práctica libre:** ensayas una situación real y el coach hace de la otra persona
  (di "pausa" para pedir una indicación).
- **Coach con oficio:** contrato de sesión, preguntas poderosas, distinciones de la
  ontología del lenguaje. Dos perfiles: Sofía y Tomás.
- **Tareas entre sesiones:** el coach deja una práctica, anotas cómo te fue y la retoma.
- **Varias personas:** quien figura en `EMAIL_PERMITIDO` es el administrador; desde
  Ajustes → «Usuarios y límites de uso» invita otras cuentas de Google, cada una con su
  progreso y su límite de minutos por mes (`LIMITE_INVITADO_MIN`, 120 por defecto). El panel
  muestra el uso de cada persona, nunca sus conversaciones ni su perfil.
- **Tu avatar:** seis animalitos (gatita, coneja y leona; osito, lobo y tigre), tiernos o
  rudos. Lo eliges al entrar por primera vez, te saluda en cada inicio y se cambia tocándolo.
- **Tu progreso:** barra del programa por niveles, que avanza también con los criterios
  logrados en tu último intento. Las tarjetas de sesión, evaluación y uso son plegables.
- **Cómo te habla el coach:** cada persona elige femenino, masculino o neutro (al elegir el
  avatar o en Ajustes). Si no lo eligió, el coach usa formas neutras y se lo pregunta; nunca
  lo deduce de la voz ni del nombre.
- **Tu propósito:** el coach te ayuda a declarar para qué haces el programa (o lo escribes
  tú); lo retoma en los momentos clave y aparece en tus certificados.
- **Tu semana:** los días que practicaste (sesión de al menos 1 minuto o reflexión de la
  tarea), con mensajes amables: nunca castiga los días sin práctica.
- **Tu evolución:** el coach guarda frases tuyas textuales (punto de partida y avances) y
  la app muestra el "antes" frente al "ahora", con toda la línea de tiempo.
- **Reconocimiento:** al empezar y al cerrar, el coach nombra un avance concreto que notó,
  comparando con tus propias palabras (sin elogios genéricos ni inventados).
- **Ceremonia de nivel:** al aprobar, el coach hace un cierre emotivo del recorrido, la esfera
  celebra y recibes un certificado con tus frases destacadas, para descargar o compartir.
- **Recordatorio diario** por notificación (en iPhone, con la app instalada).
- **Control de gasto:** minutos y costo estimado del mes, límite por sesión
  (`LIMITE_SESION_MIN`) y por mes (`LIMITE_MENSUAL_MIN`) en `functions/.env.agent-ontologico`.
- **Manos libres o "mantener para hablar"** (botón o barra espaciadora), selector de
  micrófono, chat escrito, modo día/noche.

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

- **PC (Chrome o Edge):** botón **Instalar en esta PC** de la app, o el icono de instalar en la barra de
  direcciones → **Instalar**.
- **Android (Chrome):** abre la dirección → menú ⋮ → **Instalar app** (o *Añadir a
  pantalla de inicio*).
- **iPhone (Safari):** compartir → **Añadir a pantalla de inicio**.

En cada aparato entra con tu cuenta de Google. Con auriculares la conversación fluye
mejor.

## Actualizar

### Publicación automática (recomendado)

Una sola vez, en tu PC: doble clic en **`Activar publicación automática.cmd`**. Crea en tu
proyecto de Google la cuenta `publicador-github` (solo con permisos para publicar) y guarda
su llave, cifrada, como secreto `FIREBASE_SERVICE_ACCOUNT` del repo: solo hay que autorizar
"Firebase CLI" en GitHub cuando se abre el navegador. Si eso fallara, abre la llave en el Bloc
de notas y GitHub para pegarla a mano, y la borra al terminar.

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
| `DIALOGO_AFECTIVO` | `true` | Que el coach perciba el tono (risa, ironía, cansancio) y adapte su respuesta |

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
