# Combo en la Feria (Phaser 4 + PWA)

Juego de peleas 2D en pixel art, ambientado en una feria chilena, hecho con **Phaser 4** e instalable en el celular como **PWA**: se agrega a la pantalla de inicio, abre a pantalla completa y funciona sin internet.

Es la versión en Phaser del prototipo hecho en HTML y Canvas. La lógica de pelea (estados, frames, hitboxes, combos y CPU) es la misma y ahora vive separada de Phaser.

## Requisitos

- [Node.js](https://nodejs.org) versión LTS (22 o más nueva).
- Un navegador moderno: Chrome, Edge, Safari o Firefox.

## Cómo usarlo

Abre una terminal en esta carpeta y ejecuta:

```bash
npm install        # instala Phaser, Vite y el plugin de PWA (solo la primera vez)
npm run dev        # abre el juego en modo desarrollo, con recarga automática
```

Abre la dirección que aparece (por ejemplo `http://localhost:5173`).

| Comando | Para qué sirve |
| --- | --- |
| `npm run dev` | Desarrollo. Cada cambio en el código se ve al instante. |
| `npm test` | Pruebas de la lógica de pelea, sin abrir el navegador. |
| `npm run build` | Arma la versión final en la carpeta `dist/`, con la PWA incluida. |
| `npm run preview` | Sirve la carpeta `dist/` para probar la PWA (instalar, jugar sin internet). |

### Probar en el celular

1. Conecta el computador y el celular a la misma red wifi.
2. Ejecuta `npm run dev` y abre en el celular la dirección **Network** que aparece (por ejemplo `http://192.168.1.20:5173`).
3. Pon el teléfono en horizontal.

Para **instalar** el juego y usarlo sin internet hace falta HTTPS. Eso funciona en `localhost` o una vez publicado (ver abajo), pero no desde la dirección de red local.

## Controles

| Acción | Jugador 1 | Jugador 2 |
| --- | --- | --- |
| Moverse y saltar | W A S D | Flechas |
| Golpe | F o V | K o 1 del teclado numérico |
| Patada | G o B | L o 2 del teclado numérico |
| Pausa | Esc o P | Esc o P |

- **Bloquear:** mantén atrás. La barrida solo se bloquea agachado hacia atrás.
- **Especial:** ↓ ↘ → + Golpe.
- **Súper:** ↓ ↘ → + Patada, con la barra de súper llena.
- **Celular:** joystick a la izquierda y botones a la derecha. Especial y Súper hacen la secuencia ↓↘→ solos.
- **Control (Xbox, PlayStation y similares):** cruceta o palanca para moverse, X o Y para golpe, A o B para patada y Start para pausa.
- **Para estudiar el sistema:** H muestra las hitboxes y J muestra los datos de frames. También están en el menú de pausa.

## Estructura

```text
src/
├─ main.js               configuración de Phaser
├─ pwa.js                actualización, instalación y avisos de la PWA
├─ settings.js           preferencias (sonido, dificultad…)
├─ core/                 lógica pura, SIN Phaser (se prueba con npm test)
│  ├─ constants.js       medidas del mundo y reglas
│  ├─ moves.js           tabla de ataques: frames, daño, hitboxes
│  ├─ roster.js          luchadores y sus stats
│  ├─ fighter.js         máquina de estados de cada luchador
│  ├─ combat.js          choques, bloqueo, combos y proyectiles
│  ├─ input-buffer.js    historial de controles y detección de ↓↘→
│  ├─ cpu.js             IA del CPU (3 dificultades)
│  ├─ match.js           rondas, reloj y ganador
│  └─ game.js            arma y avanza una pelea completa
├─ input/                teclado, control y botones táctiles
├─ gfx/                  dibujo de luchadores, escenario y proyectiles con código
├─ audio/sfx.js          sonidos sintetizados y locutor
└─ scenes/               Boot, Title, Select, Fight, Results y la vista de la pelea
```

La regla principal: **`src/core` decide qué pasa y Phaser solo dibuja y hace sonar**. La lógica avanza siempre a 60 cuadros por segundo exactos (`scenes/fixed-step.js`), así cada golpe dura lo mismo en una pantalla de 60 Hz o de 120 Hz.

## Usar tus propios sprites (por ejemplo de Higgsfield)

Hoy los luchadores se dibujan con código en `src/gfx/fighter-art.js`. Cada luchador es una textura con un cuadro por pose: `idle0`, `walk1`, `punchHit`, `kickHit`, `hit`, `ko`, etc. (la lista completa está en `POSES`).

Para reemplazarlos:

1. Recorta tus poses, déjalas con fondo transparente y júntalas en un atlas (png + json) con Free Texture Packer o TexturePacker.
2. Nombra cada cuadro igual que las poses de `POSES`.
3. En `src/scenes/Boot.js`, carga el atlas con `this.load.atlas('fighter-tito', 'assets/fighters/tito.png', 'assets/fighters/tito.json')` y borra la parte que genera esa textura.
4. Ajusta `CELL_W`, `CELL_H`, `FOOT_X` y `FOOT_Y` en `fighter-art.js` al tamaño de tus cuadros, con los pies al centro.
5. Revisa las hitboxes en `src/core/moves.js` con la tecla H encendida.

Con el escenario es lo mismo: carga tu imagen con la clave `stage` y quita `buildStage()`.

Los archivos van en `public/assets/`. La PWA los guarda automáticamente para jugar sin internet; el límite está en `vite.config.js` (8 MB por archivo).

## Publicarlo gratis

1. Sube el proyecto a un repositorio de GitHub (`node_modules` y `dist` ya están en `.gitignore`).
2. En Cloudflare Pages o Netlify, conecta el repositorio con:
   - **Comando de armado:** `npm run build`
   - **Carpeta de salida:** `dist`
3. Cada vez que subas un cambio, se publica solo. Los jugadores verán el aviso "Hay una versión nueva del juego" con un botón para actualizar.

## Íconos

Los íconos de `public/icons/` se generaron con `tools/make-icons.py` (`pip install pillow` y luego `python tools/make-icons.py`). Puedes reemplazarlos por los tuyos, manteniendo los nombres y tamaños.
