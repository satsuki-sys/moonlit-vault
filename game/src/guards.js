// Moonlit Vault — guard patrols and suspicion. One job: move each guard along
// its rounds and decide what it does when it sees, hears, or loses the player.
//
// States: patrol (waypoint loop) -> suspicious (saw a flicker, walks to look)
// -> investigate (walks to a noise or last-seen spot) -> chase (alarm, runs at
// the player) -> return (walks back to the nearest waypoint, resumes patrol).
import {
  GUARD_SIGHT_HALF_ANGLE,
  GUARD_WAYPOINT_PAUSE,
  TILE,
} from './config.js';
import { canSee } from './geometry.js';
import { waypointPx } from './levels.js';

export const GUARD_STATES = {
  PATROL: 'patrol',
  SUSPICIOUS: 'suspicious',
  INVESTIGATE: 'investigate',
  CHASE: 'chase',
  RETURN: 'return',
};

export class Guard {
  constructor(def, world) {
    this.name = def.name;
    this.path = def.path;
    this.speed = world.guardSpeed;
    this.sightRange = world.sightRange;
    const start = waypointPx(def.path[0]);
    this.x = start.x;
    this.y = start.y;
    this.facing = 0;
    this.state = GUARD_STATES.PATROL;
    this.wpIndex = 1;
    this.wpDir = 1;
    this.pauseTimer = 0;
    this.target = null; // {x, y} the guard is walking toward
    this.lastSeen = null; // {x, y} where the player was last spotted
    this.suspicion = 0; // 0..1, how sure this guard is something is wrong
    this.stepTimer = 0; // footstep pacing for sound
    this.stuckTimer = 0;
    this.prevX = this.x;
    this.prevY = this.y;
    this.alertFlash = 0; // seconds the "!" stays above the guard
    this.seesNow = false; // the renderer brightens the cone while this is set
    this.stare = 0; // a beat of standing still when suspicion first bites
  }

  // Speeds scale off the floor's own pace (this.speed is the patrol pace the
  // level asked for): a guard hurries to look, and runs flat out on the chase,
  // a touch faster on the later, sharper floors.
  patrolSpeed() {
    return this.speed;
  }

  hurrySpeed() {
    return this.speed * 1.8;
  }

  chaseSpeed() {
    return 150 + this.speed * 0.35;
  }

