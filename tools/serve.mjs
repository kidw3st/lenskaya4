// Локальный статический сервер для просмотра сайта.
// Запуск: node tools/serve.mjs  →  http://localhost:4173
// Продакшену не нужен: сайт статический и работает с любого веб-сервера.

import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../site');
const PORT = Number(process.env.PORT || 4173);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  // Каталожность адреса определяем ДО normalize: на Windows он меняет
  // прямые слэши на обратные, и проверка endsWith("/") переставала работать —
  // короткие адреса вроде /land/ начинали отдавать 404.
  const isDir = url === '' || url.endsWith('/');
  const parts = normalize(url).split(/[\\/]+/).filter(Boolean);
  let rel = parts.join('/');
  if (isDir) rel = rel ? rel + '/index.html' : 'index.html';

  let file = join(ROOT, rel);
  if (!file.startsWith(ROOT)) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  if (!existsSync(file) && existsSync(file + '.html')) file += '.html';

  if (!existsSync(file) || statSync(file).isDirectory()) {
    const notFound = join(ROOT, '404.html');
    res.writeHead(404, { 'Content-Type': TYPES['.html'] });
    if (existsSync(notFound)) createReadStream(notFound).pipe(res);
    else res.end('404');
    return;
  }

  res.writeHead(200, {
    'Content-Type': TYPES[extname(file)] || 'application/octet-stream',
    'Cache-Control': 'no-cache',
  });
  createReadStream(file).pipe(res);
}).listen(PORT, () => {
  console.log(`Сайт: http://localhost:${PORT}`);
});
