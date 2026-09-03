// Генератор медиаплейсхолдеров ЖК «Ленская».
// Запуск: node tools/gen-assets.mjs
// Результат: site/assets/img/*.svg
//
// Плейсхолдеры — атмосферная графика в фирменной палитре, а не серые заглушки.
// ID слота из реестра (раздел 5 спецификации) вынесен в маленький угловой чип,
// чтобы он не наезжал на текст, который страница кладёт поверх изображения.
// Каждый файл заменяется через CMS на утверждённый Заказчиком материал.

import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'site/assets/img');
mkdirSync(OUT, { recursive: true });

/* ------------------------------------------------------------------ */
/* Утилиты                                                             */
/* ------------------------------------------------------------------ */

function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const AR = {
  '21:9': [2100, 900],
  '16:9': [1600, 900],
  '16:10': [1600, 1000],
  '3:2': [1500, 1000],
  '4:3': [1400, 1050],
  '1:1': [1200, 1200],
  '4:5': [1120, 1400],
  '3:4': [1080, 1440],
  '1.91:1': [1200, 630],
};

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const n = (v) => Number(v).toFixed(1);

/* ------------------------------------------------------------------ */
/* Палитры времени суток                                               */
/* ------------------------------------------------------------------ */

const SKIES = {
  dawn: { top: '#2E3A44', mid: '#7C7466', low: '#D9A876', sun: '#F3C88E', sunY: 0.62 },
  day: { top: '#8FA6B4', mid: '#C3CEcd', low: '#E4E3D8', sun: '#FFFFFF', sunY: 0.3 },
  golden: { top: '#3C4A50', mid: '#9C8368', low: '#E0AE73', sun: '#FFD79B', sunY: 0.66 },
  dusk: { top: '#1B242B', mid: '#3B4750', low: '#8E7C6B', sun: '#E5B588', sunY: 0.72 },
  night: { top: '#0D1418', mid: '#16202A', low: '#26313A', sun: '#7E96A6', sunY: 0.5 },
  soft: { top: '#DCE0DA', mid: '#E9E7DF', low: '#F3F0E8', sun: '#FFFFFF', sunY: 0.35 },
};

const GREENS = ['#2B3A2B', '#33452F', '#3E5136', '#4A5C3D'];

function sky(W, H, key, hz) {
  const s = SKIES[key];
  const sunX = 0.66;
  return `
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${s.top}"/>
      <stop offset="0.55" stop-color="${s.mid}"/>
      <stop offset="1" stop-color="${s.low}"/>
    </linearGradient>
    <radialGradient id="sunHalo" cx="${sunX}" cy="${s.sunY}" r="0.9">
      <stop offset="0" stop-color="${s.sun}" stop-opacity="0.34"/>
      <stop offset="0.5" stop-color="${s.sun}" stop-opacity="0.1"/>
      <stop offset="1" stop-color="${s.sun}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="sun" cx="${sunX}" cy="${s.sunY}" r="0.3">
      <stop offset="0" stop-color="${s.sun}" stop-opacity="0.6"/>
      <stop offset="0.35" stop-color="${s.sun}" stop-opacity="0.2"/>
      <stop offset="0.72" stop-color="${s.sun}" stop-opacity="0.05"/>
      <stop offset="1" stop-color="${s.sun}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${hz}" fill="url(#sky)"/>
  <rect width="${W}" height="${hz}" fill="url(#sunHalo)"/>
  <rect width="${W}" height="${hz}" fill="url(#sun)"/>`;
}

// Слой леса на горизонте: чем дальше, тем светлее и мягче (воздушная перспектива)
function treeLine(W, y, height, color, opacity, rnd, density) {
  // Мягкие округлые кроны вместо пилы: каждая купа — квадратичная кривая.
  const step = W / (density || 26);
  let x = -step;
  let d = `M ${n(x)} ${n(y + height)} L ${n(x)} ${n(y + height * 0.55)}`;
  while (x < W + step) {
    const h = height * (0.4 + rnd() * 0.7);
    const w = step * (0.65 + rnd() * 1.0);
    d += ` Q ${n(x + w * 0.5)} ${n(y + height - h)} ${n(x + w)} ${n(y + height - h * (0.28 + rnd() * 0.45))}`;
    x += w;
  }
  d += ` L ${n(x)} ${n(y + height)} Z`;
  return `<path d="${d}" fill="${color}" opacity="${opacity}"/>`;
}

// Вода: горизонтальные полосы разной длины + световая дорожка
function water(W, hz, H, rnd, tint, glow) {
  let out = `<rect x="0" y="${n(hz)}" width="${W}" height="${n(H - hz)}" fill="${tint}"/>`;
  out += `<ellipse cx="${n(W * 0.66)}" cy="${n(hz)}" rx="${n(W * 0.16)}" ry="${n((H - hz) * 0.9)}" fill="${glow}" opacity="0.3"/>`;
  const bands = 42;
  for (let i = 0; i < bands; i++) {
    const t = i / bands;
    const y = hz + (H - hz) * Math.pow(t, 1.55) + 2;
    const w = W * (0.05 + rnd() * 0.34) * (0.5 + t);
    const x = rnd() * (W - w);
    const h = 1 + t * 4;
    out += `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" fill="#FFFFFF" opacity="${(0.05 + rnd() * 0.13 * (1 - t * 0.5)).toFixed(3)}" rx="${n(h / 2)}"/>`;
  }
  return out;
}

// Ступенчатый террасный объём с тёплыми окнами
function terracedBlock(x, baseY, w, floors, floorH, rnd, opts) {
  const o = opts || {};
  const body = o.body || '#20282A';
  const glass = o.glass || '#9FB4BC';
  const warm = o.warm || '#F0C489';
  const setback = o.setback == null ? 0.16 : o.setback;
  let out = '';
  let curW = w;
  let curX = x;
  let y = baseY;
  const tiers = o.tiers || 3;
  const perTier = Math.max(1, Math.round(floors / tiers));

  for (let t = 0; t < tiers; t++) {
    const h = perTier * floorH;
    y -= h;
    out += `<rect x="${n(curX)}" y="${n(y)}" width="${n(curW)}" height="${n(h)}" fill="${body}"/>`;
    // теневая грань
    out += `<rect x="${n(curX)}" y="${n(y)}" width="${n(curW * 0.16)}" height="${n(h)}" fill="#000" opacity="0.22"/>`;
    // ленты остекления
    for (let f = 0; f < perTier; f++) {
      const fy = y + f * floorH + floorH * 0.24;
      out += `<rect x="${n(curX + curW * 0.07)}" y="${n(fy)}" width="${n(curW * 0.86)}" height="${n(floorH * 0.4)}" fill="${glass}" opacity="0.5"/>`;
      // отдельные тёплые окна
      const cells = Math.max(2, Math.round(curW / 34));
      for (let c = 0; c < cells; c++) {
        if (rnd() > 0.72) {
          const cw = (curW * 0.86) / cells;
          out += `<rect x="${n(curW * 0.07 + curX + c * cw + cw * 0.12)}" y="${n(fy)}" width="${n(cw * 0.76)}" height="${n(floorH * 0.4)}" fill="${warm}" opacity="${(0.4 + rnd() * 0.45).toFixed(2)}"/>`;
        }
      }
    }
    // бронзовая кромка перекрытия-террасы
    out += `<rect x="${n(curX)}" y="${n(y - floorH * 0.09)}" width="${n(curW)}" height="${n(floorH * 0.09)}" fill="#C79A5E" opacity="0.72"/>`;
    curW *= 1 - setback;
    curX += w * setback * 0.5;
  }
  return out;
}

