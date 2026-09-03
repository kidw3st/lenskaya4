// Генератор sitemap.xml. Запуск: node tools/gen-sitemap.mjs
// В карту попадают только опубликованные лоты (is_published = true)
// и не попадают проданные — по правилу раздела 9.4 спецификации.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = resolve(ROOT, 'site');
const BASE = process.env.BASE_URL || 'https://kidw3st.github.io/lenskaya4';
const TODAY = '2026-08-06';

const read = (p) => JSON.parse(readFileSync(resolve(SITE, 'data', p), 'utf8'));

// Приоритеты отражают иерархию продуктов: земельные участки — основной раздел.
const pages = [
  ['', 1.0],
  ['land/', 0.9],
  ['about/', 0.8],
  ['architecture/', 0.7],
  ['landscape/', 0.7],
  ['location/', 0.7],
  ['infrastructure/', 0.6],
  ['gallery/', 0.6],
  ['news/', 0.6],
  ['contacts/', 0.7],
  ['documents/', 0.4],
  ['privacy/', 0.3],
  ['consent/', 0.3],
];

const urls = pages.map(([p, prio]) => ({ loc: `${BASE}/${p}`, priority: prio }));

for (const p of read('land.json')) {
  if (!p.is_published || p.status === 'sold') continue;
  urls.push({ loc: `${BASE}/land-plot/?id=${p.id}`, priority: 0.7, lastmod: p.updated_at });
}
for (const n of read('news.json')) {
  urls.push({ loc: `${BASE}/news-article/?slug=${n.slug}`, priority: 0.5, lastmod: n.date });
}

const xml =
  '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  urls
    .map(
      (u) =>
        `  <url><loc>${u.loc.replace(/&/g, '&amp;')}</loc><lastmod>${u.lastmod || TODAY}</lastmod><priority>${u.priority}</priority></url>`
    )
    .join('\n') +
  '\n</urlset>\n';

writeFileSync(resolve(SITE, 'sitemap.xml'), xml, 'utf8');
console.log(`sitemap.xml: ${urls.length} URL`);
