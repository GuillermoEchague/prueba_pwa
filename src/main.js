import Phaser from 'phaser';
import '@fontsource/silkscreen/400.css';
import '@fontsource/silkscreen/700.css';
import { W, H } from './core/constants.js';
import { Boot } from './scenes/Boot.js';
import { Title } from './scenes/Title.js';
import { Select } from './scenes/Select.js';
import { Fight } from './scenes/Fight.js';
import { Results } from './scenes/Results.js';
import { unlockAudio } from './audio/sfx.js';
import { setupPWA } from './pwa.js';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: W,
  height: H,
  backgroundColor: '#141026',
  pixelArt: true, // píxeles nítidos al agrandar
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: { activePointers: 4 },
  scene: [Boot, Title, Select, Fight, Results],
});

// El sonido se activa con el primer toque o tecla (regla de los navegadores).
const unlock = () => unlockAudio();
window.addEventListener('pointerdown', unlock, { passive: true });
window.addEventListener('keydown', unlock);

setupPWA();

// Para probar desde la consola del navegador
window.__game = game;
