// Acceso de varias personas: el administrador (EMAIL_PERMITIDO) invita a otras
// cuentas de Google, cada una con su propio límite de minutos por mes.
// Reglas puras (sin base de datos), con pruebas.
import { diasUltimaSemana, minutosDelMes, normalizar } from './progreso.js';

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const LIMITE_INVITADO_MAXIMO = 3000;

export const normalizarCorreo = (correo) => String(correo ?? '').trim().toLowerCase();

/** Valida una invitación; devuelve { correo, limiteMensualMin } o lanza un Error con el motivo. */
export function validarInvitacion({ email, limiteMensualMin } = {}, limitePorDefecto = 120) {
  const correo = normalizarCorreo(email);
  if (!CORREO.test(correo) || correo.length > 200) throw new Error('Escribe un correo válido.');
  // Sin límite indicado (vacío, null o undefined) se usa el de por defecto.
  const limite = limiteMensualMin == null || limiteMensualMin === '' ? limitePorDefecto : Math.round(Number(limiteMensualMin));
  if (!Number.isFinite(limite) || limite < 0 || limite > LIMITE_INVITADO_MAXIMO) {
    throw new Error(`El límite tiene que ser entre 0 y ${LIMITE_INVITADO_MAXIMO} minutos por mes.`);
  }
  return { correo, limiteMensualMin: limite };
}

/**
 * Quién es la persona que llama: administrador, invitada o sin acceso.
 * @param {{ email?: string, email_verified?: boolean } | undefined} token
 * @param {string} correoAdmin
 * @param {{ limiteMensualMin?: number } | null} invitacion documento de invitados/{correo}, si existe
 */
export function resolverAcceso(token, correoAdmin, invitacion) {
  const correo = normalizarCorreo(token?.email);
  if (!token?.email_verified || !correo) return { acceso: false, correo };
  if (correo === normalizarCorreo(correoAdmin)) return { acceso: true, admin: true, correo };
  if (invitacion) return { acceso: true, admin: false, correo, limiteMensualMin: invitacion.limiteMensualMin };
  return { acceso: false, correo };
}

/** Lo que el administrador ve de cada persona en el panel (sin datos íntimos: ni perfil ni sesiones). */
export function resumenUsuario(datos, ahora = new Date()) {
  const p = normalizar(datos);
  const ultima = [...p.sesiones].map((s) => s.fecha).sort().at(-1) ?? null;
  return {
    nivel: p.nivel,
    programaCompleto: p.programaCompleto,
    minutosMes: minutosDelMes(p, ahora),
    sesionesMes: p.uso?.mes === ahora.toISOString().slice(0, 7) ? p.uso.sesiones : 0,
    diasSemana: diasUltimaSemana(p, ahora),
    ultimaSesion: ultima,
  };
}
