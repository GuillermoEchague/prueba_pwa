import { W, WALL } from './constants.js';

export const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
export const projBox = (p) => ({ x: p.x - p.d.w / 2, y: p.y - p.d.h / 2, w: p.d.w, h: p.d.h });

const POPS = ['¡PAF!', '¡PUM!', '¡ZAS!', '¡TOING!', '¡CRAC!'];

// El "mundo" de la pelea: los dos luchadores, los proyectiles y las pausas de impacto.
// No dibuja ni suena: deja eventos en `events` para que la escena los muestre.
export class World {
  constructor({ rng = Math.random } = {}) {
    this.fighters = [];
    this.projs = [];
    this.hitstop = 0;   // cuadros congelados tras un golpe
    this.freeze = 0;    // cuadros congelados por la animación de súper
    this.freezeOwner = null;
    this.slowmo = false;
    this.canAct = false;
    this.frame = 0;
    this.events = [];
    this.onKO = null;
    this.rng = rng;
  }

  emit(e) { this.events.push(e); }
  drain() { const e = this.events; this.events = []; return e; }

  // Avanza un cuadro. Devuelve false si el cuadro quedó congelado (súper o impacto).
  step(inputs) {
    const [a, b] = this.fighters;
    this.frame++;
    a.feedInput(inputs[0]);
    b.feedInput(inputs[1]);
    if (this.freeze > 0) {
      this.freeze--;
      if (this.freezeOwner) this.freezeOwner.flash = this.freeze % 6 < 3 ? 2 : 0;
      return false;
    }
    if (this.hitstop > 0) { this.hitstop--; return false; }
    if (!this.slowmo || this.frame % 3 === 0) this.sim();
    return true;
  }

  sim() {
    const [a, b] = this.fighters;
    a.tick(); b.tick();
    a.phys(); b.phys();
    this.separate(a, b);
    a.face(b); b.face(a);
    const ha = a.hitbox(), hb = b.hitbox(), ua = a.hurt(), ub = b.hurt();
    const aHits = !!(ha && ub && overlap(ha, ub));
    const bHits = !!(hb && ua && overlap(hb, ua));
    const da = aHits ? a.move.d : null, db = bHits ? b.move.d : null;
    if (aHits) a.move.hit = true;
    if (bHits) b.move.hit = true;
    if (aHits) this.resolveHit(a, b, da, false, ha);
    if (bHits) this.resolveHit(b, a, db, false, hb);
    this.updateProjs();
    for (const f of this.fighters) {
      if (f.hpTrail > f.hp && f.state !== 'hit') f.hpTrail = Math.max(f.hp, f.hpTrail - 0.5);
      if (f.comboShow > 0) f.comboShow--;
    }
    if (b.state !== 'hit') a.combo = 0;
    if (a.state !== 'hit') b.combo = 0;
  }

  // Empuja a los luchadores para que no se atraviesen.
  separate(a, b) {
    if (a.state === 'ko' || b.state === 'ko' || Math.abs(a.y - b.y) >= 46) return;
    const min = 22, dx = b.x - a.x;
    if (Math.abs(dx) >= min) return;
    const s = dx === 0 ? a.facing : Math.sign(dx), push = (min - Math.abs(dx)) / 2;
    a.x -= s * push; b.x += s * push;
    a.x = Math.max(WALL, Math.min(W - WALL, a.x));
    b.x = Math.max(WALL, Math.min(W - WALL, b.x));
    const rem = min - Math.abs(b.x - a.x);
    if (rem > 0) { if (a.x <= WALL || a.x >= W - WALL) b.x += s * rem; else a.x -= s * rem; }
  }

