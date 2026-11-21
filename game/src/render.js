// Moonlit Vault — everything the eye sees. One job: draw the floor, the cover,
// the guards and their cones, the player, the light, and the HUD, in that order.
//
// The art direction in one breath: a blue night, moonlight falling in shafts
// through high windows, warm lantern light around every roundsman, and gold
// where the treasure is. Cool is safe, warm is watched, green is the way out.
import { GUARD_LANTERN_RADIUS, INTRO_SECONDS, TILE, VIEW_H, VIEW_W } from './config.js';
import { conePolygon } from './geometry.js';

// A stable shade per tile, so the floor reads as old wood and stone.
function tileShade(tx, ty) {
  const h = (tx * 73856093) ^ (ty * 19349663);
  return ((h >>> 0) % 1000) / 1000;
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    // An offscreen layer for the night: darkness with holes cut for the light.
    this.dark = document.createElement('canvas');
    this.dark.width = VIEW_W;
    this.dark.height = VIEW_H;
    this.darkCtx = this.dark.getContext('2d');
  }

  render(game) {
    const ctx = this.ctx;
    const { world, player, guards } = game;
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    this.drawFloor(ctx, world);
    this.drawShafts(ctx, world);
    this.drawExit(ctx, world, game.time);
    this.drawRelics(ctx, world, game.time);
    this.drawCover(ctx, world);
    this.drawCoins(ctx, game);
    this.drawTargets(ctx, guards, game.time);
    this.drawCones(ctx, world, guards, game);
    this.drawGuards(ctx, guards, game.time);
    this.drawPlayer(ctx, player, game.time);
    this.drawParticles(ctx, game);
    this.drawNight(ctx, world, player, guards, game.time);
    this.drawHud(ctx, game);
    this.drawIntro(ctx, game);
    this.drawOverlay(ctx, game);
  }

  // Moonlight shafts: pale blue blades slanting from the high windows,
  // drawn over the floorboards so the room's light has a direction.
  drawShafts(ctx, world) {
    ctx.save();
    for (const [tx, wTiles] of world.shafts) {
      const x = tx * TILE;
      const w = wTiles * TILE;
      const slant = TILE * 2.2;
      const grad = ctx.createLinearGradient(x, 0, x + slant, VIEW_H);
      grad.addColorStop(0, 'rgba(150,180,255,0.13)');
      grad.addColorStop(1, 'rgba(150,180,255,0.03)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + w, 0);
      ctx.lineTo(x + w + slant, VIEW_H);
      ctx.lineTo(x + slant, VIEW_H);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // Where a guard is headed to look: a small amber ring on the floor, so the
  // player can read an investigation and route around it.
  drawTargets(ctx, guards, time) {
    for (const guard of guards) {
      if (!guard.target) continue;
      if (guard.state !== 'investigate' && guard.state !== 'suspicious') continue;
      const pulse = 0.55 + Math.sin(time * 5.5) * 0.25;
      ctx.strokeStyle = `rgba(255,180,80,${0.55 * pulse})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(guard.target.x, guard.target.y, 10 + Math.sin(time * 4.2) * 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = `rgba(255,180,80,${0.7 * pulse})`;
      ctx.beginPath();
      ctx.arc(guard.target.x, guard.target.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Gold sparkles: relic pickups and the exit's payoff burst.
  drawParticles(ctx, game) {
    for (const p of game.particles || []) {
      const fade = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color.replace('A', String(0.9 * fade));
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * fade + 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawFloor(ctx, world) {
    for (let ty = 0; ty < 16; ty++) {
      for (let tx = 0; tx < 24; tx++) {
        const x = tx * TILE;
        const y = ty * TILE;
        const solid = world.solids.has(tx + ',' + ty);
        const shade = tileShade(tx, ty);
        if (solid && world.crates.some((c) => c.tx === tx && c.ty === ty)) continue;
        if (solid && world.shelves.some((s) => s.tx === tx && s.ty === ty)) continue;
        if (solid) this.drawWallTile(ctx, x, y, shade);
        else this.drawFloorTile(ctx, world.floor, x, y, tx, ty, shade);
      }
    }
  }

  // One open floor tile, dressed by the floor's theme: warehouse boards,
  // gallery marble, vault stone. All three sit in the same blue night, so
  // the floors differ without the light changing its story.
  drawFloorTile(ctx, theme, x, y, tx, ty, shade) {
    if (theme === 'marble') {
      // Checkerboard marble, pale enough that guards and gold read on it.
      const light = (tx + ty) % 2 === 0;
      const v = Math.floor(shade * 10);
      ctx.fillStyle = light ? `rgb(${104 + v},${112 + v},${134 + v})` : `rgb(${62 + v},${70 + v},${96 + v})`;
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = 'rgba(255,255,255,0.10)';
      ctx.fillRect(x, y, TILE, 1);
      ctx.fillRect(x, y, 1, TILE);
      ctx.fillStyle = 'rgba(10,12,26,0.25)';
      ctx.fillRect(x, y + TILE - 1, TILE, 1);
      ctx.fillRect(x + TILE - 1, y, 1, TILE);
    } else if (theme === 'stone') {
      // Big cold slabs with a darker grout line and a chipped corner.
      const base = 66 + Math.floor(shade * 12);
      ctx.fillStyle = `rgb(${base - 8},${base},${base + 18})`;
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = 'rgba(8,10,20,0.4)';
      ctx.fillRect(x, y + TILE - 2, TILE, 2);
      ctx.fillRect(x + TILE - 2, y, 2, TILE);
      ctx.fillStyle = 'rgba(200,215,255,0.06)';
      ctx.fillRect(x, y, TILE, 2);
      if (shade > 0.72) {
        ctx.fillStyle = 'rgba(10,12,24,0.18)';
        ctx.fillRect(x + 6, y + TILE - 9, 12, 3);
      }
    } else {
      // Wooden boards running across the room, lit a dusk blue-brown so the
      // warm crates stand a full step clearer than the floor they sit on.
      const base = 63 + Math.floor(shade * 16);
      ctx.fillStyle = `rgb(${base + 16},${base + 4},${base - 18})`;
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fillRect(x, y + TILE - 2, TILE, 2);
      ctx.fillRect(x + TILE / 2, y, 1, TILE - 2);
      ctx.fillStyle = 'rgba(255,235,200,0.05)';
      ctx.fillRect(x, y, TILE, 1);
      if (shade > 0.8) {
        ctx.fillStyle = 'rgba(30,20,12,0.16)';
        ctx.beginPath();
        ctx.ellipse(x + TILE * 0.3, y + TILE * 0.6, 7, 3, 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // A wall tile: dressed stone with a lit top bevel and a dark foot, drawn
  // proud of the floor so a corridor's shape reads at a glance.
  drawWallTile(ctx, x, y, shade) {
    const base = 84 + Math.floor(shade * 14);
    ctx.fillStyle = `rgb(${base - 18},${base - 8},${base + 16})`;
    ctx.fillRect(x, y, TILE, TILE);
    // Mortar seams: the block is two stones, split across the middle.
    ctx.fillStyle = 'rgba(10,12,24,0.35)';
    ctx.fillRect(x, y + TILE / 2 - 1, TILE, 2);
    ctx.fillRect(x + TILE / 2 - 1, y, 2, TILE / 2);
    ctx.fillRect(x + TILE / 4 - 1, y + TILE / 2, 2, TILE / 2);
    // Lit bevel on top, shadow at the foot.
    ctx.fillStyle = 'rgba(205,220,255,0.20)';
    ctx.fillRect(x, y, TILE, 3);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(x, y + TILE - 4, TILE, 4);
  }

  drawExit(ctx, world, time) {
    const { exit } = world;
    if (!exit) return;
    const pulse = 0.75 + Math.sin(time * 3) * 0.25;
    const glow = ctx.createRadialGradient(exit.x, exit.y, 4, exit.x, exit.y, 90);
    glow.addColorStop(0, `rgba(80,255,150,${0.5 * pulse})`);
    glow.addColorStop(1, 'rgba(80,255,150,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(exit.x - 90, exit.y - 90, 180, 180);
    // The doorway: a green-lit arch in the wall.
    ctx.fillStyle = '#0d2b1a';
    ctx.fillRect(exit.x - 16, exit.y - 18, 32, 36);
    ctx.fillStyle = `rgba(110,255,170,${0.65 + 0.35 * pulse})`;
    ctx.fillRect(exit.x - 11, exit.y - 13, 22, 26);
    ctx.fillStyle = '#0d2b1a';
    ctx.fillRect(exit.x - 11, exit.y + 2, 22, 3);
    ctx.fillStyle = '#bfffd9';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    // The label sits below the doorway, clear of the HUD bar up top.
    ctx.fillText('EXIT', exit.x, exit.y + 36);
  }

  drawRelics(ctx, world, time) {
    for (const relic of world.relics) {
      if (relic.taken) continue;
      const bob = Math.sin(time * 2.4 + relic.x) * 2;
      const glow = ctx.createRadialGradient(relic.x, relic.y + bob, 2, relic.x, relic.y + bob, 34);
      glow.addColorStop(0, 'rgba(255,210,90,0.55)');
      glow.addColorStop(1, 'rgba(255,210,90,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(relic.x - 34, relic.y + bob - 34, 68, 68);
      ctx.save();
      ctx.translate(relic.x, relic.y + bob);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = '#ffd25e';
      ctx.fillRect(-7, -7, 14, 14);
      ctx.fillStyle = '#fff3c4';
      ctx.fillRect(-4, -4, 8, 8);
      ctx.restore();
    }
  }

  drawCover(ctx, world) {
    for (const crate of world.crates) {
      const x = crate.tx * TILE;
      const y = crate.ty * TILE;
      // A soft shadow first, so the crate sits IN the room, then warm pale
      // planks with a bold frame and cross-brace: cover you can read across
      // the whole floor at a glance.
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(x + 4, y + 6, TILE - 4, TILE - 4);
      ctx.fillStyle = '#8a6134';
      ctx.fillRect(x + 1, y + 1, TILE - 2, TILE - 2);
      ctx.fillStyle = '#a1763f';
      ctx.fillRect(x + 5, y + 5, TILE - 10, TILE - 10);
      ctx.fillStyle = 'rgba(255,230,180,0.20)';
      ctx.fillRect(x + 1, y + 1, TILE - 2, 4);
      ctx.strokeStyle = '#4a3016';
      ctx.lineWidth = 3;
      ctx.strokeRect(x + 3, y + 3, TILE - 6, TILE - 6);
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x + 5, y + 5);
      ctx.lineTo(x + TILE - 5, y + TILE - 5);
      ctx.moveTo(x + TILE - 5, y + 5);
      ctx.lineTo(x + 5, y + TILE - 5);
      ctx.stroke();
      ctx.fillStyle = '#33220f';
      ctx.fillRect(x + 4, y + 4, 3, 3);
      ctx.fillRect(x + TILE - 7, y + 4, 3, 3);
      ctx.fillRect(x + 4, y + TILE - 7, 3, 3);
      ctx.fillRect(x + TILE - 7, y + TILE - 7, 3, 3);
    }
    for (const shelf of world.shelves) {
      const x = shelf.tx * TILE;
      const y = shelf.ty * TILE;
      // A glass display case: brass trim, bright blue glass with a diagonal
      // glint, and the little treasure inside catching the light.
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(x + 4, y + 6, TILE - 4, TILE - 4);
      ctx.fillStyle = '#8a7433';
      ctx.fillRect(x + 1, y + 1, TILE - 2, TILE - 2);
      ctx.fillStyle = '#2c3e5e';
      ctx.fillRect(x + 4, y + 4, TILE - 8, TILE - 8);
      ctx.fillStyle = '#46648f';
      ctx.fillRect(x + 6, y + 6, TILE - 12, TILE - 12);
      ctx.fillStyle = 'rgba(200,225,255,0.35)';
      ctx.beginPath();
      ctx.moveTo(x + 8, y + TILE - 8);
      ctx.lineTo(x + 18, y + 6);
      ctx.lineTo(x + 25, y + 6);
      ctx.lineTo(x + 15, y + TILE - 8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffe9a3';
      ctx.beginPath();
      ctx.arc(x + TILE / 2, y + TILE / 2 + 3, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      ctx.arc(x + TILE / 2 - 1.5, y + TILE / 2 + 1.5, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawCoins(ctx, game) {
    for (const coin of game.coins) {
      const age = game.time - coin.born;
      const ringR = 8 + age * 90;
      ctx.strokeStyle = `rgba(255,220,120,${Math.max(0, 0.7 - age)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(coin.x, coin.y, Math.min(ringR, 60), 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#ffd25e';
      ctx.beginPath();
      ctx.arc(coin.x, coin.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawCones(ctx, world, guards, game) {
    for (const guard of guards) {
      const poly = conePolygon(world.solids, guard.x, guard.y, guard.facing, guard.sightRange, 0.56);
      const alarm = game.alarmTimer > 0;
      const hot = alarm || guard.state === 'chase';
      const wary = guard.state === 'investigate' || guard.state === 'suspicious';
      const color = hot ? '255,70,70' : wary ? '255,170,60' : '255,220,110';
      // The beam is lantern light: bright at the lamp, thinning with reach.
      // While the guard's eyes are actually on the player it flares, so a
      // near miss feels as dangerous as it is.
      const reach = guard.sightRange;
      const grad = ctx.createRadialGradient(guard.x, guard.y, 6, guard.x, guard.y, reach);
      const core = guard.seesNow ? 0.52 : hot ? 0.42 : 0.34;
      grad.addColorStop(0, `rgba(${color},${core})`);
      grad.addColorStop(0.55, `rgba(${color},${core * 0.55})`);
      grad.addColorStop(1, `rgba(${color},0.05)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(poly[0][0], poly[0][1]);
      for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i][0], poly[i][1]);
      ctx.closePath();
      ctx.fill();
      // A bright rim on the cone's edge, so its reach reads at a glance.
      ctx.strokeStyle = `rgba(${color},${guard.seesNow ? 0.75 : 0.4})`;
      ctx.lineWidth = guard.seesNow ? 2.5 : 1.5;
      ctx.stroke();
      // The sight line itself while he sees you: a hot thread from his eyes
      // to the spot you are standing in.
      if (guard.seesNow) {
        ctx.strokeStyle = 'rgba(255,120,90,0.55)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(guard.x, guard.y);
        ctx.lineTo(game.player.x, game.player.y);
        ctx.stroke();
      }
    }
  }

  drawGuards(ctx, guards, time) {
    for (const guard of guards) {
      const chase = guard.state === 'chase';
      const wary = guard.state === 'investigate' || guard.state === 'suspicious';
      // The lantern pool: a warm disc of light he carries with him. It marks
      // his ground before his cone does, and it flickers like a real flame.
      const flicker = 0.92 + Math.sin(time * 7.3 + guard.x * 0.7) * 0.08;
      const pool = ctx.createRadialGradient(guard.x, guard.y, 4, guard.x, guard.y, GUARD_LANTERN_RADIUS * flicker);
      pool.addColorStop(0, 'rgba(255,196,96,0.20)');
      pool.addColorStop(1, 'rgba(255,196,96,0)');
      ctx.fillStyle = pool;
      ctx.fillRect(guard.x - 130, guard.y - 130, 260, 260);
      // A state ring under his boots: amber when wary, red on the chase, so
      // his mood reads even at the far end of the floor.
      if (chase || wary) {
        ctx.strokeStyle = chase ? 'rgba(255,80,70,0.8)' : 'rgba(255,180,80,0.65)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(guard.x, guard.y, 18 + Math.sin(time * 6) * 1.5, 0, Math.PI * 2);
        ctx.stroke();
      }
      // Shadow under the boots.
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.beginPath();
      ctx.ellipse(guard.x, guard.y + 11, 13, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      // The roundsman: a bright navy coat with a pale collar ring, so he
      // stands out from every floor in the building.
      ctx.fillStyle = chase ? '#7a2a30' : '#3a4a75';
      ctx.beginPath();
      ctx.arc(guard.x, guard.y, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#aebadd';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(guard.x, guard.y, 13, 0, Math.PI * 2);
      ctx.stroke();
      // Face: a pale dot toward the gaze, and the cap behind it.
      ctx.fillStyle = '#e8c9a0';
      ctx.beginPath();
      ctx.arc(guard.x + Math.cos(guard.facing) * 5, guard.y + Math.sin(guard.facing) * 5, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1d2438';
      ctx.beginPath();
      ctx.arc(guard.x - Math.cos(guard.facing) * 3, guard.y - Math.sin(guard.facing) * 3, 8, 0, Math.PI * 2);
      ctx.fill();
      // Brass buttons down the coat.
      ctx.fillStyle = '#e8c25e';
      ctx.fillRect(guard.x - 1, guard.y - 11, 2, 7);
      // The lantern itself, swung at his side toward the gaze: a bright
      // brass dot with a hot core.
      const lx = guard.x + Math.cos(guard.facing + 0.7) * 15;
      const ly = guard.y + Math.sin(guard.facing + 0.7) * 15;
      ctx.fillStyle = '#ffca6a';
      ctx.beginPath();
      ctx.arc(lx, ly, 4.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff3cf';
      ctx.beginPath();
      ctx.arc(lx, ly, 1.8, 0, Math.PI * 2);
      ctx.fill();
      // Facing tick: a short nose in the direction of the gaze.
      ctx.strokeStyle = '#e8e4d8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(guard.x, guard.y);
      ctx.lineTo(guard.x + Math.cos(guard.facing) * 20, guard.y + Math.sin(guard.facing) * 20);
      ctx.stroke();
      // "?" when suspicious, "!" when the alarm is up or a guard is chasing.
      const mark = chase ? '!' : guard.alertFlash > 0 || guard.state === 'investigate' ? '!' : guard.state === 'suspicious' ? '?' : null;
      if (mark) {
        const bounce = Math.sin(time * 6) * 2;
        ctx.font = 'bold 20px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = mark === '!' ? '#ff5a4e' : '#ffcf5e';
        ctx.fillText(mark, guard.x, guard.y - 24 + bounce);
      }
    }
  }

  drawPlayer(ctx, player, time) {
    const sneak = player.stance === 'sneak';
    const run = player.stance === 'run';
    // Running rings the floor: a pulsing noise circle guards can hear.
    if (player.noiseRadius > 0) {
      const pulse = 0.5 + Math.sin(time * 10) * 0.2;
      ctx.strokeStyle = `rgba(255,120,90,${0.35 * pulse})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.noiseRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,120,90,0.15)';
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.noiseRadius * 0.6, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.ellipse(player.x, player.y + 11, 12, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    // A cool moonlit halo, faint but constant: the one patch of cold light
    // that is always yours, so your eye finds the thief at a glance.
    const halo = ctx.createRadialGradient(player.x, player.y, 4, player.x, player.y, 44);
    halo.addColorStop(0, 'rgba(150,200,255,0.20)');
    halo.addColorStop(1, 'rgba(150,200,255,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(player.x - 46, player.y - 46, 92, 92);
    // The infiltrator: a teal hooded cloak with a moonlit rim, drawn as a
    // circle with a hood peak pointing where they face, low while sneaking.
    const r = sneak ? 11 : 13;
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.facing);
    ctx.fillStyle = run ? '#4d8a72' : '#35705c';
    ctx.beginPath();
    ctx.moveTo(r + 7, 0);
    ctx.lineTo(-r * 0.7, r * 0.85);
    ctx.lineTo(-r * 0.7, -r * 0.85);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#bfe8d8';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.fillStyle = '#1f4436';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.72, 0, Math.PI * 2);
    ctx.fill();
    // The face under the hood, and a gold clasp at the throat.
    ctx.fillStyle = '#f0dfbc';
    ctx.beginPath();
    ctx.arc(r * 0.25, 0, 3.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd25e';
    ctx.beginPath();
    ctx.arc(-r * 0.15, 0, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawNight(ctx, world, player, guards, time) {
    const d = this.darkCtx;
    d.clearRect(0, 0, VIEW_W, VIEW_H);
    d.globalCompositeOperation = 'source-over';
    // The night is a veil, not a wall: deep blue, thin enough that cover,
    // corridors and patrols stay readable beneath it.
    d.fillStyle = 'rgba(6,9,26,0.47)';
    d.fillRect(0, 0, VIEW_W, VIEW_H);
    d.globalCompositeOperation = 'destination-out';
    const cut = (x, y, radius, strength, flicker = 1) => {
      const g = d.createRadialGradient(x, y, 8, x, y, radius * flicker);
      g.addColorStop(0, `rgba(0,0,0,${strength})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      d.fillStyle = g;
      d.fillRect(x - radius - 12, y - radius - 12, (radius + 12) * 2, (radius + 12) * 2);
    };
    // Lamplight pools: the exit, the start, and every relic glows warm.
    const lamps = [world.exit, world.playerStart, ...world.relics.filter((r) => !r.taken)];
    for (const lamp of lamps) {
      if (!lamp) continue;
      cut(lamp.x, lamp.y, 130, 0.95, 0.9 + Math.sin(time * 2.1 + lamp.x) * 0.08);
    }
    // Every roundsman's lantern burns its own hole in the dark.
    for (const guard of guards) {
      cut(guard.x, guard.y, GUARD_LANTERN_RADIUS + 26, 0.85, 0.92 + Math.sin(time * 7.3 + guard.x * 0.7) * 0.08);
    }
    // The player's own lamp: a small circle of safety that follows them.
    cut(player.x, player.y, 150, 0.9);
    ctx.drawImage(this.dark, 0, 0);
    // Vignette: the corners of the night stay night.
    const v = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.5, VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.98);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.36)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  drawHud(ctx, game) {
    const { meter, levelIndex, score, world, player } = game;
    ctx.fillStyle = 'rgba(8,10,22,0.82)';
    ctx.fillRect(0, 0, VIEW_W, 34);
    ctx.fillStyle = '#d8d2c0';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${levelIndex + 1} · ${world.name}`, 12, 22);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd25e';
    ctx.fillText(`◆ ${player.relicsTaken}/${world.relics.length} relics`, VIEW_W / 2 - 60, 22);
    ctx.fillStyle = '#d8d2c0';
    ctx.fillText(`◉ ${player.coins} coins`, VIEW_W / 2 + 60, 22);
    ctx.fillText(`Score ${score}`, VIEW_W - 90, 22);
    // The detection meter: an eye and a bar that fills yellow, then red.
    // The eye speaks in three states, so the player always knows whether
    // they are a rumour, a sighting, or a certainty.
    const bx = VIEW_W - 260;
    const bw = 150;
    const seenNow = game.guards.some((g) => g.seesNow);
    ctx.textAlign = 'left';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillStyle = meter > 75 ? '#ff5a4e' : seenNow || meter > 40 ? '#ffcf5e' : '#cfe3ff';
    ctx.fillText(meter > 75 ? '◉ SEEN!' : seenNow || meter > 40 ? '◉ spotted…' : '◉ hidden', bx - 78, 22);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(bx, 10, bw, 14);
    const fill = meter >= 100 ? '#ff3b30' : meter > 55 ? '#ff9a3d' : '#ffd25e';
    ctx.fillStyle = fill;
    ctx.fillRect(bx, 10, Math.max(0, (bw * meter) / 100), 14);
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, 10, bw, 14);
    // Alarm banner.
    if (game.alarmTimer > 0) {
      ctx.fillStyle = 'rgba(120,10,10,0.85)';
      ctx.fillRect(0, 34, VIEW_W, 26);
      ctx.fillStyle = '#ffe2de';
      ctx.font = 'bold 14px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ALARM — break line of sight and hide!', VIEW_W / 2, 52);
    }
    // Bottom hint line.
    ctx.fillStyle = 'rgba(8,10,22,0.6)';
    ctx.fillRect(0, VIEW_H - 22, VIEW_W, 22);
    ctx.fillStyle = '#9aa3b8';
    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('WASD / arrows move · Shift run (loud) · C sneak · Click toss a coin · Reach the green EXIT unseen', VIEW_W / 2, VIEW_H - 7);
  }

  // The floor intro: for the first seconds on a new floor, a quiet banner
  // names the place, its mood, and the one job — reach the EXIT unseen.
  drawIntro(ctx, game) {
    if (game.screen !== 'play') return;
    const t = game.introT ?? 99;
    if (t >= INTRO_SECONDS) return;
    const fadeIn = Math.min(1, t / 0.5);
    const fadeOut = Math.min(1, (INTRO_SECONDS - t) / 0.8);
    const a = Math.min(fadeIn, fadeOut);
    const { world } = game;
    ctx.save();
    ctx.globalAlpha = a;
    const w = 520;
    const h = 86;
    const x = (VIEW_W - w) / 2;
    const y = 64;
    ctx.fillStyle = 'rgba(6,9,24,0.78)';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(190,205,255,0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e8dcc0';
    ctx.font = 'bold 24px Georgia, serif';
    ctx.fillText(`Floor ${game.levelIndex + 1} — ${world.name}`, VIEW_W / 2, y + 34);
    ctx.fillStyle = '#9fb4d8';
    ctx.font = 'italic 13px Georgia, serif';
    ctx.fillText(world.sub, VIEW_W / 2, y + 56);
    ctx.fillStyle = '#8dffb0';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillText('REACH THE GREEN EXIT UNSEEN · ◆ POCKET THE RELICS ON THE WAY', VIEW_W / 2, y + 76);
    ctx.restore();
  }

  drawOverlay(ctx, game) {
    if (game.screen === 'play') return;
    ctx.fillStyle = 'rgba(4,6,16,0.78)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textAlign = 'center';
    if (game.screen === 'title') {
      ctx.fillStyle = '#e8dcc0';
      ctx.font = 'bold 52px Georgia, serif';
      ctx.fillText('MOONLIT VAULT', VIEW_W / 2, 150);
      ctx.fillStyle = '#ffd25e';
      ctx.font = 'italic 18px Georgia, serif';
      ctx.fillText('a quiet burglary in three floors', VIEW_W / 2, 184);
      ctx.fillStyle = '#c8cdd8';
      ctx.font = '15px system-ui, sans-serif';
      const lines = [
        'The Halcyon Museum sleeps. You are the shadow it forgot to lock out.',
        'Slip past the roundsmen, pocket the relics, and reach the green EXIT unseen.',
        '',
        'Vision cones show what a guard can see — crates and cases block their gaze.',
        'Run and your footsteps ring out; sneak and the meter fills slowly.',
        'Click to toss a coin and pull a guard away. Get caught and the floor resets.',
        '',
        'WASD / arrows — move      Shift — run (loud)      C — sneak      Click — toss a coin',
      ];
      lines.forEach((line, i) => ctx.fillText(line, VIEW_W / 2, 240 + i * 26));
      ctx.fillStyle = '#ffd25e';
      ctx.font = 'bold 17px system-ui, sans-serif';
      ctx.fillText(game.time % 1 < 0.65 ? 'Press any key or click to begin' : '', VIEW_W / 2, 470);
    } else if (game.screen === 'caught') {
      ctx.fillStyle = '#ff5a4e';
      ctx.font = 'bold 44px Georgia, serif';
      ctx.fillText('CAUGHT', VIEW_W / 2, 250);
      ctx.fillStyle = '#c8cdd8';
      ctx.font = '16px system-ui, sans-serif';
      ctx.fillText('A roundsman laid a hand on your shoulder. The floor resets.', VIEW_W / 2, 300);
      ctx.fillStyle = '#ffd25e';
      ctx.font = 'bold 17px system-ui, sans-serif';
      ctx.fillText('Press R or click to try the floor again', VIEW_W / 2, 350);
    } else if (game.screen === 'levelclear') {
      ctx.fillStyle = '#8dffb0';
      ctx.font = 'bold 44px Georgia, serif';
      ctx.fillText('FLOOR CLEARED', VIEW_W / 2, 250);
      ctx.fillStyle = '#c8cdd8';
      ctx.font = '16px system-ui, sans-serif';
      ctx.fillText(game.clearLine || '', VIEW_W / 2, 300);
      ctx.fillStyle = '#ffd25e';
      ctx.font = 'bold 17px system-ui, sans-serif';
      ctx.fillText('Press any key for the next floor', VIEW_W / 2, 350);
    } else if (game.screen === 'victory') {
      ctx.fillStyle = '#ffd25e';
      ctx.font = 'bold 48px Georgia, serif';
      ctx.fillText('THE VAULT IS YOURS', VIEW_W / 2, 220);
      ctx.fillStyle = '#c8cdd8';
      ctx.font = '16px system-ui, sans-serif';
      ctx.fillText(`All three floors crossed unseen. Final score: ${game.score}`, VIEW_W / 2, 280);
      ctx.fillText(`Relics pocketed: ${game.totalRelics} · Time: ${Math.floor(game.totalTime)}s`, VIEW_W / 2, 312);
      ctx.fillStyle = '#8dffb0';
      ctx.font = 'bold 17px system-ui, sans-serif';
      ctx.fillText('Press R to run the museum again', VIEW_W / 2, 360);
    }
  }
}
