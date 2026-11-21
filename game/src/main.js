// Moonlit Vault — the game loop and the state machine. One job: load floors,
// run the detection meter and the alarm, and hand each frame to the renderer.
import {
  ALARM_SECONDS,
  COINS_PER_LEVEL,
  GUARD_CATCH_RADIUS,
  LEVEL_CLEAR_POINTS,
  METER_DRAIN,
  METER_FILL_BASE,
  METER_FILL_RUN,
  METER_FILL_SNEAK,
  METER_GRACE,
  METER_SUSPICIOUS,
  NOISE_COIN_RADIUS,
  NOISE_RUN_RADIUS,
  PARTICLE_MAX,
  PLAYER_RADIUS,
  RELIC_POINTS,
  TIME_BONUS_PER_SECOND,
  VIEW_H,
  VIEW_W,
} from './config.js';
import { LEVELS, parseLevel } from './levels.js';
import { pointBlocked } from './geometry.js';
import { Guard } from './guards.js';
import { Player } from './player.js';
import { Input } from './input.js';
import { Renderer } from './render.js';
import { SoundFX } from './audio.js';
import { applyShot, shotParams } from './shots.js';

const canvas = document.getElementById('game');
canvas.width = VIEW_W;
canvas.height = VIEW_H;

const game = {
  screen: 'title', // title | play | caught | levelclear | victory
  levelIndex: 0,
  world: null,
  player: null,
  guards: [],
  meter: 0,
  score: 0,
  totalRelics: 0,
  totalTime: 0,
  levelTime: 0,
  alarmTimer: 0,
  graceTimer: 0,
  coins: [], // tossed coins still ringing: {x, y, born}
  particles: [], // gold sparkles: {x, y, vx, vy, life, maxLife, size, color}
  introT: 99, // seconds since the floor loaded; the banner reads it
  time: 0,
  frozen: false, // screenshot staging: render, but do not simulate
  clearLine: '',
  loadLevel,
};

// A burst of sparkles at a point: relic gold when one is pocketed, green and
// gold when the exit takes the player home.
function burst(x, y, count, color, speed = 90) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = speed * (0.35 + Math.random() * 0.85);
    const life = 0.55 + Math.random() * 0.6;
    game.particles.push({
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v - 26,
      life,
      maxLife: life,
      size: 2 + Math.random() * 2.6,
      color,
    });
  }
  if (game.particles.length > PARTICLE_MAX) {
    game.particles.splice(0, game.particles.length - PARTICLE_MAX);
  }
}

// Particles drift and fade every frame, on every screen, so the exit burst
// still dances behind the floor-cleared card.
function stepParticles(dt) {
  for (const p of game.particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 130 * dt; // a gentle fall, like dust off a shelf
    p.vx *= 1 - 1.6 * dt;
  }
  game.particles = game.particles.filter((p) => p.life > 0);
}

const input = new Input(canvas);
const renderer = new Renderer(canvas);
const sfx = new SoundFX();
window.__game = game;

function loadLevel(index) {
  // Flush stale input: a key or click that advanced the last screen must not
  // leak into the new floor (it would skip the level-clear screen at once,
  // or toss a coin the moment play starts).
  input.takeAnyKey();
  input.takeClicks();
  game.levelIndex = index;
  game.world = parseLevel(LEVELS[index]);
  game.player = new Player(game.world.playerStart);
  game.player.coins = COINS_PER_LEVEL;
  game.guards = game.world.guardDefs.map((def) => new Guard(def, game.world));
  game.meter = 0;
  game.alarmTimer = 0;
  game.graceTimer = 0;
  game.coins = [];
  game.particles = [];
  game.introT = 0;
  game.levelTime = 0;
  game.screen = 'play';
}

function startRun() {
  game.score = 0;
  game.totalRelics = 0;
  game.totalTime = 0;
  loadLevel(0);
}

function retryLevel() {
  loadLevel(game.levelIndex);
}

function levelCleared() {
  const timeBonus = Math.max(0, Math.floor((180 - game.levelTime) * TIME_BONUS_PER_SECOND));
  game.score += LEVEL_CLEAR_POINTS + timeBonus;
  game.totalRelics += game.player.relicsTaken;
  if (game.levelIndex + 1 >= LEVELS.length) {
    game.screen = 'victory';
    sfx.victory();
  } else {
    game.clearLine = `${game.world.name} crossed unseen — +${LEVEL_CLEAR_POINTS} points, +${timeBonus} time bonus.`;
    game.screen = 'levelclear';
    sfx.levelClear();
  }
}

function caught() {
  game.screen = 'caught';
  sfx.caught();
}

