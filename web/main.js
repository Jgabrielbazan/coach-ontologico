import { GoogleGenAI } from '@google/genai';
import { Camara, Microfono, Reproductor, listarMicrofonos } from './audio.js';
import { Orbe } from './orbe.js';
import { alCambiarUsuario, entrarConGoogle, escucharProgreso, iniciarFirebase, llamar, salir } from './firebase.js';

const $ = (id) => document.getElementById(id);
const ui = {
  etiquetaNivel: $('etiqueta-nivel'),
  nombreNivel: $('nombre-nivel'),
  niveles: $('niveles'),
  boton: $('boton-principal'),
  textoBoton: $('texto-boton'),
  estado: $('estado'),
  video: $('vista-camara'),
  subtitulos: $('subtitulos'),
  activarRecordatorio: $('activar-recordatorio'),
  horaRecordatorio: $('hora-recordatorio'),
  probarRecordatorio: $('probar-recordatorio'),
  notaRecordatorio: $('nota-recordatorio'),
  selectorForma: $('selector-forma'),
  botonHablar: $('boton-hablar'),
  textoHablar: $('texto-hablar'),
  resultadoEvaluacion: $('resultado-evaluacion'),
  criteriosEvaluacion: $('criterios-evaluacion'),
  historialEvaluaciones: $('historial-evaluaciones'),
  listaEvaluaciones: $('lista-evaluaciones'),
  costoUso: $('costo-uso'),
  barraUso: $('barra-uso'),
  textoUso: $('texto-uso'),
  tarjetaTarea: $('tarjeta-tarea'),
  textoTarea: $('texto-tarea'),
  fechaTarea: $('fecha-tarea'),
  formularioReflexion: $('formulario-reflexion'),
  campoReflexion: $('campo-reflexion'),
  reflexionGuardada: $('reflexion-guardada'),
  opcionesModo: document.querySelectorAll('.opcion-modo'),
  panelPractica: $('panel-practica'),
  campoSituacion: $('campo-situacion'),
  sugerencias: document.querySelectorAll('.sugerencia'),
  conversacion: $('conversacion'),
  formularioMensaje: $('formulario-mensaje'),
  campoMensaje: $('campo-mensaje'),
  controles: $('controles'),
  silencio: $('boton-silencio'),
  camara: $('boton-camara'),
  verTexto: $('boton-subtitulos'),
  tarjetaFeedback: $('tarjeta-feedback'),
  feedback: $('ultimo-feedback'),
  puntajeFeedback: $('puntaje-feedback'),
  tarjetaSesion: $('tarjeta-sesion'),
  ultimaSesion: $('ultima-sesion'),
  fechaSesion: $('fecha-sesion'),
  reiniciar: $('boton-reiniciar'),
  pantallaEntrar: $('pantalla-entrar'),
  pantallaCoach: $('pantalla-coach'),
  botonEntrar: $('boton-entrar'),
  errorEntrar: $('error-entrar'),
  cuenta: $('cuenta'),
  salir: $('boton-salir'),
  opcionesCoach: document.querySelectorAll('.opcion-coach'),
  selectorMicrofono: $('selector-microfono'),
  medidor: $('medidor'),
  medidorBarra: $('medidor-barra'),
};

const NOMBRES_COACH = { femenino: 'Sofía', masculino: 'Tomás' };

const NIVELES = {
  1: 'El Observador Inicial',
  2: 'El Diseñador de Realidades',
  3: 'El Maestro de la Coherencia Corporal',
};
const PROGRESO_INICIAL = { nivel: 1, programaCompleto: false, evaluaciones: [], sesiones: [], tareas: [], coach: 'femenino' };

