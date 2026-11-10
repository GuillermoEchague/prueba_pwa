// Dibuja una pelea (mundo + partido) en una escena de Phaser.
// Solo LEE el estado del core; nunca lo cambia. La usan Fight (pelea real) y Title (demo de fondo).
import Phaser from 'phaser';
import { W, H, GROUND } from '../core/constants.js';
import { movePhase } from '../core/moves.js';
import { projBox } from '../core/combat.js';
import { FOOT_Y, CELL_H, poseFor, textureKey } from '../gfx/fighter-art.js';
import { text, C } from './ui.js';
import { settings } from '../settings.js';

const reduced = (() => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } })();
const hex = (s) => parseInt(s.slice(1), 16);
const STATE_ES = { idle: 'QUIETO', walk: 'CAMINANDO', crouch: 'AGACHADO', jump: 'SALTANDO', attack: 'ATACANDO', hit: 'ATURDIDO', block: 'BLOQUEANDO', ko: 'K.O.', win: 'CELEBRA' };
const PHASE_ES = { startup: 'arranque', active: 'activo', recovery: 'recuperación' };

export class FightView {
  constructor(scene, fight, { hud = true } = {}) {
    this.scene = scene;
    this.fight = fight;
    this.hud = hud;
    this.parts = [];
    this.pops = [];
    this.shake = 0;
    this.frame = 0;

    this.layer = scene.add.container(0, 0).setDepth(0);
    this.layer.add(scene.add.image(0, 0, 'stage').setOrigin(0));

    // Ampolletas
    this.bulbs = scene.registry.get('bulbs').map((b) => {
      const glow = scene.add.image(b.x, b.y + 1, 'glow').setBlendMode(Phaser.BlendModes.ADD);
      this.layer.add(glow);
      return { ...b, glow };
    });
    this.bulbG = scene.add.graphics(); this.layer.add(this.bulbG);

    this.shadowG = scene.add.graphics(); this.layer.add(this.shadowG);
    this.sprites = fight.world.fighters.map((f) => {
      const s = scene.add.image(f.x, f.y, textureKey(f.def, f.alt), 'idle0').setOrigin(0.5, FOOT_Y / CELL_H);
      this.layer.add(s);
      return s;
    });
    this.projImgs = new Map();
    this.fxG = scene.add.graphics(); this.layer.add(this.fxG);
    this.boxG = scene.add.graphics(); this.layer.add(this.boxG);

    // Súper: oscurece todo menos al que lo lanza
    this.dim = scene.add.rectangle(0, 0, W, H, 0x0c0818, 0.62).setOrigin(0).setDepth(20).setVisible(false);
    this.ghost = scene.add.image(0, 0, 'stage').setOrigin(0.5, FOOT_Y / CELL_H).setDepth(21).setVisible(false);
    this.superG = scene.add.graphics().setDepth(22);
    this.superTitle = text(scene, W / 2, 118, '', { size: 16, bold: true, color: C.ink, stroke: false, origin: [0.5, 0.5] }).setDepth(23).setVisible(false);
    this.superSub = text(scene, W / 2, 101, '', { size: 8, color: C.ink, stroke: false, origin: [0.5, 0.5] }).setDepth(23).setVisible(false);

    if (hud) this.buildHud();
  }

  buildHud() {
    const s = this.scene, [a, b] = this.fight.world.fighters;
    this.hudG = s.add.graphics().setDepth(30);
    this.name1 = text(s, 12, 21, a.def.name.toUpperCase(), { size: 8 }).setDepth(31);
    this.name2 = text(s, W - 12, 21, b.def.name.toUpperCase() + (this.fight.cpus[1] && this.fight.mode !== 'demo' ? ' · CPU' : ''), { size: 8, origin: [1, 0] }).setDepth(31);
    this.timerT = text(s, W / 2, 18, '60', { size: 16, bold: true, origin: [0.5, 0.5] }).setDepth(31);
    this.meter1 = text(s, 12, 34, 'SÚPER', { size: 8, color: C.tenue }).setDepth(31);
    this.meter2 = text(s, W - 12, 34, 'SÚPER', { size: 8, color: C.tenue, origin: [1, 0] }).setDepth(31);
    this.combo1 = text(s, 12, 62, '', { size: 16, bold: true, color: C.maravilla }).setDepth(31);
    this.combo2 = text(s, W - 12, 62, '', { size: 16, bold: true, color: C.maravilla, origin: [1, 0] }).setDepth(31);
    this.banner = text(s, W / 2, 112, '', { size: 32, bold: true, origin: [0.5, 0.5] }).setDepth(40);
    this.subBanner = text(s, W / 2, 158, '', { size: 8, origin: [0.5, 0.5] }).setDepth(40);
    this.data1 = text(s, 12, 84, '', { size: 8, wrap: 200 }).setDepth(31);
    this.data2 = text(s, W - 12, 84, '', { size: 8, origin: [1, 0], align: 'right', wrap: 200 }).setDepth(31);
  }

