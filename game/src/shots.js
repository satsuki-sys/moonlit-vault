// Moonlit Vault — staged scenes for screenshots. One job: read ?shot= from the
// URL and pose the game into a readable still: guards mid-patrol, the player
// placed, the meter set. The staged game is frozen (time still animates the
// glow) so the screenshot catches the exact composition.
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

export function applyShot(game, params) {
  const shot = params.get('shot');
  if (!shot) return false;
  game.frozen = true;
  if (shot === 'start') {
    // Cover: the whole first floor, cones out, crates everywhere, player fresh.
    game.loadLevel(0);
    poseGuard(game.guards[0], 5, 6, 90);
    poseGuard(game.guards[1], 21, 7, 90);
    poseGuard(game.guards[2], 8, 7, 0);
    game.player.x = 140;
    game.player.y = 100;
    game.meter = 0;
  } else if (shot === 'near') {
    // Near-detection: the player is inside Pell's cone, meter almost full.
    game.loadLevel(0);
    poseGuard(game.guards[0], 5, 6, 90);
    poseGuard(game.guards[1], 21, 7, 90);
    const pell = game.guards[2];
    poseGuard(pell, 8, 5, 90);
    pell.state = 'suspicious';
    pell.alertFlash = 1;
    game.player.x = 380;
    game.player.y = 335;
    game.player.stance = 'sneak';
    game.meter = 88;
  } else if (shot === 'vault') {
    // Later floor: the Vault Wing, five guards, tight stone corridors.
    game.loadLevel(2);
    poseGuard(game.guards[0], 2, 7, 90);
    poseGuard(game.guards[1], 4, 5, 270);
    poseGuard(game.guards[2], 10, 8, 0);
    poseGuard(game.guards[3], 12, 7, 180);
    poseGuard(game.guards[4], 20, 7, 90);
    game.player.x = 60;
    game.player.y = 60;
    game.meter = 20;
  } else if (shot === 'exit') {
    // The exit reached: the player stands in the green doorway's light.
    game.loadLevel(0);
    poseGuard(game.guards[0], 5, 7, 0);
    poseGuard(game.guards[1], 17, 2, 180);
    poseGuard(game.guards[2], 8, 12, 270);
    game.player.x = 820;
    game.player.y = 580;
    game.player.relicsTaken = 3;
    game.meter = 8;
  } else {
    return false;
  }
  game.screen = 'play';
  return true;
}
