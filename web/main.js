import { GoogleGenAI } from '@google/genai';
import { Camara, Microfono, Reproductor } from './audio.js';

const $ = (id) => document.getElementById(id);
const ui = {
  etiquetaNivel: $('etiqueta-nivel'),
  nombreNivel: $('nombre-nivel'),
  progreso: $('progreso'),
  boton: $('boton-principal'),
  textoBoton: $('texto-boton'),
  estado: $('estado'),
  video: $('vista-camara'),
  subtitulos: $('subtitulos'),
  controles: $('controles'),
  silencio: $('boton-silencio'),
  camara: $('boton-camara'),
  verTexto: $('boton-subtitulos'),
  feedback: $('ultimo-feedback'),
  reiniciar: $('boton-reiniciar'),
  dialogoClave: $('dialogo-clave'),
  formularioClave: $('formulario-clave'),
  campoClave: $('campo-clave'),
};

const TEXTO_INICIO = '[Inicio de sesión: saluda en una frase y continúa el programa donde corresponde.]';
const TEXTO_CIERRE = '[La sesión termina ahora: llama a guardar_resumen_sesion y despídete en una frase.]';
const MAX_REINTENTOS = 3;

const reproductor = new Reproductor(() => actualizarEstado());
let microfono = null;
let camara = null;
let sesion = null;
let idConexion = 0;
let manejadorReanudacion = null;
let activa = false;
let conectando = false;
let terminando = false;
let reintentos = 0;
let bloqueoPantalla = null;
let avisarResumenGuardado = null;

// ---------- Servidor ----------

function leerClave() {
  try {
    return localStorage.getItem('clave-coach') ?? '';
  } catch {
    return '';
  }
}

function pedirClave() {
  return new Promise((resolver) => {
    ui.campoClave.value = '';
    ui.formularioClave.onsubmit = () => {
      try {
        localStorage.setItem('clave-coach', ui.campoClave.value);
      } catch {}
    };
    ui.dialogoClave.addEventListener('close', () => resolver(), { once: true });
    ui.dialogoClave.showModal();
  });
}