  // ---------- efectos (avanzan una vez por cuadro de juego) ----------
  handleEvent(e) {
    switch (e.type) {
      case 'spark': this.spark(e); break;
      case 'dust': this.burst(e.x, GROUND - 2, 6, [0x8a7f99, 0x5e5570], 1.2, 14, 2, 0.02); break;
      case 'trail': this.parts.push({ x: e.x, y: e.y + (Math.random() * 4 - 2), vx: 0, vy: 0, g: 0, life: 10, max: 10, s: e.big ? 3 : 2, c: e.proj === 'tomate' ? 0xff8a70 : e.proj === 'chancla' ? 0xff9ab4 : 0xfff2b0 }); break;
      case 'pop': this.popText(e.x, e.y, e.text); break;
      case 'shake': if (!reduced) this.shake = Math.max(this.shake, e.amount); break;
    }
  }

  burst(x, y, n, cols, spd, life, size, grav) {
    for (let i = 0; i < n; i++) this.parts.push({ x, y, vx: (Math.random() * 2 - 1) * spd, vy: (Math.random() * 2 - 1) * spd - 0.6, life, max: life, c: cols[i % cols.length], s: size, g: grav });
  }

  spark({ x, y, kind, pt }) {
    if (kind === 'block') {
      this.burst(x, y, 8, [0x9fe0ff, 0xffffff], 2, 12, 2, 0);
      this.parts.push({ ring: true, x, y, life: 9, max: 9, c: 0x9fe0ff, vx: 0, vy: 0, g: 0 });
      return;
    }
    const cols = pt === 'tomate' ? [0xd8392b, 0xff8a70, 0x7a1a12] : pt === 'chancla' ? [0xe05a7a, 0xffd36a, 0xffffff] : [0xffe27a, 0xffffff, 0xffb02e];
    this.burst(x, y, 12, cols, 2.6, 18, 2, 0.12);
    this.parts.push({ ring: true, x, y, life: 9, max: 9, c: 0xfff4c0, vx: 0, vy: 0, g: 0 });
  }

  popText(x, y, s) {
    const t = text(this.scene, x, y, s, { size: 16, bold: true, color: '#ffe27a', origin: [0.5, 0.5] });
    this.layer.add(t);
    this.pops.push({ t, life: 40 });
  }

  tickFx() {
    this.frame++;
    for (const p of this.parts) { p.life--; p.x += p.vx; p.y += p.vy; p.vy += p.g; }
    this.parts = this.parts.filter((p) => p.life > 0);
    for (const p of this.pops) { p.life--; p.t.y -= 0.35; p.t.setAlpha(Math.min(1, p.life / 12)); if (p.life <= 0) p.t.destroy(); }
    this.pops = this.pops.filter((p) => p.life > 0);
    this.shake *= 0.86; if (this.shake < 0.25) this.shake = 0;
  }

