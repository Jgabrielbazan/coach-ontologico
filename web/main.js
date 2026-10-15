import { GoogleGenAI } from '@google/genai';
import { Camara, Microfono, Reproductor, listarMicrofonos } from './audio.js';
import { AVATARES } from './avatares.js';
import { dibujarCertificado } from './certificado.js';
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
  tarjetaFrase: $('tarjeta-frase'),
  textoFrase: $('texto-frase'),
  fechaFrase: $('fecha-frase'),
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
  tarjetaEvolucion: $('tarjeta-evolucion'),
  cuentaEvolucion: $('cuenta-evolucion'),
  citaAntes: $('cita-antes'),
  fechaAntes: $('fecha-antes'),
  momentoAhora: $('momento-ahora'),
  citaAhora: $('cita-ahora'),
  fechaAhora: $('fecha-ahora'),
  distincionAhora: $('distincion-ahora'),
  notaEvolucion: $('nota-evolucion'),
  lineaEvolucion: $('linea-evolucion'),
  listaEvolucion: $('lista-evolucion'),
  botonesCertificado: document.querySelectorAll('.ver-certificado'),
  celebracion: $('celebracion'),
  celebracionTitulo: $('celebracion-titulo'),
  celebracionBajada: $('celebracion-bajada'),
  verCertificado: $('boton-ver-certificado'),
  cerrarCelebracion: $('cerrar-celebracion'),
  dialogoCertificado: $('dialogo-certificado'),
  lienzoCertificado: $('lienzo-certificado'),
  descargarCertificado: $('descargar-certificado'),
  compartirCertificado: $('compartir-certificado'),
  cerrarCertificado: $('cerrar-certificado'),
  textoProposito: $('texto-proposito'),
  vacioProposito: $('vacio-proposito'),
  editarProposito: $('editar-proposito'),
  formularioProposito: $('formulario-proposito'),
  campoProposito: $('campo-proposito'),
  cancelarProposito: $('cancelar-proposito'),
  cuentaSemana: $('cuenta-semana'),
  diasSemana: $('dias-semana'),
  textoSemana: $('texto-semana'),
  botonAvatar: $('boton-avatar'),
  dialogoAvatar: $('dialogo-avatar'),
  cerrarAvatar: $('cerrar-avatar'),
  bienvenida: $('bienvenida'),
  bienvenidaAvatar: $('bienvenida-avatar'),
  bienvenidaTitulo: $('bienvenida-titulo'),
  bienvenidaBajada: $('bienvenida-bajada'),
  progresoPrograma: $('progreso-programa'),
  porcentajePrograma: $('porcentaje-programa'),
  tramosPrograma: $('tramos-programa'),
  detallePrograma: $('detalle-programa'),
};

const NOMBRES_COACH = { femenino: 'Sofía', masculino: 'Tomás' };

const NIVELES = {
  1: 'El Observador Inicial',
  2: 'El Diseñador de Realidades',
  3: 'El Maestro de la Coherencia Corporal',
  4: 'El Arquitecto de Compromisos',
  5: 'El Líder Conversacional',
};
const NIVEL_MAXIMO = 5;
const PROGRESO_INICIAL = {
  nivel: 1,
  programaCompleto: false,
  evaluaciones: [],
  sesiones: [],
  tareas: [],
  frases: [],
  evolucion: [],
  proposito: null,
  dias: [],
  avatar: null,
  coach: 'femenino',
};

