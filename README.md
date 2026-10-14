# Coach Ontológico

App personal de coaching ontológico **por voz en tiempo real**, para PC y móvil.
Hablas con el coach como en una llamada: te enseña un concepto por vez, te pone
ejercicios y te evalúa en tres niveles. Tu progreso queda guardado entre sesiones.

| Nivel | Nombre | Qué se trabaja |
|---|---|---|
| 1 | El Observador Inicial | Hechos (afirmaciones) vs. juicios |
| 2 | El Diseñador de Realidades | Actos lingüísticos y declaraciones |
| 3 | El Maestro de la Coherencia Corporal | Lenguaje, emoción y cuerpo (con cámara opcional) |

## Cómo funciona

- **Voz:** Gemini Live (Google), conversación de voz a voz con baja latencia. Puedes
  interrumpir al coach mientras habla.
- **Tu clave de Google nunca llega al navegador:** el servidor crea un token temporal
  de un solo uso para cada sesión.
- **Progreso:** se guarda en `data/progreso.json` en tu PC. Es el **servidor** quien
  decide si subes de nivel (aprobado + puntuación mínima de 70), no el modelo solo.
- **Memoria:** al terminar cada sesión el coach guarda un resumen, y la siguiente vez
  retoma desde ahí.
- **Cámara (nivel 3):** manda una foto por segundo para que el coach vea tu postura.

## Puesta en marcha (en tu PC)

Necesitas **Node.js 22 o superior** ([nodejs.org](https://nodejs.org)).

```bash
git clone https://github.com/Jgabrielbazan/coach-ontologico.git
cd coach-ontologico
npm install
```

Copia `.env.example` como `.env` y pon tu clave de Google AI Studio
([aistudio.google.com/apikey](https://aistudio.google.com/apikey)):

```
GEMINI_API_KEY=tu-clave
APP_PASSWORD=una-contraseña
```

Después:

```bash
npm run build
npm start
```

Abre **http://localhost:3000** en Chrome o Edge, toca **Empezar sesión** y permite el
micrófono. Con auriculares la conversación fluye mejor (evitas que el coach se
escuche a sí mismo).

## Usarla desde el móvil

El navegador solo permite el micrófono en páginas **https** (o en `localhost`).
La forma más simple es un túnel seguro gratuito de Cloudflare, con la app corriendo
en tu PC:

```bash
npx cloudflared tunnel --url http://localhost:3000
```

Te dará una dirección `https://…trycloudflare.com`. Ábrela en el móvil, entra con tu
`APP_PASSWORD` y, desde el menú del navegador, elige **Añadir a pantalla de inicio**
para tenerla como app. **Pon siempre `APP_PASSWORD`** antes de abrir el túnel: la
dirección es pública.

Tu progreso sigue guardado en el PC, así que es el mismo desde los dos dispositivos.
La dirección del túnel cambia cada vez que lo abres; para una fija hace falta una
cuenta de Cloudflare o publicar la app en un hosting.

## Configuración opcional (`.env`)

| Variable | Por defecto | Para qué |
|---|---|---|
| `PORT` | `3000` | Puerto del servidor |
| `GEMINI_MODEL` | `gemini-3.8-live` | Modelo de Gemini Live |
| `GEMINI_VOICE` | `Kore` | Voz del coach (puedes oír las voces en AI Studio) |
| `SILENCIO_MS` | `1500` | Silencio que espera antes de responder (pausas reflexivas) |

## Desarrollo

```bash
npm run dev:server   # servidor con recarga automática (puerto 3000)
npm run dev          # interfaz con Vite (puerto 5173), redirige /api al servidor
npm test             # pruebas de la lógica de niveles
```

- `server/coach.js`: instrucciones del coach, base de conocimiento, herramientas y
  configuración de voz. **Aquí se ajusta el programa.**
- `server/progreso.js`: niveles, evaluaciones y resúmenes.
- `web/`: la app (PWA): micrófono, audio, cámara e interfaz.

Para empezar de cero: botón **Reiniciar programa** en la app, o borra `data/progreso.json`.
