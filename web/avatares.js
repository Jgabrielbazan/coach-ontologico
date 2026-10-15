// Avatares del usuario: cabecitas de animales dibujadas en SVG (sin imágenes externas).
// Femeninos y masculinos, tiernos y rudos. Los ids coinciden con AVATARES del servidor.

const TINTA = '#2b2140';

// ---------- Piezas comunes ----------

/** Ojos grandes y brillantes (tiernos). */
const ojosTiernos = (y, separacion = 12, pestanas = false) =>
  [-1, 1]
    .map((lado) => {
      const x = 50 + lado * separacion;
      const pestana = pestanas
        ? `<path d="M${x + lado * 4.2} ${y - 3.6} l${lado * 3.4} -2.6 M${x + lado * 5} ${y - 0.8} l${lado * 3.6} -0.8" stroke="${TINTA}" stroke-width="1.5" stroke-linecap="round"/>`
        : '';
      return `<ellipse cx="${x}" cy="${y}" rx="5" ry="6" fill="${TINTA}"/>
        <circle cx="${x + 1.8}" cy="${y - 2.2}" r="1.9" fill="#fff"/>
        <circle cx="${x - 1.6}" cy="${y + 2}" r="0.9" fill="#fff"/>${pestana}`;
    })
    .join('');

/** Ojos entrecerrados con cejas en ángulo (rudos). */
const ojosRudos = (y, separacion = 12, piel, pestanas = false) =>
  [-1, 1]
    .map((lado) => {
      const x = 50 + lado * separacion;
      const pestana = pestanas
        ? `<path d="M${x + lado * 4} ${y - 2.5} l${lado * 4} -2" stroke="${TINTA}" stroke-width="1.6" stroke-linecap="round"/>`
        : '';
      return `<ellipse cx="${x}" cy="${y}" rx="4.6" ry="4.6" fill="${TINTA}"/>
        <circle cx="${x + 1.5}" cy="${y + 0.6}" r="1.3" fill="#fff"/>
        <path d="M${x - 6} ${y - 6.5} L${x + 6} ${y - 6.5} L${x - lado * 6} ${y - 0.2} Z" fill="${piel}"/>
        <path d="M${x + lado * 6.5} ${y - 9.5} L${x - lado * 5} ${y - 5}" stroke="${TINTA}" stroke-width="2.6" stroke-linecap="round"/>${pestana}`;
    })
    .join('');

const mejillas = (y, separacion = 20, color = '#ff8fab') =>
  `<ellipse cx="${50 - separacion}" cy="${y}" rx="5.5" ry="3.6" fill="${color}" opacity="0.55"/>
   <ellipse cx="${50 + separacion}" cy="${y}" rx="5.5" ry="3.6" fill="${color}" opacity="0.55"/>`;

const bigotes = (y, color = TINTA) =>
  `<g stroke="${color}" stroke-width="1.3" stroke-linecap="round" opacity="0.55">
     <path d="M30 ${y} l-12 -2 M30 ${y + 4} l-12 2 M70 ${y} l12 -2 M70 ${y + 4} l12 2"/>
   </g>`;

const sonrisa = (y, ancho = 4) =>
  `<path d="M50 ${y} q-${ancho * 0.8} ${ancho} -${ancho * 1.6} 0.6 M50 ${y} q${ancho * 0.8} ${ancho} ${ancho * 1.6} 0.6"
     stroke="${TINTA}" stroke-width="2" fill="none" stroke-linecap="round"/>`;

/** Sonrisa de lado, segura, con un colmillo. */
const sonrisaRuda = (y) =>
  `<path d="M41 ${y} q9 6 18 -2" stroke="${TINTA}" stroke-width="2.2" fill="none" stroke-linecap="round"/>
   <path d="M53.5 ${y + 2.4} l1.8 4 l1.6 -4.6 Z" fill="#fff" stroke="${TINTA}" stroke-width="0.9" stroke-linejoin="round"/>`;

const fondo = (color) => `<circle cx="50" cy="50" r="50" fill="${color}"/>`;

