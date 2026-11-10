import { World } from './combat.js';
import { Fighter } from './fighter.js';
import { CPU } from './cpu.js';
import { Match } from './match.js';
import { ROSTER } from './roster.js';

// Arma una pelea completa: mundo, dos luchadores, CPU (si corresponde) y partido.
// mode: 'cpu' (1 jugador), '2p' o 'demo' (CPU contra CPU en la pantalla de título).
export function createFight({ picks = [0, 1], mode = 'cpu', diff = 1, onDemoEnd = null, rng = Math.random } = {}) {
  const world = new World({ rng });
  const [i, j] = picks;
  const a = new Fighter(ROSTER[i], 0, world, false);
  const b = new Fighter(ROSTER[j], 1, world, i === j);
  world.fighters = [a, b];
  const cpus = [
    mode === 'demo' ? new CPU(1, world, rng) : null,
    mode === '2p' ? null : new CPU(mode === 'demo' ? 1 : diff, world, rng),
  ];
  const match = new Match(world, { demo: mode === 'demo', onDemoEnd });
  return { world, match, cpus, mode, picks };
}

// Un cuadro completo: controles → mundo → partido.
export function stepFight(fight, humanInputs) {
  const { world, match, cpus } = fight;
  const [a, b] = world.fighters;
  const inputs = [
    cpus[0] ? cpus[0].input(a, b) : humanInputs[0],
    cpus[1] ? cpus[1].input(b, a) : humanInputs[1],
  ];
  const advanced = world.step(inputs);
  if (advanced && match.phase !== 'end') match.tick();
}

export function randomPicks(n = ROSTER.length, rng = Math.random) {
  const i = Math.floor(rng() * n);
  let j = Math.floor(rng() * n);
  if (j === i) j = (j + 1) % n;
  return [i, j];
}
