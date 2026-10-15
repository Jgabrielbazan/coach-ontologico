// "Organismo" de fibras: cientos de partículas siguen un campo de flujo que gira
// y dejan estelas largas y finas, como un ovillo de hilos de colores con puntos
// de luz. La voz (tuya o del coach) lo agita, lo expande y lo hace más intenso.

// Modo día: colores saturados que se superponen sobre fondo claro.
const PALETAS_DIA = {
  inactivo: ['#14b8a6', '#06b6d4', '#34d399', '#8b5cf6', '#d946ef', '#f472b6', '#6366f1', '#fb923c'],
  conectando: ['#6366f1', '#06b6d4', '#8b5cf6', '#38bdf8', '#a78bfa', '#14b8a6', '#818cf8', '#22d3ee'],
  escuchando: ['#14b8a6', '#06b6d4', '#34d399', '#3b82f6', '#8b5cf6', '#22d3ee', '#10b981', '#6366f1'],
  hablando: ['#d946ef', '#f472b6', '#fb923c', '#8b5cf6', '#14b8a6', '#c026d3', '#f59e0b', '#06b6d4'],
  silenciado: ['#94a3b8', '#7c8aa5', '#a5b4c8', '#8b93ad', '#9ca3af', '#7f8ea8', '#a1a9bd', '#8a96b0'],
};
// Modo noche: tonos más claros que se suman entre sí y brillan sobre fondo oscuro.
const PALETAS_NOCHE = {
  inactivo: ['#5eead4', '#7dd3fc', '#86efac', '#a78bfa', '#f0abfc', '#f9a8d4', '#818cf8', '#fdba74'],
  conectando: ['#818cf8', '#7dd3fc', '#a78bfa', '#93c5fd', '#c4b5fd', '#5eead4', '#a5b4fc', '#67e8f9'],
  escuchando: ['#5eead4', '#7dd3fc', '#86efac', '#93c5fd', '#a78bfa', '#67e8f9', '#6ee7b7', '#818cf8'],
  hablando: ['#f0abfc', '#f9a8d4', '#fdba74', '#c4b5fd', '#5eead4', '#e879f9', '#fcd34d', '#7dd3fc'],
  silenciado: ['#64748b', '#566179', '#6b7690', '#5b6480', '#6b7280', '#55617a', '#6f7891', '#5d6984'],
};
// Colores vivos de los puntos que salpican los hilos.
const PUNTOS_DIA = ['#ef4444', '#facc15', '#3b82f6', '#22c55e', '#d946ef', '#06b6d4', '#1e1b4b', '#f97316'];
const PUNTOS_NOCHE = ['#f87171', '#fde047', '#60a5fa', '#4ade80', '#f0abfc', '#22d3ee', '#ffffff', '#fb923c'];

const hexARgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const aRgb = (paletas) => Object.fromEntries(Object.entries(paletas).map(([k, v]) => [k, v.map(hexARgb)]));
const TEMAS = {
  dia: { paletas: aRgb(PALETAS_DIA), puntos: PUNTOS_DIA, mezcla: 'source-over', alfa: 0.55 },
  noche: { paletas: aRgb(PALETAS_NOCHE), puntos: PUNTOS_NOCHE, mezcla: 'lighter', alfa: 0.3 },
};
const GRUPOS = PALETAS_DIA.inactivo.length;
const temaActual = () => (document.documentElement.dataset.tema === 'noche' ? TEMAS.noche : TEMAS.dia);