function grain(W, H, rnd, amount) {
  let out = '<g opacity="' + (amount || 0.05) + '">';
  for (let i = 0; i < 190; i++) {
    out += `<circle cx="${n(rnd() * W)}" cy="${n(rnd() * H)}" r="${n(0.6 + rnd() * 1.5)}" fill="#FFFFFF" opacity="${(rnd() * 0.5).toFixed(2)}"/>`;
  }
  return out + '</g>';
}

/* ------------------------------------------------------------------ */
/* Угловой чип с ID слота — не мешает тексту поверх кадра              */
/* ------------------------------------------------------------------ */

function chip(W, H, id, dark) {
  const s = Math.max(W, H) / 100;
  const fw = s * (1.15 * String(id).length + 3.2);
  const fh = s * 3.4;
  const x = W - fw - s * 2.2;
  const y = H - fh - s * 2.2;
  const bg = dark ? 'rgba(12,16,14,0.5)' : 'rgba(250,248,244,0.72)';
  const fg = dark ? '#EDEAE3' : '#2A302C';
  return `<g font-family="ui-monospace, 'Cascadia Mono', Consolas, monospace" opacity="0.9">
    <rect x="${n(x)}" y="${n(y)}" width="${n(fw)}" height="${n(fh)}" rx="${n(fh / 2)}" fill="${bg}"/>
    <text x="${n(x + fw / 2)}" y="${n(y + fh * 0.68)}" text-anchor="middle" fill="${fg}" font-size="${n(s * 1.7)}" letter-spacing="${n(s * 0.1)}">${esc(id)}</text>
  </g>`;
}

function svg(W, H, body, aria) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(aria)}" preserveAspectRatio="xMidYMid slice">${body}</svg>`;
}

// Если для слота уже есть реальный материал (<ID>.jpg), плейсхолдер
// не перезаписываем и не создаём — иначе он начнёт конкурировать с фото.
let skipped = [];
const write = (id, content) => {
  if (existsSync(resolve(OUT, `${id}.jpg`))) { skipped.push(id); return; }
  writeFileSync(resolve(OUT, `${id}.svg`), content, 'utf8');
};

/* ------------------------------------------------------------------ */
/* Сцены                                                               */
/* ------------------------------------------------------------------ */

// Панорама: вода на переднем плане, комплекс в среднем, лес на дальнем
function scenePanorama(W, H, rnd, timeKey) {
  const hz = H * 0.52;
  let out = sky(W, H, timeKey, hz);
  // дальний лес
  out += treeLine(W, hz - H * 0.1, H * 0.1, '#5A6A63', 0.35, rnd, 60);
  out += treeLine(W, hz - H * 0.085, H * 0.085, '#41504A', 0.55, rnd, 44);
  // застройка
  const base = hz;
  const groups = [
    [0.06, 0.15, 16],
    [0.24, 0.13, 14],
    [0.42, 0.14, 12],
    [0.62, 0.12, 9],
  ];
  groups.forEach(function (g, i) {
    out += terracedBlock(W * g[0], base, W * g[1], g[2], H * 0.026, rnd, {
      body: i % 2 ? '#1C2426' : '#222B2C',
      tiers: 3,
    });
  });
  // ближний лес справа
  out += treeLine(W, hz - H * 0.13, H * 0.13, '#2C3A31', 0.9, rnd, 28);
  // вода
  out += water(W, hz, H, rnd, '#1B262B', '#E9C08A');
  // отражения корпусов
  groups.forEach(function (g) {
    out += `<rect x="${n(W * g[0])}" y="${n(hz)}" width="${n(W * g[1])}" height="${n(H * 0.12)}" fill="#0E1518" opacity="0.35"/>`;
  });
  out += grain(W, H, rnd, 0.045);
  // мягкая виньетка
  out += `<rect width="${W}" height="${H}" fill="url(#vig)"/>
  <defs><radialGradient id="vig" cx="0.5" cy="0.45" r="0.78">
    <stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.4"/>
  </radialGradient></defs>`;
  return out;
}

// Архитектурный ракурс крупным планом
function sceneArch(W, H, rnd, timeKey, tight) {
  const hz = H * (tight ? 0.86 : 0.8);
  let out = sky(W, H, timeKey, hz);
  out += treeLine(W, hz - H * 0.09, H * 0.09, '#46554C', 0.5, rnd, 40);
  const scale = tight ? 1.5 : 1;
  out += terracedBlock(W * 0.08, hz, W * 0.36 * scale, 14, H * 0.05, rnd, { body: '#1E2628', tiers: 4 });
  out += terracedBlock(W * 0.5, hz, W * 0.3 * scale, 11, H * 0.05, rnd, { body: '#242D2E', tiers: 3 });
  // земля
  out += `<rect y="${n(hz)}" width="${W}" height="${n(H - hz)}" fill="#2A322C"/>`;
  out += `<rect y="${n(hz)}" width="${W}" height="${n(H * 0.004)}" fill="#C79A5E" opacity="0.5"/>`;
  out += grain(W, H, rnd, 0.05);
  return out;
}

// Макро-фактура: кора / камень / хвоя
function sceneTexture(W, H, rnd, base, streak) {
  let out = `<rect width="${W}" height="${H}" fill="${base}"/>`;
  for (let i = 0; i < 150; i++) {
    const x = rnd() * W;
    const w = 2 + rnd() * 16;
    out += `<rect x="${n(x)}" y="0" width="${n(w)}" height="${H}" fill="${streak}" opacity="${(0.04 + rnd() * 0.14).toFixed(3)}"/>`;
  }
  for (let i = 0; i < 26; i++) {
    const y = rnd() * H;
    out += `<rect x="0" y="${n(y)}" width="${W}" height="${n(1 + rnd() * 5)}" fill="#000" opacity="${(0.04 + rnd() * 0.1).toFixed(3)}"/>`;
  }
  out += `<rect width="${W}" height="${H}" fill="url(#tv)"/>
  <defs><radialGradient id="tv" cx="0.42" cy="0.38" r="0.8">
    <stop offset="0.3" stop-color="#FFF" stop-opacity="0.1"/><stop offset="1" stop-color="#000" stop-opacity="0.42"/>
  </radialGradient></defs>`;
  return out;
}

