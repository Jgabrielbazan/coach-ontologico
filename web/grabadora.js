// Grabadora del laboratorio de oratoria: captura el micrófono a 16 kHz (el mismo
// procesador que usa la sesión con el coach), mide en el aparato el tiempo
// hablando y las pausas largas, y arma un WAV para analizarlo.
import { aBase64 } from './audio.js';

const FRECUENCIA = 16000;
const SEG_POR_BLOQUE = 0.1;
// Volumen (RMS de 0 a 1) a partir del cual consideramos que hay voz.
const UMBRAL_VOZ = 0.015;
// Un silencio de 1,2 s o más dentro del discurso cuenta como pausa larga.
const BLOQUES_PAUSA_LARGA = 12;

export class Grabadora {
  /** @param {{ idDispositivo?: string, alNivel?: (nivel: number, segundos: number) => void }} opciones */
  constructor({ idDispositivo = '', alNivel = () => {} } = {}) {
    this.idDispositivo = idDispositivo;
    this.alNivel = alNivel;
    this.bloques = [];
    this.voz = []; // por bloque: ¿hubo voz?
  }

  async iniciar() {
    const audio = { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 };
    try {
      this.flujo = await navigator.mediaDevices.getUserMedia({
        audio: this.idDispositivo ? { ...audio, deviceId: { exact: this.idDispositivo } } : audio,
      });
    } catch (err) {
      if (!this.idDispositivo || err.name !== 'OverconstrainedError') throw err;
      this.flujo = await navigator.mediaDevices.getUserMedia({ audio });
    }
    this.contexto = new AudioContext();
    if (this.contexto.state === 'suspended') await this.contexto.resume();
    await this.contexto.audioWorklet.addModule('/mic-worklet.js');
    this.fuente = this.contexto.createMediaStreamSource(this.flujo);
    this.nodo = new AudioWorkletNode(this.contexto, 'captura-microfono');
    this.nodo.port.onmessage = (e) => {
      const bloque = new Int16Array(e.data);
      let suma = 0;
      for (const muestra of bloque) suma += (muestra / 32768) ** 2;
      const rms = Math.sqrt(suma / bloque.length);
      this.bloques.push(bloque);
      this.voz.push(rms > UMBRAL_VOZ);
      this.alNivel(Math.min(1, rms * 6), this.bloques.length * SEG_POR_BLOQUE);
    };
    this.fuente.connect(this.nodo);
    const silencio = this.contexto.createGain();
    silencio.gain.value = 0;
    this.nodo.connect(silencio).connect(this.contexto.destination);
  }

  get segundos() {
    return this.bloques.length * SEG_POR_BLOQUE;
  }

  /** Detiene la captura y devuelve el WAV en base64 y lo medido en el aparato. */
  detener() {
    this.flujo?.getTracks().forEach((t) => t.stop());
    this.nodo?.disconnect();
    this.fuente?.disconnect();
    this.contexto?.close();
    return { audio: aBase64(armarWav(this.bloques)), ...medirPausas(this.voz), duracion: Math.round(this.segundos) };
  }

  cancelar() {
    this.flujo?.getTracks().forEach((t) => t.stop());
    this.contexto?.close();
  }
}

/** Tiempo hablando (de la primera a la última voz) y pausas largas dentro del discurso. */
export function medirPausas(voz) {
  const primera = voz.indexOf(true);
  const ultima = voz.lastIndexOf(true);
  if (primera < 0) return { tiempoHablando: 0, pausasLargas: 0 };
  let pausasLargas = 0;
  let silencio = 0;
  for (let i = primera; i <= ultima; i++) {
    if (voz[i]) {
      if (silencio >= BLOQUES_PAUSA_LARGA) pausasLargas++;
      silencio = 0;
    } else {
      silencio++;
    }
  }
  return { tiempoHablando: Math.round((ultima - primera + 1) * SEG_POR_BLOQUE), pausasLargas };
}

/** WAV PCM de 16 bits, mono, 16 kHz. */
function armarWav(bloques) {
  const muestras = bloques.reduce((total, b) => total + b.length, 0);
  const buffer = new ArrayBuffer(44 + muestras * 2);
  const vista = new DataView(buffer);
  const texto = (posicion, valor) => [...valor].forEach((c, i) => vista.setUint8(posicion + i, c.charCodeAt(0)));
  texto(0, 'RIFF');
  vista.setUint32(4, 36 + muestras * 2, true);
  texto(8, 'WAVE');
  texto(12, 'fmt ');
  vista.setUint32(16, 16, true);
  vista.setUint16(20, 1, true); // PCM
  vista.setUint16(22, 1, true); // mono
  vista.setUint32(24, FRECUENCIA, true);
  vista.setUint32(28, FRECUENCIA * 2, true);
  vista.setUint16(32, 2, true);
  vista.setUint16(34, 16, true);
  texto(36, 'data');
  vista.setUint32(40, muestras * 2, true);
  let posicion = 44;
  for (const bloque of bloques) {
    new Int16Array(buffer, posicion, bloque.length).set(bloque);
    posicion += bloque.length * 2;
  }
  return buffer;
}
