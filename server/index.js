import { timingSafeEqual } from 'node:crypto';
import { existsSync } from 'node:fs';
import path from 'node:path';
import express from 'express';
import { GoogleGenAI } from '@google/genai';
import { configuracionLive, NIVELES } from './coach.js';
import {
  cargarProgreso,
  guardarResumenSesion,
  registrarEvaluacion,
  reiniciarProgreso,
} from './progreso.js';

const PUERTO = Number(process.env.PORT) || 3000;
const MODELO = process.env.GEMINI_MODEL || 'gemini-3.8-live';
const CLAVE_APP = process.env.APP_PASSWORD || '';
const CARPETA_WEB = path.join(import.meta.dirname, '..', 'dist');

const app = express();
app.use(express.json({ limit: '100kb' }));

function claveCorrecta(recibida) {
  const a = Buffer.from(String(recibida ?? ''));
  const b = Buffer.from(CLAVE_APP);
  return a.length === b.length && timingSafeEqual(a, b);
}

app.use('/api', (req, res, next) => {
  if (CLAVE_APP && !claveCorrecta(req.get('x-clave'))) {
    return res.status(401).json({ error: 'Contraseña incorrecta.' });
  }
  next();
});

// Los errores del SDK traen el JSON completo de Google; nos quedamos con el texto.
function mensajeDeGemini(err) {
  try {
    return JSON.parse(err.message).error?.message ?? err.message;
  } catch {
    return err.message;
  }
}

function vistaProgreso(progreso) {
  return { ...progreso, nombreNivel: NIVELES[progreso.nivel] };
}

// Crea un token temporal de un solo uso para que el navegador hable directo con
// Gemini Live sin conocer la clave real. Devuelve también la configuración de
// la sesión, armada con el progreso actual del usuario.
app.post('/api/sesion', async (req, res) => {
  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Falta GEMINI_API_KEY en el archivo .env del servidor.' });
  }
  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: { apiVersion: 'v1alpha' },
    });
    const ahora = Date.now();
    const token = await ai.authTokens.create({
      config: {
        uses: 1,
        expireTime: new Date(ahora + 30 * 60 * 1000).toISOString(),
        newSessionExpireTime: new Date(ahora + 60 * 1000).toISOString(),
        httpOptions: { apiVersion: 'v1alpha' },
      },
    });
    const progreso = await cargarProgreso();
    res.json({ token: token.name, modelo: MODELO, config: configuracionLive(progreso) });
  } catch (err) {
    console.error('Error creando el token de Gemini:', err);
    res.status(502).json({ error: `Gemini rechazó la solicitud: ${mensajeDeGemini(err)}` });
  }
});

app.get('/api/progreso', async (_req, res) => {
  res.json(vistaProgreso(await cargarProgreso()));
});

app.post('/api/evaluacion', async (req, res) => {
  const { progreso, mensaje } = await registrarEvaluacion(req.body ?? {});
  res.json({ mensaje, progreso: vistaProgreso(progreso) });
});

app.post('/api/resumen', async (req, res) => {
  const { progreso, mensaje } = await guardarResumenSesion(req.body?.resumen);
  res.json({ mensaje, progreso: vistaProgreso(progreso) });
});

app.post('/api/reiniciar', async (_req, res) => {
  res.json(vistaProgreso(await reiniciarProgreso()));
});

app.use('/api', (_req, res) => res.status(404).json({ error: 'Ruta no encontrada.' }));

if (existsSync(CARPETA_WEB)) {
  app.use(express.static(CARPETA_WEB));
  app.get('/{*ruta}', (_req, res) => res.sendFile(path.join(CARPETA_WEB, 'index.html')));
} else {
  app.get('/', (_req, res) =>
    res.type('text').send('Falta compilar la app: ejecutá "npm run build" y reiniciá el servidor.'),
  );
}

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor.' });
});

app.listen(PUERTO, () => {
  console.log(`Coach Ontológico listo en http://localhost:${PUERTO}`);
  if (!process.env.GEMINI_API_KEY) console.warn('Aviso: falta GEMINI_API_KEY en .env');
  if (!CLAVE_APP) console.warn('Aviso: sin APP_PASSWORD. No expongas la app fuera de tu PC así.');
});