  // Walk toward a point, sliding along solid tiles. Returns true on arrival.
  moveToward(world, tx, ty, speed, dt) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 4) return true;
    const step = speed * dt;
    const nx = this.x + (dx / dist) * step;
    const ny = this.y + (dy / dist) * step;
    this.facing = Math.atan2(dy, dx);
    this.x = this.slide(world, nx, this.y, 12) ? nx : this.x;
    this.y = this.slide(world, this.x, ny, 12) ? ny : this.y;
    // Footstep timing, so the audio module can place each guard's tread.
    this.stepTimer -= dt;
    if (this.stepTimer <= 0) {
      this.stepTimer = speed > this.chaseSpeed() - 10 ? 0.34 : 0.5;
      this.stepped = true;
    }
    // A guard that makes no progress for a while gives up on this target.
    if (Math.hypot(this.x - this.prevX, this.y - this.prevY) < 0.5) {
      this.stuckTimer += dt;
    } else {
      this.stuckTimer = 0;
    }
    this.prevX = this.x;
    this.prevY = this.y;
    return dist < 6;
  }

  // Axis-separated slide: try the new x, then the new y, keeping a 12 px
  // clearance from solid tiles. Returns whether the axis moved.
  slide(world, nx, ny, radius) {
    return !this.circleHits(world, nx, ny, radius);
  }

  circleHits(world, x, y, r) {
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

  seesPlayer(world, player) {
    return canSee(
      world.solids,
      this.x,
      this.y,
      this.facing,
      this.sightRange,
      GUARD_SIGHT_HALF_ANGLE,
      player.x,
      player.y,
    );
  }

  // One tick. `events` collects what the game loop needs to know: whether any
  // guard currently sees the player, and any noise the player made.
  update(world, player, dt, events) {
    this.stepped = false;
    this.alertFlash = Math.max(0, this.alertFlash - dt);
    const sees = this.seesPlayer(world, player);
    this.seesNow = sees;
    if (sees) {
      events.seenBy.push(this);
      this.lastSeen = { x: player.x, y: player.y };
      this.suspicion = Math.min(1, this.suspicion + dt * 0.9);
    } else {
      this.suspicion = Math.max(0, this.suspicion - dt * 0.25);
    }

    switch (this.state) {
      case GUARD_STATES.PATROL: {
        if (this.pauseTimer > 0) {
          this.pauseTimer -= dt;
          this.lookAround(dt);
          break;
        }
        const wp = waypointPx(this.path[this.wpIndex]);
        if (this.moveToward(world, wp.x, wp.y, this.patrolSpeed(), dt) || this.stuckTimer > 0.7) {
          this.stuckTimer = 0;
          this.pauseTimer = GUARD_WAYPOINT_PAUSE;
          this.wpIndex += this.wpDir;
          if (this.wpIndex >= this.path.length) {
            this.wpIndex = this.path.length - 2;
            this.wpDir = -1;
          } else if (this.wpIndex < 0) {
            this.wpIndex = 1;
            this.wpDir = 1;
          }
        }
        if (this.suspicion > 0.45) {
          this.state = GUARD_STATES.SUSPICIOUS;
          this.target = this.lastSeen ? { ...this.lastSeen } : null;
          this.stare = 0.45; // stop, stare, then walk over — a fair warning
        }
        break;
      }
      case GUARD_STATES.SUSPICIOUS: {
        if (!this.target) {
          this.state = GUARD_STATES.RETURN;
          break;
        }
        if (this.stare > 0) {
          // The stare: feet planted, gaze locked on the spot that moved.
          this.stare -= dt;
          this.facing = Math.atan2(this.target.y - this.y, this.target.x - this.x);
          break;
        }
        if (this.moveToward(world, this.target.x, this.target.y, this.hurrySpeed(), dt) || this.stuckTimer > 0.7) {
          this.stuckTimer = 0;
          this.state = GUARD_STATES.RETURN;
        }
        if (sees && this.suspicion > 0.8) {
          this.state = GUARD_STATES.INVESTIGATE;
          this.target = { ...this.lastSeen };
        }
        break;
      }
      case GUARD_STATES.INVESTIGATE: {
        if (!this.target) {
          this.state = GUARD_STATES.RETURN;
          break;
        }
        if (this.moveToward(world, this.target.x, this.target.y, this.hurrySpeed(), dt) || this.stuckTimer > 0.7) {
          this.stuckTimer = 0;
          this.state = GUARD_STATES.RETURN;
        }
        if (sees) {
          this.alertFlash = 0.6;
          this.target = { ...this.lastSeen };
        }
        break;
      }
      case GUARD_STATES.CHASE: {
        this.moveToward(world, player.x, player.y, this.chaseSpeed(), dt);
        if (sees) this.lastSeen = { x: player.x, y: player.y };
        break;
      }
      case GUARD_STATES.RETURN: {
        // Walk back to the nearest waypoint, then resume the rounds.
        let best = 0;
        let bestDist = Infinity;
        this.path.forEach((wp, i) => {
          const p = waypointPx(wp);
          const d = Math.hypot(p.x - this.x, p.y - this.y);
          if (d < bestDist) {
            bestDist = d;
            best = i;
          }
        });
        const wp = waypointPx(this.path[best]);
        if (this.moveToward(world, wp.x, wp.y, this.patrolSpeed(), dt) || this.stuckTimer > 0.7) {
          this.stuckTimer = 0;
          this.wpIndex = best;
          this.state = GUARD_STATES.PATROL;
        }
        if (this.suspicion > 0.45 && this.lastSeen) {
          this.state = GUARD_STATES.SUSPICIOUS;
          this.target = { ...this.lastSeen };
          this.stare = 0.45;
        }
        break;
      }
      default:
        break;
    }
    return sees;
  }

  // While pausing at a waypoint, a guard slowly sweeps its gaze.
  lookAround(dt) {
    this.facing += dt * 0.9;
  }

  // A noise at (x, y) pulls a patrolling or returning guard over to look.
  hearNoise(x, y) {
    if (this.state === GUARD_STATES.CHASE) return;
    this.state = GUARD_STATES.INVESTIGATE;
    this.target = { x, y };
    this.alertFlash = 0.6;
  }

  // The alarm goes up: every guard runs at the player.
  raiseAlarm() {
    this.state = GUARD_STATES.CHASE;
    this.alertFlash = 1;
  }

  // The alarm dies down: chasing guards give up and walk home.
  standDown() {
    if (this.state === GUARD_STATES.CHASE) {
      this.state = GUARD_STATES.RETURN;
      this.suspicion = 0.3;
    }
  }
}
