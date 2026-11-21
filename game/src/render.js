// Moonlit Vault — everything the eye sees. One job: draw the floor, the cover,
// the guards and their cones, the player, the light, and the HUD, in that order.
import { TILE, VIEW_H, VIEW_W } from './config.js';
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
    this.drawExit(ctx, world, game.time);
    this.drawRelics(ctx, world, game.time);
    this.drawCover(ctx, world);
    this.drawCoins(ctx, game);
    this.drawCones(ctx, world, guards, game);
    this.drawGuards(ctx, guards, game.time);
    this.drawPlayer(ctx, player, game.time);
    this.drawNight(ctx, world, player, game.time);
    this.drawHud(ctx, game);
    this.drawOverlay(ctx, game);
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
        if (solid) {
          // Wall stone: near-black blue with a faint top edge.
          ctx.fillStyle = '#232838';
          ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = 'rgba(255,255,255,0.05)';
          ctx.fillRect(x, y, TILE, 3);
        } else {
          // Wooden floorboards, each tile a slightly different dusk brown.
          const base = 44 + Math.floor(shade * 14);
          ctx.fillStyle = `rgb(${base + 12},${base + 2},${base - 12})`;
          ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = 'rgba(0,0,0,0.16)';
          ctx.fillRect(x, y + TILE - 2, TILE, 2);
          ctx.fillStyle = 'rgba(255,255,255,0.03)';
          ctx.fillRect(x, y, TILE, 1);
        }
      }
    }
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
      ctx.fillStyle = '#5a4023';
      ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
      ctx.fillStyle = '#6d4e2c';
      ctx.fillRect(x + 5, y + 5, TILE - 10, TILE - 10);
      ctx.strokeStyle = '#3d2a15';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 5, y + 5);
      ctx.lineTo(x + TILE - 5, y + TILE - 5);
      ctx.moveTo(x + TILE - 5, y + 5);
      ctx.lineTo(x + 5, y + TILE - 5);
      ctx.stroke();
      ctx.fillStyle = '#2c1e0e';
      ctx.fillRect(x + 4, y + 4, 3, 3);
      ctx.fillRect(x + TILE - 7, y + 4, 3, 3);
      ctx.fillRect(x + 4, y + TILE - 7, 3, 3);
      ctx.fillRect(x + TILE - 7, y + TILE - 7, 3, 3);
    }
    for (const shelf of world.shelves) {
      const x = shelf.tx * TILE;
      const y = shelf.ty * TILE;
      // A glass display case: dark plinth, pale glass top with a glint.
      ctx.fillStyle = '#1c1a26';
      ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
      ctx.fillStyle = '#3a3450';
      ctx.fillRect(x + 6, y + 6, TILE - 12, TILE - 12);
      ctx.fillStyle = 'rgba(190,210,255,0.28)';
      ctx.fillRect(x + 9, y + 9, TILE - 18, 10);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(x + 10, y + 10, 8, 3);
      ctx.fillStyle = '#d8c98a';
      ctx.beginPath();
      ctx.arc(x + TILE / 2, y + TILE / 2 + 4, 4, 0, Math.PI * 2);
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
      const color = alarm || guard.state === 'chase'
        ? '255,70,70'
        : guard.state === 'investigate' || guard.state === 'suspicious'
          ? '255,170,60'
          : '255,220,110';
      const alpha = alarm ? 0.34 : 0.26;
      ctx.fillStyle = `rgba(${color},${alpha})`;
      ctx.beginPath();
      ctx.moveTo(poly[0][0], poly[0][1]);
      for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i][0], poly[i][1]);
      ctx.closePath();
      ctx.fill();
      // A bright rim on the cone's edge, so its reach reads at a glance.
      ctx.strokeStyle = `rgba(${color},0.4)`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  drawGuards(ctx, guards, time) {
    for (const guard of guards) {
      const chase = guard.state === 'chase';
      // Shadow under the boots.
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath();
      ctx.ellipse(guard.x, guard.y + 10, 13, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      // The roundsman: dark uniform, brass buttons, a cap with a brim.
      ctx.fillStyle = chase ? '#5a1f24' : '#2b3247';
      ctx.beginPath();
      ctx.arc(guard.x, guard.y, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#c9a24a';
      ctx.fillRect(guard.x - 1, guard.y - 12, 2, 8);
      // Facing tick: a short nose in the direction of the gaze.
      ctx.strokeStyle = '#e8e4d8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(guard.x, guard.y);
      ctx.lineTo(guard.x + Math.cos(guard.facing) * 19, guard.y + Math.sin(guard.facing) * 19);
      ctx.stroke();
      // Cap brim.
      ctx.fillStyle = '#1a1e2c';
      ctx.beginPath();
      ctx.arc(guard.x + Math.cos(guard.facing) * 8, guard.y + Math.sin(guard.facing) * 8, 7, 0, Math.PI * 2);
      ctx.fill();
      // "?" when suspicious, "!" when the alarm is up or a guard is chasing.
      const mark = chase ? '!' : guard.alertFlash > 0 || guard.state === 'investigate' ? '!' : guard.state === 'suspicious' ? '?' : null;
      if (mark) {
        const bounce = Math.sin(time * 6) * 2;
        ctx.font = 'bold 20px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = mark === '!' ? '#ff5a4e' : '#ffcf5e';
        ctx.fillText(mark, guard.x, guard.y - 22 + bounce);
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
    // The infiltrator: a hooded cloak, drawn as a circle with a hood peak
    // pointing where they face, crouched low while sneaking.
    const r = sneak ? 11 : 13;
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.facing);
    ctx.fillStyle = run ? '#3d5a3a' : '#31473a';
    ctx.beginPath();
    ctx.moveTo(r + 6, 0);
    ctx.lineTo(-r * 0.7, r * 0.85);
    ctx.lineTo(-r * 0.7, -r * 0.85);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#223026';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.72, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8dcc0';
    ctx.beginPath();
    ctx.arc(r * 0.25, 0, 3.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawNight(ctx, world, player, time) {
    const d = this.darkCtx;
    d.clearRect(0, 0, VIEW_W, VIEW_H);
    d.globalCompositeOperation = 'source-over';
    d.fillStyle = 'rgba(5,7,20,0.62)';
    d.fillRect(0, 0, VIEW_W, VIEW_H);
    d.globalCompositeOperation = 'destination-out';
    // Lamplight pools: the exit, the start, and every relic glows warm.
    const lamps = [world.exit, world.playerStart, ...world.relics.filter((r) => !r.taken)];
    for (const lamp of lamps) {
      if (!lamp) continue;
      const flicker = 0.9 + Math.sin(time * 2.1 + lamp.x) * 0.08;
      const g = d.createRadialGradient(lamp.x, lamp.y, 8, lamp.x, lamp.y, 130 * flicker);
      g.addColorStop(0, 'rgba(0,0,0,0.95)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      d.fillStyle = g;
      d.fillRect(lamp.x - 140, lamp.y - 140, 280, 280);
    }
    // The player's own lamp: a small circle of safety that follows them.
    const g = d.createRadialGradient(player.x, player.y, 10, player.x, player.y, 150);
    g.addColorStop(0, 'rgba(0,0,0,0.9)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    d.fillStyle = g;
    d.fillRect(player.x - 160, player.y - 160, 320, 320);
    ctx.drawImage(this.dark, 0, 0);
    // Vignette: the corners of the night stay night.
    const v = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.45, VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.95);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.5)');
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
    const bx = VIEW_W - 260;
    const bw = 150;
    ctx.textAlign = 'left';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillStyle = meter > 75 ? '#ff5a4e' : meter > 40 ? '#ffcf5e' : '#cfe3ff';
    ctx.fillText(meter > 75 ? '◉ SEEN!' : '◉ hidden', bx - 78, 22);
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