const TEXTO_INICIO = {
  programa: '[Inicio de sesión: saluda en una frase y continúa el programa donde corresponde.]',
  practica: '[Inicio de práctica libre: saluda en una frase y empieza con tus preguntas de contexto sobre la situación.]',
};
const TEXTO_CIERRE =
  '[La sesión termina ahora: llama a asignar_tarea, luego a guardar_resumen_sesion, y despídete en una frase.]';
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
let recibioMensaje = false; // si la conexión actual ya respondió algo
let sinAfectivo = false; // red de seguridad: sesión sin diálogo afectivo si Gemini lo rechazara
let bloqueoPantalla = null;
let avisarResumenGuardado = null;
let progresoActual = PROGRESO_INICIAL;
let dejarDeEscuchar = null;
let estadoVisual = 'inactivo';
let hablaManual = leerTexto('forma-hablar') === 'manual'; // "mantener para hablar"
let sesionManual = false; // la forma de hablar de la sesión en curso
let apretado = false;
// Costo estimado de Gemini Live por minuto de sesión: tu voz (0,005 USD/min, todo
// el tiempo) + la del coach (0,018 USD/min, ~40 % del tiempo) + margen de contexto.
const COSTO_POR_MINUTO_USD = 0.02;
let limites = { sesionMin: 30, mensualMin: leerNumero('limite-mensual', 600) };
let inicioSesion = null; // marca de tiempo cuando la sesión quedó conectada
let temporizador = null;
let modo = 'programa'; // 'programa' o 'practica'
let situacionActiva = ''; // la situación de la práctica en curso
let diagnostico = null; // intervalo que vigila si tu voz llega al coach
let avisoMicrofono = '';

new Orbe($('orbe-entrar'), { obtenerEstado: () => 'inactivo' });
new Orbe($('orbe-coach'), {
  obtenerEstado: () => estadoVisual,
  obtenerNivel: () => (estadoVisual === 'hablando' ? reproductor.nivel() : (microfono?.nivel() ?? 0)),
});

const fechaCorta = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short' });

// Los botones de control tienen icono + texto: solo cambiamos el texto.
function ponerTexto(boton, texto) {
  boton.querySelector('span').textContent = texto;
}

// ---------- Interfaz ----------

function mostrarProgreso(datos) {
  const p = { ...PROGRESO_INICIAL, ...(datos ?? {}) };
  progresoActual = p;
  for (const opcion of ui.opcionesCoach) {
    opcion.setAttribute('aria-checked', String(opcion.dataset.coach === p.coach));
  }
  ui.etiquetaNivel.textContent = p.programaCompleto ? 'Programa completo' : `Nivel ${p.nivel} de 3`;
  ui.nombreNivel.textContent = p.programaCompleto ? 'Coherencia integrada' : NIVELES[p.nivel];
  actualizarEncabezado();
  for (const item of ui.niveles.children) {
    const nivel = Number(item.dataset.nivel);
    item.className = p.programaCompleto || nivel < p.nivel ? 'hecho' : nivel === p.nivel ? 'actual' : '';
    item.toggleAttribute('aria-current', !p.programaCompleto && nivel === p.nivel);
  }

  const ultima = p.evaluaciones.at(-1);
  ui.tarjetaFeedback.hidden = !ultima;
  if (ultima) {
    ui.feedback.textContent = ultima.feedback;
    ui.puntajeFeedback.textContent = `${ultima.puntuacion}/100`;
    ui.resultadoEvaluacion.textContent = `Nivel ${ultima.nivel} · ${ultima.aprobado ? 'Aprobada' : 'Aún no aprobada'}`;
    ui.resultadoEvaluacion.classList.toggle('aprobada', ultima.aprobado);
    // Cada criterio con ✓ o ✗ y la evidencia que dio el coach.
    ui.criteriosEvaluacion.replaceChildren(
      ...(ultima.criterios ?? []).map((c) => {
        const item = document.createElement('li');
        item.className = c.cumplido ? 'cumplido' : 'pendiente';
        const texto = document.createElement('span');
        texto.textContent = c.texto;
        item.append(texto);
        if (c.evidencia) {
          const evidencia = document.createElement('small');
          evidencia.textContent = c.evidencia;
          item.append(evidencia);
        }
        return item;
      }),
    );
  }
  ui.historialEvaluaciones.hidden = p.evaluaciones.length < 2;
  ui.listaEvaluaciones.replaceChildren(
    ...p.evaluaciones
      .slice()
      .reverse()
      .map((e) => {
        const item = document.createElement('li');
        const fecha = e.fecha ? fechaCorta.format(new Date(e.fecha)) : '';
        item.textContent = `${fecha} · Nivel ${e.nivel} · ${e.puntuacion}/100 · ${e.aprobado ? 'aprobada' : 'no aprobada'}`;
        return item;
      }),
  );

  const tarea = p.tareas.at(-1);
  ui.tarjetaTarea.hidden = !tarea;
  if (tarea) {
    ui.textoTarea.textContent = tarea.texto;
    ui.fechaTarea.textContent = fechaCorta.format(new Date(tarea.fecha));
    ui.formularioReflexion.dataset.id = tarea.id;
    ui.formularioReflexion.hidden = Boolean(tarea.reflexion);
    ui.reflexionGuardada.hidden = !tarea.reflexion;
    ui.reflexionGuardada.textContent = tarea.reflexion ? `✓ ${tarea.reflexion}` : '';
  }

  mostrarUso(p);
  if (p.recordatorio?.hora !== undefined && document.activeElement !== ui.horaRecordatorio) {
    ui.horaRecordatorio.value = String(p.recordatorio.hora);
  }

  const sesion = p.sesiones.at(-1);
  ui.tarjetaSesion.hidden = !sesion;
  if (sesion) {
    const prefijo = sesion.tipo === 'practica' ? `Práctica: ${sesion.situacion}. ` : '';
    ui.ultimaSesion.textContent = prefijo + sesion.resumen;
    ui.fechaSesion.textContent = fechaCorta.format(new Date(sesion.fecha));
  }
}

