// Sonidos sintetizados con Web Audio (sin archivos) y locutor con la voz del navegador.
// Para usar audios reales: cárgalos en Boot.js (this.load.audio) y reemplaza play() por this.sound.play(nombre).
import { settings } from '../settings.js';

let AC = null, master = null, noiseBuf = null;

// El celular solo permite sonido después del primer toque: main.js llama a esto en ese momento.
export function unlockAudio() {
  if (!AC) {
    try {
      AC = new (window.AudioContext || window.webkitAudioContext)();
      master = AC.createGain(); master.gain.value = 0.55; master.connect(AC.destination);
      const len = Math.floor(AC.sampleRate * 0.6);
      noiseBuf = AC.createBuffer(1, len, AC.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } catch { AC = null; }
  }
  if (AC && AC.state === 'suspended') AC.resume().catch(() => {});
}

function osc(type, f1, f2, dur, vol, delay = 0) {
  const t = AC.currentTime + delay, o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(f1, t);
  if (f2 && f2 !== f1) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.03);
}

function noise(dur, vol, freq, q, type, delay = 0) {
  const t = AC.currentTime + delay, s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
  s.buffer = noiseBuf; f.type = type; f.frequency.value = freq; f.Q.value = q;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(master); s.start(t); s.stop(t + dur + 0.03);
}

const SFX = {
  whoosh: () => noise(0.08, 0.1, 2600, 0.8, 'highpass'),
  charge: () => osc('square', 220, 440, 0.12, 0.05),
  hitL: () => { noise(0.09, 0.35, 1300, 0.7, 'lowpass'); osc('sine', 190, 60, 0.1, 0.35); },
  hitH: () => { noise(0.15, 0.45, 900, 0.6, 'lowpass'); osc('sine', 150, 40, 0.2, 0.5); osc('square', 95, 50, 0.08, 0.08); },
  block: () => { osc('square', 1100, 700, 0.05, 0.07); noise(0.05, 0.14, 4200, 1, 'highpass'); },
  throw: () => { noise(0.12, 0.12, 1800, 0.8, 'bandpass'); osc('square', 300, 620, 0.12, 0.06); },
  whistle: () => { osc('square', 2300, 2500, 0.22, 0.04); osc('square', 2340, 2560, 0.22, 0.03); },
  superShot: () => { osc('sawtooth', 120, 900, 0.4, 0.09); noise(0.35, 0.22, 600, 0.5, 'lowpass'); },
  super: () => { osc('sawtooth', 220, 220, 0.55, 0.05); osc('sawtooth', 277, 277, 0.55, 0.04); osc('sawtooth', 330, 330, 0.55, 0.04); osc('square', 660, 1320, 0.4, 0.04, 0.12); },
  ko: () => { osc('sawtooth', 440, 55, 0.9, 0.14); noise(0.5, 0.3, 500, 0.5, 'lowpass'); },
  land: () => noise(0.07, 0.12, 300, 0.6, 'lowpass'),
  bell: () => { osc('triangle', 880, 880, 0.7, 0.14); osc('triangle', 1320, 1320, 0.55, 0.07); },
  blip: () => osc('square', 660, 990, 0.06, 0.06),
  select: () => { osc('square', 520, 520, 0.06, 0.06); osc('square', 780, 780, 0.08, 0.06, 0.06); },
};

export function play(name) {
  if (!settings.sound || !AC || !SFX[name]) return;
  try { SFX[name](); } catch { /* el audio no es crítico */ }
}

let voice = null;
function pickVoice() {
  try {
    const vs = speechSynthesis.getVoices();
    voice = vs.find((v) => /^es[-_](CL|419|AR|MX|US)/i.test(v.lang)) || vs.find((v) => /^es/i.test(v.lang)) || null;
  } catch { /* sin voces */ }
}
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  pickVoice();
  try { speechSynthesis.onvoiceschanged = pickVoice; } catch { /* nada */ }
}

export function say(text) {
  if (!settings.sound || !settings.voice || !('speechSynthesis' in window)) return;
  try {
    const u = new SpeechSynthesisUtterance(text);
    if (voice) { u.voice = voice; u.lang = voice.lang; } else u.lang = 'es-CL';
    u.rate = 1.15; u.pitch = 0.7;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  } catch { /* nada */ }
}

export function stopVoice() { try { speechSynthesis.cancel(); } catch { /* nada */ } }