// Двор: дорожки, кроны, тени
function sceneYard(W, H, rnd, timeKey) {
  const hz = H * 0.34;
  let out = sky(W, H, timeKey, hz);
  out += treeLine(W, hz - H * 0.14, H * 0.14, '#3A4A3C', 0.75, rnd, 30);
  out += `<rect y="${n(hz)}" width="${W}" height="${n(H - hz)}" fill="#4C5B43"/>`;
  // газон с переходом
  out += `<defs><linearGradient id="lawn" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#43512F" stop-opacity="0.9"/><stop offset="1" stop-color="#5E6E4C" stop-opacity="0.9"/>
  </linearGradient></defs>
  <rect y="${n(hz)}" width="${W}" height="${n(H - hz)}" fill="url(#lawn)"/>`;
  // дорожка
  out += `<path d="M ${n(-W * 0.1)} ${n(H * 1.02)} C ${n(W * 0.3)} ${n(H * 0.72)}, ${n(W * 0.55)} ${n(H * 0.92)}, ${n(W * 1.1)} ${n(H * 0.6)}" fill="none" stroke="#D9D2C4" stroke-width="${n(H * 0.085)}" opacity="0.85" stroke-linecap="round"/>`;
  out += `<path d="M ${n(-W * 0.1)} ${n(H * 1.02)} C ${n(W * 0.3)} ${n(H * 0.72)}, ${n(W * 0.55)} ${n(H * 0.92)}, ${n(W * 1.1)} ${n(H * 0.6)}" fill="none" stroke="#F2ECE0" stroke-width="${n(H * 0.05)}" opacity="0.7" stroke-linecap="round"/>`;
  // кроны
  for (let i = 0; i < 13; i++) {
    const cx = rnd() * W;
    const cy = hz + rnd() * (H - hz) * 0.75;
    const r = H * (0.05 + rnd() * 0.12);
    out += `<ellipse cx="${n(cx)}" cy="${n(cy + r * 0.55)}" rx="${n(r * 1.1)}" ry="${n(r * 0.22)}" fill="#1F2A1C" opacity="0.28"/>`;
    out += `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" fill="${GREENS[i % GREENS.length]}" opacity="0.9"/>`;
    out += `<circle cx="${n(cx - r * 0.28)}" cy="${n(cy - r * 0.28)}" r="${n(r * 0.62)}" fill="#5C7048" opacity="0.5"/>`;
  }
  out += grain(W, H, rnd, 0.05);
  return out;
}

// Интерьер: перспектива комнаты и панорамное окно с видом
function sceneInterior(W, H, rnd, viewKey) {
  let out = `<defs><linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#E7E2D8"/><stop offset="1" stop-color="#CFC8BB"/>
  </linearGradient></defs><rect width="${W}" height="${H}" fill="url(#wall)"/>`;
  const l = W * 0.13,
    r = W * 0.87,
    t = H * 0.1,
    b = H * 0.88;
  // пол и потолок в перспективе
  out += `<path d="M 0 ${H} L ${n(l)} ${n(b)} L ${n(r)} ${n(b)} L ${W} ${H} Z" fill="#B9A88E" opacity="0.85"/>`;
  out += `<path d="M 0 0 L ${n(l)} ${n(t)} L ${n(r)} ${n(t)} L ${W} 0 Z" fill="#F1ECE2"/>`;
  out += `<path d="M 0 0 L ${n(l)} ${n(t)} L ${n(l)} ${n(b)} L 0 ${H} Z" fill="#D8D1C4"/>`;
  out += `<path d="M ${W} 0 L ${n(r)} ${n(t)} L ${n(r)} ${n(b)} L ${W} ${H} Z" fill="#C8C1B4"/>`;
  // окно с видом
  const wx = l + (r - l) * 0.08,
    wy = t + (b - t) * 0.1,
    ww = (r - l) * 0.84,
    wh = (b - t) * 0.56;
  const v = SKIES[viewKey];
  out += `<defs><linearGradient id="viewg" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${v.top}"/><stop offset="0.6" stop-color="${v.mid}"/><stop offset="1" stop-color="${v.low}"/>
  </linearGradient></defs>`;
  out += `<rect x="${n(wx)}" y="${n(wy)}" width="${n(ww)}" height="${n(wh)}" fill="url(#viewg)"/>`;
  out += `<rect x="${n(wx)}" y="${n(wy + wh * 0.58)}" width="${n(ww)}" height="${n(wh * 0.42)}" fill="#3C4C42" opacity="0.8"/>`;
  out += `<rect x="${n(wx)}" y="${n(wy + wh * 0.74)}" width="${n(ww)}" height="${n(wh * 0.26)}" fill="#22333A" opacity="0.85"/>`;
  // импосты
  out += `<rect x="${n(wx + ww * 0.5 - 3)}" y="${n(wy)}" width="6" height="${n(wh)}" fill="#2A302C" opacity="0.75"/>`;
  out += `<rect x="${n(wx)}" y="${n(wy)}" width="${n(ww)}" height="${n(wh)}" fill="none" stroke="#2A302C" stroke-width="7" opacity="0.8"/>`;
  // световое пятно на полу
  out += `<path d="M ${n(wx + ww * 0.1)} ${n(b)} L ${n(wx + ww * 0.9)} ${n(b)} L ${n(wx + ww * 1.05)} ${H} L ${n(wx - ww * 0.05)} ${H} Z" fill="#FFF3DC" opacity="0.4"/>`;
  // мебель
  out += `<rect x="${n(l + (r - l) * 0.1)}" y="${n(b - (b - t) * 0.22)}" width="${n((r - l) * 0.38)}" height="${n((b - t) * 0.15)}" rx="10" fill="#4A4438" opacity="0.85"/>`;
  out += `<rect x="${n(l + (r - l) * 0.62)}" y="${n(b - (b - t) * 0.26)}" width="${n((r - l) * 0.22)}" height="${n((b - t) * 0.19)}" rx="8" fill="#8A6A3E" opacity="0.6"/>`;
  out += grain(W, H, rnd, 0.04);
  return out;
}

