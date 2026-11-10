// Escenario "La feria al atardecer" dibujado con código.
// Para usar un fondo de Higgsfield: carga la imagen en Boot.js con la clave 'stage' y borra la llamada a buildStage().
import { W, H } from '../core/constants.js';
import { INK } from './fighter-art.js';

const ITEMS = {
  tomate: { c: '#d8392b', h: '#ff8a70' }, palta: { c: '#2f4a22', h: '#5a7a3a' }, limon: { c: '#e8d23a', h: '#fff09a' },
  naranja: { c: '#f08a24', h: '#ffbe6a' }, choclo: { c: '#f0cf50', h: '#fff0a0', long: true }, lechuga: { c: '#6cbf4a', h: '#a8e070', big: true },
};

export function buildStage(font = 'Silkscreen, monospace') {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  const sky = g.createLinearGradient(0, 0, 0, 172);
  sky.addColorStop(0, '#161331'); sky.addColorStop(0.5, '#3a2556'); sky.addColorStop(0.82, '#a0495c'); sky.addColorStop(1, '#f08a4b');
  g.fillStyle = sky; g.fillRect(0, 0, W, 172);
  for (let i = 0; i < 45; i++) { g.fillStyle = `rgba(255,240,225,${0.25 + rnd() * 0.55})`; g.fillRect(Math.floor(rnd() * W), Math.floor(rnd() * 80), 1, 1); }
  // Luna (más abajo, para no quedar detrás de las barras de vida)
  g.fillStyle = '#f6e9c8'; g.beginPath(); g.arc(222, 80, 9, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#3a2556'; g.beginPath(); g.arc(226, 77, 8, 0, Math.PI * 2); g.fill();

  // Cordillera con nieve
  const peaks = []; let x = -10;
  while (x < W + 20) { peaks.push([x, 74 + rnd() * 30]); x += 18 + rnd() * 22; }
  g.beginPath(); g.moveTo(-10, 172);
  peaks.forEach(([px, py], i) => { g.lineTo(px, py); if (i < peaks.length - 1) { const nx = peaks[i + 1][0]; g.lineTo((px + nx) / 2, py + 16 + rnd() * 10); } });
  g.lineTo(W + 20, 172); g.closePath(); g.fillStyle = '#5b3a6c'; g.fill();
  g.save(); g.clip(); g.fillStyle = 'rgba(236,220,238,0.85)';
  for (const [px, py] of peaks) {
    if (py > 96) continue;
    g.beginPath(); g.moveTo(px - 16, py + 11); g.lineTo(px, py - 1); g.lineTo(px + 16, py + 11); g.lineTo(px + 9, py + 8); g.lineTo(px + 4, py + 12); g.lineTo(px - 3, py + 8); g.lineTo(px - 9, py + 12); g.closePath(); g.fill();
  }
  g.restore();
  g.fillStyle = '#3a2650'; g.beginPath(); g.moveTo(0, 172);
  for (let hx = 0; hx <= W; hx += 8) g.lineTo(hx, 140 + Math.sin(hx * 0.02) * 6 + Math.sin(hx * 0.05) * 3);
  g.lineTo(W, 172); g.closePath(); g.fill();

  // Ciudad
  let bx = 0;
  while (bx < W) {
    const bw = 10 + Math.floor(rnd() * 18), bh = 16 + Math.floor(rnd() * 44);
    g.fillStyle = '#241b3c'; g.fillRect(bx, 168 - bh, bw, bh);
    for (let wy = 168 - bh + 3; wy < 165; wy += 5) for (let wx = bx + 2; wx < bx + bw - 2; wx += 4) if (rnd() < 0.28) { g.fillStyle = rnd() < 0.8 ? 'rgba(255,207,106,0.75)' : 'rgba(159,224,255,0.6)'; g.fillRect(wx, wy, 2, 2); }
    bx += bw + 1;
  }
  g.fillStyle = '#2a2046'; g.beginPath(); g.moveTo(360, 168); g.lineTo(361, 70); g.lineTo(368, 61); g.lineTo(375, 70); g.lineTo(376, 168); g.closePath(); g.fill();
  g.fillStyle = 'rgba(255,200,150,.22)'; g.fillRect(372, 72, 2, 96); g.fillStyle = '#2a2046'; g.fillRect(367, 50, 2, 12);
  g.fillStyle = '#2a2238'; g.fillRect(0, 168, W, 40);

  // Guirnalda de ampolletas (las luces se animan aparte)
  const bulbs = [];
  const wires = [[-10, 52, 160, 44], [160, 44, 330, 46], [330, 46, 490, 54]], cols = ['#ffd36a', '#ff8a5a', '#9fe0ff', '#ffd36a', '#b8ff8a'];
  g.strokeStyle = '#120d1f'; g.lineWidth = 1; let bi = 0;
  for (const [x1, y1, x2, y2] of wires) {
    g.beginPath();
    for (let t = 0; t <= 1.0001; t += 0.05) { const wx = x1 + (x2 - x1) * t, wy = y1 + (y2 - y1) * t + 18 * 4 * t * (1 - t); if (t === 0) g.moveTo(wx, wy); else g.lineTo(wx, wy); }
    g.stroke();
    const n = Math.floor((x2 - x1) / 13);
    for (let k = 1; k < n; k++) { const t = k / n; bulbs.push({ x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t + 18 * 4 * t * (1 - t) + 1, c: cols[bi % cols.length], i: bi }); bi++; }
  }
  g.fillStyle = '#3e3352'; g.fillRect(159, 44, 2, 161); g.fillRect(329, 46, 2, 159);

  // Puestos de la feria
  stall(g, font, 6, 146, ['#3d6ee0', '#f3ead8'], ['tomate', 'palta', 'limon'], [['TOMATE', '$990 KG'], ['PALTA', '$2.990']], rnd);
  stall(g, font, 168, 146, ['#d63b2f', '#f3ead8'], ['naranja', 'choclo', 'lechuga'], [['CHOCLO', '3X$1.000'], ['LECHUGA', '$700']], rnd);
  stall(g, font, 330, 146, ['#f2b632', '#f3ead8'], ['limon', 'tomate', 'naranja'], [['LIMÓN', '$1.500'], ['NARANJA', '$890']], rnd);

  // Calle
  const pv = g.createLinearGradient(0, 205, 0, 270); pv.addColorStop(0, '#2e2738'); pv.addColorStop(1, '#1c1726'); g.fillStyle = pv; g.fillRect(0, 205, W, 65);
  g.fillStyle = '#4a405c'; g.fillRect(0, 205, W, 2);
  g.fillStyle = 'rgba(230,190,80,.3)'; for (let lx = 0; lx < W; lx += 28) g.fillRect(lx, 260, 16, 2);
  for (let i = 0; i < 16; i++) { g.fillStyle = ['#6cbf4a', '#4f8f36', '#d8392b', '#e8d23a'][i % 4]; g.fillRect(Math.floor(rnd() * W), 212 + Math.floor(rnd() * 50), 2 + Math.floor(rnd() * 2), 1 + Math.floor(rnd() * 2)); }
  return { canvas: c, bulbs };
}

function stall(g, font, x0, w, stripes, items, signs, rnd) {
  const top = 110, tb = 128;
  g.fillStyle = '#5a4a40'; g.fillRect(x0 + 3, top, 2, 95); g.fillRect(x0 + w - 5, top, 2, 95);
  g.fillStyle = 'rgba(8,5,16,0.35)'; g.fillRect(x0 + 5, tb, w - 10, 77);
  for (let i = 0; i < 4; i++) { const cx = x0 + 10 + i * 33; g.fillStyle = '#6a4428'; g.fillRect(cx, 150, 28, 22); g.fillStyle = '#55361f'; g.fillRect(cx, 155, 28, 1); g.fillRect(cx, 161, 28, 1); g.fillRect(cx, 167, 28, 1); }
  g.fillStyle = '#7a5236'; g.fillRect(x0 + 6, 183, w - 12, 4);
  for (let hx = x0 + 6, i = 0; hx < x0 + w - 6; hx += 4, i++) for (let hy = 187, j = 0; hy < 197; hy += 4, j++) { g.fillStyle = (i + j) % 2 ? '#e8e0f0' : stripes[0]; g.fillRect(hx, hy, Math.min(4, x0 + w - 6 - hx), Math.min(4, 197 - hy)); }
  g.fillStyle = '#4e3322'; g.fillRect(x0 + 10, 197, 2, 8); g.fillRect(x0 + w - 12, 197, 2, 8);
  items.forEach((it, k) => {
    const cx = x0 + 10 + k * 45, cy = 170, I = ITEMS[it];
    for (let row = 0; row < 2; row++) for (let px = cx + 3 + row * 2.5; px < cx + 36; px += I.big ? 8 : 5) {
      const r = I.big ? 4 : 2.6, py = cy - 1 - row * 3.5 - rnd() * 1.5; g.fillStyle = I.c;
      if (I.long) g.fillRect(px - 2, py - 4, 4, 8); else { g.beginPath(); g.arc(px, py, r, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = I.h; g.fillRect(px - 1, py - 1.5, 1.2, 1.2);
    }
    g.fillStyle = '#9a6a3a'; g.fillRect(cx, cy, 38, 13); g.fillStyle = '#7a5028'; g.fillRect(cx, cy + 4, 38, 1); g.fillRect(cx, cy + 8, 38, 1);
  });
  for (let s = 0, i = 0; s < w; s += 10, i++) { g.fillStyle = stripes[i % 2]; g.fillRect(x0 + s, top, Math.min(10, w - s), tb - top); g.beginPath(); g.arc(x0 + s + 5, tb, 5, 0, Math.PI); g.fill(); }
  g.fillStyle = 'rgba(0,0,0,.16)'; g.fillRect(x0, tb - 3, w, 3);
  signs.forEach(([a, b], k) => {
    const sx = x0 + 10 + k * 70, sy = 136;
    g.fillStyle = '#3a2a20'; g.fillRect(sx + 26, sy + 22, 2, 8);
    g.fillStyle = k % 2 ? '#a8f070' : '#ffe066'; g.fillRect(sx, sy, 54, 22);
    g.fillStyle = INK; g.textAlign = 'center'; g.textBaseline = 'top';
    g.font = `8px ${font}`; g.fillText(a, sx + 27, sy + 2, 52); g.fillText(b, sx + 27, sy + 12, 52);
  });
}

// Brillo suave para las ampolletas.
export function buildGlow() {
  const c = document.createElement('canvas'); c.width = c.height = 16;
  const g = c.getContext('2d'), rg = g.createRadialGradient(8, 8, 0, 8, 8, 8);
  rg.addColorStop(0, 'rgba(255,230,170,0.9)'); rg.addColorStop(0.3, 'rgba(255,200,120,0.35)'); rg.addColorStop(1, 'rgba(255,180,90,0)');
  g.fillStyle = rg; g.fillRect(0, 0, 16, 16);
  return c;
}

// Proyectiles: un dibujo por tipo, mirando a la derecha.
export function buildProjectile(type) {
  const c = document.createElement('canvas'); c.width = 24; c.height = 24;
  const g = c.getContext('2d');
  g.translate(12, 12);
  if (type === 'tomate') {
    g.fillStyle = '#d8392b'; g.beginPath(); g.arc(0, 0, 6, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ff8a70'; g.fillRect(-3, -3, 2, 2);
    g.fillStyle = '#3d8a2a'; g.fillRect(-3, -7, 6, 2); g.fillRect(-1, -9, 2, 3);
  } else if (type === 'chancla') {
    g.fillStyle = '#e05a7a'; g.fillRect(-8, -3, 16, 6); g.fillRect(-7, -4, 13, 8);
    g.fillStyle = '#b8405e'; g.fillRect(-8, 2, 16, 1);
    g.fillStyle = '#ffd36a'; g.fillRect(-1, -5, 2, 4); g.fillRect(2, -5, 2, 4);
  } else {
    for (let i = 0; i < 3; i++) { g.strokeStyle = `rgba(255,240,180,${0.95 - i * 0.28})`; g.lineWidth = 2; g.beginPath(); g.arc(-i * 4, 0, 4 + i * 3, -0.95, 0.95); g.stroke(); }
  }
  return c;
}