  resolveHit(att, vic, data, isProj, box) {
    if (vic.state === 'ko') return;
    const dir = Math.sign(vic.x - att.x) || att.facing;
    const hy = box.y + box.h / 2, hx = vic.x - dir * 8;
    const ld = vic.lastDir, holdingBack = ld === 4 || ld === 1;
    const canBlock = vic.onGround && ['idle', 'walk', 'crouch', 'block'].includes(vic.state)
      && holdingBack && (!data.low || ld === 1);
    const P = att.def.power;
    const atWall = vic.x <= WALL + 1 || vic.x >= W - WALL - 1;

    if (canBlock) {
      vic.blockLow = ld === 1; vic.move = null; vic.setState('block'); vic.stun = data.blockstun;
      vic.hp = Math.max(0, vic.hp - (data.chip || 0) * P);
      vic.vx = dir * data.push * 0.9;
      if (!isProj && atWall) att.vx = -dir * data.push * 0.7;
      att.meter = Math.min(100, att.meter + data.meter * 0.5);
      vic.meter = Math.min(100, vic.meter + data.meter * 0.35);
      this.hitstop = Math.round(data.hitstop * 0.6);
      this.emit({ type: 'spark', kind: 'block', x: hx, y: hy });
      this.emit({ type: 'sfx', name: 'block' });
      if (vic.hp <= 0) this.ko(att, vic, dir);
      return;
    }

    att.combo = vic.state === 'hit' ? att.combo + 1 : 1;
    const scale = Math.max(0.45, 1 - (att.combo - 1) * 0.12);
    vic.hp = Math.max(0, vic.hp - data.dmg * P * scale);
    vic.move = null; vic.setState('hit'); vic.stun = data.hitstun; vic.flash = 5;
    if (vic.onGround) vic.vx = dir * data.push; else { vic.vx = dir * 2.2; vic.vy = -2.8; }
    if (!isProj && atWall) att.vx = -dir * data.push * 0.8;
    att.meter = Math.min(100, att.meter + data.meter);
    vic.meter = Math.min(100, vic.meter + data.meter * 0.5);
    this.hitstop = data.hitstop;
    this.emit({ type: 'shake', amount: data.heavy ? 4 : 2 });
    this.emit({ type: 'spark', kind: 'hit', x: hx, y: hy, pt: isProj ? att.def.proj : null });
    this.emit({ type: 'sfx', name: data.heavy || isProj ? 'hitH' : 'hitL' });
    if (att.combo >= 2) { att.comboN = att.combo; att.comboShow = 80; }
    if (data.dmg >= 8 && this.rng() < 0.6) {
      this.emit({ type: 'pop', x: hx, y: hy - 12, text: POPS[Math.floor(this.rng() * POPS.length)] });
    }
    if (vic.hp <= 0) this.ko(att, vic, dir);
  }

  ko(att, vic, dir) {
    vic.hp = 0; vic.move = null; vic.setState('ko');
    vic.onGround = false; vic.vy = -4.4; vic.vx = dir * 2.6; vic.y -= 1;
    if (this.onKO) this.onKO(att, vic);
  }

  spawnProj(f, pd, big) {
    const p = {
      owner: f, x: f.x + f.facing * 20, y: f.y + pd.y,
      vx: f.facing * pd.speed * (f.def.projSpeed || 1),
      d: pd, type: f.def.proj, big, t: 0, alive: true,
    };
    this.projs.push(p);
    if (!big) f.proj = p;
    this.emit({ type: 'sfx', name: big ? 'superShot' : (f.def.proj === 'pito' ? 'whistle' : 'throw') });
  }

  killProj(p) {
    p.alive = false;
    if (p.owner.proj === p) p.owner.proj = null;
  }

  updateProjs() {
    for (const p of this.projs) {
      if (!p.alive) continue;
      p.t++; p.x += p.vx;
      if (p.t % 3 === 0) this.emit({ type: 'trail', x: p.x - Math.sign(p.vx) * 8, y: p.y, proj: p.type, big: p.big });
      if (p.x < -40 || p.x > W + 40) { this.killProj(p); continue; }
      const opp = this.fighters[1 - p.owner.pid], hu = opp.hurt(), bx = projBox(p);
      if (hu && overlap(bx, hu)) { this.killProj(p); this.resolveHit(p.owner, opp, p.d, true, bx); }
    }
    const ps = this.projs;
    for (let i = 0; i < ps.length; i++) {
      for (let j = i + 1; j < ps.length; j++) {
        const a = ps[i], b = ps[j];
        if (!a.alive || !b.alive || a.owner === b.owner || !overlap(projBox(a), projBox(b))) continue;
        if (a.big && !b.big) this.killProj(b);
        else if (b.big && !a.big) this.killProj(a);
        else { this.killProj(a); this.killProj(b); }
        this.emit({ type: 'spark', kind: 'block', x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
        this.emit({ type: 'sfx', name: 'block' });
      }
    }
    this.projs = this.projs.filter((p) => p.alive);
  }
}
