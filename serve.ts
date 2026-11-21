// Moonlit Vault — a tiny static server for local play-testing (Node 22,
// standard library only). Serves game/ on http://localhost:8080:
//   node serve.ts [--port 8080]
// It answers only files inside game/, sends the MIME types a browser game
// needs, and is a development convenience, not a public server.
import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const gameRoot = resolve(fileURLToPath(new URL('./game', import.meta.url)));
const portArg = process.argv.indexOf('--port');
const port = portArg === -1 ? 8080 : Number(process.argv[portArg + 1]) || 8080;

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
  const target = resolve(join(gameRoot, normalize(pathname === '/' ? 'index.html' : pathname)));
  if (target !== gameRoot && !target.startsWith(gameRoot + sep)) {
    res.writeHead(403).end('forbidden');
    return;
  }
  let size: number;
  try {
    const info = statSync(target);
    if (!info.isFile()) throw new Error('not a file');
    size = info.size;
  } catch {
    res.writeHead(404).end('not found');
    return;
  }
  res.writeHead(200, {
    'content-type': TYPES[extname(target).toLowerCase()] ?? 'application/octet-stream',
    'content-length': size,
    'cache-control': 'no-store',
  });
  createReadStream(target).pipe(res);
}).listen(port, '127.0.0.1', () => {
  console.log(`Moonlit Vault is on http://localhost:${port}`);
});