const TEXTO_INICIO = {
  programa:
    '[Inicio de sesión: saluda en una frase; si en "Tu evolución" hay un avance concreto, reconócelo en una frase ' +
    'comparando el antes con el ahora; y continúa el programa donde corresponde.]',
  practica: '[Inicio de práctica libre: saluda en una frase y empieza con tus preguntas de contexto sobre la situación.]',
};
const TEXTO_CIERRE =
  '[La sesión termina ahora: si notaste un avance concreto en esta sesión, nómbralo en una frase; ' +
  'llama a asignar_tarea, luego a dejar_frase y dísela en voz alta, ' +
  'luego a guardar_resumen_sesion, y despídete en una frase.]';
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
let nombreUsuario = '';
let nivelVisto = null; // nivel del último progreso mostrado, para detectar cuándo se aprueba uno
let certificadoAbierto = null;
let bienvenidaPendiente = false; // saludo del avatar al entrar, una vez por inicio de sesión
let primerNombre = '';
let diasEstaSemana = 0;

new Orbe($('orbe-entrar'), { obtenerEstado: () => 'inactivo' });
const orbeCoach = new Orbe($('orbe-coach'), {
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
  // Quien completó el programa cuando tenía menos niveles sigue con el siguiente (igual que el servidor).
  if (p.programaCompleto && p.nivel < NIVEL_MAXIMO) Object.assign(p, { programaCompleto: false, nivel: p.nivel + 1 });
  progresoActual = p;
  for (const opcion of ui.opcionesCoach) {
    opcion.setAttribute('aria-checked', String(opcion.dataset.coach === p.coach));
  }
  ui.etiquetaNivel.textContent = p.programaCompleto ? 'Programa completo' : `Nivel ${p.nivel} de ${NIVEL_MAXIMO}`;
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
    ui.puntajeFeedback.textContent = `${ultima.aprobado ? '✓ ' : ''}${ultima.puntuacion}/100`;
    ui.puntajeFeedback.classList.toggle('aprobada', ultima.aprobado);
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

  mostrarAvatar(p.avatar);
  mostrarAvance(p);
  mostrarProposito(p.proposito);
  mostrarSemana(p.dias);
  mostrarEvolucion(p.evolucion);
  for (const boton of ui.botonesCertificado) {
    boton.hidden = !p.evaluaciones.some((e) => e.nivel === Number(boton.dataset.nivel) && e.aprobado);
  }
  detectarAprobacion(p);

  const frase = p.frases.at(-1);
  ui.tarjetaFrase.hidden = !frase;
  if (frase) {
    ui.textoFrase.textContent = frase.texto;
    ui.fechaFrase.textContent = fechaCorta.format(new Date(frase.fecha));
  }

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

  if (bienvenidaPendiente) {
    bienvenidaPendiente = false;
    if (p.avatar) saludar(p);
    else abrirSelectorAvatar();
  }
}

// ---------- Tu avatar ----------

// Las opciones del selector se arman una vez (los dibujos son SVG propios de la app).
for (const [id, avatar] of Object.entries(AVATARES)) {
  const opcion = document.createElement('button');
  opcion.type = 'button';
  opcion.className = 'opcion-avatar';
  opcion.dataset.avatar = id;
  opcion.setAttribute('role', 'radio');
  opcion.setAttribute('aria-checked', 'false');
  opcion.innerHTML = `${avatar.svg}<span class="opcion-avatar-nombre">${avatar.nombre}</span><small>${avatar.estilo}</small>`;
  opcion.addEventListener('click', () => elegirAvatar(id));
  document.querySelector(`.opciones-avatar[data-genero="${avatar.genero}"]`).append(opcion);
}

function mostrarAvatar(id) {
  const avatar = AVATARES[id];
  ui.botonAvatar.innerHTML = avatar ? avatar.svg : '<span aria-hidden="true">+</span>';
  ui.botonAvatar.classList.toggle('sin-avatar', !avatar);
  for (const opcion of document.querySelectorAll('.opcion-avatar')) {
    opcion.setAttribute('aria-checked', String(opcion.dataset.avatar === id));
  }
}

function abrirSelectorAvatar() {
  if (!ui.dialogoAvatar.open) ui.dialogoAvatar.showModal();
}

async function elegirAvatar(id) {
  const anterior = progresoActual.avatar;
  ui.dialogoAvatar.close();
  if (id === anterior) return;
  // Se muestra al instante; si el servidor no lo guarda, se vuelve al anterior.
  mostrarAvatar(id);
  saludar({ ...progresoActual, avatar: id }, { nuevo: true });
  try {
    await llamar('elegirAvatar', { avatar: id });
  } catch (err) {
    mostrarAvatar(anterior);
    actualizarEstado(`No pude guardar tu avatar: ${err.message}`);
  }
}

/** El avatar aparece, saluda y cuenta en una línea dónde estás. Se va solo o con un toque. */
function saludar(p, { nuevo = false } = {}) {
  const avatar = AVATARES[p.avatar];
  if (!avatar) return;
  ui.bienvenidaAvatar.innerHTML = avatar.svg;
  ui.bienvenidaTitulo.textContent = primerNombre ? `¡Hola, ${primerNombre}!` : '¡Hola!';
  const semana = diasEstaSemana ? ` · ${diasEstaSemana} de 7 días esta semana` : '';
  ui.bienvenidaBajada.textContent = nuevo
    ? `${avatar.nombre} te acompaña desde ahora. ¡Vamos con todo!`
    : p.programaCompleto
      ? `Completaste el programa${semana}. ¿Practicamos algo hoy?`
      : `Nivel ${p.nivel} · ${NIVELES[p.nivel]}${semana}`;
  ui.bienvenida.hidden = false;
  // Reinicia la animación aunque se vuelva a mostrar enseguida.
  ui.bienvenida.classList.remove('saliendo');
  clearTimeout(saludar.temporizador);
  saludar.temporizador = setTimeout(cerrarBienvenida, 3600);
}

function cerrarBienvenida() {
  if (ui.bienvenida.hidden) return;
  ui.bienvenida.classList.add('saliendo');
  setTimeout(() => {
    ui.bienvenida.hidden = true;
    ui.bienvenida.classList.remove('saliendo');
  }, 350);
}

ui.botonAvatar.addEventListener('click', abrirSelectorAvatar);
ui.cerrarAvatar.addEventListener('click', () => ui.dialogoAvatar.close());
ui.dialogoAvatar.addEventListener('click', (e) => e.target === ui.dialogoAvatar && ui.dialogoAvatar.close());
ui.bienvenida.addEventListener('click', cerrarBienvenida);

// ---------- Tu progreso (barra del programa) ----------

// Un tramo por nivel; dentro del nivel actual avanza con los criterios logrados en el último intento.
for (let nivel = 1; nivel <= NIVEL_MAXIMO; nivel++) {
  const tramo = document.createElement('li');
  tramo.append(document.createElement('span'));
  ui.tramosPrograma.append(tramo);
}

function mostrarAvance(p) {
  const aprobados = p.programaCompleto ? NIVEL_MAXIMO : p.nivel - 1;
  const intento = p.programaCompleto ? null : p.evaluaciones.findLast((e) => e.nivel === p.nivel);
  const total = intento?.criterios?.length ?? 0;
  const logrados = intento?.criterios?.filter((c) => c.cumplido).length ?? 0;
  // Sin aprobar, el nivel actual nunca se ve completo.
  const parcial = total ? Math.min(0.9, logrados / total) : 0;
  const porcentaje = Math.round(((aprobados + parcial) / NIVEL_MAXIMO) * 100);
  ui.porcentajePrograma.textContent = `${porcentaje}%`;
  [...ui.tramosPrograma.children].forEach((tramo, i) => {
    const nivel = i + 1;
    const actual = !p.programaCompleto && nivel === p.nivel;
    const relleno = nivel <= aprobados ? 1 : actual ? Math.max(parcial, 0.05) : 0;
    tramo.className = nivel <= aprobados ? 'hecho' : actual ? 'actual' : '';
    tramo.title = `Nivel ${nivel}: ${NIVELES[nivel]}`;
    tramo.setAttribute(
      'aria-label',
      `Nivel ${nivel}, ${NIVELES[nivel]}: ${nivel <= aprobados ? 'aprobado' : actual ? 'en curso' : 'por delante'}`,
    );
    tramo.firstChild.style.transform = `scaleX(${relleno})`;
  });
  ui.detallePrograma.textContent = p.programaCompleto
    ? `¡Completaste los ${NIVEL_MAXIMO} niveles!`
    : total
      ? `Nivel ${p.nivel}: ${logrados} de ${total} criterios logrados en tu último intento.`
      : `Nivel ${p.nivel}: aún sin evaluación. ${
          aprobados ? `Ya aprobaste ${aprobados} ${aprobados === 1 ? 'nivel' : 'niveles'}.` : '¡Vamos por el primero!'
        }`;
}

// ---------- Tarjetas plegables (recuerdan si las dejaste abiertas) ----------

for (const plegable of document.querySelectorAll('details.plegable')) {
  const clave = `plegable-${plegable.id}`;
  try {
    plegable.open = localStorage.getItem(clave) === 'abierta';
  } catch {}
  plegable.addEventListener('toggle', () => {
    try {
      localStorage.setItem(clave, plegable.open ? 'abierta' : 'cerrada');
    } catch {}
  });
}

/** Fecha local del aparato como "AAAA-MM-DD" (para contar días practicados). */
const hoyLocal = (fecha = new Date()) => fecha.toLocaleDateString('en-CA');

// ---------- Tu propósito ----------

function mostrarProposito(proposito) {
  const texto = proposito?.texto ?? '';
  const editando = !ui.formularioProposito.hidden;
  ui.textoProposito.textContent = texto;
  ui.textoProposito.hidden = !texto || editando;
  ui.vacioProposito.hidden = Boolean(texto) || editando;
  ui.editarProposito.textContent = texto ? 'Editar' : 'Escribirlo';
  ui.editarProposito.hidden = editando;
}

function editarProposito(abrir) {
  ui.formularioProposito.hidden = !abrir;
  if (abrir) {
    ui.campoProposito.value = progresoActual.proposito?.texto ?? '';
    ui.campoProposito.focus();
  }
  mostrarProposito(progresoActual.proposito);
}

ui.editarProposito.addEventListener('click', () => editarProposito(true));
ui.cancelarProposito.addEventListener('click', () => editarProposito(false));
ui.formularioProposito.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const proposito = ui.campoProposito.value.trim();
  if (proposito.length < 3) return;
  const boton = ui.formularioProposito.querySelector('[type="submit"]');
  boton.disabled = true;
  try {
    await llamar('guardarProposito', { proposito });
    editarProposito(false);
  } catch (err) {
    actualizarEstado(`No pude guardar tu propósito: ${err.message}`);
  } finally {
    boton.disabled = false;
  }
});