  // ---------- dibujo (una vez por cuadro de pantalla) ----------
  render() {
    const { world, match } = this.fight;
    const fr = this.frame;
    this.layer.setPosition(this.shake ? Math.round((Math.random() * 2 - 1) * this.shake) : 0, this.shake ? Math.round((Math.random() * 2 - 1) * this.shake * 0.5) : 0);

    // Luces
    const bg = this.bulbG.clear();
    for (const b of this.bulbs) {
      const a = 0.6 + 0.4 * Math.sin(fr * 0.04 + b.i * 1.7);
      b.glow.setAlpha(a * 0.55);
      bg.fillStyle(hex(b.c), 1).fillRect(Math.round(b.x) - 1, Math.round(b.y), 3, 3);
    }
    if (fr % 90 < 45) bg.fillStyle(0xff4a3a, 1).fillRect(367, 48, 2, 2);

    // Sombras y luchadores (el que ataca va adelante)
    const sg = this.shadowG.clear();
    const fs = world.fighters;
    fs.forEach((f, i) => {
      const h = GROUND - f.y, w = (f.state === 'ko' && f.onGround ? 30 : 20) - Math.min(12, h * 0.12);
      sg.fillStyle(0x0a0614, 0.45).fillEllipse(f.x, GROUND + 1, Math.max(6, w) * 2, 7);
      this.drawFighter(this.sprites[i], f, world);
    });
    const [s0, s1] = this.sprites;
    if (fs[0].state === 'attack' && fs[1].state !== 'attack') this.layer.moveAbove(s0, s1);
    else if (fs[1].state === 'attack' && fs[0].state !== 'attack') this.layer.moveAbove(s1, s0);

    this.drawProjectiles(world);
    this.drawFx();
    this.drawBoxes(world);
    this.drawSuper(world);
    if (this.hud) { this.drawHud(match, fs); this.drawAnnouncer(match); this.drawData(fs); }
  }

  drawFighter(spr, f, world) {
    const p = poseFor(f);
    spr.setFrame(p.frame);
    spr.setFlipX(f.facing === -1);
    let x = Math.round(f.x);
    if (world.hitstop > 0 && f.state === 'hit') x += this.frame % 2 ? 1 : -1;
    spr.setPosition(x, Math.round(f.y + (p.oy || 0)));
    spr.setRotation((p.rot || 0) * f.facing);
    if (f.flash > 0) spr.setTint(0xfff7e0).setTintMode(Phaser.TintModes.FILL);
    else spr.clearTint().setTintMode(Phaser.TintModes.MULTIPLY);
  }

  drawProjectiles(world) {
    const alive = new Set(world.projs);
    for (const [p, img] of this.projImgs) if (!alive.has(p)) { img.destroy(); this.projImgs.delete(p); }
    for (const p of world.projs) {
      let img = this.projImgs.get(p);
      if (!img) {
        img = this.scene.add.image(p.x, p.y, `proj-${p.type}`);
        this.layer.addAt(img, this.layer.getIndex(this.fxG));
        this.projImgs.set(p, img);
      }
      const dir = Math.sign(p.vx) || 1;
      img.setPosition(Math.round(p.x), Math.round(p.y)).setScale(p.big ? 2 : 1).setFlipX(dir < 0);
      img.setRotation(p.type === 'tomate' ? p.t * 0.25 * dir : p.type === 'chancla' ? p.t * 0.45 * dir : 0);
    }
  }

  drawFx() {
    const g = this.fxG.clear();
    for (const p of this.parts) {
      const a = Math.max(0, p.life / p.max);
      if (p.ring) {
        const r = 3 + (p.max - p.life) * 2.4;
        g.lineStyle(2, p.c, a).strokeCircle(p.x, p.y, r);
        for (let k = 0; k < 4; k++) {
          const an = k * Math.PI / 2 + 0.4;
          g.lineBetween(p.x + Math.cos(an) * r * 0.4, p.y + Math.sin(an) * r * 0.4, p.x + Math.cos(an) * r * 1.5, p.y + Math.sin(an) * r * 1.5);
        }
      } else {
        g.fillStyle(p.c, a).fillRect(Math.round(p.x - p.s / 2), Math.round(p.y - p.s / 2), p.s, p.s);
      }
    }
  }

