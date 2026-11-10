import { test } from 'node:test';
import assert from 'node:assert/strict';
import { InputBuffer, blank, relToAbs } from '../src/core/input-buffer.js';
import { createFight, stepFight } from '../src/core/game.js';
import { MOVES } from '../src/core/moves.js';

const press = (d, facing, extra = {}) => ({ ...relToAbs(d, facing), ...extra });

function feedSeq(buf, seq, facing = 1) {
  for (const [d, n, extra] of seq) for (let i = 0; i < n; i++) buf.feed(press(d, facing, extra), facing);
}

test('↓↘→ dentro de 22 cuadros cuenta como especial', () => {
  const b = new InputBuffer();
  feedSeq(b, [[2, 3], [3, 3], [6, 2]]);
  assert.equal(b.qcf(), true);
});

test('↓↘→ demasiado lento no cuenta', () => {
  const b = new InputBuffer();
  feedSeq(b, [[2, 3], [3, 20], [6, 10]]);
  assert.equal(b.qcf(), false);
});

test('la secuencia se lee relativa a hacia dónde mira el luchador', () => {
  const b = new InputBuffer();
  feedSeq(b, [[2, 2, {}], [3, 2], [6, 2]], -1);
  assert.equal(b.qcf(), true);
  assert.deepEqual(relToAbs(6, -1).left, 1);
});

// Pelea de prueba: los dos humanos, sin CPU, ya en fase de pelea.
function readyFight() {
  const fight = createFight({ picks: [0, 1], mode: '2p', rng: () => 0.99 });
  const idle = [blank(), blank()];
  while (fight.match.phase !== 'fight') stepFight(fight, idle);
  const [a, b] = fight.world.fighters;
  a.x = 200; b.x = 228; // a distancia de golpe
  return { fight, a, b };
}

test('un golpe conecta justo después de sus cuadros de arranque', () => {
  const { fight, a, b } = readyFight();
  const hp = b.hp;
  stepFight(fight, [{ ...blank(), p: 1 }, blank()]);
  let frames = 1;
  while (b.hp === hp && frames < 20) { stepFight(fight, [blank(), blank()]); frames++; }
  assert.equal(b.state, 'hit');
  // Cuadro 1: se aprieta y empieza el ataque. Luego 4 de arranque. Pega en el siguiente.
  assert.equal(frames, 1 + MOVES.punch.startup + 1);
  assert.equal(hp - b.hp, MOVES.punch.dmg * a.def.power);
});

test('bloquear (mantener atrás) recibe 0 de daño con un golpe', () => {
  const { fight, b } = readyFight();
  const hp = b.hp;
  const back = relToAbs(4, b.facing);
  stepFight(fight, [{ ...blank(), p: 1 }, back]);
  for (let i = 0; i < 15; i++) stepFight(fight, [blank(), back]);
  assert.equal(b.hp, hp);
});

test('la pelea termina cuando alguien gana 2 rondas', () => {
  const { fight, a, b } = readyFight();
  let guard = 0;
  while (fight.match.phase !== 'end' && guard++ < 20000) {
    if (fight.match.phase === 'fight') { b.hp = 0.1; a.x = 200; b.x = 228; }
    stepFight(fight, [{ ...blank(), p: guard % 2 }, blank()]);
  }
  assert.equal(fight.match.phase, 'end');
  assert.equal(fight.match.winner, a);
  assert.equal(a.wins, 2);
});

test('una pelea contra el CPU llega al final sin errores', () => {
  let seed = 7;
  const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const fight = createFight({ picks: [1, 2], mode: 'cpu', diff: 2, rng });
  let guard = 0;
  while (fight.match.phase !== 'end' && guard++ < 60 * 60 * 6) {
    stepFight(fight, [relToAbs(guard % 90 < 40 ? 6 : 4, fight.world.fighters[0].facing, guard % 7 === 0 ? 1 : 0), blank()]);
  }
  assert.equal(fight.match.phase, 'end');
});
