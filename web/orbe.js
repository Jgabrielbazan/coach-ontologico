// Núcleo: una esfera 3D de miles de partículas, con malla holográfica, anillos
// orbitales y un núcleo de luz. Gira despacio; la voz (tuya o del coach) hace
// ondular su superficie y, cuando habla el coach, emite pulsos de energía.

// Tres tonos por estado: [principal, secundario, acento].
const TEMAS = {
  dia: {
    mezcla: 'source-over',
    nucleo: 0.18,
    malla: 0.11,
    paletas: {
      inactivo: ['#4c1d95', '#6d28d9', '#0e7490'],
      conectando: ['#3730a3', '#6366f1', '#0891b2'],
      escuchando: ['#155e75', '#0891b2', '#4338ca'],
      hablando: ['#86198f', '#c026d3', '#ea580c'],
      silenciado: ['#64748b', '#94a3b8', '#475569'],
    },
  },
  noche: {
    mezcla: 'lighter',
    nucleo: 0.45,
    malla: 0.14,
    paletas: {
      inactivo: ['#a78bfa', '#c4b5fd', '#67e8f9'],
      conectando: ['#818cf8', '#a5b4fc', '#67e8f9'],
      escuchando: ['#67e8f9', '#5eead4', '#a5b4fc'],
      hablando: ['#f0abfc', '#f9a8d4', '#fdba74'],
      silenciado: ['#64748b', '#94a3b8', '#475569'],
    },
  },
};

const hexARgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
for (const tema of Object.values(TEMAS)) {
  for (const estado of Object.keys(tema.paletas)) tema.paletas[estado] = tema.paletas[estado].map(hexARgb);
}
const temaActual = () => (document.documentElement.dataset.tema === 'noche' ? TEMAS.noche : TEMAS.dia);
const rgba = ([r, g, b], a) => `rgba(${r | 0}, ${g | 0}, ${b | 0}, ${a})`;

const CAPAS_PROFUNDIDAD = 6;

// Anillos orbitales: inclinación (x, z), radio relativo, cantidad de puntos, velocidad.
const ANILLOS = [
  { ix: 1.15, iz: 0.35, radio: 1.28, puntos: 160, velocidad: 0.22 },
  { ix: -0.55, iz: -0.9, radio: 1.46, puntos: 190, velocidad: -0.15 },
  { ix: 0.25, iz: 1.35, radio: 1.64, puntos: 220, velocidad: 0.1 },
];

export class Orbe {
  /**
   * @param {HTMLCanvasElement} lienzo
   * @param {{ obtenerEstado: () => string, obtenerNivel?: () => number }} fuentes
   */
  constructor(lienzo, { obtenerEstado, obtenerNivel = () => 0 }) {
    this.lienzo = lienzo;
    this.ctx = lienzo.getContext('2d');
    this.obtenerEstado = obtenerEstado;
    this.obtenerNivel = obtenerNivel;
    this.nivel = 0;
    this.energia = 0.1;
    this.giro = 0;
    this.anterior = 0;
    this.pulsos = [];
    this.proximoPulso = 0;
    this.colores = temaActual().paletas.inactivo.map((c) => [...c]);
    this.movimientoReducido = matchMedia('(prefers-reduced-motion: reduce)').matches;

    new ResizeObserver(() => this.ajustar()).observe(lienzo);
    this.ajustar();
    const bucle = (ms) => {
      this.cuadro(ms / 1000);
      requestAnimationFrame(bucle);
    };
    requestAnimationFrame(bucle);
  }

