// Moonlit Vault — the three floors. One job: hold the level maps and turn them
// into the world the other modules play in.
//
// Map legend: '#' wall, 'C' crate, 'S' display shelf, '.' floor,
// 'P' player start, 'E' glowing exit, '*' relic to pocket.
// Guards walk their waypoint list ping-pong style and pause at each stop.
import { TILE } from './config.js';
import { tileKey } from './geometry.js';

export const LEVELS = [
  {
    name: 'The Night Warehouse',
    sub: 'Crates, dust, and three sleepy roundsmen.',
    floor: 'wood',
    shafts: [[3, 3], [14, 4], [20, 2]],
    sightRange: 235,
    guardSpeed: 62,
    map: [
      '########################',
      '#P....C.......C.....*..#',
      '#.....C.......C........#',
      '#..C.....C........C....#',
      '#..C.....C....C...C....#',
      '#......C.....C.........#',
      '#..*........CC...C.....#',
      '#.....C......C.....C...#',
      '#.....C....C...C.......#',
      '#..C.......C...C...*...#',
      '#..C...C.......C.......#',
      '#......C....C......C...#',
      '#..*.......C....C......#',
      '#.....C.........C...C..#',
      '#..C......C........C.E.#',
      '########################',
    ],
    guards: [
      { name: 'Bram', path: [[5, 1], [5, 13]] },
      { name: 'Wren', path: [[16, 2], [21, 2], [21, 12]] },
      { name: 'Pell', path: [[8, 1], [8, 13]] },
    ],
  },
  {
    name: 'The Quiet Gallery',
    sub: 'Glass cases, velvet ropes, four sharper eyes.',
    floor: 'marble',
    shafts: [[6, 3], [17, 3]],
    sightRange: 250,
    guardSpeed: 70,
    map: [
      '########################',
      '#P...S......S......*...#',
      '#....S......S..........#',
      '#....S..C...C...S......#',
      '#....S......S....S.....#',
      '#..C.....S......S..C...#',
      '#....S......S..........#',
      '#.*..S..C...S....S.....#',
      '#....S......S....S.....#',
      '#.....C.S.......S..*...#',
      '#..S.......S......S....#',
      '#..S...C...S...S.......#',
      '#..S.......S......S....#',
      '#.....S........S...C...#',
      '#..*....S....S.....S..E#',
      '########################',
    ],
    guards: [
      { name: 'Marlowe', path: [[2, 1], [2, 13]] },
      { name: 'Ivo', path: [[10, 1], [10, 13]] },
      { name: 'Sable', path: [[20, 2], [20, 12]] },
      { name: 'Rook', path: [[14, 6], [21, 6], [21, 9]] },
    ],
  },
  {
    name: 'The Vault Wing',
    sub: 'Stone corridors, five guards, no room for noise.',
    floor: 'stone',
    shafts: [[9, 3], [18, 2]],
    sightRange: 260,
    guardSpeed: 78,
    map: [
      '########################',
      '#P....#......*....#...E#',
      '#.....#...........#....#',
      '#..C..#..C.....C..#....#',
      '#.....#...........#....#',
      '#..*....###.#######....#',
      '#.....#.........#......#',
      '#..C..#....C....#..C...#',
      '#.....#................#',
      '#..C..#....*....#..*...#',
      '#.....#.........#......#',
      '#..C....####.#####.....#',
      '#.....#...........C....#',
      '#..*..#....C......#....#',
      '#.....#......C....#....#',
      '########################',
    ],
    guards: [
      { name: 'Ash', path: [[2, 1], [2, 13]] },
      { name: 'Fen', path: [[4, 2], [4, 12]] },
      { name: 'Moss', path: [[8, 8], [15, 8]] },
      { name: 'Wick', path: [[12, 7], [12, 13]] },
      { name: 'Slate', path: [[20, 2], [20, 8], [20, 13]] },
    ],
  },
];

// Turn a level definition into a world: solid tiles for sight and movement,
// crates and shelves to draw, relics, the player's start and the exit.
export function parseLevel(def) {
  const solids = new Set();
  const crates = [];
  const shelves = [];
  const relics = [];
  let playerStart = null;
  let exit = null;
  def.map.forEach((row, ty) => {
    for (let tx = 0; tx < row.length; tx++) {
      const ch = row[tx];
      const cx = tx * TILE + TILE / 2;
      const cy = ty * TILE + TILE / 2;
      if (ch === '#' || ch === 'C' || ch === 'S') solids.add(tileKey(tx, ty));
      if (ch === 'C') crates.push({ tx, ty, x: cx, y: cy });
      if (ch === 'S') shelves.push({ tx, ty, x: cx, y: cy });
      if (ch === '*') relics.push({ x: cx, y: cy, taken: false });
      if (ch === 'P') playerStart = { x: cx, y: cy };
      if (ch === 'E') exit = { x: cx, y: cy, tx, ty };
    }
  });
  return {
    name: def.name,
    sub: def.sub,
    floor: def.floor || 'wood',
    shafts: def.shafts || [],
    sightRange: def.sightRange,
    guardSpeed: def.guardSpeed,
    solids,
    crates,
    shelves,
    relics,
    playerStart,
    exit,
    guardDefs: def.guards,
  };
}

// Tile-center in pixels for a waypoint given as [tileX, tileY].
export function waypointPx([tx, ty]) {
  return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
}