// Земельный участок: трава, кромка леса, пунктирная граница
function sceneLand(W, H, rnd, aerial) {
  const hz = aerial ? H * 0.16 : H * 0.44;
  let out = sky(W, H, aerial ? 'day' : 'golden', hz);
  out += treeLine(W, hz - H * 0.1, H * 0.1, '#5C6C60', 0.4, rnd, 52);
  out += treeLine(W, hz - H * 0.075, H * 0.075, '#3B4A3D', 0.85, rnd, 34);
  out += `<defs><linearGradient id="field" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#7C8A5C"/><stop offset="1" stop-color="#9BA671"/>
  </linearGradient></defs>
  <rect y="${n(hz)}" width="${W}" height="${n(H - hz)}" fill="url(#field)"/>`;
  // травяная фактура
  for (let i = 0; i < 260; i++) {
    const y = hz + rnd() * (H - hz);
    const t = (y - hz) / (H - hz);
    out += `<rect x="${n(rnd() * W)}" y="${n(y)}" width="${n(2 + rnd() * 12 * (0.4 + t))}" height="${n(1 + t * 2.5)}" fill="#5E6B42" opacity="${(0.1 + rnd() * 0.28).toFixed(2)}" rx="1"/>`;
  }
  // граница участка
  if (aerial) {
    out += `<polygon points="${n(W * 0.16)},${n(H * 0.42)} ${n(W * 0.8)},${n(H * 0.35)} ${n(W * 0.89)},${n(H * 0.8)} ${n(W * 0.22)},${n(H * 0.9)}"
      fill="#C79A5E" fill-opacity="0.14" stroke="#C79A5E" stroke-width="${n(H * 0.009)}" stroke-dasharray="${n(H * 0.032)} ${n(H * 0.018)}" stroke-linejoin="round"/>`;
    ['0.16,0.42', '0.8,0.35', '0.89,0.8', '0.22,0.9'].forEach(function (p) {
      const c = p.split(',');
      out += `<circle cx="${n(W * +c[0])}" cy="${n(H * +c[1])}" r="${n(H * 0.012)}" fill="#C79A5E"/>`;
    });
  } else {
    out += `<path d="M ${n(W * 0.03)} ${n(H * 0.95)} L ${n(W * 0.4)} ${n(H * 0.62)} L ${n(W * 0.97)} ${n(H * 0.7)}" fill="none" stroke="#C79A5E" stroke-width="${n(H * 0.01)}" stroke-dasharray="${n(H * 0.03)} ${n(H * 0.018)}" opacity="0.95" stroke-linecap="round"/>`;
    // колышки границы
    [0.03, 0.4, 0.97].forEach(function (x, i) {
      const y = [0.95, 0.62, 0.7][i];
      out += `<rect x="${n(W * x - 2)}" y="${n(H * y - H * 0.06)}" width="4" height="${n(H * 0.06)}" fill="#C79A5E"/>`;
    });
  }
  out += grain(W, H, rnd, 0.05);
  return out;
}

// 3D-визуализация типового проекта застройки
function sceneHouse(W, H, rnd, variant) {
  const hz = H * 0.72;
  let out = sky(W, H, variant % 2 ? 'golden' : 'day', hz);
  out += treeLine(W, hz - H * 0.16, H * 0.16, '#4B5A4C', 0.45, rnd, 40);
  out += treeLine(W, hz - H * 0.12, H * 0.12, '#33422F', 0.8, rnd, 26);
  out += `<defs><linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#7F8E5F"/><stop offset="1" stop-color="#9EAA76"/>
  </linearGradient></defs>
  <rect y="${n(hz)}" width="${W}" height="${n(H - hz)}" fill="url(#ground)"/>`;

  const cx = W * 0.5;
  const bw = W * 0.5;
  const shapes = [
    [[-0.5, 0.56, 0.3], [0.02, 0.48, 0.44]],
    [[-0.52, 0.5, 0.42], [-0.02, 0.54, 0.24], [0.32, 0.2, 0.32]],
    [[-0.5, 0.32, 0.5], [-0.16, 0.32, 0.42], [0.18, 0.32, 0.36]],
    [[-0.5, 1.0, 0.46]],
  ][variant % 4];

  shapes.forEach(function (s, i) {
    const x = cx + bw * s[0];
    const w = bw * s[1];
    const h = H * s[2];
    const y = hz - h;
    out += `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" fill="${i % 2 ? '#242D2C' : '#1E2626'}"/>`;
    out += `<rect x="${n(x)}" y="${n(y)}" width="${n(w * 0.26)}" height="${n(h)}" fill="#000" opacity="0.2"/>`;
    // остекление
    const rows = Math.max(1, Math.round(h / (H * 0.14)));
    for (let f = 0; f < rows; f++) {
      const fy = y + h * (0.14 + f * (0.74 / rows));
      out += `<rect x="${n(x + w * 0.08)}" y="${n(fy)}" width="${n(w * 0.84)}" height="${n(H * 0.05)}" fill="#B8C7C2" opacity="0.55"/>`;
      if (rnd() > 0.45) {
        out += `<rect x="${n(x + w * 0.08)}" y="${n(fy)}" width="${n(w * 0.34)}" height="${n(H * 0.05)}" fill="#F2C58C" opacity="0.7"/>`;
      }
    }
    // кровля-терраса
    out += `<rect x="${n(x - w * 0.03)}" y="${n(y - H * 0.012)}" width="${n(w * 1.06)}" height="${n(H * 0.012)}" fill="#C79A5E" opacity="0.85"/>`;
  });

  // тень и передний план
  out += `<ellipse cx="${n(cx)}" cy="${n(hz + H * 0.03)}" rx="${n(bw * 0.72)}" ry="${n(H * 0.028)}" fill="#2A331F" opacity="0.32"/>`;
  for (let i = 0; i < 90; i++) {
    const y = hz + rnd() * (H - hz);
    const t = (y - hz) / (H - hz);
    out += `<rect x="${n(rnd() * W)}" y="${n(y)}" width="${n(3 + rnd() * 14 * (0.4 + t))}" height="${n(1 + t * 3)}" fill="#606D40" opacity="${(0.12 + rnd() * 0.25).toFixed(2)}" rx="1"/>`;
  }
  out += grain(W, H, rnd, 0.045);
  return out;
}

