// Версионирование ссылок на CSS и JS: assets/js/site.js?v=3
//
// Зачем: статика на хостинге кэшируется (на GitHub Pages — 10 минут).
// После выкладки браузер может взять новый HTML и старый JS из кэша,
// и страница окажется наполовину обновлённой. Номер версии в ссылке
// делает выкладку атомарной для браузера.
//
// Запуск: node tools/bump-assets.mjs        — увеличить версию на 1
//         node tools/bump-assets.mjs 7      — задать версию явно

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = resolve(ROOT, 'site');

// Страницы лежат по адресам без .html: главная в корне, остальные —
// каждая в своей директории. Собираем и те и другие.
const listPages = (dir, prefix = '') => {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || e.name.startsWith('_')) continue;
    if (e.isDirectory()) {
      if (['assets', 'data'].includes(e.name)) continue;
      out.push(...listPages(join(dir, e.name), prefix + e.name + '/'));
    } else if (e.name.endsWith('.html')) {
      out.push(prefix + e.name);
    }
  }
  return out;
};
const files = listPages(SITE);

// Текущая версия — максимальная из встреченных
let current = 0;
for (const f of files) {
  const s = readFileSync(resolve(SITE, f), 'utf8');
  for (const m of s.matchAll(/assets\/(?:css|js)\/[\w.-]+\?v=(\d+)/g)) {
    current = Math.max(current, Number(m[1]));
  }
}

const next = process.argv[2] ? Number(process.argv[2]) : current + 1;
if (!Number.isFinite(next) || next < 1) {
  console.error('Некорректный номер версии');
  process.exit(1);
}

let touched = 0;
for (const f of files) {
  const p = resolve(SITE, f);
  const before = readFileSync(p, 'utf8');
  // Снимаем старую версию и ставим новую — на href и src одинаково
  const after = before.replace(
    /(assets\/(?:css|js)\/[\w.-]+?)(?:\?v=\d+)?(["'])/g,
    (_m, path, quote) => `${path}?v=${next}${quote}`
  );
  if (after !== before) {
    writeFileSync(p, after, 'utf8');
    touched++;
  }
}

console.log(`Версия ассетов: ${current || '—'} → ${next}`);
console.log(`Обновлено страниц: ${touched}`);
