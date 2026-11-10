// Dibujo de los luchadores con código, pose por pose.
// Cada luchador se convierte en una textura con un cuadro por pose (ver Boot.js).
// Cuando tengas sprites de Higgsfield, reemplaza esta textura por tu atlas con los MISMOS nombres de cuadro.
import { ROSTER } from '../core/roster.js';
import { movePhase } from '../core/moves.js';

export const INK = '#1b1226';
export const CELL_W = 80;   // ancho de cada cuadro
export const CELL_H = 68;   // alto de cada cuadro
export const FOOT_X = 40;   // los pies quedan al centro…
export const FOOT_Y = 66;   // …y casi abajo del cuadro

export function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${Math.round(((n >> 16) & 255) * k)},${Math.round(((n >> 8) & 255) * k)},${Math.round((n & 255) * k)})`;
}

export function makeLook(def, alt) {
  const L = Object.assign({}, def.look, alt ? def.alt : {});
  L.armD = shade(L.arm, 0.72);
  L.pantsD = shade(L.pants, 0.72);
  return L;
}

// Parámetros de cada pose. fa/ba = brazo delantero/trasero, fLeg/bLeg = piernas.
export const POSES = {
  idle0: {}, idle1: { bob: 1 },
  walk0: {}, walk1: { walkO: 2 }, walk2: { walkO: -2 },
  crouch: { crouch: 13 },
  jump: { fLeg: 'tuck', bLeg: 'tuck' },
  block: { fa: 'block', ba: 'block', lean: -1 },
  blockLow: { fa: 'block', ba: 'block', lean: -1, crouch: 13 },
  hit: { lean: -3, fa: 'flail', ba: 'flailB', face: 'hurt' },
  hitAir: { lean: -3, fa: 'flail', ba: 'flailB', face: 'hurt', fLeg: 'tuck', bLeg: 'tuck' },
  win0: { fa: 'up', face: 'happy' }, win1: { fa: 'up', face: 'happy', bob: 1 },
  ko: { fa: 'hang', ba: 'hang', face: 'ko' },
  punchWind: { fa: 'wind', lean: -1 }, punchHit: { fa: 'punch', lean: 2 }, punchBack: { fa: 'guard', lean: 1 },
  kickRaise: { fLeg: 'raise', lean: -1 }, kickHit: { fLeg: 'kick', lean: -3 },
  lowSweep: { crouch: 13, fLeg: 'sweep' },
  airKick: { fLeg: 'airkick', bLeg: 'tuck' },
  throwWind: { fa: 'wind', ba: 'wind', lean: -2 }, throw: { fa: 'throw', lean: 2 },
};
export const POSE_NAMES = Object.keys(POSES);

export function drawPose(g, L, pose, flash = false) {
  const P = Object.assign({ crouch: 0, lean: 0, bob: 0, fa: 'guard', ba: 'guardB', fLeg: 'stand', bLeg: 'stand', face: 'n', walkO: 0 }, pose);
  const { crouch, lean, bob, walkO } = P;
  const R = (x, y, w, h, c) => { g.fillStyle = flash ? '#fff7e0' : c; g.fillRect(x, y, w, h); };
  const wide = L.wide ? 1 : 0;
  const hipY = -22 + crouch, topY = -44 + crouch + bob, hx = -6 + lean, hy = topY - 14;

  function leg(lx, mode, back) {
    const Pc = back ? L.pantsD : L.pants, Sh = L.shoe;
    switch (mode) {
      case 'stand':
        if (crouch > 0) { R(lx - 1, hipY, 11, 6, Pc); R(lx + 5, hipY + 3, 6, -hipY - 6, Pc); R(lx + 4, -3, 9, 3, Sh); }
        else { R(lx, hipY, 6, -hipY - 3, Pc); R(lx - 1, -3, 9, 3, Sh); }
        break;
      case 'tuck': R(lx, hipY, 6, 8, Pc); R(lx + 2, hipY + 6, 6, 6, Pc); R(lx + 2, hipY + 11, 8, 3, Sh); break;
      case 'raise': R(lx, hipY, 6, 6, Pc); R(lx + 3, hipY + 2, 10, 6, Pc); R(lx + 10, hipY + 6, 5, 8, Pc); R(lx + 9, hipY + 13, 8, 3, Sh); break;
      case 'kick': R(lx, hipY - 10, 28, 7, Pc); R(lx + 26, hipY - 12, 7, 9, Sh); break;
      case 'sweep': R(lx, -9, 30, 6, Pc); R(lx + 28, -11, 7, 8, Sh); break;
      case 'airkick': R(lx, hipY, 6, 6, Pc); R(lx + 2, hipY + 4, 20, 6, Pc); R(lx + 20, hipY + 2, 7, 9, Sh); break;
    }
  }
  function arm(sx, sy, mode, back) {
    const A = back ? L.armD : L.arm, K = back ? L.skinD : L.skin;
    switch (mode) {
      case 'guard': R(sx, sy, 5, 9, A); R(sx + 3, sy + 5, 8, 4, A); R(sx + 10, sy + 3, 5, 5, K); break;
      case 'guardB': R(sx, sy - 1, 5, 8, A); R(sx + 3, sy + 2, 10, 4, A); R(sx + 12, sy - 2, 5, 5, K); break;
      case 'wind': R(sx - 4, sy, 5, 9, A); R(sx - 8, sy + 4, 6, 4, A); R(sx - 12, sy + 3, 5, 5, K); break;
      case 'punch': R(sx, sy + 1, 22, 5, A); R(sx + 21, sy, 7, 7, K); break;
      case 'throw': R(sx, sy - 3, 16, 5, A); R(sx + 15, sy - 5, 6, 6, K); break;
      case 'block': R(sx + 2, sy - 10, 5, 16, A); R(sx + 2, sy - 14, 5, 5, K); break;
      case 'flail': R(sx - 8, sy - 6, 9, 4, A); R(sx - 12, sy - 8, 5, 5, K); break;
      case 'flailB': R(sx - 6, sy - 8, 8, 4, A); R(sx - 10, sy - 10, 5, 5, K); break;
      case 'up': R(sx, sy - 14, 5, 16, A); R(sx, sy - 19, 5, 5, K); break;
      case 'hang': R(sx, sy, 5, 14, A); R(sx, sy + 14, 5, 4, K); break;
    }
  }

  arm(-5 + lean, topY + 2, P.ba, true);
  leg(-7 - walkO, P.bLeg, true);
  R(-9 - wide + lean, topY, 18 + wide * 2, hipY - topY + 2, L.top);
  if (L.apron) {
    R(-1 + lean, topY + 7, 10 + wide, hipY - topY - 4, L.apron); R(1 + lean, topY + 3, 2, 5, L.apron);
    if (L.flowers) { R(2 + lean, topY + 10, 2, 2, '#ffffff'); R(6 + lean, topY + 14, 2, 2, L.acc); R(3 + lean, topY + 18, 2, 2, '#ffffff'); R(7 + lean, topY + 9, 2, 2, L.acc); }
    else R(2 + lean, topY + 14, 6, 4, shade(L.apron, 0.75));
  }
  if (L.badge) { R(3 + lean, topY + 5, 4, 4, L.acc); R(-9 - wide + lean, hipY - 3, 18 + wide * 2, 3, '#14121c'); R(1 + lean, hipY - 3, 3, 3, L.acc); }
  leg(1 + walkO, P.fLeg, false);
  R(-2 + lean, topY - 2, 5, 3, L.skinD);
  R(hx, hy, 13, 13, L.skin);
  if (L.hat === 'cap') { R(hx - 1, hy - 2, 14, 5, L.acc); R(hx + 11, hy + 1, 7, 2, L.acc); R(hx + 4, hy - 1, 3, 2, '#ffffff'); R(hx - 1, hy + 3, 3, 6, L.hair); }
  else if (L.hat === 'rulos') { R(hx - 2, hy - 3, 14, 6, L.hair); R(hx - 3, hy + 1, 6, 9, L.hair); R(hx + 1, hy - 5, 3, 3, L.acc); R(hx + 6, hy - 5, 3, 3, '#9fd8f0'); R(hx - 4, hy + 3, 3, 3, L.acc); R(hx + 3, hy + 9, 2, 2, '#ffd36a'); }
  else if (L.hat === 'guard') { R(hx - 1, hy - 3, 14, 5, '#1f274a'); R(hx + 11, hy, 7, 2, '#141a33'); R(hx + 5, hy - 2, 3, 3, L.acc); R(hx - 1, hy + 2, 3, 5, L.hair); }
  R(hx + 3, hy + 5, 2, 3, L.skinD);
  R(hx + 12, hy + 6, 2, 3, L.skinD);
  if (P.face === 'hurt') { R(hx + 8, hy + 5, 4, 1, INK); R(hx + 9, hy + 9, 3, 3, '#5a1b25'); }
  else if (P.face === 'ko') { R(hx + 8, hy + 4, 1, 1, INK); R(hx + 10, hy + 4, 1, 1, INK); R(hx + 9, hy + 5, 1, 1, INK); R(hx + 8, hy + 6, 1, 1, INK); R(hx + 10, hy + 6, 1, 1, INK); R(hx + 9, hy + 10, 3, 1, INK); }
  else { R(hx + 9, hy + 5, 2, 2, INK); if (P.face === 'happy') R(hx + 8, hy + 10, 5, 2, '#5a1b25'); else R(hx + 9, hy + 10, 3, 1, INK); }
  if (L.stache) R(hx + 8, hy + 8, 6, 2, L.hair);
  arm(2 + lean, topY + 2, P.fa, false);
}

// Hoja de sprites: una fila con un cuadro por pose.
export function buildSheet(def, alt) {
  const L = makeLook(def, alt);
  const c = document.createElement('canvas');
  c.width = CELL_W * POSE_NAMES.length;
  c.height = CELL_H;
  const g = c.getContext('2d');
  POSE_NAMES.forEach((name, i) => {
    g.save();
    g.translate(i * CELL_W + FOOT_X, FOOT_Y);
    drawPose(g, L, POSES[name]);
    g.restore();
  });
  return c;
}

export const textureKey = (def, alt) => `fighter-${def.id}${alt ? '-alt' : ''}`;
export const allFighterTextures = () => ROSTER.flatMap((d) => [[d, false], [d, true]]);

// Qué pose mostrar según el estado del luchador. Devuelve el cuadro y ajustes de dibujo.
export function poseFor(f) {
  const st = f.state;
  switch (st) {
    case 'idle': return { frame: Math.floor(f.t / 14) % 2 ? 'idle1' : 'idle0' };
    case 'walk': return { frame: ['walk0', 'walk1', 'walk0', 'walk2'][Math.floor(f.t / 6) % 4] };
    case 'crouch': return { frame: 'crouch' };
    case 'jump': return { frame: 'jump' };
    case 'block': return { frame: f.blockLow ? 'blockLow' : 'block' };
    case 'hit': return { frame: f.onGround ? 'hit' : 'hitAir' };
    case 'win': return { frame: Math.floor(f.t / 10) % 2 ? 'win1' : 'win0' };
    case 'ko': { const a = Math.min(1, f.sf / 12); return { frame: 'ko', rot: -Math.PI / 2 * a, oy: -10 * a }; }
    case 'attack': {
      const m = f.move, d = m.d, ph = movePhase(f);
      switch (m.id) {
        case 'punch':
          if (ph === 'startup') return { frame: 'punchWind' };
          if (ph === 'active') return { frame: 'punchHit' };
          return { frame: m.f <= d.startup + d.active + 3 ? 'punchHit' : 'punchBack' };
        case 'kick': return { frame: ph === 'active' ? 'kickHit' : 'kickRaise' };
        case 'low': return { frame: (ph === 'active' || (ph === 'recovery' && m.f <= d.startup + d.active + 4)) ? 'lowSweep' : 'crouch' };
        case 'air': return { frame: ph === 'active' ? 'airKick' : 'jump' };
        default: return { frame: ph === 'startup' ? 'throwWind' : 'throw' };
      }
    }
  }
  return { frame: 'idle0' };
}
