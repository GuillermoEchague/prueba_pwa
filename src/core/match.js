import { ROUND_SECS, FPS, WINS_TO_MATCH, MAX_ROUNDS } from './constants.js';

const NUM = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco'];

// Rondas, reloj y ganador. Fases: intro → fight → ko | timeup → (intro …) → end.
// En modo demo (pantalla de título) no hay reloj ni rondas: al caer uno, empieza otra pelea.
export class Match {
  constructor(world, { demo = false, onDemoEnd = null } = {}) {
    this.world = world;
    this.demo = demo;
    this.onDemoEnd = onDemoEnd;
    this.round = 1;
    this.timer = 0;
    this.phase = demo ? 'demo' : 'intro';
    this.phaseT = 0;
    this.roundWinner = null;
    this.finalRound = false;
    this.winner = null;
    world.onKO = (att, vic) => this.handleKO(att, vic);
    if (demo) { world.canAct = true; } else this.startRound();
  }

  get fighters() { return this.world.fighters; }
  get inPlay() { return ['intro', 'fight', 'ko', 'timeup'].includes(this.phase); }

  startRound() {
    const [a, b] = this.fighters;
    a.reset(150); b.reset(330);
    const w = this.world;
    w.projs = []; w.hitstop = 0; w.freeze = 0; w.freezeOwner = null; w.slowmo = false;
    this.timer = ROUND_SECS * FPS;
    this.phase = 'intro'; this.phaseT = 0; this.roundWinner = null;
    this.finalRound = a.wins === WINS_TO_MATCH - 1 && b.wins === WINS_TO_MATCH - 1;
    w.canAct = false;
    w.emit({ type: 'round', round: this.round, final: this.finalRound });
  }

  handleKO(att) {
    const w = this.world;
    if (this.phase === 'fight') {
      this.phase = 'ko'; this.phaseT = 0; this.roundWinner = att;
      w.hitstop = 26;
      w.emit({ type: 'shake', amount: 7 });
      w.emit({ type: 'sfx', name: 'ko' });
      w.emit({ type: 'say', text: '¡K.O.!' });
    } else if (this.phase === 'ko' && this.phaseT === 0) {
      this.roundWinner = null; // doble K.O. en el mismo cuadro
    }
  }

  // Se llama una vez por cuadro que no quedó congelado.
  tick() {
    const [a, b] = this.fighters;
    const w = this.world;
    this.phaseT++;
    switch (this.phase) {
      case 'intro':
        if (this.phaseT === 1) {
          w.emit({ type: 'sfx', name: 'bell' });
          w.emit({ type: 'say', text: this.finalRound ? 'Ronda final' : `Ronda ${NUM[this.round]}` });
        }
        if (this.phaseT === 70) w.emit({ type: 'say', text: '¡A pelear!' });
        if (this.phaseT >= 105) { this.phase = 'fight'; this.phaseT = 0; w.canAct = true; }
        break;
      case 'fight':
        if (this.timer > 0) this.timer--;
        if (this.timer <= 0) {
          this.phase = 'timeup'; this.phaseT = 0; w.canAct = false;
          const ra = a.hp / a.maxHp, rb = b.hp / b.maxHp;
          this.roundWinner = ra > rb ? a : rb > ra ? b : null;
          w.emit({ type: 'sfx', name: 'bell' });
          w.emit({ type: 'say', text: '¡Se acabó el tiempo!' });
        }
        break;
      case 'ko':
      case 'timeup': {
        w.canAct = false;
        const win = this.roundWinner;
        if (this.phaseT === 80 && win && win.state !== 'ko') { win.move = null; win.setState('win'); win.vx = 0; }
        if (this.phaseT >= 170) this.endRound();
        break;
      }
      case 'demo':
        if (a.state === 'ko' || b.state === 'ko') {
          this.demoT = (this.demoT || 0) + 1;
          if (this.demoT === 60) {
            const win = a.state === 'ko' ? b : a;
            if (win.state !== 'ko') { win.move = null; win.setState('win'); }
          }
          if (this.demoT > 170 && this.onDemoEnd) this.onDemoEnd();
        }
        break;
    }
    w.slowmo = this.phase === 'ko' && this.phaseT < 50;
  }

  endRound() {
    const win = this.roundWinner;
    if (win) win.wins++;
    const [a, b] = this.fighters;
    if (a.wins >= WINS_TO_MATCH || b.wins >= WINS_TO_MATCH || this.round >= MAX_ROUNDS) {
      this.phase = 'end';
      this.winner = a.wins > b.wins ? a : b.wins > a.wins ? b : null;
      this.world.emit({ type: 'matchEnd', winner: this.winner });
      if (this.winner) this.world.emit({ type: 'say', text: `¡Gana ${this.winner.def.name}!` });
      return;
    }
    this.round++;
    this.startRound();
  }

  get seconds() { return Math.max(0, Math.ceil(this.timer / FPS)); }
}
