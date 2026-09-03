/* ==========================================================================
   Нормализация метаданных в <head>
   Запуск: node tools/gen-meta.mjs

   Один источник правды на весь сайт: og-разметка, twitter-карточка,
   theme-color, canonical, robots и хлебные крошки для поисковиков.
   Раньше это добавлялось руками и разъезжалось от страницы к странице —
   у половины не было og:title, у трети og:type, у 404 вообще ничего.

   Заголовок и описание берутся из самой страницы: их пишет человек,
   скрипт только следит, чтобы они были и укладывались в разумную длину.
   ========================================================================== */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = resolve(ROOT, 'site');
const ORIGIN = process.env.BASE_URL || 'https://kidw3st.github.io/lenskaya4';

const SITE_NAME = '«Ленская» — земельные участки в Перми';
const THEME_LIGHT = '#faf8f4';
const THEME_DARK = '#101512';

// Страницы, которым в поиске делать нечего
const NOINDEX = new Set(['favorites/index.html', '404.html']);

// Тип по разделу
const ARTICLE = new Set(['news-article/index.html']);

const listPages = (dir, prefix = '') => {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || e.name.startsWith('_')) continue;
    if (e.isDirectory()) {
      if (['assets', 'data'].includes(e.name)) continue;
      out.push(...listPages(join(dir, e.name), prefix + e.name + '/'));
    } else if (e.name.endsWith('.html')) out.push(prefix + e.name);
  }
  return out;
};

const pages = listPages(SITE);
const problems = [];
let touched = 0;

/** Адрес страницы на сайте: about/index.html -> /about/ */
const publicPath = (file) =>
  file === 'index.html' ? '/' : file === '404.html' ? '/404.html' : '/' + file.replace(/index\.html$/, '');

/** Глубина вложенности — для относительных ссылок на ассеты */
const up = (file) => (file.includes('/') ? '../' : '');

const tag = (html, re) => (re.exec(html) || [])[1] || '';

for (const file of pages) {
  const p = resolve(SITE, file);
  let html = readFileSync(p, 'utf8');
  const before = html;

  const title = tag(html, /<title>([\s\S]*?)<\/title>/);
  let desc = tag(html, /<meta name="description" content="([^"]*)"/);

  if (!title) problems.push(`${file}: нет <title>`);
  if (!desc) problems.push(`${file}: нет description`);
  if (desc && desc.length > 170) problems.push(`${file}: description ${desc.length} знаков — длиннее 170`);

  const url = ORIGIN + publicPath(file);
  const image = ORIGIN + '/assets/img/' + (file.startsWith('land') ? 'OG-LAND-01.svg' : 'OG-01.svg');
  const type = ARTICLE.has(file) ? 'article' : 'website';

  /* --- Собираем блок --- */
  const block = [
    `<meta name="theme-color" content="${THEME_LIGHT}" media="(prefers-color-scheme: light)">`,
    `<meta name="theme-color" content="${THEME_DARK}" media="(prefers-color-scheme: dark)">`,
    NOINDEX.has(file) ? '<meta name="robots" content="noindex, follow">' : '',
    `<meta property="og:site_name" content="${SITE_NAME}">`,
    `<meta property="og:locale" content="ru_RU">`,
    `<meta property="og:type" content="${type}">`,
    `<meta property="og:title" content="${title}">`,
    desc ? `<meta property="og:description" content="${desc}">` : '',
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:image" content="${image}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${title}">`,
    desc ? `<meta name="twitter:description" content="${desc}">` : '',
    `<meta name="twitter:image" content="${image}">`,
  ]
    .filter(Boolean)
    .join('\n');

  const MARK_A = '<!-- meta:start -->';
  const MARK_B = '<!-- meta:end -->';
  const wrapped = `${MARK_A}\n${block}\n${MARK_B}`;

  // Убираем старые разрозненные теги, чтобы не задвоить
  html = html
    .replace(/\n?<meta property="og:(?:image|title|description|url|type|site_name|locale)"[^>]*>/g, '')
    .replace(/\n?<meta name="twitter:[^"]*"[^>]*>/g, '')
    .replace(/\n?<meta name="theme-color"[^>]*>/g, '')
    .replace(/\n?<meta name="robots"[^>]*>/g, '');

  if (html.includes(MARK_A)) {
    html = html.replace(new RegExp(MARK_A + '[\\s\\S]*?' + MARK_B), wrapped);
  } else {
    // Ставим сразу после canonical, а если его нет — после description
    if (/<link rel="canonical"[^>]*>/.test(html)) {
      html = html.replace(/(<link rel="canonical"[^>]*>)/, `$1\n${wrapped}`);
    } else {
      const canonical = `<link rel="canonical" href="./">`;
      html = html.replace(/(<meta name="description"[^>]*>)/, `$1\n${canonical}\n${wrapped}`);
      if (!html.includes(canonical)) html = html.replace(/(<title>[\s\S]*?<\/title>)/, `$1\n${canonical}\n${wrapped}`);
    }
  }

  if (html !== before) {
    writeFileSync(p, html, 'utf8');
    touched++;
  }
}

console.log(`Метаданные приведены к единому виду на страницах: ${touched} из ${pages.length}`);
if (problems.length) {
  console.log('\nТребует внимания:');
  for (const x of problems) console.log('  ' + x);
} else {
  console.log('Заголовки и описания на месте и укладываются в длину.');
}