async function api(ruta, cuerpo) {
  const respuesta = await fetch(ruta, {
    method: cuerpo === undefined ? 'GET' : 'POST',
    headers: { 'content-type': 'application/json', 'x-clave': leerClave() },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  if (respuesta.status === 401) {
    await pedirClave();
    return api(ruta, cuerpo);
  }
  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) throw new Error(datos.error || `Error ${respuesta.status} del servidor`);
  return datos;
}

// ---------- Interfaz ----------

function mostrarProgreso(p) {
  ui.etiquetaNivel.textContent = p.programaCompleto ? 'Programa completo' : `Nivel ${p.nivel} de 3`;
  ui.nombreNivel.textContent = p.programaCompleto ? 'Coherencia integrada' : p.nombreNivel;
  for (const punto of ui.progreso.children) {
    const nivel = Number(punto.dataset.nivel);
    punto.className = p.programaCompleto || nivel < p.nivel ? 'hecho' : nivel === p.nivel ? 'actual' : '';
  }
  const ultima = p.evaluaciones.at(-1);
  ui.feedback.hidden = !ultima;
  if (ultima) {
    ui.feedback.textContent = `Última evaluación (nivel ${ultima.nivel}, ${ultima.puntuacion}/100): ${ultima.feedback}`;
  }
}

function actualizarEstado(mensaje) {
  let estado = 'inactivo';
  let texto = 'Toca para hablar con tu coach';
  if (terminando) [estado, texto] = ['conectando', 'Cerrando la sesión…'];
  else if (conectando) [estado, texto] = ['conectando', 'Conectando…'];
  else if (activa && reproductor.hablando) [estado, texto] = ['hablando', 'Tu coach está hablando. Puedes interrumpirlo.'];
  else if (activa && microfono?.silenciado) [estado, texto] = ['silenciado', 'Micrófono silenciado'];
  else if (activa) [estado, texto] = ['escuchando', 'Te escucho…'];

  ui.boton.dataset.estado = estado;
  ui.textoBoton.textContent = activa ? 'Terminar' : 'Empezar sesión';
  ui.boton.disabled = terminando;
  ui.estado.textContent = mensaje ?? texto;
  ui.controles.hidden = !activa;
}

let ultimoHablante = null;
function agregarSubtitulo(quien, texto) {
  let parrafo = ui.subtitulos.lastElementChild;
  if (quien !== ultimoHablante || !parrafo) {
    parrafo = document.createElement('p');
    parrafo.className = quien;
    const etiqueta = document.createElement('span');
    etiqueta.className = 'quien';
    etiqueta.textContent = quien === 'coach' ? 'Coach: ' : 'Tú: ';
    parrafo.append(etiqueta, document.createTextNode(''));
    ui.subtitulos.append(parrafo);
    while (ui.subtitulos.children.length > 40) ui.subtitulos.firstElementChild.remove();
    ultimoHablante = quien;
  }
  parrafo.lastChild.textContent += texto;
  ui.subtitulos.scrollTop = ui.subtitulos.scrollHeight;
}

// ---------- Herramientas que llama el coach ----------

async function ejecutarHerramienta({ name, args = {} }) {
  switch (name) {
    case 'consultar_progreso': {
      const p = await api('/api/progreso');
      return {
        nivel: p.nivel,
        nombreNivel: p.nombreNivel,
        programaCompleto: p.programaCompleto,
        ultimasEvaluaciones: p.evaluaciones.slice(-3),
      };
    }
    case 'registrar_evaluacion': {
      const { mensaje, progreso } = await api('/api/evaluacion', args);
      mostrarProgreso(progreso);
      return { resultado: mensaje };
    }
    case 'guardar_resumen_sesion': {
      const { mensaje } = await api('/api/resumen', { resumen: args.resumen });
      avisarResumenGuardado?.();
      return { resultado: mensaje };
    }
    default:
      return { error: `Herramienta desconocida: ${name}` };
  }
}

async function atenderLlamadas(llamadas) {
  const functionResponses = await Promise.all(
    llamadas.map(async (llamada) => {
      let response;
      try {
        response = await ejecutarHerramienta(llamada);
      } catch (err) {
        response = { error: err.message };
      }
      return { id: llamada.id, name: llamada.name, response };
    }),
  );
  sesion?.sendToolResponse({ functionResponses });
}

// ---------- Conexión con Gemini Live ----------

function alMensaje(mensaje) {
  reintentos = 0;
  const reanudacion = mensaje.sessionResumptionUpdate;
  if (reanudacion?.resumable && reanudacion.newHandle) manejadorReanudacion = reanudacion.newHandle;

  // El servidor avisa antes de cortar la conexión (duran ~10 min): reconectamos sin perder el hilo.
  if (mensaje.goAway) reconectar();
  if (mensaje.toolCall?.functionCalls?.length) atenderLlamadas(mensaje.toolCall.functionCalls);

  const contenido = mensaje.serverContent;
  if (!contenido) return;
  if (contenido.interrupted) reproductor.cortar();
  for (const parte of contenido.modelTurn?.parts ?? []) {
    if (parte.inlineData?.data && parte.inlineData.mimeType?.startsWith('audio/')) {
      reproductor.reproducir(parte.inlineData.data);
    }
  }
  if (contenido.inputTranscription?.text) agregarSubtitulo('usuario', contenido.inputTranscription.text);
  if (contenido.outputTranscription?.text) agregarSubtitulo('coach', contenido.outputTranscription.text);
}

async function conectar() {
  const { token, modelo, config } = await api('/api/sesion', {});
  const ai = new GoogleGenAI({ apiKey: token, httpOptions: { apiVersion: 'v1alpha' } });
  const mia = ++idConexion;
  const nueva = await ai.live.connect({
    model: modelo,
    config: {
      ...config,
      sessionResumption: manejadorReanudacion ? { handle: manejadorReanudacion } : {},
    },
    callbacks: {
      onmessage: (m) => mia === idConexion && alMensaje(m),
      onerror: (e) => mia === idConexion && console.error('Error de Gemini Live:', e),
      onclose: (e) => mia === idConexion && alCerrar(e),
    },
  });
  if (mia !== idConexion) {
    // La sesión terminó mientras conectábamos.
    nueva.close();
    return false;
  }
  sesion = nueva;
  return true;
}

async function reconectar() {
  if (!activa || terminando || conectando) return;
  idConexion++; // invalida los eventos de la conexión anterior
  const anterior = sesion;
  sesion = null;
  try {
    anterior?.close();
  } catch {}

  conectando = true;
  actualizarEstado('Reconectando…');
  try {
    await conectar();
  } catch (err) {
    console.error(err);
    if (++reintentos <= MAX_REINTENTOS) {
      conectando = false;
      setTimeout(reconectar, 1000 * reintentos);
      return;
    }
    finalizar(`Se perdió la conexión: ${err.message}`);
    return;
  }
  conectando = false;
  actualizarEstado();
}

function alCerrar(evento) {
  sesion = null;
  if (!activa || terminando) return;
  if (manejadorReanudacion && reintentos < MAX_REINTENTOS) {
    reintentos++;
    reconectar();
  } else {
    finalizar(evento?.reason ? `La sesión se cerró: ${evento.reason}` : 'La sesión se cerró.');
  }
}

// ---------- Ciclo de la sesión ----------

async function iniciar() {
  if (!navigator.mediaDevices?.getUserMedia) {
    actualizarEstado('El micrófono solo funciona con https:// o en localhost.');
    return;
  }
  activa = true;
  conectando = true;
  reintentos = 0;
  manejadorReanudacion = null;
  ui.subtitulos.replaceChildren();
  ultimoHablante = null;
  actualizarEstado();

  try {
    await reproductor.preparar();
    microfono = new Microfono((datos) =>
      sesion?.sendRealtimeInput({ audio: { data: datos, mimeType: 'audio/pcm;rate=16000' } }),
    );
    await microfono.iniciar();
    if (!(await conectar())) return;
  } catch (err) {
    console.error(err);
    const mensaje =
      err.name === 'NotAllowedError'
        ? 'Necesito permiso para usar el micrófono.'
        : `No se pudo iniciar: ${err.message}`;
    finalizar(mensaje);
    return;
  }

  conectando = false;
  try {
    bloqueoPantalla = await navigator.wakeLock?.request('screen');
  } catch {}
  sesion.sendClientContent({ turns: [{ role: 'user', parts: [{ text: TEXTO_INICIO }] }], turnComplete: true });
  actualizarEstado();
}

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

async function terminar() {
  if (!sesion) {
    finalizar();
    return;
  }
  terminando = true;
  actualizarEstado();
  microfono.silenciado = true;
  const resumenGuardado = new Promise((r) => (avisarResumenGuardado = r));
  sesion.sendClientContent({ turns: [{ role: 'user', parts: [{ text: TEXTO_CIERRE }] }], turnComplete: true });

  await Promise.race([resumenGuardado, esperar(10000)]);
  // Deja que termine la despedida, con un límite.
  for (let i = 0; i < 40 && (reproductor.hablando || i < 6); i++) await esperar(250);
  finalizar('Sesión guardada. ¡Hasta la próxima!');
}

function finalizar(mensaje) {
  activa = false;
  conectando = false;
  terminando = false;
  avisarResumenGuardado = null;
  idConexion++;
  try {
    sesion?.close();
  } catch {}
  sesion = null;
  microfono?.detener();
  microfono = null;
  apagarCamara();
  reproductor.cortar();
  bloqueoPantalla?.release().catch(() => {});
  bloqueoPantalla = null;
  ui.silencio.setAttribute('aria-pressed', 'false');
  ui.silencio.textContent = 'Silenciar micrófono';
  actualizarEstado(mensaje);
}

// ---------- Controles ----------

function apagarCamara() {
  camara?.detener();
  camara = null;
  ui.video.hidden = true;
  ui.camara.setAttribute('aria-pressed', 'false');
  ui.camara.textContent = 'Activar cámara';
}

ui.boton.addEventListener('click', () => (activa ? terminar() : iniciar()));

ui.silencio.addEventListener('click', () => {
  if (!microfono) return;
  microfono.silenciado = !microfono.silenciado;
  if (microfono.silenciado) sesion?.sendRealtimeInput({ audioStreamEnd: true });
  ui.silencio.setAttribute('aria-pressed', String(microfono.silenciado));
  ui.silencio.textContent = microfono.silenciado ? 'Activar micrófono' : 'Silenciar micrófono';
  actualizarEstado();
});

ui.camara.addEventListener('click', async () => {
  if (camara) {
    apagarCamara();
    return;
  }
  camara = new Camara(ui.video, (datos) =>
    sesion?.sendRealtimeInput({ video: { data: datos, mimeType: 'image/jpeg' } }),
  );
  try {
    ui.video.hidden = false;
    await camara.iniciar();
    ui.camara.setAttribute('aria-pressed', 'true');
    ui.camara.textContent = 'Apagar cámara';
  } catch (err) {
    apagarCamara();
    actualizarEstado(err.name === 'NotAllowedError' ? 'Necesito permiso para usar la cámara.' : err.message);
  }
});

ui.verTexto.addEventListener('click', () => {
  ui.subtitulos.hidden = !ui.subtitulos.hidden;
  ui.verTexto.setAttribute('aria-pressed', String(!ui.subtitulos.hidden));
  ui.verTexto.textContent = ui.subtitulos.hidden ? 'Ver texto' : 'Ocultar texto';
});

ui.reiniciar.addEventListener('click', async () => {
  if (activa) return;
  if (!confirm('¿Borrar tu progreso y volver al Nivel 1?')) return;
  try {
    mostrarProgreso(await api('/api/reiniciar', {}));
    actualizarEstado('Programa reiniciado.');
  } catch (err) {
    actualizarEstado(err.message);
  }
});

// ---------- Arranque ----------

actualizarEstado();
api('/api/progreso')
  .then(mostrarProgreso)
  .catch((err) => actualizarEstado(`No pude leer tu progreso: ${err.message}`));

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}