function leerTexto(clave) {
  try {
    return localStorage.getItem(clave) ?? '';
  } catch {
    return '';
  }
}

function leerNumero(clave, porDefecto) {
  try {
    return Number(localStorage.getItem(clave)) || porDefecto;
  } catch {
    return porDefecto;
  }
}

const dinero = new Intl.NumberFormat('es', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

/** Minutos del mes en curso y costo estimado, con barra hacia el límite mensual. */
function mostrarUso(p) {
  const mes = new Date().toISOString().slice(0, 7);
  const segundos = p.uso?.mes === mes ? p.uso.segundos : 0;
  const minutos = Math.round(segundos / 60);
  const proporcion = Math.min(1, minutos / limites.mensualMin);
  ui.costoUso.textContent = `≈ ${dinero.format(minutos * COSTO_POR_MINUTO_USD)}`;
  ui.barraUso.style.transform = `scaleX(${proporcion})`;
  ui.barraUso.parentElement.classList.toggle('cerca-del-limite', proporcion >= 0.8);
  ui.textoUso.textContent = `${minutos} de ${limites.mensualMin} min · ${p.uso?.mes === mes ? p.uso.sesiones : 0} sesiones (costo estimado)`;
}

/** El encabezado muestra el nivel en el programa, o la situación en la práctica libre. */
function actualizarEncabezado() {
  if (modo !== 'practica') {
    const p = progresoActual;
    ui.etiquetaNivel.textContent = p.programaCompleto ? 'Programa completo' : `Nivel ${p.nivel} de 3`;
    ui.nombreNivel.textContent = p.programaCompleto ? 'Coherencia integrada' : NIVELES[p.nivel];
    return;
  }
  ui.etiquetaNivel.textContent = 'Práctica libre';
  ui.nombreNivel.textContent = activa && situacionActiva ? situacionActiva : 'Ensaya una situación real';
}

function elegirModo(nuevo) {
  if (activa) return;
  modo = nuevo;
  for (const opcion of ui.opcionesModo) opcion.setAttribute('aria-selected', String(opcion.dataset.modo === modo));
  try {
    localStorage.setItem('modo', modo);
  } catch {}
  actualizarEncabezado();
  actualizarEstado();
}

for (const opcion of ui.opcionesModo) opcion.addEventListener('click', () => elegirModo(opcion.dataset.modo));
for (const sugerencia of ui.sugerencias) {
  sugerencia.addEventListener('click', () => {
    ui.campoSituacion.value = sugerencia.textContent;
    ui.campoSituacion.focus();
  });
}

function actualizarEstado(mensaje) {
  let estado = 'inactivo';
  let texto = 'Toca el orbe para hablar con tu coach';
  if (terminando) [estado, texto] = ['conectando', 'Cerrando la sesión…'];
  else if (conectando) [estado, texto] = ['conectando', 'Conectando…'];
  else if (activa && reproductor.hablando)
    [estado, texto] = ['hablando', `${NOMBRES_COACH[progresoActual.coach] ?? 'Tu coach'} está hablando. Puedes interrumpirlo.`];
  else if (activa && microfono?.silenciado && !sesionManual) [estado, texto] = ['silenciado', 'Micrófono silenciado'];
  else if (activa && sesionManual && !apretado)
    [estado, texto] = ['inactivo', 'Mantén apretado el botón (o la barra espaciadora) para hablar'];
  else if (activa) [estado, texto] = ['escuchando', avisoMicrofono || 'Te escucho…'];

  estadoVisual = estado;
  ui.boton.dataset.estado = estado;
  ui.textoBoton.textContent = activa ? 'Terminar' : 'Empezar sesión';
  ui.boton.disabled = terminando;
  ui.estado.textContent = mensaje ?? texto;
  ui.controles.hidden = !activa;
  ui.medidor.hidden = !activa;
  ui.botonHablar.hidden = !activa || conectando || !sesionManual;
  ui.silencio.hidden = sesionManual;
  ui.selectorForma.disabled = activa;
  ui.panelPractica.hidden = activa || modo !== 'practica';
  for (const opcion of ui.opcionesModo) opcion.disabled = activa;
  for (const opcion of ui.opcionesCoach) opcion.disabled = activa;
}

let ultimoHablante = null;
/** Agrega texto a la conversación: se suma a la burbuja actual si sigue hablando el mismo. */
function agregarSubtitulo(quien, texto, { nuevaBurbuja = false } = {}) {
  let burbuja = ui.subtitulos.lastElementChild;
  if (quien !== ultimoHablante || !burbuja || nuevaBurbuja) {
    burbuja = document.createElement('div');
    burbuja.className = `mensaje mensaje-${quien}`;
    const etiqueta = document.createElement('span');
    etiqueta.className = 'mensaje-quien';
    etiqueta.textContent = quien === 'coach' ? (NOMBRES_COACH[progresoActual.coach] ?? 'Coach') : 'Tú';
    const contenido = document.createElement('p');
    burbuja.append(etiqueta, contenido);
    ui.subtitulos.append(burbuja);
    while (ui.subtitulos.children.length > 60) ui.subtitulos.firstElementChild.remove();
    ultimoHablante = quien;
  }
  burbuja.lastChild.textContent += texto;
  ui.subtitulos.scrollTop = ui.subtitulos.scrollHeight;
}

// Anotar cómo te fue con la tarea: el coach lo lee al empezar la próxima sesión.
ui.formularioReflexion.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const reflexion = ui.campoReflexion.value.trim();
  if (!reflexion) return;
  const boton = ui.formularioReflexion.querySelector('button');
  boton.disabled = true;
  try {
    await llamar('registrarReflexion', { id: ui.formularioReflexion.dataset.id, reflexion });
    ui.campoReflexion.value = '';
  } catch (err) {
    actualizarEstado(`No pude guardar tu reflexión: ${err.message}`);
  } finally {
    boton.disabled = false;
  }
});

