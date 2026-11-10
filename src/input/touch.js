// Joystick y botones en pantalla para celular, dibujados dentro del juego.
// Especial y Súper hacen la secuencia ↓↘→ solos, para no depender de marcarla con el dedo.
import { blank, relToAbs } from '../core/input-buffer.js';
import { text, C } from '../scenes/ui.js';

export const isTouchDevice = () => {
  try { return matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0 && matchMedia('(hover: none)').matches; }
  catch { return false; }
};

const STICK = { x: 58, y: 212, r: 30, knob: 12, max: 18 };
const BTN_W = 48, BTN_H = 28;
const BUTTONS = [
  { id: 'special', label: 'ESPECIAL', x: 378, y: 190, macro: 'p' },
  { id: 'super', label: 'SÚPER', x: 430, y: 190, macro: 'k' },
  { id: 'p', label: 'GOLPE', x: 378, y: 222 },
  { id: 'k', label: 'PATADA', x: 430, y: 222 },
];
export const PAUSE_BTN = { x: 226, y: 38, w: 28, h: 14 };

export class TouchControls {
  constructor(scene, { onPause } = {}) {
    this.scene = scene;
    this.state = blank();
    this.macro = [];
    this.stickId = null;
    this.knob = { x: 0, y: 0 };
    this.held = new Map(); // pointerId → botón
    this.tapped = new Set(); // toques rápidos que se sueltan antes del siguiente cuadro
    this.superReady = false;
    scene.input.addPointer(3);

    this.g = scene.add.graphics().setDepth(60);
    this.labels = BUTTONS.map((b) => text(scene, b.x + BTN_W / 2, b.y + BTN_H / 2, b.label, { size: 8, origin: [0.5, 0.5], stroke: false, color: C.ink }).setDepth(61));
    this.pauseLabel = text(scene, PAUSE_BTN.x + PAUSE_BTN.w / 2, PAUSE_BTN.y + PAUSE_BTN.h / 2, 'II', { size: 8, origin: [0.5, 0.5] }).setDepth(61);

    const inBtn = (p, b) => p.x >= b.x && p.x <= b.x + BTN_W && p.y >= b.y && p.y <= b.y + BTN_H;
    const inPause = (p) => p.x >= PAUSE_BTN.x - 6 && p.x <= PAUSE_BTN.x + PAUSE_BTN.w + 6 && p.y >= PAUSE_BTN.y - 6 && p.y <= PAUSE_BTN.y + PAUSE_BTN.h + 6;

    this.onDown = (p) => {
      if (inPause(p)) { if (onPause) onPause(); return; }
      const b = BUTTONS.find((bt) => inBtn(p, bt));
      if (b) {
        this.held.set(p.id, b);
        if (b.id === 'p' || b.id === 'k') this.tapped.add(b.id);
        if (b.macro) this.startMacro(b.macro);
        return;
      }
      if (p.x < 240 && p.y > 100 && this.stickId === null) { this.stickId = p.id; this.moveStick(p); }
    };
    this.onMove = (p) => { if (p.id === this.stickId) this.moveStick(p); };
    this.onUp = (p) => {
      if (p.id === this.stickId) { this.stickId = null; this.knob = { x: 0, y: 0 }; Object.assign(this.state, { up: 0, down: 0, left: 0, right: 0 }); }
      this.held.delete(p.id);
    };
    scene.input.on('pointerdown', this.onDown);
    scene.input.on('pointermove', this.onMove);
    scene.input.on('pointerup', this.onUp);
    scene.input.on('pointerupoutside', this.onUp);
    scene.events.once('shutdown', () => this.destroy());
  }

  moveStick(p) {
    const dx = p.x - STICK.x, dy = p.y - STICK.y, dist = Math.hypot(dx, dy), k = dist > STICK.max ? STICK.max / dist : 1;
    this.knob = { x: dx * k, y: dy * k };
    const s = this.state;
    s.up = s.down = s.left = s.right = 0;
    if (dist < 6) return;
    const oct = Math.round(Math.atan2(dy, dx) / (Math.PI / 4));
    const map = { 0: ['right'], 1: ['right', 'down'], 2: ['down'], 3: ['down', 'left'], 4: ['left'], '-4': ['left'], '-3': ['up', 'left'], '-2': ['up'], '-1': ['up', 'right'] };
    for (const d of map[oct] || []) s[d] = 1;
  }

  startMacro(btn) {
    this.macro = [2, 2, 2, 3, 3, 3, 6, 6, 6].map((d, i) => ({ d, [btn]: i === 6 || i === 7 ? 1 : 0 }));
  }

  // Controles de este cuadro para el luchador que mira hacia `facing`.
  read(facing) {
    if (this.macro.length) { const m = this.macro.shift(); return relToAbs(m.d, facing, m.p || 0, m.k || 0); }
    const r = { ...this.state };
    for (const b of this.held.values()) if (b.id === 'p' || b.id === 'k') r[b.id] = 1;
    for (const id of this.tapped) r[id] = 1;
    this.tapped.clear();
    return r;
  }

  draw() {
    const g = this.g;
    g.clear();
    const active = this.stickId !== null;
    g.fillStyle(0x1d1735, active ? 0.55 : 0.35).fillCircle(STICK.x, STICK.y, STICK.r);
    g.lineStyle(1, 0xaaa2cc, 0.6).strokeCircle(STICK.x, STICK.y, STICK.r);
    g.fillStyle(0x271f47, 0.9).fillCircle(STICK.x + this.knob.x, STICK.y + this.knob.y, STICK.knob);
    g.lineStyle(1, 0xf3ead8, 0.8).strokeCircle(STICK.x + this.knob.x, STICK.y + this.knob.y, STICK.knob);
    const pressed = new Set([...this.held.values()].map((b) => b.id));
    BUTTONS.forEach((b, i) => {
      const dim = b.id === 'super' && !this.superReady;
      const on = pressed.has(b.id);
      const fill = b.macro ? 0xaaa2cc : 0xffc23a;
      g.fillStyle(fill, dim ? 0.25 : on ? 1 : 0.7).fillRoundedRect(b.x, b.y + (on ? 1 : 0), BTN_W, BTN_H, 6);
      g.lineStyle(1, 0x1b1226, 0.9).strokeRoundedRect(b.x, b.y + (on ? 1 : 0), BTN_W, BTN_H, 6);
      this.labels[i].setAlpha(dim ? 0.5 : 1);
    });
    g.fillStyle(0x1d1735, 0.7).fillRoundedRect(PAUSE_BTN.x, PAUSE_BTN.y, PAUSE_BTN.w, PAUSE_BTN.h, 3);
    g.lineStyle(1, 0xaaa2cc, 0.8).strokeRoundedRect(PAUSE_BTN.x, PAUSE_BTN.y, PAUSE_BTN.w, PAUSE_BTN.h, 3);
  }

  setVisible(v) {
    this.g.setVisible(v);
    this.labels.forEach((l) => l.setVisible(v));
    this.pauseLabel.setVisible(v);
  }

  reset() { this.held.clear(); this.tapped.clear(); this.stickId = null; this.knob = { x: 0, y: 0 }; this.state = blank(); this.macro = []; }

  destroy() {
    const i = this.scene.input;
    i.off('pointerdown', this.onDown); i.off('pointermove', this.onMove);
    i.off('pointerup', this.onUp); i.off('pointerupoutside', this.onUp);
  }
}
