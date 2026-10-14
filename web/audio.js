export function aBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binario = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binario += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binario);
}

function desdeBase64(texto) {
  const binario = atob(texto);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return bytes.buffer;
}

/** Micrófono → bloques PCM 16 kHz en base64. */
export class Microfono {
  constructor(alBloque) {
    this.alBloque = alBloque;
    this.silenciado = false;
  }

  async iniciar() {
    this.flujo = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
    });
    this.contexto = new AudioContext();
    await this.contexto.audioWorklet.addModule('/mic-worklet.js');
    this.fuente = this.contexto.createMediaStreamSource(this.flujo);
    this.nodo = new AudioWorkletNode(this.contexto, 'captura-microfono');
    this.nodo.port.onmessage = (e) => {
      if (!this.silenciado) this.alBloque(aBase64(e.data));
    };
    this.fuente.connect(this.nodo);
  }

  detener() {
    this.flujo?.getTracks().forEach((t) => t.stop());
    this.nodo?.disconnect();
    this.fuente?.disconnect();
    this.contexto?.close();
    this.flujo = this.contexto = this.fuente = this.nodo = null;
  }
}

/** Reproduce en cola los fragmentos PCM 24 kHz que manda Gemini. */
export class Reproductor {
  constructor(alCambiarEstado = () => {}) {
    this.alCambiarEstado = alCambiarEstado;
    this.fuentes = new Set();
    this.siguienteInicio = 0;
  }

  // Debe llamarse desde un gesto del usuario (clic) para que el navegador permita el audio.
  async preparar() {
    this.contexto ??= new AudioContext({ sampleRate: 24000 });
    if (this.contexto.state === 'suspended') await this.contexto.resume();
  }

  get hablando() {
    return this.fuentes.size > 0;
  }

  reproducir(base64) {
    const pcm = new Int16Array(desdeBase64(base64));
    const buffer = this.contexto.createBuffer(1, pcm.length, 24000);
    const datos = buffer.getChannelData(0);
    for (let i = 0; i < pcm.length; i++) datos[i] = pcm[i] / 0x8000;

    const fuente = this.contexto.createBufferSource();
    fuente.buffer = buffer;
    fuente.connect(this.contexto.destination);
    const inicio = Math.max(this.contexto.currentTime + 0.02, this.siguienteInicio);
    fuente.start(inicio);
    this.siguienteInicio = inicio + buffer.duration;

    const estabaCallado = !this.hablando;
    this.fuentes.add(fuente);
    if (estabaCallado) this.alCambiarEstado(true);
    fuente.onended = () => {
      this.fuentes.delete(fuente);
      if (!this.hablando) this.alCambiarEstado(false);
    };
  }

  /** Corta todo lo pendiente (cuando el usuario interrumpe al coach). */
  cortar() {
    for (const fuente of this.fuentes) {
      fuente.onended = null;
      try {
        fuente.stop();
      } catch {}
    }
    const hablaba = this.hablando;
    this.fuentes.clear();
    this.siguienteInicio = 0;
    if (hablaba) this.alCambiarEstado(false);
  }
}

/** Cámara → un fotograma JPEG por segundo (el máximo que acepta Gemini Live). */
export class Camara {
  constructor(video, alFotograma) {
    this.video = video;
    this.alFotograma = alFotograma;
    this.lienzo = document.createElement('canvas');
  }

  async iniciar() {
    this.flujo = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
    });
    this.video.srcObject = this.flujo;
    await this.video.play();
    this.intervalo = setInterval(() => this.capturar(), 1000);
  }

  capturar() {
    const { videoWidth: ancho, videoHeight: alto } = this.video;
    if (!ancho) return;
    const escala = Math.min(1, 640 / ancho);
    this.lienzo.width = Math.round(ancho * escala);
    this.lienzo.height = Math.round(alto * escala);
    this.lienzo.getContext('2d').drawImage(this.video, 0, 0, this.lienzo.width, this.lienzo.height);
    this.alFotograma(this.lienzo.toDataURL('image/jpeg', 0.7).split(',')[1]);
  }

  detener() {
    clearInterval(this.intervalo);
    this.flujo?.getTracks().forEach((t) => t.stop());
    this.video.srcObject = null;
    this.flujo = null;
  }
}
