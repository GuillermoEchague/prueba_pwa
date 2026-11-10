import Phaser from 'phaser';
import { W, H } from '../core/constants.js';
import { createFight, stepFight } from '../core/game.js';
import { merge, blank } from '../core/input-buffer.js';
import { FightView } from './fight-view.js';
import { FixedStep, dispatchEvents } from './fixed-step.js';
import { KeyboardInput } from '../input/keyboard.js';
import { readPad, padEdges } from '../input/gamepad.js';
import { TouchControls, isTouchDevice } from '../input/touch.js';
import { text, createMenu, C, onKeyOnce } from './ui.js';
import { settings, saveSettings } from '../settings.js';
import { stopVoice } from '../audio/sfx.js';

// La pelea. La lógica vive en src/core; esta escena junta controles, avanza el core
// a 60 cuadros por segundo y le pide a FightView que lo dibuje.
export class Fight extends Phaser.Scene {
  constructor() { super('Fight'); }

  init(data) {
    this.mode = data.mode || 'cpu';
    this.picks = data.picks || [0, 1];
  }

  create() {
    this.fight = createFight({ picks: this.picks, mode: this.mode, diff: settings.diff });
    this.view = new FightView(this, this.fight);
    this.keys = new KeyboardInput(this);
    this.loop = new FixedStep(() => this.stepOnce());
    this.paused = false;
    this.ended = false;

    this.touch = isTouchDevice() ? new TouchControls(this, { onPause: () => this.togglePause() }) : null;

    // Pausa y herramientas de depuración
    onKeyOnce(this, (e) => {
      if (e.code === 'Escape' || e.code === 'KeyP') this.togglePause();
      else if (e.code === 'KeyH') { settings.boxes = !settings.boxes; saveSettings(); }
      else if (e.code === 'KeyJ') { settings.data = !settings.data; saveSettings(); }
    });
    const autoPause = () => { if (!this.paused && this.fight.match.inPlay) this.togglePause(); };
    const onVis = () => { if (document.hidden) autoPause(); };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('blur', autoPause);
    this.events.once('shutdown', () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('blur', autoPause);
      stopVoice();
    });
    this.portrait = matchMedia('(orientation: portrait)');
    this.buildPause();
  }

  buildPause() {
    const yes = (v) => (v ? 'SÍ' : 'NO');
    this.pauseBg = this.add.rectangle(0, 0, W, H, 0x0e0a1e, 0.8).setOrigin(0).setDepth(80).setVisible(false);
    this.pauseTitle = text(this, W / 2, 70, 'PAUSA', { size: 32, bold: true, color: C.maravilla, origin: [0.5, 0.5] }).setDepth(81).setVisible(false);
    this.pauseMenu = createMenu(this, {
      x: W / 2, y: 118, gap: 16, depth: 81,
      onBack: () => this.togglePause(),
      items: [
        { label: 'SEGUIR', action: () => this.togglePause() },
        { label: () => `VER HITBOXES: ${yes(settings.boxes)}`, action: () => { settings.boxes = !settings.boxes; saveSettings(); } },
        { label: () => `DATOS DE FRAMES: ${yes(settings.data)}`, action: () => { settings.data = !settings.data; saveSettings(); } },
        { label: () => `SONIDO: ${yes(settings.sound)}`, action: () => { settings.sound = !settings.sound; if (!settings.sound) stopVoice(); saveSettings(); } },
        { label: 'SALIR AL MENÚ', action: () => this.scene.start('Title') },
      ],
    });
    this.pauseMenu.setVisible(false);
  }

  togglePause() {
    if (this.ended || !this.fight.match.inPlay) return;
    this.paused = !this.paused;
    this.pauseBg.setVisible(this.paused);
    this.pauseTitle.setVisible(this.paused);
    this.pauseMenu.setVisible(this.paused);
    if (this.paused) { this.pauseMenu.index = 0; stopVoice(); }
    if (this.touch) this.touch.reset();
    this.loop.reset();
  }

  humanInputs() {
    const [a] = this.fight.world.fighters;
    const k1 = this.keys.player(0), k2 = this.keys.player(1);
    this.keys.endFrame();
    if (this.mode === 'cpu') {
      const r = merge(merge(merge(blank(), k1), k2), readPad(0));
      if (this.touch) {
        const t = this.touch.read(a.facing);
        merge(r, t);
      }
      return [r, null];
    }
    const r1 = merge(merge(blank(), k1), readPad(0));
    if (this.touch) merge(r1, this.touch.read(a.facing));
    return [r1, merge(merge(blank(), k2), readPad(1))];
  }

  stepOnce() {
    const f = this.fight;
    stepFight(f, this.humanInputs());
    const events = dispatchEvents(f.world, this.view);
    this.view.tickFx();
    if (events.some((e) => e.type === 'matchEnd')) this.time.delayedCall(400, () => this.showResults());
  }

  showResults() {
    if (this.ended) return;
    this.ended = true;
    if (this.touch) this.touch.setVisible(false);
    this.scene.launch('Results', { mode: this.mode, picks: this.picks, winnerPid: this.fight.match.winner ? this.fight.match.winner.pid : -1 });
  }

  update(time, delta) {
    const e = padEdges();
    if (e.start) this.togglePause();
    if (this.touch && this.portrait.matches && !this.paused && this.fight.match.inPlay) this.togglePause();

    if (!this.paused && this.fight.match.phase !== 'end') this.loop.update(delta);
    else if (this.paused) this.pauseMenu.update();
    this.view.render();
    if (this.touch && !this.ended) {
      this.touch.superReady = this.fight.world.fighters[0].meter >= 100;
      this.touch.setVisible(!this.paused);
      this.touch.draw();
    }
  }
}