// Escribirle al coach: responde por voz igual que si le hablaras.
ui.formularioMensaje.addEventListener('submit', (evento) => {
  evento.preventDefault();
  const texto = ui.campoMensaje.value.trim();
  if (!texto) return;
  if (!sesion) {
    actualizarEstado('Empieza una sesión para escribirle a tu coach.');
    return;
  }
  agregarSubtitulo('usuario', texto, { nuevaBurbuja: true });
  ultimoHablante = null; // lo próximo que llegue (voz o respuesta) va en otra burbuja
  reproductor.cortar();
  sesion.sendClientContent({ turns: [{ role: 'user', parts: [{ text: texto }] }], turnComplete: true });
  ui.campoMensaje.value = '';
});

// ---------- Herramientas que llama el coach ----------

async function ejecutarHerramienta({ name, args = {} }) {
  switch (name) {
    case 'consultar_progreso': {
      const p = progresoActual;
      return {
        nivel: p.nivel,
        nombreNivel: NIVELES[p.nivel],
        programaCompleto: p.programaCompleto,
        ultimasEvaluaciones: p.evaluaciones.slice(-3),
      };
    }
    case 'registrar_evaluacion': {
      const { mensaje } = await llamar('registrarEvaluacion', args);
      return { resultado: mensaje };
    }
    case 'asignar_tarea': {
      const { mensaje } = await llamar('asignarTarea', { tarea: args.tarea });
      return { resultado: mensaje };
    }
    case 'guardar_resumen_sesion': {
      const { mensaje } = await llamar('guardarResumen', {
        resumen: args.resumen,
        tipo: modo,
        situacion: situacionActiva,
      });
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
  recibioMensaje = true;
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
  if (contenido.inputTranscription?.text) {
    agregarSubtitulo('usuario', contenido.inputTranscription.text);
    if (diagnostico) diagnostico.vozRecibida = true;
    if (avisoMicrofono) {
      avisoMicrofono = '';
      actualizarEstado();
    }
  }
  if (contenido.outputTranscription?.text) agregarSubtitulo('coach', contenido.outputTranscription.text);
}

async function conectar() {
  const { token, modelo, config, limites: limitesServidor } = await llamar('crearSesion', {
    modo,
    situacion: situacionActiva,
    manual: sesionManual,
  });
  if (limitesServidor) {
    limites = limitesServidor;
    try {
      localStorage.setItem('limite-mensual', String(limites.mensualMin));
    } catch {}
  }
  const ai = new GoogleGenAI({ apiKey: token, httpOptions: { apiVersion: 'v1alpha' } });
  const mia = ++idConexion;
  recibioMensaje = false;
  const configuracion = { ...config, sessionResumption: manejadorReanudacion ? { handle: manejadorReanudacion } : {} };
  if (sinAfectivo) delete configuracion.enableAffectiveDialog;
  const nueva = await ai.live.connect({
    model: modelo,
    config: configuracion,
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
  // Sin reanudación es una sesión nueva: hay que volver a saludar.
  if (!manejadorReanudacion) enviarInicio();
  actualizarEstado();
}

function enviarInicio() {
  sesion?.sendClientContent({ turns: [{ role: 'user', parts: [{ text: TEXTO_INICIO[modo] }] }], turnComplete: true });
}

function alCerrar(evento) {
  sesion = null;
  if (!activa || terminando) return;
  // Si Gemini cerró sin responder nada, puede ser que no acepte el diálogo
  // afectivo con este modelo: reintentamos una vez sin esa función.
  if (!recibioMensaje && !sinAfectivo) {
    console.warn('Gemini cerró la conexión al iniciar; reintento sin diálogo afectivo.', evento?.reason);
    sinAfectivo = true;
    reconectar();
    return;
  }
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
  situacionActiva = modo === 'practica' ? ui.campoSituacion.value.replace(/\s+/g, ' ').trim() : '';
  if (modo === 'practica' && situacionActiva.length < 3) {
    actualizarEstado('Escribe qué situación quieres practicar, o elige una sugerencia.');
    ui.campoSituacion.focus();
    return;
  }
  sesionManual = hablaManual;
  activa = true;
  conectando = true;
  reintentos = 0;
  manejadorReanudacion = null;
  ui.subtitulos.replaceChildren();
  ultimoHablante = null;
  actualizarEncabezado();
  actualizarEstado();

  try {
    await reproductor.preparar();
    microfono = crearMicrofono();
    // En "mantener para hablar" el micrófono solo transmite mientras apretás el botón.
    microfono.silenciado = sesionManual;
    await microfono.iniciar();
    cargarMicrofonos(); // con permiso concedido ya se ven los nombres reales
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
  enviarInicio();
  iniciarDiagnostico();
  iniciarTemporizador();
  actualizarEstado();
}

// ---------- Duración de la sesión y uso del mes ----------

/** Avisa cuando faltan 2 minutos para el límite de la sesión y cierra al llegar. */
function iniciarTemporizador() {
  inicioSesion = Date.now();
  clearInterval(temporizador);
  let avisado = false;
  temporizador = setInterval(() => {
    const restante = limites.sesionMin * 60 - (Date.now() - inicioSesion) / 1000;
    if (restante <= 120 && !avisado) {
      avisado = true;
      actualizarEstado('Quedan 2 minutos de sesión: vamos cerrando.');
    }
    if (restante <= 0 && !terminando) terminar();
  }, 1000);
}

/** Guarda en la cuenta cuánto duró la sesión (para el medidor de uso). */
function registrarDuracion() {
  clearInterval(temporizador);
  temporizador = null;
  if (!inicioSesion) return;
  const segundos = Math.round((Date.now() - inicioSesion) / 1000);
  inicioSesion = null;
  if (segundos >= 5) llamar('registrarUso', { segundos }).catch((err) => console.error(err));
}

// ---------- Micrófono: elección, medidor y diagnóstico ----------

function leerMicrofonoGuardado() {
  try {
    return localStorage.getItem('microfono') ?? '';
  } catch {
    return '';
  }
}

function crearMicrofono() {
  return new Microfono(
    (datos) => sesion?.sendRealtimeInput({ audio: { data: datos, mimeType: 'audio/pcm;rate=16000' } }),
    leerMicrofonoGuardado(),
  );
}

async function cargarMicrofonos() {
  try {
    const microfonos = await listarMicrofonos();
    const elegido = leerMicrofonoGuardado();
    ui.selectorMicrofono.replaceChildren(new Option('Predeterminado del sistema', ''));
    microfonos.forEach((m, i) => {
      if (m.deviceId === 'default' || m.deviceId === 'communications') return;
      ui.selectorMicrofono.add(new Option(m.label || `Micrófono ${i + 1}`, m.deviceId, false, m.deviceId === elegido));
    });
  } catch {}
}

ui.selectorMicrofono.addEventListener('change', async () => {
  try {
    localStorage.setItem('microfono', ui.selectorMicrofono.value);
  } catch {}
  if (!microfono) return;
  // Cambio en caliente durante la sesión.
  const silenciado = microfono.silenciado;
  microfono.detener();
  microfono = crearMicrofono();
  microfono.silenciado = silenciado;
  try {
    await microfono.iniciar();
    if (diagnostico) Object.assign(diagnostico, { msVoz: 0, msEscuchando: 0, nivelMaximo: 0 });
    avisoMicrofono = '';
    actualizarEstado(`Usando: ${microfono.nombre || 'micrófono elegido'}`);
  } catch (err) {
    actualizarEstado(`No pude usar ese micrófono: ${err.message}`);
  }
});

/**
 * Vigila si tu voz llega: mueve el medidor y, si hablas y el coach no recibe
 * nada (o del micrófono no llega sonido), muestra un aviso con qué revisar.
 */
function iniciarDiagnostico() {
  clearInterval(diagnostico?.intervalo);
  diagnostico = { msVoz: 0, msEscuchando: 0, nivelMaximo: 0, vozRecibida: false };
  diagnostico.intervalo = setInterval(() => {
    const nivel = microfono?.nivel() ?? 0;
    ui.medidorBarra.style.transform = `scaleX(${Math.min(1, nivel * 1.6)})`;
    if (estadoVisual !== 'escuchando' || diagnostico.vozRecibida) return;
    diagnostico.msEscuchando += 100;
    diagnostico.nivelMaximo = Math.max(diagnostico.nivelMaximo, nivel);
    if (nivel > 0.06) diagnostico.msVoz += 100;

    let aviso = '';
    if (diagnostico.msEscuchando > 12000 && diagnostico.nivelMaximo < 0.02) {
      aviso = `No llega sonido de «${microfono?.nombre || 'tu micrófono'}». Elige otro en «Micrófono».`;
    } else if (diagnostico.msVoz > 6000) {
      aviso = 'Te oigo en el micrófono, pero el coach aún no recibe tu voz. Prueba otro micrófono o habla más cerca.';
    }
    if (aviso !== avisoMicrofono) {
      avisoMicrofono = aviso;
      actualizarEstado();
    }
  }, 100);
}

function detenerDiagnostico() {
  clearInterval(diagnostico?.intervalo);
  diagnostico = null;
  avisoMicrofono = '';
  ui.medidorBarra.style.transform = 'scaleX(0)';
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
  terminarDeHablar();
  detenerDiagnostico();
  registrarDuracion();
  apagarCamara();
  reproductor.cortar();
  bloqueoPantalla?.release().catch(() => {});
  bloqueoPantalla = null;
  ui.silencio.setAttribute('aria-pressed', 'false');
  ponerTexto(ui.silencio, 'Silenciar');
  actualizarEncabezado();
  actualizarEstado(mensaje);
}

// ---------- Controles ----------

// ---------- Recordatorios (notificaciones push) ----------

ui.horaRecordatorio.value = '20';
const pushDisponible = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

function avisoRecordatorio(texto) {
  ui.notaRecordatorio.hidden = !texto;
  ui.notaRecordatorio.textContent = texto ?? '';
}

/** La clave pública VAPID viene en base64url; el navegador la quiere en bytes. */
function claveEnBytes(base64) {
  const relleno = '='.repeat((4 - (base64.length % 4)) % 4);
  const binario = atob((base64 + relleno).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(binario, (c) => c.charCodeAt(0));
}

async function suscripcionActual() {
  const registro = await navigator.serviceWorker.getRegistration();
  return registro?.pushManager.getSubscription() ?? null;
}

async function prepararRecordatorios() {
  if (!pushDisponible) {
    ui.activarRecordatorio.disabled = true;
    avisoRecordatorio(
      /iPhone|iPad/.test(navigator.userAgent)
        ? 'En iPhone, instala la app en la pantalla de inicio para recibir recordatorios.'
        : 'Este navegador no admite notificaciones.',
    );
    return;
  }
  const suscripcion = await suscripcionActual().catch(() => null);
  ui.activarRecordatorio.checked = Boolean(suscripcion);
  ui.probarRecordatorio.hidden = !suscripcion;
}

async function guardarRecordatorio(activo) {
  const zona = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const hora = Number(ui.horaRecordatorio.value);
  let suscripcion = await suscripcionActual();
  if (activo) {
    if ((await Notification.requestPermission()) !== 'granted') {
      throw new Error('No diste permiso para notificaciones (puedes darlo en la configuración del sitio).');
    }
    if (!suscripcion) {
      const { clavePublica } = await llamar('configPush');
      const registro = await navigator.serviceWorker.ready;
      suscripcion = await registro.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: claveEnBytes(clavePublica),
      });
    }
  }
  await llamar('guardarRecordatorio', { activo, hora, zona, suscripcion: suscripcion?.toJSON() });
  if (!activo) await suscripcion?.unsubscribe();
}

ui.activarRecordatorio.addEventListener('change', async () => {
  const activo = ui.activarRecordatorio.checked;
  ui.activarRecordatorio.disabled = true;
  try {
    await guardarRecordatorio(activo);
    avisoRecordatorio(activo ? `Listo: te aviso todos los días a las ${ui.horaRecordatorio.selectedOptions[0].text}.` : '');
  } catch (err) {
    ui.activarRecordatorio.checked = !activo;
    avisoRecordatorio(err.message);
  } finally {
    ui.activarRecordatorio.disabled = false;
    ui.probarRecordatorio.hidden = !ui.activarRecordatorio.checked;
  }
});

ui.horaRecordatorio.addEventListener('change', async () => {
  if (!ui.activarRecordatorio.checked) return;
  try {
    await guardarRecordatorio(true);
    avisoRecordatorio(`Listo: te aviso todos los días a las ${ui.horaRecordatorio.selectedOptions[0].text}.`);
  } catch (err) {
    avisoRecordatorio(err.message);
  }
});

ui.probarRecordatorio.addEventListener('click', async () => {
  try {
    const suscripcion = await suscripcionActual();
    await llamar('probarRecordatorio', { suscripcion: suscripcion?.toJSON() });
    avisoRecordatorio('Te mandé una notificación de prueba.');
  } catch (err) {
    avisoRecordatorio(err.message);
  }
});

// ---------- Mantener para hablar ----------

ui.selectorForma.value = hablaManual ? 'manual' : 'auto';
ui.selectorForma.addEventListener('change', () => {
  hablaManual = ui.selectorForma.value === 'manual';
  try {
    localStorage.setItem('forma-hablar', ui.selectorForma.value);
  } catch {}
});

function empezarAHablar() {
  if (!sesion || !sesionManual || apretado) return;
  apretado = true;
  reproductor.cortar(); // hablar interrumpe al coach
  sesion.sendRealtimeInput({ activityStart: {} });
  microfono.silenciado = false;
  ui.botonHablar.classList.add('apretado');
  ui.textoHablar.textContent = 'Te escucho… suelta para enviar';
  actualizarEstado();
}

function terminarDeHablar() {
  if (!apretado) return;
  apretado = false;
  if (microfono) microfono.silenciado = true;
  sesion?.sendRealtimeInput({ activityEnd: {} });
  ui.botonHablar.classList.remove('apretado');
  ui.textoHablar.textContent = 'Mantén apretado para hablar';
  actualizarEstado();
}

ui.botonHablar.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  ui.botonHablar.setPointerCapture?.(e.pointerId);
  empezarAHablar();
});
for (const evento of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  ui.botonHablar.addEventListener(evento, terminarDeHablar);
}
ui.botonHablar.addEventListener('contextmenu', (e) => e.preventDefault());

// En PC: barra espaciadora (salvo que estés escribiendo en un campo).
const escribiendo = () => ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && !e.repeat && sesionManual && activa && !escribiendo()) {
    e.preventDefault();
    empezarAHablar();
  }
});
document.addEventListener('keyup', (e) => {
  if (e.code === 'Space' && sesionManual) terminarDeHablar();
});