// ---------- Tu semana (racha amable) ----------

/** Los 7 días de la semana en curso (de lunes a domingo) con los que practicaste. Nunca castiga. */
function mostrarSemana(dias) {
  const practicados = new Set(dias);
  const hoy = hoyLocal();
  const lunes = new Date();
  lunes.setHours(12, 0, 0, 0);
  lunes.setDate(lunes.getDate() - ((lunes.getDay() + 6) % 7));
  const letras = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  const nombres = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
  let cuenta = 0;
  ui.diasSemana.replaceChildren(
    ...letras.map((letra, i) => {
      const dia = new Date(lunes);
      dia.setDate(lunes.getDate() + i);
      const clave = hoyLocal(dia);
      const hecho = practicados.has(clave);
      if (hecho) cuenta++;
      const item = document.createElement('li');
      item.textContent = letra;
      item.classList.toggle('hecho', hecho);
      item.classList.toggle('hoy', clave === hoy);
      item.classList.toggle('futuro', clave > hoy);
      item.setAttribute('aria-label', `${nombres[i]}: ${hecho ? 'practicaste' : clave > hoy ? 'todavía no llega' : 'sin práctica'}`);
      return item;
    }),
  );
  ui.cuentaSemana.textContent = `${cuenta} de 7`;
  diasEstaSemana = cuenta;
  const hoyHecho = practicados.has(hoy);
  const animo =
    cuenta === 0
      ? 'Una sesión corta hoy ya cuenta.'
      : cuenta === 1
        ? hoyHecho
          ? 'Buen comienzo: hoy ya sumaste.'
          : 'Buen comienzo: cada día que practicas suma.'
        : cuenta <= 3
          ? 'Vas construyendo el hábito.'
          : cuenta <= 5
            ? 'Semana muy constante. ¡Bien!'
            : '¡Semana excelente! Tu constancia se nota.';
  const total = dias.length ? ` · ${dias.length} ${dias.length === 1 ? 'día practicado' : 'días practicados'} en total` : '';
  ui.textoSemana.textContent = animo + total;
}

