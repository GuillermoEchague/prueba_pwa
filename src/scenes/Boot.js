import Phaser from 'phaser';
import { ROSTER } from '../core/roster.js';
import { buildSheet, textureKey, POSE_NAMES, CELL_W, CELL_H } from '../gfx/fighter-art.js';
import { buildStage, buildGlow, buildProjectile } from '../gfx/stage-art.js';
import { text, FONT } from './ui.js';

// Carga la fuente y genera todas las texturas del juego.
// Cuando tengas imágenes reales, cárgalas en preload() con this.load.atlas / this.load.image
// usando las mismas claves ('fighter-tito', 'stage', 'proj-tomate'…) y quita lo que se genera aquí.
export class Boot extends Phaser.Scene {
  constructor() { super('Boot'); }

  async create() {
    const msg = text(this, 240, 135, 'CARGANDO…', { size: 8, origin: [0.5, 0.5] });
    try {
      await Promise.race([
        Promise.all([document.fonts.load(`8px ${FONT}`), document.fonts.load(`bold 8px ${FONT}`)]),
        new Promise((r) => setTimeout(r, 2500)),
      ]);
    } catch { /* si la fuente falla, se usa la de respaldo */ }
    msg.setText('CARGANDO…');

    for (const def of ROSTER) {
      for (const alt of [false, true]) {
        const key = textureKey(def, alt);
        const tex = this.textures.addCanvas(key, buildSheet(def, alt));
        POSE_NAMES.forEach((name, i) => tex.add(name, 0, i * CELL_W, 0, CELL_W, CELL_H));
      }
    }
    const stage = buildStage(FONT);
    this.textures.addCanvas('stage', stage.canvas);
    this.registry.set('bulbs', stage.bulbs);
    this.textures.addCanvas('glow', buildGlow());
    for (const t of ['tomate', 'chancla', 'pito']) this.textures.addCanvas(`proj-${t}`, buildProjectile(t));

    this.scene.start('Title');
  }
}
