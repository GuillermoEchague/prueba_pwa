import { blank } from '../core/input-buffer.js';

// Jugador 1: WASD · Golpe F o V · Patada G o B
// Jugador 2: flechas · Golpe K o 1 del teclado numérico · Patada L o 2 del teclado numérico
const P1 = { up: ['W'], down: ['S'], left: ['A'], right: ['D'], p: ['F', 'V'], k: ['G', 'B'] };
const P2 = { up: ['UP'], down: ['DOWN'], left: ['LEFT'], right: ['RIGHT'], p: ['K', 'NUMPAD_ONE'], k: ['L', 'NUMPAD_TWO'] };

export class KeyboardInput {
  constructor(scene) {
    const kb = scene.input.keyboard;
    // Toques muy rápidos (apretar y soltar dentro del mismo cuadro) también cuentan.
    this.tapped = new Set();
    const make = (map) => {
      const out = {};
      for (const action in map) {
        out[action] = map[action].map((name) => {
          const key = kb.addKey(name);
          key.on('down', () => this.tapped.add(key)); // repetir no hace daño: es un conjunto
          return key;
        });
      }
      return out;
    };
    this.p1 = make(P1);
    this.p2 = make(P2);
  }

  read(keys) {
    const r = blank();
    for (const action in keys) if (keys[action].some((k) => k.isDown || this.tapped.has(k))) r[action] = 1;
    return r;
  }

  player(i) { return this.read(i === 0 ? this.p1 : this.p2); }

  // Llamar una vez por cuadro, después de leer a los dos jugadores.
  endFrame() { this.tapped.clear(); }
}
