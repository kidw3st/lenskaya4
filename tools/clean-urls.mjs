/* ==========================================================================
   Переезд на адреса без .html
   Запуск: node tools/clean-urls.mjs

   Было:  /about.html          Стало:  /about/
   Каждая страница переезжает в собственную директорию под именем index.html —
   так статический хостинг отдаёт её по короткому адресу без единой серверной
   настройки. В корне остаются только index.html и 404.html: GitHub Pages ищет
   страницу ошибки именно там.

   Скрипт идемпотентный: повторный запуск ничего не ломает.
   ========================================================================== */

import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync, rmSync, statSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = resolve(ROOT, 'site');

// Остаются в корне: главная и страница ошибки
const KEEP_FLAT = new Set(['index.html', '404.html']);

const pagesAtRoot = readdirSync(SITE).filter(
  (f) => f.endsWith('.html') && !f.startsWith('_') && statSync(join(SITE, f)).isFile()
);
const moving = pagesAtRoot.filter((f) => !KEEP_FLAT.has(f));

/** Имя страницы -> её новый адрес относительно корня сайта */
const slug = (file) => file.replace(/\.html$/, '');

/**
 * Переписывает ссылки внутри одного файла.
 * depth = 0 для корня, 1 для страницы в своей директории.
 */
function rewrite(html, depth) {
  const up = depth ? '../' : '';

  // Ссылки на страницы: about.html -> ../about/ ; index.html -> ../
  html = html.replace(/(href|action)="([a-z0-9-]+)\.html(\?[^"#]*)?(#[^"]*)?"/g, (all, attr, name, q, frag) => {
    if (name === '404') return `${attr}="${up}404.html${q || ''}${frag || ''}"`;
    if (name === 'index') return `${attr}="${up || './'}${q || ''}${frag || ''}"`;
    return `${attr}="${up}${name}/${q || ''}${frag || ''}"`;
  });

  // Ресурсы: assets/..., data/..., sitemap и прочее в корне
  if (depth) {
    html = html.replace(/((?:href|src|content|data-lb-src|srcset)=")(assets\/|data\/|sitemap\.xml|robots\.txt)/g, '$1../$2');
  }

  // Канонический адрес страницы
  html = html.replace(/<link rel="canonical" href="[^"]*">/, (m) => m);

  return html;
}

let moved = 0;
for (const file of moving) {
  const name = slug(file);
  const dir = resolve(SITE, name);
  const src = resolve(SITE, file);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  let html = readFileSync(src, 'utf8');
  html = rewrite(html, 1);
  // Канонический адрес: короткий, без index.html
  html = html.replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${name}/">`);

  writeFileSync(join(dir, 'index.html'), html, 'utf8');
  rmSync(src);
  moved++;
}

// Корневые страницы
for (const file of pagesAtRoot.filter((f) => KEEP_FLAT.has(f))) {
  const p = resolve(SITE, file);
  let html = readFileSync(p, 'utf8');
  html = rewrite(html, 0);
  if (file === 'index.html') html = html.replace(/<link rel="canonical" href="[^"]*">/, '<link rel="canonical" href="./">');
  writeFileSync(p, html, 'utf8');
}

console.log(`Перенесено страниц: ${moved}`);
console.log(`В корне осталось: ${[...KEEP_FLAT].join(', ')}`);
