// Certificado de nivel: se dibuja en un lienzo para poder descargarlo como
// imagen o compartirlo. Diseño claro (tipo papel) para que se vea bien impreso.

const ANCHO = 1600;
const ALTO = 1130;
const fechaLarga = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'long', year: 'numeric' });

/** Parte un texto en líneas que entren en `ancho`; corta con "…" si pasa de `maximo` líneas. */
function partir(ctx, texto, ancho, maximo = Infinity) {
  const lineas = [];
  let actual = '';
  for (const palabra of texto.split(/\s+/)) {
    const prueba = actual ? `${actual} ${palabra}` : palabra;
    if (ctx.measureText(prueba).width > ancho && actual) {
      lineas.push(actual);
      actual = palabra;
    } else {
      actual = prueba;
    }
  }
  if (actual) lineas.push(actual);
  if (lineas.length > maximo) {
    lineas.length = maximo;
    let ultima = lineas[maximo - 1];
    while (ultima && ctx.measureText(`${ultima}…`).width > ancho) ultima = ultima.slice(0, -1);
    lineas[maximo - 1] = `${ultima.trimEnd()}…`;
  }
  return lineas;
}

function espaciado(ctx, valor) {
  if ('letterSpacing' in ctx) ctx.letterSpacing = valor;
}