function apagarCamara() {
  camara?.detener();
  camara = null;
  ui.video.hidden = true;
  ui.camara.setAttribute('aria-pressed', 'false');
  ponerTexto(ui.camara, 'Cámara');
}

ui.boton.addEventListener('click', () => (activa ? terminar() : iniciar()));

ui.silencio.addEventListener('click', () => {
  if (!microfono) return;
  microfono.silenciado = !microfono.silenciado;
  if (microfono.silenciado) sesion?.sendRealtimeInput({ audioStreamEnd: true });
  ui.silencio.setAttribute('aria-pressed', String(microfono.silenciado));
  ponerTexto(ui.silencio, microfono.silenciado ? 'Activar micrófono' : 'Silenciar');
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
    ponerTexto(ui.camara, 'Apagar cámara');
  } catch (err) {
    apagarCamara();
    actualizarEstado(err.name === 'NotAllowedError' ? 'Necesito permiso para usar la cámara.' : err.message);
  }
});

ui.verTexto.addEventListener('click', () => {
  ui.conversacion.hidden = !ui.conversacion.hidden;
  ui.verTexto.setAttribute('aria-pressed', String(!ui.conversacion.hidden));
  ponerTexto(ui.verTexto, ui.conversacion.hidden ? 'Texto' : 'Ocultar texto');
  if (!ui.conversacion.hidden) ui.campoMensaje.focus();
});

