// Tabla de ataques. Todo se mide en cuadros (1/60 s).
// startup: cuadros antes de que pegue · active: cuadros en que puede pegar · recovery: cuadros expuesto después.
// box: hitbox relativa a los pies del luchador, mirando a la derecha.
export const MOVES = {
  punch: {
    label: 'Golpe', input: 'Golpe',
    startup: 4, active: 3, recovery: 8,
    dmg: 5, hitstun: 15, blockstun: 9, push: 1.6, hitstop: 5, meter: 6,
    box: { x: 10, y: -45, w: 24, h: 11 },
    cancel: ['kick', 'low', 'special', 'super'],
  },
  kick: {
    label: 'Patada', input: 'Patada',
    startup: 7, active: 4, recovery: 14,
    dmg: 8, hitstun: 18, blockstun: 11, push: 2.6, hitstop: 7, meter: 8, heavy: true,
    box: { x: 8, y: -36, w: 34, h: 13 },
    cancel: ['special', 'super'],
  },
  low: {
    label: 'Barrida', input: '↓ + Patada',
    startup: 6, active: 4, recovery: 16,
    dmg: 7, hitstun: 17, blockstun: 10, push: 2.2, hitstop: 6, meter: 8, low: true,
    box: { x: 6, y: -12, w: 36, h: 11 },
    cancel: ['special', 'super'],
  },
  air: {
    label: 'Patada aérea', input: 'Saltando + Patada',
    startup: 4, active: 12, recovery: 0,
    dmg: 8, hitstun: 17, blockstun: 10, push: 2, hitstop: 6, meter: 8,
    box: { x: 4, y: -24, w: 28, h: 15 },
  },
  special: {
    label: 'Especial', input: '↓ ↘ → + Golpe',
    startup: 12, active: 0, recovery: 20,
    proj: { dmg: 9, speed: 3.4, hitstun: 20, blockstun: 14, chip: 1.5, push: 2.6, hitstop: 7, meter: 10, w: 14, h: 12, y: -44 },
  },
  super: {
    label: 'Súper', input: '↓ ↘ → + Patada',
    startup: 14, active: 0, recovery: 26,
    proj: { dmg: 24, speed: 4.4, hitstun: 36, blockstun: 22, chip: 6, push: 4.2, hitstop: 14, meter: 0, heavy: true, w: 30, h: 26, y: -46 },
  },
};

export const MOVE_ORDER = ['punch', 'kick', 'low', 'air', 'special', 'super'];

export function movePhase(f) {
  const m = f.move;
  if (!m) return null;
  const d = m.d;
  if (m.f <= d.startup) return 'startup';
  if (m.f <= d.startup + d.active) return 'active';
  return 'recovery';
}
