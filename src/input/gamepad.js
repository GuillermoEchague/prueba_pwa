// Controles (Xbox, PlayStation y similares) con la Gamepad API del navegador.
// Botones estándar: 0 A/Cruz · 1 B/Círculo · 2 X/Cuadrado · 3 Y/Triángulo · 9 Start · 12-15 cruceta.

function pads() {
  try { return Array.from(navigator.getGamepads ? navigator.getGamepads() : []).filter(Boolean); }
  catch { return []; }
}

export function readPad(i) {
  const p = pads()[i];
  if (!p) return null;
  const b = (n) => !!(p.buttons[n] && p.buttons[n].pressed);
  const ax = p.axes[0] || 0, ay = p.axes[1] || 0;
  return {
    up: b(12) || ay < -0.5 ? 1 : 0,
    down: b(13) || ay > 0.5 ? 1 : 0,
    left: b(14) || ax < -0.5 ? 1 : 0,
    right: b(15) || ax > 0.5 ? 1 : 0,
    p: b(2) || b(3) ? 1 : 0,
    k: b(0) || b(1) ? 1 : 0,
    a: b(0), bb: b(1), start: b(9),
  };
}

// Botones recién apretados (para menús y pausa), mirando todos los controles conectados.
let prev = {};
export function padEdges() {
  const now = { up: false, down: false, left: false, right: false, a: false, b: false, start: false };
  for (let i = 0; i < 4; i++) {
    const s = readPad(i);
    if (!s) continue;
    now.up ||= !!s.up; now.down ||= !!s.down; now.left ||= !!s.left; now.right ||= !!s.right;
    now.a ||= s.a; now.b ||= s.bb; now.start ||= s.start;
  }
  const e = {};
  for (const k in now) e[k] = now[k] && !prev[k];
  prev = now;
  return {
    ...e,
    prev: (h) => (h ? e.left : e.up),
    next: (h) => (h ? e.right : e.down),
  };
}