// One frame of play: move the player, run the guards, work the meter.
function update(dt) {
  const { world, player } = game;
  game.levelTime += dt;
  game.totalTime += dt;
  game.introT += dt;
  sfx.ambient(dt);

  // Coin tosses: a click throws where the mouse points. A coin that would
  // land inside a crate or a wall hops to the nearest open floor instead —
  // a guard sent to stare into a shelf helps nobody.
  for (const click of input.takeClicks()) {
    const land = player.tossCoin(click.x, click.y);
    if (land) {
      if (pointBlocked(world.solids, land.x, land.y)) {
        let found = null;
        for (let r = 12; r <= 56 && !found; r += 11) {
          for (let k = 0; k < 8 && !found; k++) {
            const a = (k * Math.PI) / 4;
            const cx = land.x + Math.cos(a) * r;
            const cy = land.y + Math.sin(a) * r;
            if (!pointBlocked(world.solids, cx, cy)) found = { x: cx, y: cy };
          }
        }
        if (found) {
          land.x = found.x;
          land.y = found.y;
        } else {
          player.coins += 1; // nowhere honest to land: the coin stays home
          continue;
        }
      }
      game.coins.push({ x: land.x, y: land.y, born: game.time });
      sfx.coinPing();
      for (const guard of game.guards) {
        if (Math.hypot(guard.x - land.x, guard.y - land.y) < NOISE_COIN_RADIUS) {
          guard.hearNoise(land.x, land.y);
        }
      }
    }
  }
  game.coins = game.coins.filter((c) => game.time - c.born < 3);

  player.update(world, input.moveVector(), input.runHeld, input.sneakHeld, dt);
  if (player.stepped) sfx.playerStep(player.stance);
  if (player.noiseRadius > 0 && player.stepped) {
    for (const guard of game.guards) {
      if (Math.hypot(guard.x - player.x, guard.y - player.y) < NOISE_RUN_RADIUS) {
        guard.hearNoise(player.x, player.y);
      }
    }
  }

  // Guards see, hear, and walk; collect who has eyes on the player.
  const events = { seenBy: [] };
  for (const guard of game.guards) {
    guard.update(world, player, dt, events);
    if (guard.stepped) sfx.guardStep(Math.hypot(guard.x - player.x, guard.y - player.y));
  }

  // The detection meter: a grace window, then a fill that quickens up close.
  if (events.seenBy.length > 0) {
    game.graceTimer += dt;
    if (game.graceTimer > METER_GRACE) {
      let nearest = Infinity;
      for (const guard of events.seenBy) {
        nearest = Math.min(nearest, Math.hypot(guard.x - player.x, guard.y - player.y));
      }
      const closeness = 1.35 - nearest / game.world.sightRange;
      const stanceFactor = player.stance === 'sneak' ? METER_FILL_SNEAK : player.stance === 'run' ? METER_FILL_RUN : 1;
      game.meter = Math.min(100, game.meter + METER_FILL_BASE * closeness * stanceFactor * dt);
      if (game.meter >= METER_SUSPICIOUS && game.alarmTimer <= 0) {
        const watcher = events.seenBy[0];
        if (watcher.state === 'patrol' || watcher.state === 'return') {
          watcher.state = 'investigate';
          watcher.target = watcher.lastSeen ? { ...watcher.lastSeen } : null;
          watcher.alertFlash = 0.8;
        }
      }
      if (game.meter >= 100 && game.alarmTimer <= 0) {
        game.alarmTimer = ALARM_SECONDS;
        for (const guard of game.guards) guard.raiseAlarm();
        sfx.alarm();
      }
    }
  } else {
    game.graceTimer = 0;
    game.meter = Math.max(0, game.meter - METER_DRAIN * dt);
  }

  if (game.alarmTimer > 0) {
    game.alarmTimer -= dt;
    if (game.alarmTimer <= 0) {
      game.alarmTimer = 0;
      game.meter = 40; // the guards stay wary after the alarm dies down
      for (const guard of game.guards) guard.standDown();
    }
  }

  // Caught: a chasing guard lays a hand on the player.
  for (const guard of game.guards) {
    if (guard.state === 'chase' && Math.hypot(guard.x - player.x, guard.y - player.y) < GUARD_CATCH_RADIUS + PLAYER_RADIUS) {
      caught();
      return;
    }
  }

  // Relics: walk over one to pocket it, in a spray of gold dust.
  for (const relic of world.relics) {
    if (!relic.taken && Math.hypot(relic.x - player.x, relic.y - player.y) < 26) {
      relic.taken = true;
      player.relicsTaken += 1;
      game.score += RELIC_POINTS;
      burst(relic.x, relic.y, 12, 'rgba(255,210,94,A)');
      sfx.pickup();
    }
  }

  // The exit: step into the green light to clear the floor, and let the
  // doorway answer with a burst of its own.
  if (world.exit && Math.hypot(world.exit.x - player.x, world.exit.y - player.y) < 26) {
    burst(world.exit.x, world.exit.y, 30, 'rgba(120,255,170,A)', 120);
    burst(player.x, player.y, 10, 'rgba(255,210,94,A)', 70);
    levelCleared();
  }
}

// The frame loop: title and end screens wait on a key or a click.
let last = performance.now();
let frames = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  game.time += dt;
  stepParticles(dt);
  if (!game.frozen) {
    if (game.screen === 'title') {
      if (input.takeAnyKey() || input.takeClicks().length > 0) {
        sfx.unlock();
        startRun();
      }
    } else if (game.screen === 'play') {
      sfx.unlock();
      update(dt);
      // Keys pressed during play must not leak into the next screen: drain
      // the "any key" flag every frame, so reaching the exit cannot skip
      // the level-clear screen on a stale keypress.
      input.takeAnyKey();
    } else if (game.screen === 'caught') {
      if (input.keys.has('r') || input.takeClicks().length > 0) retryLevel();
    } else if (game.screen === 'levelclear') {
      if (input.takeAnyKey() || input.takeClicks().length > 0) loadLevel(game.levelIndex + 1);
    } else if (game.screen === 'victory') {
      if (input.keys.has('r')) startRun();
    }
  }
  renderer.render(game);
  frames += 1;
  if (game.frozen && frames === 3) window.__shotReady = true;
  requestAnimationFrame(frame);
}

// Boot: load the first floor behind the title screen, or pose a shot.
loadLevel(0);
game.screen = 'title';
const params = shotParams();
if (params.get('shot')) {
  applyShot(game, params);
  window.__shotMode = params.get('shot');
}
requestAnimationFrame(frame);