/** Tiempo entre dos fechas, en palabras: "5 días después", "3 semanas después". */
function distancia(desde, hasta) {
  const dias = Math.round((new Date(hasta) - new Date(desde)) / 86400000);
  if (dias < 1) return 'el mismo día';
  if (dias < 14) return `${dias} ${dias === 1 ? 'día' : 'días'} después`;
  if (dias < 60) return `${Math.round(dias / 7)} semanas después`;
  return `${Math.round(dias / 30)} meses después`;
}

/** "Tu evolución": tu frase del punto de partida frente al último avance, y la línea de tiempo completa. */
function mostrarEvolucion(evolucion) {
  ui.tarjetaEvolucion.hidden = !evolucion.length;
  if (!evolucion.length) return;
  const antes = evolucion.find((a) => a.tipo === 'partida') ?? evolucion[0];
  const ahora = evolucion.findLast((a) => a.tipo === 'avance' && a !== antes && a.fecha >= antes.fecha);
  ui.cuentaEvolucion.textContent = `${evolucion.length} ${evolucion.length === 1 ? 'momento' : 'momentos'}`;
  ui.citaAntes.textContent = antes.cita;
  ui.fechaAntes.textContent = fechaCorta.format(new Date(antes.fecha));
  ui.momentoAhora.hidden = !ahora;
  ui.notaEvolucion.hidden = Boolean(ahora);
  if (ahora) {
    ui.citaAhora.textContent = ahora.cita;
    ui.fechaAhora.textContent = `${fechaCorta.format(new Date(ahora.fecha))} · ${distancia(antes.fecha, ahora.fecha)}`;
    ui.distincionAhora.textContent = ahora.distincion;
    ui.distincionAhora.hidden = !ahora.distincion;
  }
  ui.lineaEvolucion.hidden = evolucion.length < 3;
  ui.listaEvolucion.replaceChildren(
    ...evolucion.map((a) => {
      const item = document.createElement('li');
      item.className = a.tipo === 'partida' ? 'partida' : 'avance';
      const encabezado = document.createElement('span');
      encabezado.className = 'linea-fecha';
      encabezado.textContent = `${fechaCorta.format(new Date(a.fecha))} · Nivel ${a.nivel} · ${a.tipo === 'partida' ? 'Punto de partida' : 'Avance'}`;
      const cita = document.createElement('q');
      cita.textContent = a.cita;
      item.append(encabezado, cita);
      if (a.distincion) {
        const distincion = document.createElement('small');
        distincion.textContent = a.distincion;
        item.append(distincion);
      }
      return item;
    }),
  );
}