/** Emblema: una pequeña esfera de partículas con un anillo, como el orbe de la app. */
function emblema(ctx, cx, cy, radio) {
  const brillo = ctx.createRadialGradient(cx, cy, 0, cx, cy, radio * 1.9);
  brillo.addColorStop(0, 'rgba(167, 139, 250, 0.35)');
  brillo.addColorStop(1, 'rgba(167, 139, 250, 0)');
  ctx.fillStyle = brillo;
  ctx.beginPath();
  ctx.arc(cx, cy, radio * 1.9, 0, Math.PI * 2);
  ctx.fill();

  const cantidad = 700;
  const dorado = Math.PI * (3 - Math.sqrt(5));
  const [ci, si] = [Math.cos(0.45), Math.sin(0.45)];
  for (let i = 0; i < cantidad; i++) {
    const y = 1 - (2 * (i + 0.5)) / cantidad;
    const r = Math.sqrt(1 - y * y);
    const x = Math.cos(i * dorado) * r;
    const z = Math.sin(i * dorado) * r;
    const y1 = y * ci - z * si;
    const z1 = y * si + z * ci;
    if (z1 < -0.2) continue;
    const delante = (z1 + 1) / 2;
    const mezcla = (y1 + 1) / 2;
    const color = [124 + (8 - 124) * mezcla, 92 + (145 - 92) * mezcla, 240 + (178 - 240) * mezcla];
    ctx.fillStyle = `rgba(${color.map((c) => c | 0).join(',')}, ${0.25 + delante * 0.75})`;
    ctx.beginPath();
    ctx.arc(cx + x * radio, cy + y1 * radio, 0.8 + delante * 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(217, 119, 6, 0.75)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(cx, cy, radio * 1.55, radio * 0.42, -0.25, 0, Math.PI * 2);
  ctx.stroke();
}

function fondo(ctx) {
  const base = ctx.createLinearGradient(0, 0, ANCHO, ALTO);
  base.addColorStop(0, '#fdfcff');
  base.addColorStop(1, '#f2eefb');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, ANCHO, ALTO);

  for (const [x, y, r, color] of [
    [140, 120, 520, '233, 213, 255'],
    [1500, 1040, 560, '204, 251, 241'],
    [1480, 90, 380, '252, 231, 243'],
  ]) {
    const luz = ctx.createRadialGradient(x, y, 0, x, y, r);
    luz.addColorStop(0, `rgba(${color}, 0.9)`);
    luz.addColorStop(1, `rgba(${color}, 0)`);
    ctx.fillStyle = luz;
    ctx.fillRect(0, 0, ANCHO, ALTO);
  }

  const oro = ctx.createLinearGradient(0, 0, ANCHO, ALTO);
  oro.addColorStop(0, '#b7791f');
  oro.addColorStop(0.5, '#ecc94b');
  oro.addColorStop(1, '#b7791f');
  ctx.strokeStyle = oro;
  ctx.lineWidth = 4;
  ctx.strokeRect(38, 38, ANCHO - 76, ALTO - 76);
  ctx.strokeStyle = 'rgba(124, 92, 240, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(58, 58, ANCHO - 116, ALTO - 116);
}

/**
 * @param {HTMLCanvasElement} lienzo
 * @param {{ nivel: number, nombreNivel: string, completo: boolean, nombre: string, fecha: string,
 *   puntuacion: number, citas: string[], logros: string[], coach: string }} datos
 */
export async function dibujarCertificado(lienzo, datos) {
  await Promise.all(
    ['700 54px Sora', '600 64px Sora', '500 28px Sora', '400 26px Inter', '600 22px Inter'].map((f) =>
      document.fonts?.load(f).catch(() => {}),
    ),
  );
  lienzo.width = ANCHO;
  lienzo.height = ALTO;
  const ctx = lienzo.getContext('2d');
  const centro = ANCHO / 2;
  const tinta = '#1c1a33';
  const suave = '#55537a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  fondo(ctx);
  emblema(ctx, centro, 178, 62);

  ctx.font = '600 22px Inter, system-ui, sans-serif';
  espaciado(ctx, '8px');
  ctx.fillStyle = '#7c5cf0';
  ctx.fillText(datos.completo ? 'CERTIFICADO DE PROGRAMA COMPLETO' : 'CERTIFICADO DE NIVEL', centro, 305);
  espaciado(ctx, '0px');

  ctx.font = '700 54px Sora, system-ui, sans-serif';
  ctx.fillStyle = tinta;
  ctx.fillText(`Nivel ${datos.nivel} · ${datos.nombreNivel}`, centro, 380, ANCHO - 240);

  ctx.font = '400 26px Inter, system-ui, sans-serif';
  ctx.fillStyle = suave;
  ctx.fillText('Se otorga a', centro, 445);

  let tam = 64;
  ctx.font = `600 ${tam}px Sora, system-ui, sans-serif`;
  while (ctx.measureText(datos.nombre).width > 1150 && tam > 34) {
    tam -= 2;
    ctx.font = `600 ${tam}px Sora, system-ui, sans-serif`;
  }
  const ancho = ctx.measureText(datos.nombre).width;
  const tintaNombre = ctx.createLinearGradient(centro - ancho / 2, 0, centro + ancho / 2, 0);
  tintaNombre.addColorStop(0, '#6d28d9');
  tintaNombre.addColorStop(1, '#0e7490');
  ctx.fillStyle = tintaNombre;
  ctx.fillText(datos.nombre, centro, 525);

  const linea = ctx.createLinearGradient(centro - 320, 0, centro + 320, 0);
  linea.addColorStop(0, 'rgba(183, 121, 31, 0)');
  linea.addColorStop(0.5, 'rgba(183, 121, 31, 0.9)');
  linea.addColorStop(1, 'rgba(183, 121, 31, 0)');
  ctx.fillStyle = linea;
  ctx.fillRect(centro - 320, 552, 640, 2);

  ctx.font = '400 26px Inter, system-ui, sans-serif';
  ctx.fillStyle = suave;
  const motivo = datos.completo
    ? `por completar los tres niveles del programa de coaching ontológico, con la evaluación final aprobada el ${fechaLarga.format(new Date(datos.fecha))} (${datos.puntuacion}/100).`
    : `por aprobar la evaluación del nivel el ${fechaLarga.format(new Date(datos.fecha))}, con ${datos.puntuacion}/100.`;
  let y = 605;
  for (const l of partir(ctx, motivo, 1100, 2)) {
    ctx.fillText(l, centro, y);
    y += 36;
  }

  // Lo más personal: sus propias frases del recorrido; si no hay, los logros evaluados.
  y += 34;
  const conCitas = datos.citas.length > 0;
  ctx.font = '600 20px Inter, system-ui, sans-serif';
  espaciado(ctx, '5px');
  ctx.fillStyle = '#b7791f';
  ctx.fillText(conCitas ? 'EN TUS PALABRAS' : 'LO QUE LOGRASTE', centro, y);
  espaciado(ctx, '0px');
  y += 48;
  const limite = 930;
  if (conCitas) {
    ctx.font = 'italic 500 28px Sora, system-ui, sans-serif';
    ctx.fillStyle = tinta;
    for (const cita of datos.citas.slice(0, 3)) {
      const lineas = partir(ctx, `«${cita}»`, 1150, 2);
      if (y + (lineas.length - 1) * 38 > limite) break;
      for (const l of lineas) {
        ctx.fillText(l, centro, y);
        y += 38;
      }
      y += 12;
    }
  } else {
    ctx.font = '400 24px Inter, system-ui, sans-serif';
    for (const logro of datos.logros.slice(0, 3)) {
      if (y > limite) break;
      const texto = partir(ctx, logro, 1050, 1)[0];
      const marca = '✓  ';
      const total = ctx.measureText(marca + texto).width;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#059669';
      ctx.fillText(marca, centro - total / 2, y);
      ctx.fillStyle = tinta;
      ctx.fillText(texto, centro - total / 2 + ctx.measureText(marca).width, y);
      ctx.textAlign = 'center';
      y += 38;
    }
  }

  // Pie: firma del coach a la izquierda, la app a la derecha.
  const pie = 1010;
  ctx.fillStyle = 'rgba(28, 26, 51, 0.25)';
  ctx.fillRect(210, pie - 46, 300, 1.5);
  ctx.fillRect(ANCHO - 510, pie - 46, 300, 1.5);
  ctx.font = '600 30px Sora, system-ui, sans-serif';
  ctx.fillStyle = tinta;
  ctx.fillText(datos.coach, 360, pie);
  ctx.fillText('Coach Ontológico', ANCHO - 360, pie);
  ctx.font = '400 20px Inter, system-ui, sans-serif';
  ctx.fillStyle = suave;
  ctx.fillText('Tu coach', 360, pie + 32);
  ctx.fillText('Lenguaje · Emoción · Cuerpo', ANCHO - 360, pie + 32);
}
