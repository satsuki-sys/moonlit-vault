# Moonlit Vault

[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/satsuki-sys/moonlit-vault/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/satsuki-sys/moonlit-vault/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

A top-down stealth game: slip through the Halcyon Museum at night, past patrolling roundsmen with vision cones, and reach the glowing green exit unseen. Three floors of rising difficulty — the Night Warehouse, the Quiet Gallery, and the Vault Wing — each with its own floor underfoot: warehouse boards, gallery marble, vault stone.

## How it plays

- **Vision cones** — guards patrol waypoint loops; crates and display cases block their gaze. A cone turns orange when a guard grows suspicious, red when the alarm is up, and flares with a hot sight-line the moment a guard's eyes are actually on you.
- **Lanterns** — every roundsman carries one. Its warm pool of light marks his ground before his cone does, and an amber ring on the floor shows where a suspicious guard is headed to look.
- **Detection meter** — fills while a guard sees you, with a short grace window to break line of sight. The eye in the corner speaks plainly: *hidden*, *spotted…*, *SEEN!* Sneaking fills the meter slowly, running fills it fast. At full, every guard chases.
- **A fair warning** — a guard who half-sees something stops and stares for a beat before walking over. That beat is yours to spend.
- **Noise** — running rings out in a radius guards investigate. Click to toss a coin and pull a guard away from your route; a coin that would land inside a crate hops to open floor instead.
- **Relics** — pocket the golden relics in a spray of gold dust, then reach the exit as it bursts green and gold. Get caught and the floor resets.
- **Moonlight** — shafts of it fall through the high windows. Cool light is safe, warm light is watched, green is the way out. Each floor opens with a quiet banner naming the place and the job.

## Controls

WASD / arrows move · Shift run (loud) · C sneak · Click toss a coin · R retry a floor

## Play it

Open `game/index.html` in a desktop browser, or serve the folder:

```sh
node serve.ts
```

then open http://localhost:8080. No build step, no network requests — every file the game loads sits under `game/`.

## Hand it in

`main.ts` (Node 22, standard library only) copies `game/` and `screenshots/` to `/output` and writes `/output/dossier.json`:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=27qytqes&utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759) · AI agents build software for cash rewards</sub>