// ---------- Ceremonia de nivel y certificado ----------

/** Compara con el progreso anterior: si se acaba de aprobar un nivel, lo celebra. */
function detectarAprobacion(p) {
  const antes = nivelVisto;
  nivelVisto = { nivel: p.nivel, completo: p.programaCompleto };
  if (!antes) return; // primera carga: nada que celebrar
  if (p.programaCompleto && !antes.completo) celebrarNivel(NIVEL_MAXIMO);
  else if (p.nivel > antes.nivel) celebrarNivel(p.nivel - 1);
}

function celebrarNivel(nivel) {
  orbeCoach.celebrar();
  navigator.vibrate?.([60, 40, 140]);
  const final = nivel === NIVEL_MAXIMO;
  ui.celebracionTitulo.textContent = final ? '¡Programa completo!' : `¡Nivel ${nivel} aprobado!`;
  ui.celebracionBajada.textContent = final
    ? `Aprobaste los ${NIVEL_MAXIMO} niveles. Tu certificado te espera.`
    : `${NIVELES[nivel]} · Tu certificado te espera.`;
  ui.celebracion.dataset.nivel = String(nivel);
  ui.celebracion.hidden = false;
}

function datosCertificado(p, nivel) {
  const evaluacion = p.evaluaciones.findLast((e) => e.nivel === nivel && e.aprobado);
  if (!evaluacion) return null;
  // Solo los avances: las frases del punto de partida no van en un certificado.
  const citas = p.evolucion
    .filter((a) => a.nivel === nivel && a.tipo === 'avance')
    .slice(-3)
    .map((a) => a.cita);
  return {
    nivel,
    nombreNivel: NIVELES[nivel],
    completo: nivel === NIVEL_MAXIMO,
    totalNiveles: NIVEL_MAXIMO,
    proposito: p.proposito?.texto ?? '',
    nombre: nombreUsuario,
    fecha: evaluacion.fecha,
    puntuacion: evaluacion.puntuacion,
    citas,
    logros: (evaluacion.criterios ?? []).filter((c) => c.cumplido).map((c) => c.texto),
    coach: NOMBRES_COACH[p.coach] ?? 'Tu coach',
  };
}

