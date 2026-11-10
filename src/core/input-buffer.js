import { QCF_WINDOW } from './constants.js';

// Estado de controles de un cuadro. Teclado, control y táctil entregan este mismo objeto.
export const blank = () => ({ up: 0, down: 0, left: 0, right: 0, p: 0, k: 0 });

export function merge(a, b) {
  if (!b) return a;
  for (const k in a) if (b[k]) a[k] = 1;
  return a;
}

// Dirección relativa en notación de teclado numérico: 6 = adelante, 4 = atrás, 2 = abajo, 3 = abajo-adelante…
export function relDir(i, facing) {
  let h = 0;
  if (i.left && !i.right) h = -1; else if (i.right && !i.left) h = 1;
  h *= facing;
  let v = 0;
  if (i.up && !i.down) v = 1; else if (i.down && !i.up) v = -1;
  return 5 + h + v * 3;
}

// Lo contrario: de dirección relativa a teclas absolutas (lo usan el CPU y los botones táctiles).
export function relToAbs(d, facing, p = 0, k = 0) {
  const r = blank();
  if (d >= 7) r.up = 1;
  if (d <= 3) r.down = 1;
  const fw = facing === 1 ? 'right' : 'left';
  const bk = facing === 1 ? 'left' : 'right';
  if (d % 3 === 0) r[fw] = 1;
  if (d % 3 === 1) r[bk] = 1;
  r.p = p; r.k = k;
  return r;
}

export const ARROWS = ['', '↙', '↓', '↘', '←', '·', '→', '↖', '↑', '↗'];

export class InputBuffer {
  constructor() { this.reset(); }

  reset() {
    this.held = blank();
    this.pBuf = 0;
    this.kBuf = 0;
    this.dirs = [];
    this.lastDir = 5;
    this.f = 0;
    this.hist = [];
  }

  pushHist(s) {
    this.hist.push(s);
    if (this.hist.length > 12) this.hist.shift();
  }

  // Se llama una vez por cuadro con los controles de ese cuadro.
  feed(inp, facing) {
    this.f++;
    const d = relDir(inp, facing);
    if (d !== this.lastDir) {
      this.dirs.push({ d, t: this.f });
      if (this.dirs.length > 16) this.dirs.shift();
      this.lastDir = d;
      if (d !== 5) this.pushHist(ARROWS[d]);
    }
    if (inp.p && !this.held.p) { this.pBuf = 6; this.pushHist('G'); }
    if (inp.k && !this.held.k) { this.kBuf = 6; this.pushHist('P'); }
    this.held = { ...inp };
  }

  decay() {
    if (this.pBuf > 0) this.pBuf--;
    if (this.kBuf > 0) this.kBuf--;
  }

  // ¿Se marcó ↓ ↘ → dentro de la ventana?
  qcf(windowFrames = QCF_WINDOW) {
    const seq = [2, 3, 6];
    let i = 0;
    for (const e of this.dirs) {
      if (this.f - e.t > windowFrames) continue;
      if (e.d === seq[i]) { i++; if (i === 3) return true; }
    }
    return false;
  }

  clearDirs() { this.dirs.length = 0; }
}
