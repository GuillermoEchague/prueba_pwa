import { GROUND, W, WALL } from './constants.js';
import { MOVES, movePhase } from './moves.js';
import { InputBuffer, blank } from './input-buffer.js';

// Un luchador. Solo guarda estado y lo avanza un cuadro a la vez; no sabe nada de Phaser.
// Estados: idle, walk, crouch, jump, attack, hit, block, ko, win.
export class Fighter {
  constructor(def, pid, world, alt = false) {
    this.def = def;
    this.pid = pid;
    this.world = world;
    this.alt = alt;
    this.maxHp = def.hp;
    this.wins = 0;
    this.meter = 0;
    this.input = new InputBuffer();
    this.reset(pid === 0 ? 150 : 330);
  }

  reset(x) {
    Object.assign(this, {
      x, y: GROUND, vx: 0, vy: 0,
      facing: this.pid === 0 ? 1 : -1,
      hp: this.maxHp, hpTrail: this.maxHp,
      state: 'idle', sf: 0, t: 0, move: null, stun: 0, onGround: true,
      flash: 0, combo: 0, comboN: 0, comboShow: 0,
      proj: null, airUsed: false, blockLow: false,
    });
    this.input.reset();
  }

  setState(s) { this.state = s; this.sf = 0; }

  get crouching() {
    return this.state === 'crouch'
      || (this.state === 'block' && this.blockLow)
      || (this.state === 'attack' && this.move && this.move.id === 'low');
  }

  get lastDir() { return this.input.lastDir; }

  feedInput(inp) { this.input.feed(inp || blank(), this.facing); }

  tick() {
    this.t++; this.sf++;
    if (this.flash > 0) this.flash--;
    this.input.decay();
    const canAct = this.world.canAct;
    const ib = this.input;
    switch (this.state) {
      case 'hit':
        if (this.stun > 0) this.stun--;
        if (this.stun <= 0 && this.onGround) this.setState('idle');
        break;
      case 'block':
        if (--this.stun <= 0) this.setState(this.blockLow ? 'crouch' : 'idle');
        break;
      case 'attack':
        this.runMove();
        break;
      case 'jump':
        if (canAct && !this.airUsed && (ib.kBuf || ib.pBuf)) {
          ib.kBuf = ib.pBuf = 0; this.airUsed = true; this.startMove('air');
        }
        break;
      case 'ko':
      case 'win':
        break;
      default:
        if (canAct) this.ground();
        else { if (this.state !== 'idle') this.setState('idle'); this.vx = 0; }
    }
  }

  ground() {
    const ib = this.input;
    const d = ib.lastDir, fwd = d % 3 === 0, back = d % 3 === 1, down = d <= 3, up = d >= 7;
    if (ib.pBuf) {
      ib.pBuf = 0;
      if (ib.qcf() && !this.proj) { ib.clearDirs(); return this.startMove('special'); }
      return this.startMove('punch');
    }
    if (ib.kBuf) {
      ib.kBuf = 0;
      if (ib.qcf() && this.meter >= 100) { ib.clearDirs(); return this.startMove('super'); }
      return this.startMove(down ? 'low' : 'kick');
    }
    if (up) {
      this.vy = -6.4;
      this.vx = (fwd ? 1.9 : back ? -1.9 : 0) * this.facing;
      this.onGround = false; this.airUsed = false; this.y -= 1;
      this.setState('jump');
      return;
    }
    if (down) { if (this.state !== 'crouch') this.setState('crouch'); this.vx = 0; return; }
    if (fwd || back) {
      if (this.state !== 'walk') this.setState('walk');
      this.vx = (fwd ? 1 : -0.8) * this.def.speed * this.facing;
      return;
    }
    if (this.state !== 'idle') this.setState('idle');
    this.vx = 0;
  }

