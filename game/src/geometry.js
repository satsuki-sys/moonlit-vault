// Moonlit Vault — line of sight and vision-cone geometry. One job: answer
// "can this point see that point?" against the level's solid tiles.
import { TILE } from './config.js';

// A solid tile blocks sight and movement. `solids` is a Set of "tx,ty" keys.
export function tileKey(tx, ty) {
  return tx + ',' + ty;
}

export function isSolidTile(solids, tx, ty) {
  return solids.has(tileKey(tx, ty));
}

export function pointBlocked(solids, x, y) {
  return isSolidTile(solids, Math.floor(x / TILE), Math.floor(y / TILE));
}

// Sample along a segment; true when any sample lands inside a solid tile.
// Sampling every 6 px keeps a thin crate edge from being stepped over.
export function segmentBlocked(solids, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 6));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (pointBlocked(solids, x0 + dx * t, y0 + dy * t)) return true;
  }
  return false;
}

// True when the target is inside the guard's range and cone and nothing solid
// stands between them.
export function canSee(solids, gx, gy, facing, range, halfAngle, px, py) {
  const dx = px - gx;
  const dy = py - gy;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return false;
  if (dist < 1) return true;
  let delta = Math.atan2(dy, dx) - facing;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  if (Math.abs(delta) > halfAngle) return false;
  return !segmentBlocked(solids, gx, gy, px, py);
}

// The visible part of a guard's cone as a polygon: cast a fan of rays, each one
// stopping at the first solid tile (or at full range), for the renderer to fill.
export function conePolygon(solids, gx, gy, facing, range, halfAngle) {
  const rays = 26;
  const points = [[gx, gy]];
  for (let i = 0; i <= rays; i++) {
    const a = facing - halfAngle + (2 * halfAngle * i) / rays;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    let reach = range;
    const steps = Math.ceil(range / 6);
    for (let s = 1; s <= steps; s++) {
      const r = (range * s) / steps;
      if (pointBlocked(solids, gx + dx * r, gy + dy * r)) {
        reach = r;
        break;
      }
    }
    points.push([gx + dx * reach, gy + dy * reach]);
  }
  return points;
}

// Distance from a point to the nearest solid tile edge, used to keep the player
// and guards from clipping into crates. Returns the clearance in pixels.
export function clearanceToSolids(solids, x, y) {
  const tx = Math.floor(x / TILE);
  const ty = Math.floor(y / TILE);
  let best = Infinity;
  for (let oy = -1; oy <= 1; oy++) {
    for (let ox = -1; ox <= 1; ox++) {
      if (!isSolidTile(solids, tx + ox, ty + oy)) continue;
      const cx = Math.max(tx * TILE + ox * TILE, Math.min(x, tx * TILE + ox * TILE + TILE));
      const cy = Math.max(ty * TILE + oy * TILE, Math.min(y, ty * TILE + oy * TILE + TILE));
      best = Math.min(best, Math.hypot(x - cx, y - cy));
    }
  }
  return best;
}