const svg = (contenido) =>
  `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${contenido}</svg>`;

// ---------- Los avatares ----------

const gatita = svg(`
  ${fondo('#ffe1ec')}
  <path d="M20 46 L24 13 L46 30 Z" fill="#f6b860"/><path d="M80 46 L76 13 L54 30 Z" fill="#f6b860"/>
  <path d="M26 38 L28 21 L40 30 Z" fill="#ff9fb7"/><path d="M74 38 L72 21 L60 30 Z" fill="#ff9fb7"/>
  <ellipse cx="50" cy="58" rx="33" ry="29" fill="#f6b860"/>
  <path d="M50 31 v9 M42 32 l2.5 7 M58 32 l-2.5 7" stroke="#dc8a2c" stroke-width="3.2" stroke-linecap="round"/>
  <ellipse cx="50" cy="70" rx="14" ry="10" fill="#fff3e0"/>
  ${ojosTiernos(57, 13, true)}
  ${mejillas(67, 21)}
  <path d="M46.5 64.5 h7 l-3.5 4 Z" fill="#ef6f8f"/>
  ${sonrisa(68.5)}
  ${bigotes(66)}
  <g transform="translate(70 18) rotate(18)">
    <path d="M0 0 L-11 -7 L-11 7 Z M0 0 L11 -7 L11 7 Z" fill="#ff5c93"/><circle r="3.6" fill="#ff86ad"/>
  </g>`);

const coneja = svg(`
  ${fondo('#dcf5ea')}
  <g transform="rotate(-10 38 30)"><ellipse cx="38" cy="24" rx="9" ry="22" fill="#f8f4f7"/><ellipse cx="38" cy="26" rx="4.5" ry="16" fill="#ffb3c7"/></g>
  <g transform="rotate(10 62 30)"><ellipse cx="62" cy="24" rx="9" ry="22" fill="#f8f4f7"/><ellipse cx="62" cy="26" rx="4.5" ry="16" fill="#ffb3c7"/></g>
  <ellipse cx="50" cy="61" rx="31" ry="27" fill="#f8f4f7"/>
  ${ojosTiernos(58, 12, true)}
  ${mejillas(68, 20)}
  <ellipse cx="50" cy="66" rx="3.4" ry="2.6" fill="#ef6f8f"/>
  ${sonrisa(68.5, 3.5)}
  <rect x="46.6" y="70.5" width="6.8" height="6" rx="1.4" fill="#fff" stroke="${TINTA}" stroke-width="1"/>
  <path d="M50 70.5 v6" stroke="${TINTA}" stroke-width="0.8"/>
  <g transform="translate(29 39)">
    ${[0, 72, 144, 216, 288].map((a) => `<circle cx="${Math.cos((a * Math.PI) / 180) * 4.5}" cy="${Math.sin((a * Math.PI) / 180) * 4.5}" r="3.6" fill="#ffd166"/>`).join('')}
    <circle r="2.8" fill="#f78c2a"/>
  </g>`);

const leona = svg(`
  ${fondo('#fff0d2')}
  ${Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2;
    return `<circle cx="${(50 + Math.cos(a) * 33).toFixed(1)}" cy="${(55 + Math.sin(a) * 31).toFixed(1)}" r="11" fill="${i % 2 ? '#b8611f' : '#cf7a2c'}"/>`;
  }).join('')}
  <circle cx="30" cy="33" r="7" fill="#e9a54b"/><circle cx="70" cy="33" r="7" fill="#e9a54b"/>
  <ellipse cx="50" cy="57" rx="25" ry="24" fill="#f2b65c"/>
  <ellipse cx="50" cy="69" rx="12" ry="9" fill="#fff1d9"/>
  ${ojosRudos(55, 10.5, '#f2b65c', true)}
  <path d="M46.5 63.5 h7 l-3.5 4 Z" fill="#7a3b16"/>
  ${sonrisaRuda(70)}
  <circle cx="26.5" cy="66" r="2.6" fill="none" stroke="#ffc83d" stroke-width="1.8"/>`);