// Карта
function sceneMap(W, H, rnd) {
  let out = `<rect width="${W}" height="${H}" fill="#EFEBE2"/>`;
  out += `<rect width="${W}" height="${n(H * 0.36)}" fill="#CBD6BC" opacity="0.8"/>`;
  out += `<path d="M ${n(-W * 0.05)} ${n(H * 0.74)} C ${n(W * 0.25)} ${n(H * 0.56)}, ${n(W * 0.58)} ${n(H * 0.94)}, ${n(W * 1.05)} ${n(H * 0.6)}" fill="none" stroke="#A6C0CC" stroke-width="${n(H * 0.15)}" opacity="0.95"/>`;
  out += `<g stroke="#C9C2B4" stroke-width="${n(H * 0.011)}" opacity="0.9">`;
  for (let i = 1; i < 7; i++) out += `<line x1="0" y1="${n((H * i) / 7)}" x2="${W}" y2="${n((H * i) / 7 - H * 0.04)}"/>`;
  for (let i = 1; i < 9; i++) out += `<line x1="${n((W * i) / 9)}" y1="0" x2="${n((W * i) / 9 + W * 0.02)}" y2="${H}"/>`;
  out += `</g>`;
  out += `<g stroke="#B9B1A1" stroke-width="${n(H * 0.02)}" opacity="0.8" fill="none">
    <path d="M 0 ${n(H * 0.42)} L ${W} ${n(H * 0.38)}"/>
    <path d="M ${n(W * 0.3)} 0 L ${n(W * 0.34)} ${H}"/>
  </g>`;
  const mx = W * 0.42,
    my = H * 0.48;
  out += `<circle cx="${n(mx)}" cy="${n(my)}" r="${n(H * 0.1)}" fill="#C79A5E" opacity="0.24"/>`;
  out += `<path d="M ${n(mx)} ${n(my - H * 0.085)} a ${n(H * 0.04)} ${n(H * 0.04)} 0 1 1 -0.1 0 z" fill="#1E2626"/>`;
  out += `<circle cx="${n(mx)}" cy="${n(my - H * 0.056)}" r="${n(H * 0.015)}" fill="#F5F1E8"/>`;
  return out;
}

