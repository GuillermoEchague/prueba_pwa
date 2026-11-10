// Piezas de interfaz compartidas: textos con la fuente pixel y menús que se manejan con
// teclado, control o tocando la pantalla.
import { play } from '../audio/sfx.js';
import { padEdges } from '../input/gamepad.js';

export const FONT = 'Silkscreen, monospace';
export const C = {
  noche: 0x141026, panel: 0x1d1735, panel2: 0x271f47, linea: 0x3a3066,
  papel: '#f3ead8', tenue: '#aaa2cc', maravilla: '#ffc23a', aji: '#e8443a', ink: '#1b1226',
};

// Phaser a veces entrega el mismo evento de teclado dos veces (si dos pasos del juego leen la
// misma cola). Este envoltorio hace que cada oyente reaccione una sola vez por tecla.
export function onKeyOnce(scene, fn) {
  const seen = new WeakSet();
  const h = (e) => { if (seen.has(e)) return; seen.add(e); fn(e); };
  scene.input.keyboard.on('keydown', h);
  return () => scene.input.keyboard.off('keydown', h);
}

export function text(scene, x, y, str, { size = 8, color = C.papel, bold = false, stroke = true, align = 'left', origin = [0, 0], wrap = 0 } = {}) {
  const t = scene.add.text(x, y, str, {
    fontFamily: FONT,
    fontSize: `${size}px`,
    fontStyle: bold ? 'bold' : 'normal',
    color,
    align,
    stroke: stroke ? C.ink : undefined,
    strokeThickness: stroke ? Math.max(2, Math.round(size / 4)) : 0,
    padding: { x: 2, y: 2 },
    wordWrap: wrap ? { width: wrap } : undefined,
    lineSpacing: 2,
  });
  t.setOrigin(origin[0], origin[1]);
  return t;
}

// Menú vertical (o horizontal). items: [{ label: string | () => string, action, enabled?: () => bool }]
export function createMenu(scene, { x, y, items, gap = 16, horizontal = false, size = 8, onBack = null, align = 'center', depth = 0 }) {
  let sel = 0;
  let z = depth;
  const visible = () => items.filter((it) => !it.hidden || !it.hidden());
  const nodes = [];
  const label = (it) => (typeof it.label === 'function' ? it.label() : it.label);

  function build() {
    nodes.forEach((n) => n.destroy());
    nodes.length = 0;
    visible().forEach((it, i) => {
      const px = horizontal ? x + i * gap : x;
      const py = horizontal ? y : y + i * gap;
      const t = text(scene, px, py, label(it), { size, origin: [align === 'center' ? 0.5 : 0, 0.5] });
      t.setInteractive({ useHandCursor: true });
      t.on('pointerover', () => { sel = i; refresh(); });
      t.on('pointerup', () => { sel = i; refresh(); choose(); });
      t.item = it;
      t.setDepth(z);
      nodes.push(t);
    });
    if (sel >= nodes.length) sel = 0;
    refresh();
  }

  function refresh() {
    nodes.forEach((n, i) => {
      const on = i === sel;
      n.setText((on ? '› ' : '  ') + label(n.item) + (on ? ' ‹' : '  '));
      n.setColor(on ? C.maravilla : C.papel);
    });
  }

  function move(d) {
    if (!nodes.length) return;
    sel = (sel + d + nodes.length) % nodes.length;
    play('blip');
    refresh();
  }

  function choose() {
    const n = nodes[sel];
    if (!n) return;
    play('select');
    n.item.action();
    if (api.alive) refresh();
  }

  const prevKey = horizontal ? ['ArrowLeft', 'KeyA'] : ['ArrowUp', 'KeyW'];
  const nextKey = horizontal ? ['ArrowRight', 'KeyD'] : ['ArrowDown', 'KeyS'];
  let activatedAt = 0;
  const onKey = (e) => {
    if (!api.alive || !api.active) return;
    if (e.timeStamp && e.timeStamp <= activatedAt) return; // la misma tecla que abrió el menú no cuenta
    if (prevKey.includes(e.code)) move(-1);
    else if (nextKey.includes(e.code)) move(1);
    else if (['Enter', 'Space', 'KeyF', 'KeyK', 'KeyG', 'KeyL'].includes(e.code)) choose();
    else if (e.code === 'Escape' && onBack) { play('blip'); onBack(); }
  };
  const offKey = onKeyOnce(scene, onKey);

  const api = {
    alive: true,
    active: true,
    get index() { return sel; },
    set index(v) { sel = v; refresh(); },
    nodes,
    rebuild: build,
    refresh,
    // Llamar en update() de la escena para leer el control.
    update() {
      if (!api.active) return;
      const e = padEdges();
      if (e.prev(horizontal)) move(-1);
      if (e.next(horizontal)) move(1);
      if (e.a) choose();
      if (e.b && onBack) { play('blip'); onBack(); }
    },
    setVisible(v) {
      nodes.forEach((n) => n.setVisible(v));
      if (v && !api.active) activatedAt = performance.now();
      api.active = v;
    },
    setDepth(d) { z = d; nodes.forEach((n) => n.setDepth(d)); return api; },
    destroy() {
      api.alive = false;
      offKey();
      nodes.forEach((n) => n.destroy());
    },
  };
  build();
  scene.events.once('shutdown', () => api.destroy());
  return api;
}