const osito = svg(`
  ${fondo('#e0e9ff')}
  <circle cx="27" cy="32" r="12" fill="#a8744f"/><circle cx="73" cy="32" r="12" fill="#a8744f"/>
  <circle cx="27" cy="32" r="6.5" fill="#e3b591"/><circle cx="73" cy="32" r="6.5" fill="#e3b591"/>
  <ellipse cx="50" cy="56" rx="32" ry="29" fill="#a8744f"/>
  <ellipse cx="50" cy="68" rx="14" ry="11" fill="#e3b591"/>
  ${ojosTiernos(53, 13)}
  ${mejillas(64, 21, '#ff8f70')}
  <ellipse cx="50" cy="63" rx="5" ry="3.6" fill="${TINTA}"/>
  ${sonrisa(67.5)}
  <g transform="translate(50 88)">
    <path d="M0 0 L-12 -6 L-12 6 Z M0 0 L12 -6 L12 6 Z" fill="#3b82f6"/><circle r="3.4" fill="#60a5fa"/>
  </g>`);

const lobo = svg(`
  ${fondo('#e3e6f0')}
  <path d="M18 44 L22 10 L44 30 Z" fill="#6f7891"/><path d="M82 44 L78 10 L56 30 Z" fill="#6f7891"/>
  <path d="M25 37 L26 20 L37 30 Z" fill="#454c61"/><path d="M75 37 L74 20 L63 30 Z" fill="#454c61"/>
  <path d="M17 52 Q20 30 50 27 Q80 30 83 52 Q84 74 66 84 L50 90 L34 84 Q16 74 17 52 Z" fill="#7d869e"/>
  <path d="M33 62 Q50 50 67 62 Q66 80 50 87 Q34 80 33 62 Z" fill="#eef0f6"/>
  ${ojosRudos(52, 13, '#7d869e')}
  <path d="M62.5 41 l3 15" stroke="#4b5268" stroke-width="1.8" stroke-linecap="round"/>
  <ellipse cx="50" cy="66" rx="5.6" ry="4" fill="${TINTA}"/>
  ${sonrisaRuda(73)}`);

const tigre = svg(`
  ${fondo('#ffe3cc')}
  <circle cx="26" cy="31" r="10" fill="#f08a24"/><circle cx="74" cy="31" r="10" fill="#f08a24"/>
  <circle cx="26" cy="31" r="5" fill="#fff4e6"/><circle cx="74" cy="31" r="5" fill="#fff4e6"/>
  <ellipse cx="50" cy="57" rx="33" ry="29" fill="#f08a24"/>
  <g fill="#2b2140">
    <path d="M50 29 l-4 9 h8 Z"/><path d="M41 30 l-1 7 l4 -1 Z"/><path d="M59 30 l1 7 l-4 -1 Z"/>
    <path d="M17 52 l12 2 l-12 4 Z"/><path d="M18 62 l11 0 l-10 5 Z"/>
    <path d="M83 52 l-12 2 l12 4 Z"/><path d="M82 62 l-11 0 l10 5 Z"/>
  </g>
  <path d="M30 66 Q50 54 70 66 Q66 84 50 86 Q34 84 30 66 Z" fill="#fff4e6"/>
  ${ojosRudos(53, 12.5, '#f08a24')}
  <path d="M46 63 h8 l-4 4.5 Z" fill="#e0607e"/>
  ${sonrisaRuda(71)}
  ${bigotes(68)}`);

export const AVATARES = {
  gatita: { nombre: 'Gatita', genero: 'femenino', estilo: 'Tierna', svg: gatita },
  coneja: { nombre: 'Coneja', genero: 'femenino', estilo: 'Tierna', svg: coneja },
  leona: { nombre: 'Leona', genero: 'femenino', estilo: 'Ruda', svg: leona },
  osito: { nombre: 'Osito', genero: 'masculino', estilo: 'Tierno', svg: osito },
  lobo: { nombre: 'Lobo', genero: 'masculino', estilo: 'Rudo', svg: lobo },
  tigre: { nombre: 'Tigre', genero: 'masculino', estilo: 'Rudo', svg: tigre },
};
