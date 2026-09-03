/* ==========================================================================
   Синхронизация width/height у <img> с фактическими файлами
   Запуск: node tools/sync-image-sizes.mjs

   Атрибуты размера нужны браузеру, чтобы зарезервировать место под картинку
   до её загрузки. Если они врут — вёрстка прыгает при подгрузке (CLS).
   А врать они начинают сразу же, как только картинку пережали.
   ========================================================================== */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = resolve(ROOT, 'site');
const IMG = resolve(SITE, 'assets/img');

/** Размеры JPEG из заголовка SOF */
function jpegSize(buf) {
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) { i++; continue; }
    const mk = buf[i + 1];
    if (mk >= 0xc0 && mk <= 0xcf && mk !== 0xc4 && mk !== 0xc8 && mk !== 0xcc)
      return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return null;
}

/** Размеры SVG из viewBox */
function svgSize(text) {
  const m = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(text);
  return m ? { w: Math.round(+m[1]), h: Math.round(+m[2]) } : null;
}

const sizes = {};
for (const f of readdirSync(IMG)) {
  const p = join(IMG, f);
  if (f.endsWith('.jpg')) sizes[f] = jpegSize(readFileSync(p));
  else if (f.endsWith('.svg')) sizes[f] = svgSize(readFileSync(p, 'utf8'));
}

const listPages = (dir, prefix = '') => {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.')) continue;
    if (e.isDirectory()) {
      if (['img', 'css', 'js', 'data'].includes(e.name)) continue;
      out.push(...listPages(join(dir, e.name), prefix + e.name + '/'));
    } else if (e.name.endsWith('.html')) out.push(prefix + e.name);
  }
  return out;
};

let fixed = 0;
const touchedPages = new Set();

for (const page of listPages(SITE)) {
  const p = resolve(SITE, page);
  let html = readFileSync(p, 'utf8');
  const before = html;

  html = html.replace(
    /<img([^>]*?)src="([^"]*assets\/img\/([^"?]+))(\?[^"]*)?"([^>]*?)>/g,
    (all, pre, _src, file, q, post) => {
      const s = sizes[file];
      if (!s) return all;
      const hasW = /\bwidth="\d+"/.test(all);
      const hasH = /\bheight="\d+"/.test(all);
      let out = all;
      if (hasW && hasH) {
        const cur = [/\bwidth="(\d+)"/.exec(all)[1], /\bheight="(\d+)"/.exec(all)[1]].map(Number);
        if (cur[0] === s.w && cur[1] === s.h) return all;
        out = out.replace(/\bwidth="\d+"/, `width="${s.w}"`).replace(/\bheight="\d+"/, `height="${s.h}"`);
      } else {
        out = out.replace(/>$/, ` width="${s.w}" height="${s.h}">`);
      }
      fixed++;
      touchedPages.add(page);
      return out;
    }
  );

  // <source> внутри <picture> тоже резервирует место: без своих размеров
  // мобильный вертикальный кадр подставляется в коробку от горизонтального,
  // и при загрузке макет прыгает.
  html = html.replace(
    /<source([^>]*?)srcset="([^"]*assets\/img\/([^"?]+))(\?[^"]*)?"([^>]*?)>/g,
    (all, pre, _src, file) => {
      const s2 = sizes[file];
      if (!s2) return all;
      let out = all;
      if (/ width="[0-9]+"/.test(all)) {
        out = out.replace(/ width="[0-9]+"/, ` width="${s2.w}"`).replace(/ height="[0-9]+"/, ` height="${s2.h}"`);
      } else {
        out = out.replace(/>$/, ` width="${s2.w}" height="${s2.h}">`);
      }
      if (out !== all) { fixed++; touchedPages.add(page); }
      return out;
    }
  );

  if (html !== before) writeFileSync(p, html, 'utf8');
}

console.log(`Размеров исправлено: ${fixed} на ${touchedPages.size} страницах`);
if (!fixed) console.log('Все width/height совпадают с файлами.');
