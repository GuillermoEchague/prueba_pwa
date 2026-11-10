import { blank, relToAbs } from './input-buffer.js';
import { movePhase } from './moves.js';

// IA del CPU: reglas según la distancia, con azar y un tiempo de reacción.
// level: 0 fácil, 1 normal, 2 difícil.
export class CPU {
  constructor(level, world, rng = Math.random) {
    this.lv = level;
    this.world = world;
    this.rng = rng;
    this.q = [];
    this.hold = 5;
    this.holdN = 0;
    this.wait = 20;
  }

  seq(arr) {
    for (const [d, n, p = 0, k = 0] of arr) {
      for (let i = 0; i < n; i++) this.q.push({ d, p: p && i < 2 ? 1 : 0, k: k && i < 2 ? 1 : 0 });
    }
  }

  qcfSeq(btn) {
    this.seq([[2, 3], [3, 3], [6, 2, btn === 'p' ? 1 : 0, btn === 'k' ? 1 : 0], [5, 14]]);
  }

  input(me, opp) {
    if (!this.world.canAct || me.state === 'ko') {
      this.q.length = 0; this.holdN = 0; this.wait = 8;
      return blank();
    }
    if (this.q.length) { const s = this.q.shift(); return relToAbs(s.d, me.facing, s.p, s.k); }
    if (this.holdN > 0) { this.holdN--; return relToAbs(this.hold, me.facing); }
    if (this.wait > 0) { this.wait--; return blank(); }
    this.decide(me, opp);
    return blank();
  }

  decide(me, opp) {
    const L = this.lv, rnd = this.rng, R = rnd(), dist = Math.abs(opp.x - me.x);
    const react = [24, 13, 6][L], blockP = [0.22, 0.5, 0.78][L];
    const threat = this.world.projs.find((p) => p.owner === opp
      && Math.sign(me.x - p.x) === Math.sign(p.vx) && Math.abs(me.x - p.x) < 140);
    const oppAtk = opp.state === 'attack' && movePhase(opp) !== 'recovery' && dist < 78;

    if (threat && R < blockP + 0.12) {
      if (dist > 110 && rnd() < 0.5) this.seq([[9, 4], [5, 26]]);
      else { this.hold = 4; this.holdN = 20; }
      return;
    }
    if (oppAtk && R < blockP) {
      this.hold = (opp.move && opp.move.id === 'low' && L > 0) ? 1 : 4;
      this.holdN = 16;
      return;
    }
    if (me.meter >= 100 && dist < 220 && rnd() < 0.25 + L * 0.2) {
      this.qcfSeq('k');
    } else if (dist > 150) {
      if (R < 0.3 && !me.proj) this.qcfSeq('p');
      else { this.hold = 6; this.holdN = 14 + Math.floor(rnd() * 12); }
    } else if (dist > 62) {
      if (R < 0.18) this.seq([[9, 3], [5, 14], [5, 2, 0, 1], [5, 22]]);
      else if (R < 0.38 && !me.proj) this.qcfSeq('p');
      else if (R < 0.48) { this.hold = 4; this.holdN = 12; }
      else { this.hold = 6; this.holdN = 10 + Math.floor(rnd() * 12); }
    } else {
      if (R < 0.3 + L * 0.06) this.seq([[5, 2, 1, 0], [5, 5], [5, 2, 0, 1], [5, 6], [2, 2], [3, 2], [6, 2, 1, 0], [5, 16]]);
      else if (R < 0.48) this.seq([[2, 3], [2, 2, 0, 1], [2, 16]]);
      else if (R < 0.6) this.seq([[5, 2, 1, 0], [5, 10]]);
      else if (R < 0.72) this.seq([[5, 2, 0, 1], [5, 14]]);
      else if (R < 0.86) { this.hold = 4; this.holdN = 14; }
      else { this.hold = 1; this.holdN = 14; }
    }
    this.wait = Math.round(react * (0.6 + rnd() * 0.8));
  }
}