// Генплан / схема
function sceneScheme(W, H, rnd, greenCorridors) {
  let out = `<rect width="${W}" height="${H}" fill="#F5F2EA"/>`;
  out += `<rect width="${W}" height="${n(H * 0.22)}" fill="#CBD6BC" opacity="0.85"/>`;
  out += `<path d="M ${n(-W * 0.05)} ${n(H * 0.86)} C ${n(W * 0.3)} ${n(H * 0.72)}, ${n(W * 0.6)} ${n(H * 0.98)}, ${n(W * 1.05)} ${n(H * 0.74)}" fill="none" stroke="#A6C0CC" stroke-width="${n(H * 0.13)}" opacity="0.9"/>`;
  const blocks = [
    [0.09, 0.32, 0.19, 0.13],
    [0.32, 0.28, 0.15, 0.15],
    [0.51, 0.34, 0.17, 0.12],
    [0.15, 0.53, 0.13, 0.12],
    [0.36, 0.55, 0.2, 0.1],
    [0.63, 0.5, 0.15, 0.14],
  ];
  blocks.forEach(function (b, i) {
    out += `<rect x="${n(W * b[0])}" y="${n(H * b[1])}" width="${n(W * b[2])}" height="${n(H * b[3])}" rx="${n(H * 0.008)}" fill="#25302E" opacity="0.9"/>`;
    out += `<rect x="${n(W * b[0])}" y="${n(H * b[1])}" width="${n(W * b[2])}" height="${n(H * b[3])}" rx="${n(H * 0.008)}" fill="none" stroke="#C79A5E" stroke-width="${n(H * 0.004)}" opacity="0.75"/>`;
  });
  // зона участков — бронзовый контур
  out += `<rect x="${n(W * 0.78)}" y="${n(H * 0.3)}" width="${n(W * 0.18)}" height="${n(H * 0.42)}" rx="${n(H * 0.01)}" fill="#C79A5E" fill-opacity="0.16" stroke="#C79A5E" stroke-width="${n(H * 0.006)}" stroke-dasharray="${n(H * 0.022)} ${n(H * 0.014)}"/>`;
  for (let i = 0; i < 8; i++) {
    out += `<rect x="${n(W * 0.795)}" y="${n(H * (0.32 + i * 0.048))}" width="${n(W * 0.15)}" height="${n(H * 0.035)}" fill="#8A6A3E" opacity="0.28" rx="2"/>`;
  }
  if (greenCorridors !== false) {
    out += `<g stroke="#6E8A55" stroke-width="${n(H * 0.009)}" stroke-dasharray="${n(H * 0.022)} ${n(H * 0.016)}" opacity="0.9" fill="none" stroke-linecap="round">
      <path d="M ${n(W * 0.06)} ${n(H * 0.2)} L ${n(W * 0.28)} ${n(H * 0.5)} L ${n(W * 0.34)} ${n(H * 0.82)}"/>
      <path d="M ${n(W * 0.48)} ${n(H * 0.18)} L ${n(W * 0.5)} ${n(H * 0.52)} L ${n(W * 0.58)} ${n(H * 0.84)}"/>
      <path d="M ${n(W * 0.72)} ${n(H * 0.22)} L ${n(W * 0.7)} ${n(H * 0.56)} L ${n(W * 0.74)} ${n(H * 0.82)}"/>
    </g>`;
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Планировки квартир                                                  */
/* ------------------------------------------------------------------ */

function planSvg(kind, label) {
  const [W, H] = AR['4:5'];
  const m = 100;
  const x0 = m,
    y0 = m + 40,
    x1 = W - m,
    y1 = H - m - 60;
  const w = x1 - x0,
    h = y1 - y0;

  const layouts = {
    STUDIO: [
      [0, 0, 1, 0.6, 'Жилая зона'],
      [0, 0.6, 0.58, 0.4, 'Кухня'],
      [0.58, 0.6, 0.42, 0.22, 'С/у'],
      [0.58, 0.82, 0.42, 0.18, 'Прихожая'],
    ],
    1: [
      [0, 0, 0.62, 0.55, 'Комната'],
      [0.62, 0, 0.38, 0.55, 'Кухня'],
      [0, 0.55, 0.4, 0.45, 'Прихожая'],
      [0.4, 0.55, 0.3, 0.45, 'С/у'],
      [0.7, 0.55, 0.3, 0.45, 'Балкон'],
    ],
    2: [
      [0, 0, 0.52, 0.5, 'Гостиная'],
      [0.52, 0, 0.48, 0.5, 'Спальня'],
      [0, 0.5, 0.44, 0.5, 'Кухня'],
      [0.44, 0.5, 0.26, 0.28, 'С/у'],
      [0.44, 0.78, 0.26, 0.22, 'Гардероб'],
      [0.7, 0.5, 0.3, 0.5, 'Прихожая'],
    ],
    3: [
      [0, 0, 0.44, 0.44, 'Гостиная'],
      [0.44, 0, 0.28, 0.44, 'Спальня 1'],
      [0.72, 0, 0.28, 0.44, 'Спальня 2'],
      [0, 0.44, 0.4, 0.32, 'Кухня'],
      [0.4, 0.44, 0.24, 0.32, 'С/у'],
      [0.64, 0.44, 0.36, 0.32, 'Прихожая'],
      [0, 0.76, 1, 0.24, 'Терраса'],
    ],
    '4P': [
      [0, 0, 0.4, 0.4, 'Гостиная'],
      [0.4, 0, 0.3, 0.4, 'Спальня 1'],
      [0.7, 0, 0.3, 0.4, 'Спальня 2'],
      [0, 0.4, 0.3, 0.3, 'Спальня 3'],
      [0.3, 0.4, 0.3, 0.3, 'Кабинет'],
      [0.6, 0.4, 0.2, 0.3, 'С/у'],
      [0.8, 0.4, 0.2, 0.3, 'С/у 2'],
      [0, 0.7, 0.5, 0.3, 'Кухня-столовая'],
      [0.5, 0.7, 0.5, 0.3, 'Терраса'],
    ],
  };
  const rooms = layouts[kind] || layouts['2'];

  let out = `<rect width="${W}" height="${H}" fill="#FBF8F2"/>`;
  out += `<text x="${m}" y="${m - 4}" font-family="'Segoe UI', system-ui, sans-serif" font-size="34" fill="#2A302C">${esc(label)}</text>`;
  out += `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="#F2EDE3"/>`;

  for (const [rx, ry, rw, rh, name] of rooms) {
    const X = x0 + w * rx,
      Y = y0 + h * ry,
      RW = w * rw,
      RH = h * rh;
    const outer = name === 'Терраса' || name === 'Балкон';
    out += `<rect x="${n(X)}" y="${n(Y)}" width="${n(RW)}" height="${n(RH)}" fill="${outer ? '#E5EBDC' : '#FFFFFF'}" stroke="#2A302C" stroke-width="4"/>`;
    if (outer) {
      for (let i = 0; i < 8; i++) {
        out += `<line x1="${n(X + (RW / 8) * i)}" y1="${n(Y)}" x2="${n(X + (RW / 8) * i + RH * 0.4)}" y2="${n(Y + RH)}" stroke="#A9B79A" stroke-width="2" opacity="0.6"/>`;
      }
    }
    out += `<text x="${n(X + RW / 2)}" y="${n(Y + RH / 2 + 9)}" text-anchor="middle" font-family="'Segoe UI', system-ui, sans-serif" font-size="27" fill="#3A403B">${esc(name)}</text>`;
  }
  out += `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="none" stroke="#2A302C" stroke-width="9"/>`;
  // размерная линия
  out += `<g stroke="#A8814F" stroke-width="3">
    <line x1="${x0}" y1="${y1 + 40}" x2="${x1}" y2="${y1 + 40}"/>
    <line x1="${x0}" y1="${y1 + 28}" x2="${x0}" y2="${y1 + 52}"/>
    <line x1="${x1}" y1="${y1 + 28}" x2="${x1}" y2="${y1 + 52}"/>
  </g>`;
  out += `<g transform="translate(${x1 - 54} ${y0 + 54})"><circle r="30" fill="none" stroke="#9AA096" stroke-width="3"/><path d="M 0 -23 L 8 7 L 0 1 L -8 7 Z" fill="#2A302C"/><text y="-34" text-anchor="middle" font-family="'Segoe UI', system-ui, sans-serif" font-size="20" fill="#9AA096">С</text></g>`;
  return out;
}

/* ------------------------------------------------------------------ */
/* Схемы границ участков и планы этажей                                */
/* ------------------------------------------------------------------ */

function plotSchemeSvg(num, areaSqm) {
  const [W, H] = AR['1:1'];
  const r = mulberry32(7000 + num);
  const m = 190;
  const j = () => (r() - 0.5) * 84;
  const p = [
    [m + j(), m + j()],
    [W - m + j(), m + j()],
    [W - m + j(), H - m + j()],
    [m + j(), H - m + j()],
  ];
  const pts = p.map(([x, y]) => `${n(x)},${n(y)}`).join(' ');

  let out = `<rect width="${W}" height="${H}" fill="#FBF8F2"/>`;
  out += `<g stroke="#E0D9CB" stroke-width="1.5">`;
  for (let i = 1; i < 12; i++) {
    out += `<line x1="0" y1="${n((H * i) / 12)}" x2="${W}" y2="${n((H * i) / 12)}"/><line x1="${n((W * i) / 12)}" y1="0" x2="${n((W * i) / 12)}" y2="${H}"/>`;
  }
  out += `</g>`;
  out += `<polygon points="${pts}" fill="#E5EBDC" stroke="#A8814F" stroke-width="9" stroke-linejoin="round"/>`;
  const labels = ['сев.', 'вост.', 'юж.', 'зап.'];
  for (let i = 0; i < 4; i++) {
    const [ax, ay] = p[i];
    const [bx, by] = p[(i + 1) % 4];
    const len = Math.hypot(bx - ax, by - ay) / 12;
    const mx = (ax + bx) / 2,
      my = (ay + by) / 2;
    out += `<circle cx="${n(ax)}" cy="${n(ay)}" r="11" fill="#A8814F"/>`;
    out += `<text x="${n(mx)}" y="${n(my + (i === 0 ? -20 : i === 2 ? 32 : 7))}" text-anchor="middle" font-family="ui-monospace, Consolas, monospace" font-size="29" fill="#2A302C">${len.toFixed(1).replace('.', ',')} м</text>`;
    out += `<text x="${n(mx)}" y="${n(my + (i === 0 ? -52 : i === 2 ? 64 : 40))}" text-anchor="middle" font-family="'Segoe UI', system-ui, sans-serif" font-size="21" fill="#8A9088">${labels[i]}</text>`;
  }
  out += `<text x="${W / 2}" y="${H / 2 - 6}" text-anchor="middle" font-family="'Segoe UI', system-ui, sans-serif" font-size="54" fill="#2A302C">№${num}</text>`;
  out += `<text x="${W / 2}" y="${H / 2 + 46}" text-anchor="middle" font-family="'Segoe UI', system-ui, sans-serif" font-size="32" fill="#5A615A">${(areaSqm / 100).toFixed(2).replace('.', ',')} сотки · ${areaSqm} м²</text>`;
  out += `<g transform="translate(${W - 150} 150)"><circle r="48" fill="none" stroke="#9AA096" stroke-width="4"/><path d="M 0 -36 L 13 11 L 0 2 L -13 11 Z" fill="#2A302C"/><text y="-56" text-anchor="middle" font-family="'Segoe UI', system-ui, sans-serif" font-size="26" fill="#9AA096">С</text></g>`;
  return out;
}

function floorSvg(building) {
  const [W, H] = AR['16:10'];
  let out = `<rect width="${W}" height="${H}" fill="#FBF8F2"/>`;
  const m = 96;
  out += `<text x="${W / 2}" y="${m - 30}" text-anchor="middle" font-family="'Segoe UI', system-ui, sans-serif" font-size="32" fill="#2A302C">Корпус ${building} · типовой этаж</text>`;
  out += `<rect x="${m}" y="${m}" width="${W - m * 2}" height="${H - m * 2}" fill="#F2EDE3" stroke="#2A302C" stroke-width="8" rx="6"/>`;
  const cols = 7,
    rows = 2;
  const cw = (W - m * 2) / cols,
    ch = (H - m * 2) / rows;
  let idx = 0;
  for (let ry = 0; ry < rows; ry++) {
    for (let cx = 0; cx < cols; cx++) {
      idx++;
      const x = m + cx * cw,
        y = m + ry * ch;
      const active = idx === 4;
      out += `<rect x="${n(x + 5)}" y="${n(y + 5)}" width="${n(cw - 10)}" height="${n(ch - 10)}" rx="4" fill="${active ? '#DDE5CF' : '#FFFFFF'}" stroke="${active ? '#6E7A55' : '#2A302C'}" stroke-width="${active ? 7 : 4}"/>`;
      out += `<text x="${n(x + cw / 2)}" y="${n(y + ch / 2 + 10)}" text-anchor="middle" font-family="'Segoe UI', system-ui, sans-serif" font-size="28" fill="#3A403B">${idx}</text>`;
    }
  }
  const kx = m + cw * 3,
    ky = m + ch * 0.62;
  out += `<rect x="${n(kx)}" y="${n(ky)}" width="${n(cw)}" height="${n(ch * 0.76)}" rx="4" fill="#2A302C"/>`;
  out += `<text x="${n(kx + cw / 2)}" y="${n(ky + ch * 0.44)}" text-anchor="middle" font-family="'Segoe UI', system-ui, sans-serif" font-size="25" fill="#F2EDE3">Лифты</text>`;
  return out;
}

/* ------------------------------------------------------------------ */
/* Сборка                                                              */
/* ------------------------------------------------------------------ */

let count = 0;

function make(id, ar, sceneFn, aria, dark, seedExtra) {
  const [W, H] = AR[ar];
  const seed = String(id)
    .split('')
    .reduce((a, c) => a + c.charCodeAt(0), 11) + (seedExtra || 0);
  const rnd = mulberry32(seed);
  const body = sceneFn(W, H, rnd);
  write(id, svg(W, H, body + chip(W, H, id, dark), aria));
  count++;
}

/* --- Интро и Hero --- */
make('INTRO-01', '16:9', (W, H, r) => scenePanorama(W, H, r, 'night'), 'Вода Камы в сумерках', true);
make('INTRO-02', '16:9', (W, H, r) => scenePanorama(W, H, r, 'dusk'), 'Кромка берега в синий час', true);
make('INTRO-03', '16:9', (W, H, r) => scenePanorama(W, H, r, 'golden'), 'Переход в панораму комплекса', true);
make('HERO-01F', '21:9', (W, H, r) => scenePanorama(W, H, r, 'golden'), 'Панорама: река Кама, комплекс и Закамский Бор', true);
make('HERO-01M', '4:5', (W, H, r) => scenePanorama(W, H, r, 'golden'), 'Панорама комплекса, мобильный кроп', true);

/* --- Манифест и фактуры --- */
make('MANIFEST-01', '3:4', (W, H, r) => sceneTexture(W, H, r, '#2E3A2E', '#5E7048'), 'Макро-фактура: кора сосны', true);

/* --- Генплан и схемы --- */
make('MASTERPLAN-01', '16:10', (W, H, r) => sceneScheme(W, H, r), 'Генеральный план территории', false);
make('MASTERPLAN-02', '16:9', (W, H, r) => sceneArch(W, H, r, 'day'), 'Аксонометрия комплекса', true);
make('MASTERPLAN-03', '16:10', (W, H, r) => sceneScheme(W, H, r), 'Схема зелёных коридоров', false);

/* --- Локация --- */
make('LOCATION-01', '16:9', (W, H, r) => sceneLand(W, H, r, true), 'Аэросъёмка: река, участок, лес', false);
make('LOCATION-02', '3:2', (W, H, r) => scenePanorama(W, H, r, 'dawn'), 'Набережная и выход к воде', true);
make('LOCATION-03', '4:5', (W, H, r) => sceneTexture(W, H, r, '#26331F', '#4F6B3A'), 'Закамский Бор', true);

/* --- Карты --- */
['MAP-01F', 'MAP-02', 'MAP-03', 'MAP-04'].forEach((id, i) => {
  const ar = ['16:9', '4:3', '16:9', '16:9'][i];
  const aria = ['Карта расположения комплекса', 'Схема проезда к офису продаж', 'Карта окружения проекта', 'Карта офиса продаж'][i];
  make(id, ar, sceneMap, aria, false);
});

/* --- Архитектура --- */
const archCaps = [
  ['ARCH-01', '3:2', 'golden', false, 'Фасады со стороны реки'],
  ['ARCH-02', '4:5', 'day', true, 'Ступенчатые террасы верхних уровней'],
  ['ARCH-03', '3:2', null, null, 'Известняк в отделке цоколя'],
  ['ARCH-04', '4:5', 'day', true, 'Панорамное остекление, деталь'],
  ['ARCH-05', '3:2', null, null, 'Бронзовые профили ограждений'],
  ['ARCH-06', '16:9', 'scheme', null, 'Схема террасной этажности'],
  ['ARCH-07', '16:9', 'scheme', null, 'Разрез по корпусу A'],
  ['ARCH-08', '3:2', 'day', false, 'Вид с юго-запада'],
  ['ARCH-09', '3:2', 'dusk', false, 'Вечерний ракурс'],
  ['ARCH-10', '3:2', 'golden', true, 'Кровля-терраса'],
];
archCaps.forEach(([id, ar, mode, tight, aria]) => {
  if (mode === 'scheme') make(id, ar, (W, H, r) => sceneScheme(W, H, r, false), aria, false);
  else if (mode === null) make(id, ar, (W, H, r) => sceneTexture(W, H, r, '#CFC7B8', '#8C8375'), aria, false);
  else make(id, ar, (W, H, r) => sceneArch(W, H, r, mode, tight), aria, true);
});

/* --- Благоустройство --- */
[
  ['YARD-01', '3:2', 'day', 'Двор без транзитного проезда'],
  ['YARD-02', '4:5', 'day', 'Пешеходная связь к набережной'],
  ['YARD-03', '3:2', 'soft', 'Детская зона в тени сосен'],
  ['YARD-04', '16:9', 'dusk', 'Вечерний сценарий освещения'],
  ['YARD-05', '3:2', 'dawn', 'Утро во дворе'],
  ['YARD-06', '3:2', 'day', 'День во дворе'],
  ['YARD-07', '3:2', 'golden', 'Вечер во дворе'],
].forEach(([id, ar, t, aria]) => make(id, ar, (W, H, r) => sceneYard(W, H, r, t), aria, t === 'dusk'));

/* --- Инфраструктура --- */
[
  ['INFRA-01', '16:9', 'Первые этажи с витринным остеклением'],
  ['INFRA-02', '16:9', 'Коммерческая галерея'],
  ['INFRA-03', '16:9', 'Помещение социального назначения'],
  ['INFRA-04', '16:9', 'Входная группа корпуса'],
].forEach(([id, ar, aria], i) => make(id, ar, (W, H, r) => sceneArch(W, H, r, i % 2 ? 'dusk' : 'day', true), aria, true, i));

/* --- Интерьеры и виды --- */
make('INT-01', '3:2', (W, H, r) => sceneInterior(W, H, r, 'golden'), 'Гостиная с угловым остеклением', false);
make('INT-02', '4:5', (W, H, r) => sceneInterior(W, H, r, 'day'), 'Кухня-столовая', false);
make('INT-03', '3:2', (W, H, r) => sceneInterior(W, H, r, 'dawn'), 'Спальня с видом на лес', false);
make('VIEW-RIVER', '16:9', (W, H, r) => scenePanorama(W, H, r, 'golden'), 'Вид на Каму с верхних этажей', true);
make('VIEW-FOREST', '3:2', (W, H, r) => sceneTexture(W, H, r, '#2A3826', '#54703F'), 'Вид на Закамский Бор', true);
make('VIEW-YARD', '4:5', (W, H, r) => sceneYard(W, H, r, 'day'), 'Вид во двор', false);

/* --- Земельные участки --- */
make('LAND-PLOT-A', '3:2', (W, H, r) => sceneLand(W, H, r, false), 'Земельный участок, съёмка с уровня земли', false);
make('LAND-PLOT-B', '3:2', (W, H, r) => sceneLand(W, H, r, true), 'Земельный участок, съёмка с высоты', false);
make('LAND-PLOT-SCHEME', '16:10', (W, H, r) => sceneScheme(W, H, r), 'Схема нарезки земельных участков', false);

/* --- Типовые проекты застройки --- */
[
  'Проект «Кромка», главный фасад',
  'Проект «Кромка», со стороны сада',
  'Проект «Терраса», вид с юго-запада',
  'Проект «Терраса», эксплуатируемая кровля',
  'Проект «Бор», внутренний двор',
  'Проект «Бор», уличный фасад',
  'Проект «Пойма», общий вид',
  'Проект «Пойма», типовая квартира',
].forEach((aria, i) => {
  make(`HOUSE-VIZ-0${i + 1}`, '16:9', (W, H, r) => sceneHouse(W, H, r, Math.floor(i / 2)), aria + '. Иллюстративная визуализация', false, i);
});
[1, 2].forEach((i) =>
  make(`HOUSE-VIZ-VIDEO-0${i}`, '16:9', (W, H, r) => sceneHouse(W, H, r, i), `Кадр видеооблёта типового проекта ${i}. Иллюстративная визуализация`, false, i * 7)
);

/* --- О проекте, контакты, фоны --- */
make('ABOUT-01', '16:9', (W, H, r) => scenePanorama(W, H, r, 'day'), 'Общий вид жилого комплекса', true);
make('ABOUT-02', '3:2', (W, H, r) => sceneScheme(W, H, r), 'Схема связи воды, застройки и леса', false);
make('ABOUT-03', '3:2', (W, H, r) => scenePanorama(W, H, r, 'dawn'), 'Первая линия берега', true);
make('ABOUT-04', '3:2', (W, H, r) => sceneYard(W, H, r, 'day'), 'Зелёные коридоры', false);
make('ABOUT-05', '3:2', (W, H, r) => sceneArch(W, H, r, 'golden'), 'Террасная архитектура', true);
make('ABOUT-06', '3:2', (W, H, r) => sceneTexture(W, H, r, '#CFC7B8', '#8C8375'), 'Застройщик и архитектурное бюро', false);
make('CONTACTS-01', '3:2', (W, H, r) => sceneInterior(W, H, r, 'day'), 'Офис продаж', false);
make('CTA-BG-01', '21:9', (W, H, r) => scenePanorama(W, H, r, 'night'), 'Тёмный фон финального призыва', true);
make('404-01', '16:9', (W, H, r) => sceneTexture(W, H, r, '#26302B', '#4A5A4E'), 'Фон страницы 404', true);
make('OG-01', '1.91:1', (W, H, r) => scenePanorama(W, H, r, 'golden'), 'Превью проекта для соцсетей', true);
make('OG-LAND-01', '1.91:1', (W, H, r) => sceneLand(W, H, r, true), 'Превью раздела «Земельные участки»', false);

/* --- Ход проекта --- */
[1, 2, 3, 4, 5, 6].forEach((i) =>
  make(`PROGRESS-0${i}`, '3:2', i <= 2 ? (W, H, r) => sceneScheme(W, H, r) : (W, H, r) => sceneLand(W, H, r, true), `Материал по ходу проекта ${i}`, false, i * 3)
);

/* --- Превью каталога квартир --- */
[1, 2, 3, 4].forEach((i) =>
  make(`FLATPREV-0${i}`, '4:5', (W, H, r) => sceneInterior(W, H, r, i % 2 ? 'golden' : 'day'), `Превью каталога квартир ${i}`, false, i * 5)
);

/* --- Планировки --- */
const planNames = { STUDIO: 'Студия', 1: '1 комната', 2: '2 комнаты', 3: '3 комнаты', '4P': '4 комнаты и более' };
for (const kind of ['STUDIO', '1', '2', '3', '4P']) {
  const [W, H] = AR['4:5'];
  const id = `PLAN-${kind}`;
  write(id, svg(W, H, planSvg(kind, planNames[kind]) + chip(W, H, id, false), `Схема планировки: ${planNames[kind]}`));
  count++;
}

/* --- Планы этажей --- */
for (const b of ['A', 'B', 'C', 'D']) {
  const [W, H] = AR['16:10'];
  const id = `FLOOR-${b}`;
  write(id, svg(W, H, floorSvg(b) + chip(W, H, id, false), `План типового этажа корпуса ${b}`));
  count++;
}

/* --- Схемы границ участков --- */
const land = JSON.parse(readFileSync(resolve(ROOT, 'site/data/land.json'), 'utf8'));
for (const p of land) {
  const [W, H] = AR['1:1'];
  write(
    p.plot_scheme,
    svg(W, H, plotSchemeSvg(Number(p.plot_number), p.area_sqm) + chip(W, H, p.plot_scheme, false), `Схема границ участка №${p.plot_number}`)
  );
  count++;
}

console.log(`Создано плейсхолдеров: ${count - skipped.length}`);
if (skipped.length) console.log(`Пропущено (есть реальное фото): ${skipped.join(', ')}`);
console.log('Каталог: site/assets/img/');