for (const opcion of ui.opcionesCoach) {
  opcion.addEventListener('click', async () => {
    if (activa || opcion.getAttribute('aria-checked') === 'true') return;
    const anterior = progresoActual.coach;
    mostrarProgreso({ ...progresoActual, coach: opcion.dataset.coach });
    try {
      await llamar('elegirCoach', { coach: opcion.dataset.coach });
      actualizarEstado(`Tu coach ahora es ${NOMBRES_COACH[opcion.dataset.coach]}.`);
    } catch (err) {
      mostrarProgreso({ ...progresoActual, coach: anterior });
      actualizarEstado(`No pude cambiar de coach: ${err.message}`);
    }
  });
}

ui.reiniciar.addEventListener('click', async () => {
  if (activa) return;
  if (!confirm('¿Borrar tu progreso y volver al Nivel 1?')) return;
  try {
    actualizarEstado((await llamar('reiniciarProgreso')).mensaje);
  } catch (err) {
    actualizarEstado(err.message);
  }
});

$('version').textContent = `Versión ${__VERSION__} · publicada el ${new Intl.DateTimeFormat('es', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
}).format(new Date(__PUBLICADO__))}`;

// ---------- Modo día / noche ----------

function cambiarTema() {
  const tema = document.documentElement.dataset.tema === 'noche' ? 'dia' : 'noche';
  document.documentElement.dataset.tema = tema;
  document.querySelector('meta[name="theme-color"]').content = tema === 'noche' ? '#0b0a14' : '#f6f5fa';
  try {
    localStorage.setItem('tema', tema);
  } catch {}
}