async function abrirCertificado(nivel) {
  const datos = datosCertificado(progresoActual, nivel);
  if (!datos) return;
  certificadoAbierto = datos;
  await dibujarCertificado(ui.lienzoCertificado, datos);
  ui.lienzoCertificado.setAttribute(
    'aria-label',
    `Certificado del Nivel ${nivel}, ${datos.nombreNivel}, otorgado a ${datos.nombre} con ${datos.puntuacion}/100`,
  );
  ui.compartirCertificado.hidden = !puedeCompartirImagen();
  if (!ui.dialogoCertificado.open) ui.dialogoCertificado.showModal();
}

function puedeCompartirImagen() {
  try {
    return Boolean(navigator.canShare?.({ files: [new File([''], 'prueba.png', { type: 'image/png' })] }));
  } catch {
    return false;
  }
}

function archivoCertificado() {
  return new Promise((listo) =>
    ui.lienzoCertificado.toBlob(
      (blob) => listo(new File([blob], `certificado-nivel-${certificadoAbierto.nivel}.png`, { type: 'image/png' })),
      'image/png',
    ),
  );
}

for (const boton of ui.botonesCertificado) {
  boton.addEventListener('click', () => abrirCertificado(Number(boton.dataset.nivel)));
}
ui.verCertificado.addEventListener('click', () => abrirCertificado(Number(ui.celebracion.dataset.nivel)));
ui.cerrarCelebracion.addEventListener('click', () => (ui.celebracion.hidden = true));
ui.cerrarCertificado.addEventListener('click', () => ui.dialogoCertificado.close());
// Tocar fuera del certificado también lo cierra.
ui.dialogoCertificado.addEventListener('click', (e) => e.target === ui.dialogoCertificado && ui.dialogoCertificado.close());

ui.descargarCertificado.addEventListener('click', async () => {
  const archivo = await archivoCertificado();
  const url = URL.createObjectURL(archivo);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = archivo.name;
  enlace.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
});

