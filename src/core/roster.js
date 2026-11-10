// Luchadores. `look` son los colores que usa el dibujo generado por código;
// cuando tengas hojas de sprites, `look` deja de importar y basta con `id`.
export const ROSTER = [
  {
    id: 'tito', name: 'Don Tito', role: 'Feriante de tomates',
    speed: 1.6, power: 1, hp: 100, stats: [3, 3, 3],
    special: 'Tomatazo', superName: 'Cajón de tomates', proj: 'tomate', projSpeed: 1,
    quote: '¡A luca el kilo de combos, casero!',
    look: { skin: '#d9a07a', skinD: '#a8704e', hair: '#3a2a22', top: '#ece4d4', arm: '#ece4d4', apron: '#cf3b30', pants: '#3b4a78', shoe: '#2a1f22', acc: '#2f63c9', hat: 'cap', stache: true },
    alt: { apron: '#2f9a5a', acc: '#e08a2a', pants: '#5a3a2a' },
  },
  {
    id: 'nena', name: 'Tía Nena', role: 'Dueña del kiosko',
    speed: 1.95, power: 0.88, hp: 92, stats: [5, 2, 2],
    special: 'Chancletazo', superName: 'Chancla teledirigida', proj: 'chancla', projSpeed: 1.15,
    quote: '¿Y? ¿Va a llevar algo o se va a quedar mirando?',
    look: { skin: '#e8b48e', skinD: '#bf8a66', hair: '#8a4a3a', top: '#5fb59a', arm: '#5fb59a', apron: '#f2c94c', flowers: true, pants: '#4b3a66', shoe: '#e05a7a', acc: '#e05a7a', hat: 'rulos' },
    alt: { top: '#8a6ad0', arm: '#8a6ad0', apron: '#f08a5a' },
  },
  {
    id: 'rulo', name: 'El Rulo', role: 'Guardia del mall',
    speed: 1.3, power: 1.18, hp: 112, stats: [2, 5, 4],
    special: '¡Priiit!', superName: 'Pitazo final', proj: 'pito', projSpeed: 0.9,
    quote: 'Circule, circule, que aquí no hay nada que ver.',
    look: { skin: '#b8805c', skinD: '#8a5a3c', hair: '#1c1418', top: '#33406e', arm: '#33406e', pants: '#232842', shoe: '#0f0f14', acc: '#e8c040', hat: 'guard', stache: true, badge: true, wide: true },
    alt: { top: '#6e3a3a', arm: '#6e3a3a', pants: '#3a2626' },
  },
];