  startMove(id) {
    this.move = { id, d: MOVES[id], f: 0, hit: false };
    this.setState('attack');
    if (id !== 'air') this.vx = 0;
    const w = this.world;
    if (id === 'super') {
      this.meter = Math.max(0, this.meter - 100);
      w.freeze = 42; w.freezeOwner = this;
      w.emit({ type: 'sfx', name: 'super' });
      w.emit({ type: 'say', text: this.def.superName });
      w.emit({ type: 'super', fighter: this });
    } else if (id === 'special') {
      w.emit({ type: 'sfx', name: 'charge' });
    } else {
      w.emit({ type: 'sfx', name: 'whoosh' });
    }
  }

  runMove() {
    const m = this.move, d = m.d, ib = this.input;
    m.f++;
    // Cancelar en otro ataque solo si este conectó.
    if (m.hit && d.cancel && m.f > d.startup) {
      const down = ib.lastDir <= 3;
      if (ib.pBuf && d.cancel.includes('special') && ib.qcf() && !this.proj) {
        ib.pBuf = 0; ib.clearDirs(); return this.startMove('special');
      }
      if (ib.kBuf) {
        if (d.cancel.includes('super') && ib.qcf() && this.meter >= 100) {
          ib.kBuf = 0; ib.clearDirs(); return this.startMove('super');
        }
        const nid = down ? 'low' : 'kick';
        if (d.cancel.includes(nid)) { ib.kBuf = 0; return this.startMove(nid); }
      }
    }
    if (d.proj && m.f === d.startup) this.world.spawnProj(this, d.proj, m.id === 'super');
    if (m.id === 'air') return; // termina al tocar el suelo
    if (m.f >= d.startup + d.active + d.recovery) {
      this.move = null;
      this.setState(ib.lastDir <= 3 ? 'crouch' : 'idle');
    }
  }

  phys() {
    if (!this.onGround) {
      this.vy += 0.34; this.x += this.vx; this.y += this.vy;
      if (this.y >= GROUND) { this.y = GROUND; this.vy = 0; this.onGround = true; this.land(); }
    } else {
      this.x += this.vx;
      if (this.state !== 'walk') this.vx *= 0.8;
      if (Math.abs(this.vx) < 0.05) this.vx = 0;
    }
    this.x = Math.max(WALL, Math.min(W - WALL, this.x));
  }

  land() {
    const w = this.world;
    if (this.state === 'jump' || (this.state === 'attack' && this.move && this.move.id === 'air')) {
      this.move = null; this.setState('idle'); this.vx = 0;
      w.emit({ type: 'sfx', name: 'land' }); w.emit({ type: 'dust', x: this.x });
    } else if (this.state === 'hit') {
      this.vx *= 0.4;
      if (this.stun <= 0) this.setState('idle');
      w.emit({ type: 'dust', x: this.x });
    } else if (this.state === 'ko') {
      this.vx *= 0.3;
      w.emit({ type: 'dust', x: this.x }); w.emit({ type: 'sfx', name: 'land' });
      w.emit({ type: 'shake', amount: 3 });
    } else {
      this.vx *= 0.5;
    }
  }

  face(opp) {
    if (['idle', 'walk', 'crouch'].includes(this.state) && this.onGround) {
      const s = Math.sign(opp.x - this.x);
      if (s) this.facing = s;
    }
  }

  // Zona del cuerpo que recibe daño.
  hurt() {
    if (this.state === 'ko') return null;
    if (!this.onGround) return { x: this.x - 11, y: this.y - 56, w: 22, h: 48 };
    if (this.crouching) return { x: this.x - 12, y: this.y - 40, w: 24, h: 40 };
    return { x: this.x - 11, y: this.y - 60, w: 22, h: 60 };
  }

  boxOf(b) {
    return { x: this.facing === 1 ? this.x + b.x : this.x - b.x - b.w, y: this.y + b.y, w: b.w, h: b.h };
  }

  // Zona del golpe, solo durante los cuadros activos y si todavía no conectó.
  hitbox() {
    const m = this.move;
    if (!m || m.hit || !m.d.box || movePhase(this) !== 'active') return null;
    return this.boxOf(m.d.box);
  }
}