for (const boton of document.querySelectorAll('.boton-tema')) boton.addEventListener('click', cambiarTema);

// ---------- Cuenta y arranque ----------

function mostrarPantalla(conectado) {
  ui.pantallaEntrar.hidden = conectado;
  ui.pantallaCoach.hidden = !conectado;
}

ui.botonEntrar.addEventListener('click', async () => {
  ui.errorEntrar.hidden = true;
  try {
    await entrarConGoogle();
  } catch (err) {
    ui.errorEntrar.textContent = `No se pudo iniciar sesión: ${err.message}`;
    ui.errorEntrar.hidden = false;
  }
});

ui.salir.addEventListener('click', () => {
  if (activa) finalizar();
  salir();
});

async function arrancar() {
  try {
    await iniciarFirebase();
  } catch (err) {
    ui.errorEntrar.textContent = err.message;
    ui.errorEntrar.hidden = false;
    return;
  }
  alCambiarUsuario((usuario) => {
    dejarDeEscuchar?.();
    dejarDeEscuchar = null;
    mostrarPantalla(Boolean(usuario));
    if (!usuario) return;
    ui.cuenta.textContent = usuario.email;
    cargarMicrofonos();
    prepararRecordatorios();
    actualizarEstado();
    dejarDeEscuchar = escucharProgreso(usuario.uid, mostrarProgreso, (err) => {
      const mensaje =
        err.code === 'permission-denied' ? 'Esta cuenta no tiene acceso a la app.' : err.message;
      actualizarEstado(`No pude leer tu progreso: ${mensaje}`);
    });
  });
}

try {
  if (localStorage.getItem('modo') === 'practica') elegirModo('practica');
} catch {}

arrancar();

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}
