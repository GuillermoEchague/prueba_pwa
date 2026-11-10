import { STEP_MS } from '../core/constants.js';
import { play, say } from '../audio/sfx.js';

// La lógica avanza siempre a 60 cuadros por segundo, aunque la pantalla sea de 120 Hz o vaya lenta.
// Así cada golpe dura lo mismo en cualquier dispositivo.
export class FixedStep {
  constructor(stepFn) { this.stepFn = stepFn; this.acc = 0; }
  update(delta) {
    this.acc += Math.min(delta, 100);
    let n = 0;
    while (this.acc >= STEP_MS && n < 5) { this.stepFn(); this.acc -= STEP_MS; n++; }
    if (n === 5) this.acc = 0; // si el equipo se atrasa mucho, no intentar recuperar todo
  }
  reset() { this.acc = 0; }
}

// Reparte los eventos del core: lo visual a la vista y los sonidos al audio.
export function dispatchEvents(world, view, { sound = true } = {}) {
  const out = [];
  for (const e of world.drain()) {
    view.handleEvent(e);
    if (sound && e.type === 'sfx') play(e.name);
    if (sound && e.type === 'say') say(e.text);
    out.push(e);
  }
  return out;
}