ui.compartirCertificado.addEventListener('click', async () => {
  const archivo = await archivoCertificado();
  const { nivel, nombreNivel } = certificadoAbierto;
  navigator
    .share({ files: [archivo], title: 'Mi certificado', text: `Aprobé el Nivel ${nivel} del Coach Ontológico: ${nombreNivel}.` })
    .catch(() => {}); // cancelar el menú de compartir no es un error
});

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
    ui.progresoPrograma.hidden = false;
    const p = progresoActual;
    ui.etiquetaNivel.textContent = p.programaCompleto ? 'Programa completo' : `Nivel ${p.nivel} de ${NIVEL_MAXIMO}`;
    ui.nombreNivel.textContent = p.programaCompleto ? 'Coherencia integrada' : NIVELES[p.nivel];
    return;
  }
  ui.progresoPrograma.hidden = true;
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
    await llamar('registrarReflexion', { id: ui.formularioReflexion.dataset.id, reflexion, fecha: hoyLocal() });
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
    case 'dejar_frase': {
      const { mensaje } = await llamar('dejarFrase', { frase: args.frase });
      return { resultado: mensaje };
    }
    case 'declarar_proposito': {
      const { mensaje } = await llamar('guardarProposito', { proposito: args.proposito });
      return { resultado: mensaje };
    }
    case 'registrar_avance': {
      const { mensaje } = await llamar('registrarAvance', {
        cita: args.cita,
        tipo: args.tipo,
        distincion: args.distincion,
      });
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
  if (segundos >= 5) llamar('registrarUso', { segundos, fecha: hoyLocal() }).catch((err) => console.error(err));
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

  // El cierre incluye tarea, frase dicha en voz alta y resumen: le damos tiempo.
  await Promise.race([resumenGuardado, esperar(20000)]);
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

/** Le cuenta al coach que la cámara se prendió o apagó, sin interrumpir lo que está diciendo. */
function avisarCamara(activa) {
  const texto = activa
    ? '[La cámara está activada: ahora puedes verme. Úsala como señal, con tacto.]'
    : '[La cámara se apagó: ya no puedes verme.]';
  sesion?.sendClientContent({ turns: [{ role: 'user', parts: [{ text: texto }] }], turnComplete: false });
}

ui.camara.addEventListener('click', async () => {
  if (camara) {
    apagarCamara();
    avisarCamara(false);
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
    avisarCamara(true);
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
  if (!confirm('¿Borrar tu progreso y volver al Nivel 1? Se conservan tu propósito y tus días practicados.')) return;
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

// ---------- Instalar la app (acceso directo en el escritorio y ventana propia) ----------

let pedidoInstalacion = null;
const botonesInstalar = document.querySelectorAll('.boton-instalar');
const mostrarInstalar = (visible) => botonesInstalar.forEach((boton) => (boton.hidden = !visible));

// El navegador avisa cuando la app se puede instalar; guardamos el aviso para usarlo con nuestro botón.
window.addEventListener('beforeinstallprompt', (evento) => {
  evento.preventDefault();
  pedidoInstalacion = evento;
  mostrarInstalar(true);
});

window.addEventListener('appinstalled', () => {
  pedidoInstalacion = null;
  mostrarInstalar(false);
  actualizarEstado('¡Listo! El Coach quedó instalado: lo encuentras en el escritorio y en el menú Inicio.');
});

for (const boton of botonesInstalar) {
  boton.addEventListener('click', async () => {
    if (!pedidoInstalacion) return;
    pedidoInstalacion.prompt();
    await pedidoInstalacion.userChoice.catch(() => null);
    // Cada aviso sirve una sola vez; si lo cancelas, el navegador vuelve a ofrecerlo más adelante.
    pedidoInstalacion = null;
    mostrarInstalar(false);
  });
}

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
    nivelVisto = null;
    ui.celebracion.hidden = true;
    mostrarPantalla(Boolean(usuario));
    if (!usuario) return;
    ui.cuenta.textContent = usuario.email;
    nombreUsuario = usuario.displayName || usuario.email.split('@')[0];
    primerNombre = nombreUsuario.split(' ')[0];
    bienvenidaPendiente = true;
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
