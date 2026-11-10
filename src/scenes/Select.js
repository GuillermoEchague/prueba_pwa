import Phaser from 'phaser';
import { W, H } from '../core/constants.js';
import { ROSTER } from '../core/roster.js';
import { textureKey, FOOT_Y, CELL_H } from '../gfx/fighter-art.js';
import { text, C, onKeyOnce } from './ui.js';
import { play } from '../audio/sfx.js';
import { padEdges } from '../input/gamepad.js';

const CARD_W = 104, CARD_H = 168, GAP = 10, TOP = 50;
const STAT_NAMES = ['VEL', 'FUE', 'AGU'];

// Selección de luchador. En 1 jugador eliges tu luchador y luego el rival.
export class Select extends Phaser.Scene {
  constructor() { super('Select'); }

  init(data) {
    this.mode = data.mode || 'cpu';
    this.step = 0;
    this.picks = [0, 1];
    this.sel = 0;
  }

  create() {
    this.add.image(0, 0, 'stage').setOrigin(0).setAlpha(0.35);
    this.add.rectangle(0, 0, W, H, 0x141026, 0.55).setOrigin(0);
    this.title = text(this, W / 2, 26, '', { size: 16, bold: true, color: C.maravilla, origin: [0.5, 0.5] });
    const back = text(this, 12, 14, '‹ VOLVER', { size: 8, color: C.tenue }).setInteractive({ useHandCursor: true });
    back.on('pointerup', () => this.back());

    const n = ROSTER.length + 1;
    const x0 = Math.round((W - (n * CARD_W + (n - 1) * GAP)) / 2);
    this.cards = [];
    for (let i = 0; i < n; i++) {
      const x = x0 + i * (CARD_W + GAP), def = ROSTER[i];
      const c = { x, y: TOP, def, objs: [] };
      c.g = this.add.graphics();
      if (def) {
        c.img = this.add.image(x + CARD_W / 2, TOP + 74, textureKey(def, false), 'idle0').setOrigin(0.5, FOOT_Y / CELL_H);
        c.objs.push(text(this, x + 8, TOP + 82, def.name.toUpperCase(), { size: 8, bold: true, color: C.maravilla }));
        c.objs.push(text(this, x + 8, TOP + 94, def.role, { size: 8, color: C.tenue, wrap: CARD_W - 14 }));
        def.stats.forEach((v, k) => c.objs.push(text(this, x + 8, TOP + 118 + k * 10, STAT_NAMES[k], { size: 8, color: C.tenue })));
        c.objs.push(text(this, x + 8, TOP + 150, def.special.toUpperCase(), { size: 8, color: C.papel }));
      } else {
        c.objs.push(text(this, x + CARD_W / 2, TOP + 52, '?', { size: 32, bold: true, color: C.maravilla, origin: [0.5, 0.5] }));
        c.objs.push(text(this, x + CARD_W / 2, TOP + 96, 'AL AZAR', { size: 8, bold: true, origin: [0.5, 0.5] }));
      }
      c.tag = text(this, x + CARD_W - 6, TOP + 6, '1P', { size: 8, bold: true, color: C.papel, origin: [1, 0] }).setVisible(false);
      const zone = this.add.zone(x, TOP, CARD_W, CARD_H).setOrigin(0).setInteractive({ useHandCursor: true });
      zone.on('pointerover', () => { this.sel = i; this.refresh(); });
      zone.on('pointerup', () => { this.sel = i; this.confirm(); });
      this.cards.push(c);
    }

    this.hint = text(this, W / 2, H - 14, '← → ELIGE   ·   ENTER CONFIRMA   ·   ESC VUELVE', { size: 8, color: C.tenue, origin: [0.5, 0.5] });
    onKeyOnce(this, (e) => {
      if (['ArrowLeft', 'KeyA'].includes(e.code)) this.move(-1);
      else if (['ArrowRight', 'KeyD'].includes(e.code)) this.move(1);
      else if (['Enter', 'Space', 'KeyF', 'KeyK', 'KeyG', 'KeyL'].includes(e.code)) this.confirm();
      else if (e.code === 'Escape') this.back();
    });
    this.refresh();
  }

  move(d) {
    this.sel = (this.sel + d + this.cards.length) % this.cards.length;
    play('blip');
    this.refresh();
  }

  back() {
    play('blip');
    if (this.step === 1) { this.step = 0; this.sel = this.picks[0]; this.refresh(); }
    else this.scene.start('Title');
  }

  confirm() {
    play('select');
    let i = this.sel;
    if (!this.cards[i].def) i = Math.floor(Math.random() * ROSTER.length);
    this.picks[this.step] = i;
    if (this.step === 0) { this.step = 1; this.sel = (i + 1) % ROSTER.length; this.refresh(); return; }
    this.scene.start('Fight', { mode: this.mode, picks: [...this.picks] });
  }

  refresh() {
    const who = this.step === 0
      ? (this.mode === 'cpu' ? 'ELIGE TU LUCHADOR' : 'JUGADOR 1, ELIGE')
      : (this.mode === 'cpu' ? 'ELIGE A TU RIVAL' : 'JUGADOR 2, ELIGE');
    this.title.setText(who);
    this.cards.forEach((c, i) => {
      const on = i === this.sel;
      const g = c.g.clear();
      g.fillStyle(0x1d1735, 0.95).fillRoundedRect(c.x, c.y, CARD_W, CARD_H, 6);
      g.fillStyle(0x231c3e, 1).fillRect(c.x + 6, c.y + 6, CARD_W - 12, 72);
      g.lineStyle(on ? 2 : 1, on ? 0xffc23a : 0x3a3066, 1).strokeRoundedRect(c.x, c.y, CARD_W, CARD_H, 6);
      if (c.def) {
        c.def.stats.forEach((v, k) => {
          for (let p = 0; p < 5; p++) g.fillStyle(p < v ? 0xffc23a : 0x3a3066, 1).fillRect(c.x + 36 + p * 12, c.y + 121 + k * 10, 10, 4);
        });
        c.img.setFrame(on ? 'win0' : 'idle0');
      }
      const tagged = this.step === 1 && i === this.picks[0];
      c.tag.setVisible(tagged);
      if (tagged) g.fillStyle(0xe8443a, 1).fillRect(c.x + CARD_W - 26, c.y + 5, 22, 12);
    });
  }

  update() {
    const e = padEdges();
    if (e.left) this.move(-1);
    if (e.right) this.move(1);
    if (e.a) this.confirm();
    if (e.b) this.back();
  }
}