  ajustar() {
    const escala = Math.min(devicePixelRatio || 1, 2);
    this.ancho = this.lienzo.clientWidth;
    this.alto = this.lienzo.clientHeight;
    if (!this.ancho || !this.alto) return;
    this.lienzo.width = Math.round(this.ancho * escala);
    this.lienzo.height = Math.round(this.alto * escala);
    this.ctx.setTransform(escala, 0, 0, escala, 0, 0);

    // Puntos repartidos de forma pareja sobre la esfera (espiral de Fibonacci).
    const cantidad = this.ancho < 500 ? 2200 : 4200;
    this.esfera = new Float32Array(cantidad * 3);
    const dorado = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < cantidad; i++) {
      const y = 1 - (2 * (i + 0.5)) / cantidad;
      const r = Math.sqrt(1 - y * y);
      // Un poco de desorden para que no se note la trama regular de puntos.
      const a = i * dorado + (Math.random() - 0.5) * 0.35;
      this.esfera.set([Math.cos(a) * r, y, Math.sin(a) * r], i * 3);
    }
  }

  cuadro(segundos) {
    const { ctx, ancho, alto } = this;
    if (!ancho || !alto || !this.esfera) return;
    const lento = this.movimientoReducido ? 0.3 : 1;
    const t = segundos * lento;
    const dt = Math.min(0.05, segundos - this.anterior) * lento;
    this.anterior = segundos;

    // Estado, colores (con transición suave) y energía de la voz.
    const tema = temaActual();
    const estado = this.obtenerEstado();
    const destino = tema.paletas[estado] ?? tema.paletas.inactivo;
    this.colores.forEach((c, i) => c.forEach((v, j) => (c[j] = v + (destino[i][j] - v) * 0.05)));
    const crudo = this.obtenerNivel();
    this.nivel += (crudo - this.nivel) * (crudo > this.nivel ? 0.35 : 0.07);
    let objetivo = this.nivel;
    if (estado === 'conectando') objetivo = 0.25 + 0.2 * Math.sin(t * 5);
    if (estado === 'inactivo') objetivo = 0.06;
    if (estado === 'silenciado') objetivo = 0.02;
    this.energia += (objetivo - this.energia) * 0.08;
    const e = this.energia;

    this.giro += dt * (0.14 + e * 0.5);
    const inclinacion = 0.38 + Math.sin(t * 0.17) * 0.08;
    const [cy0, sy0] = [Math.cos(this.giro), Math.sin(this.giro)];
    const [cx0, sx0] = [Math.cos(inclinacion), Math.sin(inclinacion)];

    const cx = ancho / 2;
    const cy = alto / 2;
    const R = Math.min(ancho, alto) * 0.27 * (1 + e * 0.05);
    const foco = R * 3.2;

    // Rota (giro + inclinación) y proyecta en perspectiva un punto de la esfera unitaria.
    const proyectar = (x, y, z, radio) => {
      const x1 = x * cy0 - z * sy0;
      const z1 = x * sy0 + z * cy0;
      const y1 = y * cx0 - z1 * sx0;
      const z2 = y * sx0 + z1 * cx0;
      const p = foco / (foco - z2 * radio * R);
      return [cx + x1 * radio * R * p, cy + y1 * radio * R * p, z2, p];
    };

    ctx.clearRect(0, 0, ancho, alto);

    // 1) Núcleo de luz detrás de todo.
    // El brillo nunca pasa del borde del lienzo (si no, se ve un corte recto).
    const radioNucleo = Math.min(R * (1.5 + e * 0.5), Math.min(ancho, alto) * 0.49);
    const nucleo = ctx.createRadialGradient(cx, cy, 0, cx, cy, radioNucleo);
    nucleo.addColorStop(0, rgba(this.colores[1], tema.nucleo + e * 0.25));
    nucleo.addColorStop(0.45, rgba(this.colores[0], (tema.nucleo + e * 0.2) * 0.45));
    nucleo.addColorStop(1, rgba(this.colores[0], 0));
    ctx.fillStyle = nucleo;
    ctx.fillRect(0, 0, ancho, alto);

    ctx.globalCompositeOperation = tema.mezcla;

    // 2) Pulsos de energía cuando el coach habla.
    if (estado === 'hablando' && t > this.proximoPulso && e > 0.08) {
      this.pulsos.push({ inicio: t });
      this.proximoPulso = t + 0.55 - Math.min(0.3, e * 0.4);
    }
    this.pulsos = this.pulsos.filter((p) => t - p.inicio < 1.6);
    for (const p of this.pulsos) {
      const avance = (t - p.inicio) / 1.6;
      ctx.strokeStyle = rgba(this.colores[2], (1 - avance) * 0.35);
      ctx.lineWidth = 1.2 * (1 - avance) + 0.3;
      ctx.beginPath();
      ctx.arc(cx, cy, Math.min(R * (1.05 + avance * 0.9), Math.min(ancho, alto) * 0.48), 0, Math.PI * 2);
      ctx.stroke();
    }

    // 3) Anillos orbitales: la mitad trasera, antes que la esfera.
    const puntosAnillos = [];
    for (const [indice, anillo] of ANILLOS.entries()) {
      const [ci, si] = [Math.cos(anillo.ix), Math.sin(anillo.ix)];
      const [cz, sz] = [Math.cos(anillo.iz), Math.sin(anillo.iz)];
      const radio = anillo.radio * (1 + e * 0.15);
      for (let k = 0; k < anillo.puntos; k++) {
        const a = (k / anillo.puntos) * Math.PI * 2 + t * anillo.velocidad;
        // Círculo en el plano XZ, inclinado sobre X y luego sobre Z.
        let x = Math.cos(a);
        let y = 0;
        let z = Math.sin(a);
        [y, z] = [y * ci - z * si, y * si + z * ci];
        [x, y] = [x * cz - y * sz, x * sz + y * cz];
        const [px, py, pz, p] = proyectar(x, y, z, radio);
        // Pequeñas "cuentas" más brillantes cada tantos puntos.
        const cuenta = k % 14 === 0;
        puntosAnillos.push([px, py, pz, p, indice, cuenta]);
      }
    }
    const dibujarAnillos = (delante) => {
      for (const [px, py, pz, p, indice, cuenta] of puntosAnillos) {
        if (pz > 0 !== delante) continue;
        const alfa = (delante ? 0.75 : 0.22) * (cuenta ? 1 : 0.55);
        ctx.fillStyle = rgba(this.colores[indice === 1 ? 2 : 1], alfa);
        const tam = (cuenta ? 2.2 : 0.9) * p * (1 + e * 0.6);
        ctx.fillRect(px - tam / 2, py - tam / 2, tam, tam);
      }
    };
    dibujarAnillos(false);

    // 4) Malla holográfica (paralelos y meridianos), muy tenue.
    ctx.lineWidth = 0.6;
    ctx.strokeStyle = rgba(this.colores[0], tema.malla + e * 0.1);
    ctx.beginPath();
    for (let lat = -3; lat <= 3; lat++) {
      const y = lat / 4;
      const r = Math.sqrt(1 - y * y);
      for (let k = 0; k <= 72; k++) {
        const a = (k / 72) * Math.PI * 2;
        const [px, py] = proyectar(Math.cos(a) * r, y, Math.sin(a) * r, 1.015);
        k === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
    }
    for (let lon = 0; lon < 12; lon++) {
      const a = (lon / 12) * Math.PI;
      for (let k = 0; k <= 48; k++) {
        const b = (k / 48) * Math.PI * 2;
        const [px, py] = proyectar(Math.cos(a) * Math.sin(b), Math.cos(b), Math.sin(a) * Math.sin(b), 1.015);
        k === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
    }
    ctx.stroke();

    // 5) La esfera de partículas, agrupada por profundidad y color (pocos trazos, muy rápido).
    const amplitud = 0.03 + e * 0.11;
    const grupos = Array.from({ length: CAPAS_PROFUNDIDAD * 3 }, () => []);
    const s = this.esfera;
    for (let i = 0; i < s.length; i += 3) {
      const x = s[i];
      const y = s[i + 1];
      const z = s[i + 2];
      const onda =
        (Math.sin(x * 3.1 + t * 0.9) + Math.sin(y * 4.3 - t * 1.1) + Math.sin(z * 5.2 + t * 0.7)) / 3 +
        e * Math.sin(x * 9 + y * 7 - t * 6) * 0.8;
      const [px, py, pz, p] = proyectar(x, y, z, 1 + onda * amplitud);
      const capa = Math.min(CAPAS_PROFUNDIDAD - 1, ((pz + 1) / 2) * CAPAS_PROFUNDIDAD) | 0;
      // Color por "latitud" ondulada: bandas suaves que recorren la esfera.
      const banda = (y + Math.sin(x * 2 + t * 0.4) * 0.35 + 1.35) / 2.7;
      const color = Math.min(2, Math.max(0, (banda * 3) | 0));
      grupos[capa * 3 + color].push(px, py, p);
    }
    for (let capa = 0; capa < CAPAS_PROFUNDIDAD; capa++) {
      const delante = capa / (CAPAS_PROFUNDIDAD - 1); // 0 = atrás, 1 = adelante
      for (let color = 0; color < 3; color++) {
        const g = grupos[capa * 3 + color];
        if (!g.length) continue;
        ctx.fillStyle = rgba(this.colores[color], 0.12 + delante * 0.78);
        ctx.beginPath();
        for (let k = 0; k < g.length; k += 3) {
          const tam = (0.35 + delante * 0.95) * g[k + 2] * (1 + e * 0.5);
          ctx.moveTo(g[k] + tam, g[k + 1]);
          ctx.arc(g[k], g[k + 1], tam, 0, Math.PI * 2);
        }
        ctx.fill();
      }
    }

    // 6) Anillos: la mitad delantera, por encima de la esfera.
    dibujarAnillos(true);

    ctx.globalCompositeOperation = 'source-over';
  }
}
