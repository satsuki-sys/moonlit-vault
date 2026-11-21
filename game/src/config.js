// Moonlit Vault — tuning constants. One job: every number the game balances on.
export const TILE = 40;
export const COLS = 24;
export const ROWS = 16;
export const VIEW_W = COLS * TILE; // 960
export const VIEW_H = ROWS * TILE; // 640

// Player movement, pixels per second.
export const PLAYER_WALK_SPEED = 150;
export const PLAYER_SNEAK_SPEED = 85;
export const PLAYER_RUN_SPEED = 235;
export const PLAYER_RADIUS = 13;

// Guard sight and hearing.
export const GUARD_SIGHT_RANGE = 235;
export const GUARD_SIGHT_HALF_ANGLE = 0.56; // radians, about 32 degrees each side
export const GUARD_CATCH_RADIUS = 20;
export const GUARD_PATROL_SPEED = 62;
export const GUARD_CHASE_SPEED = 165;
export const GUARD_INVESTIGATE_SPEED = 110;
export const GUARD_WAYPOINT_PAUSE = 1.1; // seconds a guard waits at each waypoint

// Detection meter, 0..100. Fills while a guard sees the player, drains while hidden.
export const METER_FILL_BASE = 58; // per second at point-blank range, walking
export const METER_FILL_SNEAK = 0.55; // sneaking fills the meter slower
export const METER_FILL_RUN = 1.5; // running fills it faster
export const METER_DRAIN = 52; // per second while no guard has line of sight
export const METER_GRACE = 0.4; // seconds of sight before the meter starts rising
export const METER_SUSPICIOUS = 55; // a guard starts investigating at this level
export const ALARM_SECONDS = 6; // how long a full meter keeps every guard chasing

// Noise: running feet and tossed coins.
export const NOISE_RUN_RADIUS = 150;
export const NOISE_COIN_RADIUS = 250;
export const COINS_PER_LEVEL = 3;

// Light: each roundsman carries a lantern, and its pool of light is both a
// landmark and a warning — where the warm light falls, his gaze may follow.
export const GUARD_LANTERN_RADIUS = 118;

// The floor-intro banner: name, mood line and objective, shown while the
// player takes their first steps on a new floor.
export const INTRO_SECONDS = 3.6;

// Sparkle particles for relic pickups and the exit's payoff burst.
export const PARTICLE_MAX = 240;

// Scoring.
export const RELIC_POINTS = 100;
export const LEVEL_CLEAR_POINTS = 250;
export const TIME_BONUS_PER_SECOND = 2;