  drawBoxes(world) {
    const g = this.boxG.clear();
    if (!settings.boxes || !this.hud) return;
    for (const f of world.fighters) {
      const hu = f.hurt();
      if (hu) { g.fillStyle(0x50dc78, 0.16).fillRect(hu.x, hu.y, hu.w, hu.h); g.lineStyle(1, 0x5ce08a, 1).strokeRect(hu.x + 0.5, hu.y + 0.5, hu.w - 1, hu.h - 1); }
      const hb = f.hitbox();
      if (hb) { g.fillStyle(0xff463c, 0.45).fillRect(hb.x, hb.y, hb.w, hb.h); g.lineStyle(1, 0xff5a4a, 1).strokeRect(hb.x + 0.5, hb.y + 0.5, hb.w - 1, hb.h - 1); }
      if (f.move && f.move.d.box && movePhase(f) === 'startup') {
        const b = f.boxOf(f.move.d.box);
        g.lineStyle(1, 0xff5a4a, 0.6).strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
      }
      g.fillStyle(0x9fe0ff, 0.7).fillRect(f.x - 11, f.y, 22, 1);
    }
    for (const p of world.projs) { const b = projBox(p); g.fillStyle(0xff463c, 0.4).fillRect(b.x, b.y, b.w, b.h); g.lineStyle(1, 0xff5a4a, 1).strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1); }
  }

  drawSuper(world) {
    const on = world.freeze > 0 && world.freezeOwner;
    this.dim.setVisible(!!on); this.ghost.setVisible(!!on);
    this.superTitle.setVisible(!!on); this.superSub.setVisible(!!on);
    const g = this.superG.clear();
    if (!on) return;
    const f = world.freezeOwner, i = world.fighters.indexOf(f);
    const src = this.sprites[i];
    this.ghost.setTexture(src.texture.key, src.frame.name).setPosition(src.x, src.y).setFlipX(src.flipX).setRotation(src.rotation);
    if (f.flash > 0) this.ghost.setTint(0xfff7e0).setTintMode(Phaser.TintModes.FILL); else this.ghost.clearTint().setTintMode(Phaser.TintModes.MULTIPLY);
    const k = Math.min(1, (42 - world.freeze) / 8), off = reduced ? 0 : Math.round((1 - k) * W);
    g.fillStyle(0xffc23a, 1).fillPoints([{ x: off, y: 104 }, { x: off + W, y: 92 }, { x: off + W, y: 128 }, { x: off, y: 140 }].map((p) => new Phaser.Math.Vector2(p.x, p.y)), true);
    g.fillStyle(0xe8443a, 1).fillPoints([{ x: off, y: 140 }, { x: off + W, y: 128 }, { x: off + W, y: 132 }, { x: off, y: 144 }].map((p) => new Phaser.Math.Vector2(p.x, p.y)), true);
    this.superTitle.setText(f.def.superName.toUpperCase()).setX(W / 2 + off);
    this.superSub.setText('SÚPER DE ' + f.def.name.toUpperCase()).setX(W / 2 + off);
  }

  hpBar(g, f, x, y, w, left) {
    const h = 9, fr = this.frame;
    g.fillStyle(0x1b1226, 1).fillRect(x - 1, y - 1, w + 2, h + 2);
    g.fillStyle(0x3a1424, 1).fillRect(x, y, w, h);
    const tw = Math.round(w * f.hpTrail / f.maxHp), hw = Math.round(w * f.hp / f.maxHp), low = f.hp / f.maxHp < 0.25;
    g.fillStyle(0xe8443a, 1); if (left) g.fillRect(x + w - tw, y, tw, h); else g.fillRect(x, y, tw, h);
    g.fillStyle(low && fr % 20 < 10 ? 0xff7a3a : 0xffc23a, 1); if (left) g.fillRect(x + w - hw, y, hw, h); else g.fillRect(x, y, hw, h);
    g.fillStyle(0xffffff, 0.35); if (left) g.fillRect(x + w - hw, y + 1, hw, 2); else g.fillRect(x, y + 1, hw, 2);
  }

  meterBar(g, f, x, y, left) {
    const w = 110, h = 4, full = f.meter >= 100, fr = this.frame;
    g.fillStyle(0x1b1226, 1).fillRect(x - 1, y - 1, w + 2, h + 2);
    g.fillStyle(0x231c3e, 1).fillRect(x, y, w, h);
    const mw = Math.round(w * f.meter / 100);
    g.fillStyle(full ? (fr % 16 < 8 ? 0x9fe0ff : 0xffffff) : 0x3d6ee0, 1);
    if (left) g.fillRect(x, y, mw, h); else g.fillRect(x + w - mw, y, mw, h);
  }

  drawHud(match, fs) {
    const g = this.hudG.clear(), [a, b] = fs, fr = this.frame;
    this.hpBar(g, a, 12, 10, 190, true);
    this.hpBar(g, b, W - 202, 10, 190, false);
    g.fillStyle(0x1b1226, 1).fillRect(W / 2 - 22, 5, 44, 27);
    g.lineStyle(1, 0xffc23a, 1).strokeRect(W / 2 - 21.5, 5.5, 43, 26);
    const sec = match.seconds;
    this.timerT.setText(String(sec).padStart(2, '0')).setColor(sec <= 10 && fr % 30 < 15 ? C.aji : C.papel);
    for (let k = 0; k < 2; k++) {
      g.fillStyle(k < a.wins ? 0xffc23a : 0x3a3066, 1).fillCircle(W / 2 - 32 - k * 9, 27, 3);
      g.fillStyle(k < b.wins ? 0xffc23a : 0x3a3066, 1).fillCircle(W / 2 + 32 + k * 9, 27, 3);
    }
    this.meterBar(g, a, 54, 37, true);
    this.meterBar(g, b, W - 164, 37, false);
    for (const [f, t] of [[a, this.meter1], [b, this.meter2]]) {
      const full = f.meter >= 100;
      t.setColor(full ? '#ffe27a' : C.tenue);
    }
    for (const [f, t] of [[a, this.combo1], [b, this.combo2]]) {
      if (f.comboShow > 0 && f.comboN >= 2) t.setText(`${f.comboN} GOLPES`).setAlpha(Math.min(1, f.comboShow / 20)).setVisible(true);
      else t.setVisible(false);
    }
  }

  destroy() {
    const objs = [this.layer, this.dim, this.ghost, this.superG, this.superTitle, this.superSub,
      this.hudG, this.name1, this.name2, this.timerT, this.meter1, this.meter2, this.combo1, this.combo2,
      this.banner, this.subBanner, this.data1, this.data2];
    objs.forEach((o) => o && o.destroy());
    this.projImgs.clear();
  }

  drawAnnouncer(match) {
    const t = match.phaseT, w = match.roundWinner;
    let txt = '', col = C.papel, size = 32, sub = '';
    const pop = (tt) => (reduced ? 1 : tt < 8 ? 1.5 - tt * 0.0625 : 1);
    let scale = 1;
    switch (match.phase) {
      case 'intro':
        if (t < 70) { txt = match.finalRound ? 'RONDA FINAL' : `RONDA ${match.round}`; size = 24; scale = pop(t); }
        else { txt = '¡A PELEAR!'; col = C.maravilla; scale = pop(t - 70); }
        break;
      case 'ko':
        if (t > 2) { txt = 'K.O.'; col = C.aji; size = 48; scale = pop(t); }
        if (t > 80) sub = w ? `${w.def.name.toUpperCase()} GANA LA RONDA` : 'EMPATE';
        break;
      case 'timeup':
        txt = '¡TIEMPO!'; col = C.maravilla; scale = pop(t);
        if (t > 80) sub = w ? `${w.def.name.toUpperCase()} GANA LA RONDA` : 'EMPATE';
        break;
    }
    if (this.banner.text !== txt) this.banner.setText(txt);
    this.banner.setFontSize(size).setColor(col).setScale(scale).setVisible(!!txt);
    if (this.subBanner.text !== sub) this.subBanner.setText(sub);
    this.subBanner.setVisible(!!sub);
  }

  drawData(fs) {
    const on = settings.data;
    this.data1.setVisible(on); this.data2.setVisible(on);
    if (!on || this.frame % 3) return;
    fs.forEach((f, i) => {
      let st = STATE_ES[f.state] || f.state, ph = '';
      if (f.state === 'attack' && f.move) {
        const m = f.move, d = m.d, p = movePhase(f);
        st = d.label.toUpperCase();
        if (p === 'startup') ph = `${PHASE_ES[p]} ${m.f}/${d.startup}`;
        else if (p === 'active') ph = `${PHASE_ES[p]} ${m.f - d.startup}/${d.active || 1}`;
        else ph = d.recovery ? `${PHASE_ES[p]} ${Math.min(d.recovery, m.f - d.startup - d.active)}/${d.recovery}` : 'cayendo';
        if (m.hit) ph += ' · conectó';
      } else if (f.state === 'hit' || f.state === 'block') ph = `quedan ${Math.max(0, f.stun)} cuadros`;
      const hist = f.input.hist.map((s) => s).join(' ');
      (i === 0 ? this.data1 : this.data2).setText([st, ph, hist].filter(Boolean).join('\n'));
    });
  }
}

