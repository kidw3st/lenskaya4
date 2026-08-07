// Генератор sitemap.xml. Запуск: node tools/gen-sitemap.mjs
// В карту попадают только опубликованные лоты (is_published = true)
// и не попадают проданные — по правилу раздела 9.4 спецификации.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = resolve(ROOT, 'site');
const BASE = process.env.BASE_URL || 'https://lenskaya.example';
const TODAY = '2026-08-06';

const read = (p) => JSON.parse(readFileSync(resolve(SITE, 'data', p), 'utf8'));

// Приоритеты отражают иерархию продуктов: земельные участки — основной раздел.
const pages = [
  ['', 1.0],
  ['land.html', 0.9],
  ['flats.html', 0.8],
  ['about.html', 0.8],
  ['architecture.html', 0.7],
  ['landscape.html', 0.7],
  ['location.html', 0.7],
  ['infrastructure.html', 0.6],
  ['gallery.html', 0.6],
  ['progress.html', 0.6],
  ['news.html', 0.6],
  ['contacts.html', 0.7],
  ['documents.html', 0.4],
  ['privacy.html', 0.3],
  ['consent.html', 0.3],
];

const urls = pages.map(([p, prio]) => ({ loc: `${BASE}/${p}`, priority: prio }));

for (const p of read('land.json')) {
  if (!p.is_published || p.status === 'sold') continue;
  urls.push({ loc: `${BASE}/land-plot.html?id=${p.id}`, priority: 0.7, lastmod: p.updated_at });
}
for (const f of read('flats.json')) {
  if (!f.is_published || f.status === 'sold') continue;
  urls.push({ loc: `${BASE}/flat.html?id=${f.id}`, priority: 0.5, lastmod: f.updated_at });
}
for (const n of read('news.json')) {
  urls.push({ loc: `${BASE}/news-article.html?slug=${n.slug}`, priority: 0.5, lastmod: n.date });
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
