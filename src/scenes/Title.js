import Phaser from 'phaser';
import { W, H } from '../core/constants.js';
import { createFight, stepFight, randomPicks } from '../core/game.js';
import { FightView } from './fight-view.js';
import { FixedStep, dispatchEvents } from './fixed-step.js';
import { text, createMenu, C } from './ui.js';
import { settings, saveSettings, DIFF_NAMES } from '../settings.js';
import { canInstall, needsIosHelp, promptInstall, showIosHelp, onInstallChange, isStandalone, isIOS, toast } from '../pwa.js';
import { isTouchDevice } from '../input/touch.js';
import { stopVoice } from '../audio/sfx.js';

// Pantalla de título: una pelea de demostración de fondo y el menú principal.
export class Title extends Phaser.Scene {
  constructor() { super('Title'); }

  create() {
    this.newDemo();
    this.loop = new FixedStep(() => this.step());

    const shade = this.add.graphics().setDepth(50);
    shade.fillGradientStyle(0x0e0a1e, 0x0e0a1e, 0x0e0a1e, 0x0e0a1e, 0.15, 0.15, 0.85, 0.85).fillRect(0, 0, W, H);

    text(this, W / 2, 30, 'JUEGO DE PELEAS · PROTOTIPO', { size: 8, color: C.tenue, origin: [0.5, 0.5] }).setDepth(51);
    const logo = (y, s) => text(this, W / 2, y, s, { size: 32, bold: true, color: C.maravilla, origin: [0.5, 0.5] })
      .setShadow(3, 3, C.aji, 0, true, true).setDepth(51);
    logo(62, 'COMBO');
    logo(96, 'EN LA FERIA');

    // Panel detrás del menú para que se lea sobre la pelea de fondo
    this.add.graphics().setDepth(51).fillStyle(0x0e0a1e, 0.72).fillRoundedRect(W / 2 - 86, 122, 172, 108, 8);

    const yes = (v) => (v ? 'SÍ' : 'NO');
    this.menu = createMenu(this, {
      x: W / 2, y: 134, gap: 14,
      items: [
        { label: '1 JUGADOR', action: () => this.go('cpu') },
        { label: '2 JUGADORES', action: () => this.go('2p') },
        { label: () => `CPU: ${DIFF_NAMES[settings.diff]}`, action: () => { settings.diff = (settings.diff + 1) % 3; saveSettings(); } },
        { label: () => `SONIDO: ${yes(settings.sound)}`, action: () => { settings.sound = !settings.sound; if (!settings.sound) stopVoice(); saveSettings(); } },
        { label: () => `LOCUTOR: ${yes(settings.voice)}`, action: () => { settings.voice = !settings.voice; saveSettings(); } },
        { label: 'INSTALAR JUEGO', hidden: () => !canInstall(), action: () => promptInstall() },
        { label: 'CÓMO INSTALAR', hidden: () => canInstall() || !needsIosHelp(), action: () => showIosHelp(true) },
        // Solo en la app instalada o en pantalla completa (en una pestaña normal se cierra la pestaña).
        { label: () => (this.confirmExit ? '¿SALIR? TOCA OTRA VEZ' : 'SALIR'), hidden: () => !isStandalone() && !this.scale.isFullscreen, action: () => this.exitGame() },
      ],
      depth: 52,
    });
    const off = onInstallChange(() => this.menu.rebuild());
    this.events.once('shutdown', off);

    const hint = isTouchDevice()
      ? 'TOCA UNA OPCIÓN PARA EMPEZAR'
      : '1P: WASD + F/G   ·   2P: FLECHAS + K/L   ·   ENTER ELIGE';
    text(this, W / 2, H - 12, hint, { size: 8, color: C.tenue, origin: [0.5, 0.5] }).setDepth(51);
  }

  newDemo() {
    if (this.view) this.view.destroy();
    this.fight = createFight({ mode: 'demo', picks: randomPicks(), onDemoEnd: () => { this.pendingDemo = true; } });
    this.view = new FightView(this, this.fight, { hud: false });
  }

  step() {
    stepFight(this.fight, [null, null]);
    dispatchEvents(this.fight.world, this.view, { sound: false });
    this.view.tickFx();
    if (this.pendingDemo) { this.pendingDemo = false; this.newDemo(); }
  }

  go(mode) {
    // En el celular, pantalla completa al empezar (en la app instalada ya lo es).
    if (isTouchDevice() && !isStandalone() && !this.scale.isFullscreen) {
      try { this.scale.startFullscreen(); } catch { /* algunos navegadores no lo permiten */ }
    }
    this.scene.start('Select', { mode });
  }

  exitGame() {
    // Primer toque: pide confirmar, para no salir por accidente.
    if (!this.confirmExit) {
      this.confirmExit = true;
      this.time.delayedCall(2500, () => { this.confirmExit = false; if (this.menu.alive) this.menu.refresh(); });
      return;
    }
    this.confirmExit = false;
    stopVoice();
    // Jugando en el navegador a pantalla completa: solo se sale de la pantalla completa.
    if (!isStandalone()) {
      this.scale.stopFullscreen();
      this.time.delayedCall(200, () => this.menu.rebuild());
      return;
    }
    // App instalada: se intenta cerrar la ventana. Android y computador lo permiten;
    // iPhone no deja que una página se cierre sola, así que se explica cómo hacerlo.
    window.close();
    setTimeout(() => {
      toast(isIOS()
        ? 'Para salir, desliza hacia arriba desde el borde inferior de la pantalla.'
        : 'Para salir, usa el botón de inicio o el de atrás de tu teléfono.');
    }, 400);
  }

  update(time, delta) {
    this.loop.update(delta);
    this.view.render();
    this.menu.update();
  }
}