// Preferencias del jugador, guardadas en este navegador.
const KEY = 'combo-feria-prefs';
const DEFAULTS = { sound: true, voice: true, diff: 1, boxes: false, data: false };

export const settings = { ...DEFAULTS };

try {
  const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
  for (const k of Object.keys(DEFAULTS)) if (typeof saved[k] === typeof DEFAULTS[k]) settings[k] = saved[k];
} catch { /* sin almacenamiento: se usan los valores por defecto */ }

export function saveSettings() {
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* nada que hacer */ }
}

export const DIFF_NAMES = ['FÁCIL', 'NORMAL', 'DIFÍCIL'];
