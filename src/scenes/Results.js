import Phaser from 'phaser';
import { W, H } from '../core/constants.js';
import { ROSTER } from '../core/roster.js';
import { text, createMenu, C } from './ui.js';

// Resultado de la pelea, encima de la última imagen de Fight.
export class Results extends Phaser.Scene {
  constructor() { super('Results'); }

  init(data) { this.data_ = data; }

  create() {
    const { mode, picks, winnerPid } = this.data_;
    this.add.rectangle(0, 0, W, H, 0x0e0a1e, 0.72).setOrigin(0);
    let title = 'EMPATE';
    let quote = null;
    if (winnerPid >= 0) {
      const def = ROSTER[picks[winnerPid]];
      title = mode === 'cpu' ? (winnerPid === 0 ? '¡GANASTE!' : 'PERDISTE') : `¡GANA ${def.name.toUpperCase()}!`;
      quote = def;
    }
    text(this, W / 2, 62, title, { size: 32, bold: true, color: C.maravilla, origin: [0.5, 0.5] }).setShadow(3, 3, C.aji, 0, true, true);
    if (quote) {
      const g = this.add.graphics();
      g.fillStyle(0xf3ead8, 1).fillRoundedRect(60, 92, W - 120, 46, 8);
      text(this, W / 2, 108, `“${quote.quote}”`, { size: 8, color: C.ink, stroke: false, origin: [0.5, 0.5], wrap: W - 140, align: 'center' });
      text(this, W / 2, 128, quote.name.toUpperCase(), { size: 8, color: '#5a4a7a', stroke: false, origin: [0.5, 0.5] });
    }
    this.menu = createMenu(this, {
      x: W / 2, y: 168, gap: 16, depth: 5,
      items: [
        { label: 'REVANCHA', action: () => { this.scene.stop(); this.scene.get('Fight').scene.restart({ mode, picks }); } },
        { label: 'CAMBIAR LUCHADORES', action: () => { this.scene.stop('Fight'); this.scene.start('Select', { mode }); } },
        { label: 'MENÚ', action: () => { this.scene.stop('Fight'); this.scene.start('Title'); } },
      ],
    });
  }

  update() { this.menu.update(); }
}
