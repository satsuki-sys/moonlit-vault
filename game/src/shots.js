// Moonlit Vault — staged scenes for screenshots. One job: read ?shot= from the
// URL and pose the game into a readable still: guards mid-patrol, the player
// placed, the meter set. The staged game is frozen (time still animates the
// glow) so the screenshot catches the exact composition.
//
// Each still is composed to teach one thing at a glance: the cover shows the
// whole game — cones, cover, a coin pulling a guard away, the thief mid-floor;
// the near-miss shows the flare of a cone that has actually caught you; the
// vault wing shows the last floor's stone and five lanterns; the exit shows
// the green doorway paying out in sparks.
export function shotParams() {
  return new URLSearchParams(window.location.search);
}

// Place a guard at a tile, facing an angle in degrees.
function poseGuard(guard, tx, ty, facingDeg) {
  guard.x = tx * 40 + 20;
  guard.y = ty * 40 + 20;
  guard.facing = (facingDeg * Math.PI) / 180;
  guard.pauseTimer = 0;
}

// Send a guard to investigate a point, lantern up and "!" lit.
function poseInvestigate(guard, tx, ty, facingDeg, targetX, targetY) {
  poseGuard(guard, tx, ty, facingDeg);
  guard.state = 'investigate';
  guard.target = { x: targetX, y: targetY };
  guard.alertFlash = 0.8;
}

export function applyShot(game, params) {
  const shot = params.get('shot');
  if (!shot) return false;
  game.frozen = true;
  if (shot === 'start') {
    // Cover: the whole first floor. Bram sweeps the west column, Wren the
    // east; Pell has heard a tossed coin ring mid-floor and gone to look,
    // and the thief slips past the crate block behind his back. The floor
    // banner is still up, naming the place and the job.
    game.loadLevel(0);
    poseGuard(game.guards[0], 5, 9, 90);
    poseGuard(game.guards[1], 20, 5, 90);
    poseInvestigate(game.guards[2], 17, 7, 180, 610, 300);
    game.coins.push({ x: 610, y: 300, born: -0.32 });
    game.player.x = 340;
    game.player.y = 335;
    game.player.facing = 0;
    game.player.stance = 'sneak';
    game.meter = 14;
    game.introT = 0.9;
  } else if (shot === 'near') {
    // Near-detection: the thief is inside Pell's cone, caught in the flare,
    // the meter two-thirds up and climbing — one step from the alarm.
    game.loadLevel(0);
    poseGuard(game.guards[0], 5, 10, 90);
    poseGuard(game.guards[1], 17, 3, 180);
    const pell = game.guards[2];
    poseGuard(pell, 8, 4, 90);
    pell.state = 'suspicious';
    pell.target = { x: 330, y: 300 };
    pell.seesNow = true;
    game.player.x = 330;
    game.player.y = 300;
    game.player.facing = -Math.PI / 2;
    game.player.stance = 'sneak';
    game.meter = 67;
    game.introT = 99;
  } else if (shot === 'vault') {
    // Later floor: the Vault Wing — stone corridors, five lanterns, and
    // Wick leaving his post to check a sound in the middle room.
    game.loadLevel(2);
    poseGuard(game.guards[0], 2, 7, 90);
    poseGuard(game.guards[1], 4, 5, 270);
    poseGuard(game.guards[2], 13, 8, 180);
    poseInvestigate(game.guards[3], 12, 11, 270, 500, 462);
    poseGuard(game.guards[4], 20, 7, 90);
    game.player.x = 420;
    game.player.y = 425;
    game.player.facing = Math.PI / 2;
    game.meter = 24;
    game.introT = 99;
  } else if (shot === 'exit') {
    // The exit reached: the thief stands in the green doorway's light as it
    // bursts, three relics in the bag and no eyes on them.
    game.loadLevel(0);
    poseGuard(game.guards[0], 5, 3, 270);
    poseGuard(game.guards[1], 17, 2, 180);
    poseGuard(game.guards[2], 8, 12, 270);
    game.player.x = 868;
    game.player.y = 580;
    game.player.facing = 0;
    game.player.relicsTaken = 3;
    game.score = 300;
    game.meter = 0;
    game.introT = 99;
    // The doorway's payoff, caught mid-burst.
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2 + 0.3;
      const v = 55 + (i % 5) * 16;
      game.particles.push({
        x: 900,
        y: 580,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 20,
        life: 1.6,
        maxLife: 1.6,
        size: 3 + (i % 3),
        color: i % 3 === 0 ? 'rgba(255,210,94,A)' : 'rgba(120,255,170,A)',
      });
    }
  } else {
    return false;
  }
  game.screen = 'play';
  return true;
}
