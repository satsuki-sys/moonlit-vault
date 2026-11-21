// Moonlit Vault — the infiltrator. One job: move the player with collision,
// track stance (walk / sneak / run), and say how loud each step is.
import {
  NOISE_RUN_RADIUS,
  PLAYER_RADIUS,
  PLAYER_RUN_SPEED,
  PLAYER_SNEAK_SPEED,
  PLAYER_WALK_SPEED,
  TILE,
} from './config.js';

export const STANCES = {
  WALK: 'walk',
  SNEAK: 'sneak',
  RUN: 'run',
};

export class Player {
  constructor(start) {
    this.x = start.x;
    this.y = start.y;
    this.facing = -Math.PI / 2;
    this.stance = STANCES.WALK;
    this.moving = false;
    this.stepTimer = 0;
    this.stepped = false;
    this.noiseRadius = 0; // how far the current step carries, 0 when silent
    this.coins = 0;
    this.relicsTaken = 0;
  }

  reset(start) {
    this.x = start.x;
    this.y = start.y;
    this.facing = -Math.PI / 2;
    this.stance = STANCES.WALK;
    this.moving = false;
    this.noiseRadius = 0;
  }

  circleHits(world, x, y) {
    const r = PLAYER_RADIUS;
    const minTx = Math.floor((x - r) / TILE);
    const maxTx = Math.floor((x + r) / TILE);
    const minTy = Math.floor((y - r) / TILE);
    const maxTy = Math.floor((y + r) / TILE);
    for (let ty = minTy; ty <= maxTy; ty++) {
      for (let tx = minTx; tx <= maxTx; tx++) {
        if (!world.solids.has(tx + ',' + ty)) continue;
        const cx = Math.max(tx * TILE, Math.min(x, tx * TILE + TILE));
        const cy = Math.max(ty * TILE, Math.min(y, ty * TILE + TILE));
        if (Math.hypot(x - cx, y - cy) < r) return true;
      }
    }
    return false;
  }

  // `move` is {x, y} in -1..1 from the keys; `run` and `sneak` are held keys.
  update(world, move, run, sneak, dt) {
    this.stepped = false;
    this.noiseRadius = 0;
    const len = Math.hypot(move.x, move.y);
    this.moving = len > 0.01;
    if (!this.moving) return;
    const nx = move.x / len;
    const ny = move.y / len;
    this.facing = Math.atan2(ny, nx);
    this.stance = run ? STANCES.RUN : sneak ? STANCES.SNEAK : STANCES.WALK;
    const speed =
      this.stance === STANCES.RUN
        ? PLAYER_RUN_SPEED
        : this.stance === STANCES.SNEAK
          ? PLAYER_SNEAK_SPEED
          : PLAYER_WALK_SPEED;
    const step = speed * dt;
    const tryX = this.x + nx * step;
    const tryY = this.y + ny * step;
    if (!this.circleHits(world, tryX, this.y)) this.x = tryX;
    if (!this.circleHits(world, this.x, tryY)) this.y = tryY;
    // Running is loud: every step rings out to the noise radius.
    if (this.stance === STANCES.RUN) this.noiseRadius = NOISE_RUN_RADIUS;
    this.stepTimer -= dt;
    if (this.stepTimer <= 0) {
      this.stepTimer = this.stance === STANCES.RUN ? 0.28 : this.stance === STANCES.SNEAK ? 0.6 : 0.42;
      this.stepped = true;
    }
  }

  // Toss a coin toward (tx, ty): it lands a short hop away and pings.
  // Returns the landing spot, or null when no coins are left.
  tossCoin(tx, ty) {
    if (this.coins <= 0) return null;
    this.coins -= 1;
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.hypot(dx, dy);
    const hop = Math.min(dist, 190);
    const land = {
      x: this.x + (dist > 0 ? (dx / dist) * hop : 0),
      y: this.y + (dist > 0 ? (dy / dist) * hop : 0),
    };
    return land;
  }
}