// Ondas del campo de flujo: [kx, ky, velocidad, amplitud]. Distintas direcciones
// y escalas para que el ovillo tenga volumen, se enrede y lance arcos largos.
const ONDAS = [
  [1.7, 1.2, 0.13, 1],
  [-1.3, 2.2, -0.11, 0.9],
  [2.9, -1.8, 0.19, 0.7],
  [-3.9, -3.2, 0.23, 0.55],
  [5.6, 4.4, -0.29, 0.38],
  [-7.2, 5.1, 0.33, 0.22],
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
    this.colores = temaActual().paletas.inactivo.map((c) => [...c]);
    this.movimientoReducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.particulas = [];

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
    // Menos fibras en pantallas chicas para que vaya fluido en el móvil.
    const cantidad = Math.round(Math.min(1500, Math.max(500, this.ancho * this.alto * 0.0038)));
    this.particulas = Array.from({ length: cantidad }, (_, i) => this.nacer({ indice: i }, true));
  }

  /** Coloca una fibra nueva en algún punto del cuerpo del organismo. */
  nacer(p, precalentar = false) {
    const a = Math.random() * Math.PI * 2;
    const d = Math.pow(Math.random(), 1.1); // más densidad en el núcleo
    p.x = this.ancho / 2 + Math.cos(a) * d * this.ancho * 0.3;
    p.y = this.alto / 2 + Math.sin(a) * d * this.alto * 0.22;
    p.estela = [p.x, p.y];
    p.largo = 50 + Math.floor(Math.random() * 110); // puntos de estela
    p.vida = 0;
    p.duracion = 220 + Math.random() * 380;
    p.grupo = p.indice % GRUPOS;
    // Una de cada ocho es "exploradora": se aleja más y dibuja los arcos largos.
    p.exploradora = p.indice % 8 === 0;
    // Algunas fibras llevan puntos de colores a lo largo de su recorrido.
    p.cuentas = p.indice % 13 === 0 ? (p.indice / 13) % PUNTOS_DIA.length | 0 : null;
    if (precalentar) {
      // Al arrancar, avanzamos un poco para no empezar con todo vacío.
      const pasos = Math.floor(Math.random() * p.largo);
      for (let i = 0; i < pasos; i++) this.mover(p, 0, 0.1, 1.4);
      p.vida = Math.random() * p.duracion * 0.6;
    }
    return p;
  }

  /**
   * Dirección del flujo en (x, y): el "rotor" de una suma de ondas. Gira y se
   * enreda pero nunca converge en un punto, así las fibras forman un ovillo.
   */
  flujo(x, y, t, turbulencia) {
    const escala = Math.min(this.ancho, this.alto);
    const px = (x - this.ancho / 2) / escala;
    const py = (y - this.alto / 2) / escala;
    let dx = 0;
    let dy = 0;
    for (const [kx, ky, w, amp] of ONDAS) {
      const c = Math.cos(kx * px + ky * py + w * t) * amp;
      dx += kx * c;
      dy += ky * c;
    }
    // Ondas finas que aparecen con la voz y agitan las fibras.
    const c2 = Math.cos(9 * px - 7 * py + t * 2) * turbulencia * 0.28;
    dx += 9 * c2;
    dy -= 7 * c2;
    return [dy, -dx];
  }

  mover(p, t, energia, velocidad) {
    const [fx, fy] = this.flujo(p.x, p.y, t, energia);
    const modulo = Math.hypot(fx, fy) || 1;
    let vx = (fx / modulo) * velocidad;
    let vy = (fy / modulo) * velocidad;

    // Fuerza suave hacia el centro para mantener la forma; las exploradoras se escapan más.
    const rx = this.ancho * (0.33 + energia * 0.05);
    const ry = this.alto * (0.24 + energia * 0.05);
    const dx = (p.x - this.ancho / 2) / rx;
    const dy = (p.y - this.alto / 2) / ry;
    const fuera = dx * dx + dy * dy;
    const limite = p.exploradora ? 1.4 : 0.5;
    if (fuera > limite) {
      vx -= dx * (fuera - limite) * 0.7;
      vy -= dy * (fuera - limite) * 0.7;
    }
    p.x += vx;
    p.y += vy;
    p.estela.push(p.x, p.y);
    return fuera;
  }

  cuadro(segundos) {
    const { ctx, ancho, alto } = this;
    if (!ancho || !alto || !this.particulas.length) return;
    const t = this.movimientoReducido ? segundos * 0.3 : segundos;

    const estado = this.obtenerEstado();
    const tema = temaActual();
    const destino = tema.paletas[estado] ?? tema.paletas.inactivo;
    this.colores.forEach((c, i) => c.forEach((v, j) => (c[j] = v + (destino[i][j] - v) * 0.04)));

    const crudo = this.obtenerNivel();
    this.nivel += (crudo - this.nivel) * (crudo > this.nivel ? 0.3 : 0.06);
    let objetivo = this.nivel;
    if (estado === 'conectando') objetivo = 0.3 + 0.2 * Math.sin(t * 4);
    if (estado === 'inactivo') objetivo = 0.1;
    if (estado === 'silenciado') objetivo = 0.03;
    this.energia += (objetivo - this.energia) * 0.08;
    const e = this.energia;
    const velocidad = (this.movimientoReducido ? 0.6 : 1.3) * (0.7 + e * 2.2);

    // 1) Mover todas las fibras.
    for (const p of this.particulas) {
      p.vida++;
      if (p.vida < p.duracion) {
        const fuera = this.mover(p, t, e, velocidad);
        if (p.estela.length > p.largo * 2) p.estela.splice(0, 2);
        // Las que se alejan demasiado se recogen y renacen en el núcleo (evita que se amontonen en el borde).
        if (fuera > (p.exploradora ? 3.5 : 1.5)) p.vida = p.duracion;
      } else {
        // Al morir, la estela se recoge desde la cola hasta desaparecer.
        p.estela.splice(0, 4);
        if (p.estela.length < 4) this.nacer(p);
      }
    }

    ctx.clearRect(0, 0, ancho, alto);
    ctx.globalCompositeOperation = tema.mezcla;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 2) Fibras, agrupadas por color (un solo trazo por grupo: mucho más rápido).
    ctx.lineWidth = 0.7 + e * 0.4;
    for (let g = 0; g < GRUPOS; g++) {
      const [r, gr, b] = this.colores[g];
      ctx.strokeStyle = `rgba(${r | 0}, ${gr | 0}, ${b | 0}, ${tema.alfa + e * 0.3})`;
      ctx.beginPath();
      for (const p of this.particulas) {
        if (p.grupo !== g || p.estela.length < 4) continue;
        const s = p.estela;
        ctx.moveTo(s[0], s[1]);
        for (let i = 2; i < s.length; i += 2) ctx.lineTo(s[i], s[i + 1]);
      }
      ctx.stroke();
    }

    // 3) Puntos de colores a lo largo de algunas fibras, como cuentas.
    const tam = 1.3 + e * 1.2;
    for (const p of this.particulas) {
      if (p.cuentas === null || p.estela.length < 4) continue;
      ctx.fillStyle = tema.puntos[p.cuentas];
      const s = p.estela;
      for (let i = s.length - 2; i >= 0; i -= 22) {
        ctx.beginPath();
        ctx.arc(s[i], s[i + 1], tam * (0.4 + (0.6 * i) / s.length), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalCompositeOperation = 'source-over';
  }
}
