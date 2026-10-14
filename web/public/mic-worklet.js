// Captura el micrófono, lo reduce a 16 kHz mono y lo entrega en bloques de
// 100 ms como PCM de 16 bits (el formato que pide Gemini Live).
const FRECUENCIA_DESTINO = 16000;
const MUESTRAS_POR_BLOQUE = 1600;

class CapturaMicrofono extends AudioWorkletProcessor {
  constructor() {
    super();
    this.paso = sampleRate / FRECUENCIA_DESTINO;
    this.posicion = 0;
    this.bloque = new Int16Array(MUESTRAS_POR_BLOQUE);
    this.llenas = 0;
  }

  process(entradas) {
    const canal = entradas[0]?.[0];
    if (!canal) return true;

    // Remuestreo por interpolación lineal desde la frecuencia del dispositivo.
    while (this.posicion < canal.length) {
      const i = Math.floor(this.posicion);
      const fraccion = this.posicion - i;
      const siguiente = i + 1 < canal.length ? canal[i + 1] : canal[i];
      const muestra = canal[i] + (siguiente - canal[i]) * fraccion;
      const limitada = Math.max(-1, Math.min(1, muestra));
      this.bloque[this.llenas++] = limitada < 0 ? limitada * 0x8000 : limitada * 0x7fff;

      if (this.llenas === MUESTRAS_POR_BLOQUE) {
        this.port.postMessage(this.bloque.buffer, [this.bloque.buffer]);
        this.bloque = new Int16Array(MUESTRAS_POR_BLOQUE);
        this.llenas = 0;
      }
      this.posicion += this.paso;
    }
    this.posicion -= canal.length;
    return true;
  }
}

registerProcessor('captura-microfono', CapturaMicrofono);
