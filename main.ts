// Moonlit Vault — the hand-in program (Node 22, standard library only).
//
// The game is plain static files under game/, and the screenshots live under
// screenshots/. This program copies both into the output directory and writes
// /output/dossier.json with the vendored make.fun library, so the gate can
// check the game exactly as the repository holds it.
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Start from an empty output directory, so a stale file from an earlier run
// can never ride along into the hand-in.
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

cpSync(join(repoRoot, 'game'), join(outDir, 'game'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
}

// Count what was handed in, for the summary line below: every file under
// game/ (walked recursively) and every screenshot.
function countFiles(dir) {
  let n = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    n += entry.isDirectory() ? countFiles(join(dir, entry.name)) : 1;
  }
  return n;
}
const gameFiles = countFiles(join(outDir, 'game'));
const shotFiles = existsSync(join(outDir, 'screenshots')) ? readdirSync(join(outDir, 'screenshots')).length : 0;

// The caps mirror the gate: at most 4 screenshots of 256 KiB, game/ at most
// 993 files and 48 MiB, and the dossier text at most 160 KiB.
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);

// One line on stdout, so a local run can confirm the hand-in at a glance:
// the dossier is the judge's whole view of the entry.
console.log(
  `Moonlit Vault handed in: ${gameFiles} game files, ${shotFiles} screenshots, dossier.json is ${Buffer.byteLength(dossier)} bytes.`,
);
