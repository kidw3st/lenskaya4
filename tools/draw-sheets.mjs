/* ==========================================================================
   Листы, не привязанные к данным участков: карты, планировки, разрезы.

   Карты — намеренно СХЕМЫ, а не топография: реальной геоподосновы у нас нет,
   и рисовать правдоподобную «карту» было бы враньём. Поэтому геометрия
   условная, подписи только опорные, и на каждом листе стоит оговорка.
   ========================================================================== */

import { T, svg, txt, dimH, dimV, frame, north, scaleBar, titleBlock, legend, m } from './draw-lib.mjs';

/* ==========================================================================
   Карты
   ========================================================================== */

/** Русло Камы: одна кривая через весь лист, ширина меняется по течению. */
function river(W, H, o = {}) {
  const y = o.y ?? H * 0.52;
  const amp = o.amp ?? H * 0.1;
  const w = o.w ?? H * 0.13;
  const top = `M-20 ${y - amp - w / 2} C ${W * 0.28} ${y - amp * 2 - w / 2}, ${W * 0.52} ${y + amp - w / 2}, ${W + 20} ${y - amp * 0.4 - w / 2}`;
  const bot = `L${W + 20} ${y - amp * 0.4 + w / 2} C ${W * 0.52} ${y + amp + w / 2}, ${W * 0.28} ${y - amp * 2 + w / 2}, -20 ${y - amp + w / 2} Z`;
  return (
    `<path d="${top} ${bot}" fill="${T.water}"/>` +
    `<path d="${top} ${bot}" fill="url(#h-water)"/>` +
    `<path d="${top}" fill="none" stroke="${T.waterInk}" stroke-width="1.2" opacity=".6"/>`
  );
}

/**
 * Лесной массив. Контур неровный: правильный эллипс на месте леса читается
 * как диаграмма, а не как местность. Дрожание радиуса детерминированное —
 * один и тот же лес рисуется одинаково при каждой генерации.
 */
function forestBlob(cx, cy, rx, ry, rot = 0, seed = 7) {
  const N = 16;
  let r = seed;
  const rnd = () => ((r = (r * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const pts = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const k = 0.78 + rnd() * 0.34;
    pts.push([Math.cos(a) * rx * k, Math.sin(a) * ry * k]);
  }
  // Замкнутая кривая через середины отрезков — контур получается плавным
  let d = '';
  for (let i = 0; i < N; i++) {
    const cur = pts[i];
    const nxt = pts[(i + 1) % N];
    const mid = [(cur[0] + nxt[0]) / 2, (cur[1] + nxt[1]) / 2];
    d += i === 0 ? `M${mid[0].toFixed(1)} ${mid[1].toFixed(1)}` : '';
    const nn = pts[(i + 2) % N];
    const mid2 = [(nxt[0] + nn[0]) / 2, (nxt[1] + nn[1]) / 2];
    d += ` Q${nxt[0].toFixed(1)} ${nxt[1].toFixed(1)} ${mid2[0].toFixed(1)} ${mid2[1].toFixed(1)}`;
  }
  d += ' Z';
  return (
    `<g transform="translate(${cx},${cy}) rotate(${rot})">` +
    `<path d="${d}" fill="${T.forest}"/>` +
    `<path d="${d}" fill="url(#h-forest)"/>` +
    `<path d="${d}" fill="none" stroke="${T.forestInk}" stroke-width="1.4" opacity=".75"/>` +
    '</g>'
  );
}

/** Городская ткань: разреженная сетка кварталов. */
function cityGrid(x, y, w, h, step = 34) {
  let g = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${T.road}" opacity=".55"/>`;
  for (let i = 1; i * step < w; i++)
    g += `<line x1="${x + i * step}" y1="${y}" x2="${x + i * step}" y2="${y + h}" stroke="${T.roadInk}" stroke-width="1" opacity=".65"/>`;
  for (let j = 1; j * step < h; j++)
    g += `<line x1="${x}" y1="${y + j * step}" x2="${x + w}" y2="${y + j * step}" stroke="${T.roadInk}" stroke-width="1" opacity=".65"/>`;
  return g;
}

/** Метка проекта: кольцо с бронзовой точкой и выноской к подписи. */
function pin(x, y, title, sub, side = 'right') {
  const dx = side === 'right' ? 1 : -1;
  const lx = x + dx * 34;
  return (
    `<circle cx="${x}" cy="${y}" r="15" fill="${T.bronze}" opacity=".16"/>` +
    `<circle cx="${x}" cy="${y}" r="7.5" fill="${T.bronze}" stroke="${T.paper}" stroke-width="2.5"/>` +
    `<line x1="${x + dx * 12}" y1="${y}" x2="${lx - dx * 6}" y2="${y}" stroke="${T.bronzeInk}" stroke-width="1.2"/>` +
    txt(lx, y - 3, title, { size: 17, fill: T.ink, weight: 700, anchor: side === 'right' ? 'start' : 'end' }) +
    (sub ? txt(lx, y + 17, sub, { size: 13, fill: T.ink2, anchor: side === 'right' ? 'start' : 'end' }) : '')
  );
}

const SCHEME_NOTE = 'Схема, не топографическая карта. Геометрия условная.';

export function mapLocation(W, H) {
  let g = '';
  g += cityGrid(W * 0.04, H * 0.1, W * 0.32, H * 0.42);
  g += txt(W * 0.06, H * 0.09, 'П Е Р М Ь', { size: 15, fill: T.ink3, weight: 600, ls: 5 });
  g += river(W, H, { y: H * 0.6, amp: H * 0.09, w: H * 0.16 });
  g += forestBlob(W * 0.72, H * 0.75, W * 0.26, H * 0.2, -8);
  g += txt(W * 0.72, H * 0.75, 'ЗАКАМСКИЙ БОР', { size: 14, anchor: 'middle', fill: '#6f7f58', weight: 600, ls: 2.4 });
  g += txt(W * 0.14, H * 0.66, 'К А М А', { size: 15, fill: T.waterInk, weight: 600, ls: 5 });

  // Мост и главный подъезд
  g += `<path d="M${W * 0.3} ${H * 0.44} L${W * 0.47} ${H * 0.72}" stroke="${T.ink3}" stroke-width="3" stroke-linecap="round"/>`;
  g += `<path d="M${W * 0.47} ${H * 0.72} L${W * 0.63} ${H * 0.7}" stroke="${T.ink3}" stroke-width="2.4" stroke-dasharray="9 6"/>`;
  g += txt(W * 0.33, H * 0.53, 'мост', { size: 12.5, fill: T.ink3 });

  g += pin(W * 0.63, H * 0.7, '«Ленская»', 'правый берег, первая линия');
  g += frame(W, H);
  g += titleBlock(60, 74, 'Расположение', 'Между Камой и Закамским Бором', null);
  g += north(W - 74, 86, 20);
  g += txt(60, H - 46, SCHEME_NOTE, { size: 12, fill: T.ink3 });
  return g;
}

export function mapMini(W, H) {
  let g = '';
  g += river(W, H, { y: H * 0.62, amp: H * 0.08, w: H * 0.2 });
  g += forestBlob(W * 0.74, H * 0.78, W * 0.3, H * 0.24, -6);
  g += pin(W * 0.44, H * 0.72, '«Ленская»', null);
  g += frame(W, H, 14);
  return g;
}

export function mapReach(W, H) {
  const cx = W * 0.58;
  const cy = H * 0.56;
  let g = '';
  g += river(W, H, { y: H * 0.78, amp: H * 0.05, w: H * 0.1 });
  g += cityGrid(W * 0.05, H * 0.12, W * 0.3, H * 0.36, 30);
  g += txt(W * 0.06, H * 0.1, 'ЦЕНТР', { size: 12.5, fill: T.ink3, ls: 2.4, weight: 600 });

  // Изохроны: три вложенных контура
  const rings = [
    { r: W * 0.13, t: '10 мин' },
    { r: W * 0.22, t: '20 мин' },
    { r: W * 0.31, t: '30 мин' },
  ];
  for (let i = rings.length - 1; i >= 0; i--) {
    g +=
      `<ellipse cx="${cx}" cy="${cy}" rx="${rings[i].r}" ry="${rings[i].r * 0.74}" ` +
      `fill="${T.bronze}" opacity="${0.07 + (rings.length - i) * 0.03}" ` +
      `stroke="${T.bronze}" stroke-width="1.3" stroke-dasharray="7 6"/>`;
  }
  rings.forEach((r) => {
    g += txt(cx, cy - r.r * 0.74 + 20, r.t, { size: 13, anchor: 'middle', fill: T.bronzeInk, weight: 600 });
  });

  // Дороги от точки
  const roads = [[-0.62, -0.55], [-0.72, 0.18], [0.55, -0.5], [0.42, 0.62]];
  for (const [dx, dy] of roads)
    g += `<line x1="${cx}" y1="${cy}" x2="${cx + dx * W * 0.42}" y2="${cy + dy * H * 0.5}" stroke="${T.roadInk}" stroke-width="2.6" stroke-linecap="round"/>`;

  g += pin(cx, cy, '«Ленская»', null, 'left');
  g += frame(W, H);
  g += titleBlock(56, 68, 'Транспортная доступность', 'Время в пути на автомобиле', null);
  g += north(W - 66, 78, 18);
  g += txt(56, H - 44, SCHEME_NOTE + ' Время зависит от трафика.', { size: 12, fill: T.ink3 });
  return g;
}

export function mapRoute(W, H) {
  let g = '';
  g += river(W, H, { y: H * 0.84, amp: H * 0.04, w: H * 0.09 });
  g += forestBlob(W * 0.2, H * 0.28, W * 0.2, H * 0.16, 12);

  const path = `M${W * 0.06} ${H * 0.2} L${W * 0.34} ${H * 0.26} L${W * 0.46} ${H * 0.5} L${W * 0.72} ${H * 0.58}`;
  g +=
    `<path d="${path}" fill="none" stroke="${T.bronze}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" opacity=".28"/>` +
    `<path d="${path}" fill="none" stroke="${T.bronzeInk}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="12 8"/>`;

  const stops = [
    [W * 0.06, H * 0.2, 'Шоссе Космонавтов'],
    [W * 0.34, H * 0.26, 'поворот на набережную'],
    [W * 0.46, H * 0.5, 'ул. Ленская'],
  ];
  stops.forEach(([x, y, t], i) => {
    g +=
      `<circle cx="${x}" cy="${y}" r="6" fill="${T.paper}" stroke="${T.bronzeInk}" stroke-width="2"/>` +
      txt(x + 12, y - 10, t, { size: 13, fill: T.ink2 }) +
      txt(x + 12, y + 8, `${i + 1}`, { size: 11.5, fill: T.ink3 });
  });

  g += pin(W * 0.72, H * 0.58, 'Офис продаж', 'ул. Ленская, 1', 'left');
  g += frame(W, H);
  g += titleBlock(56, 68, 'Как доехать', 'От шоссе до офиса продаж', null);
  g += north(W - 66, 78, 18);
  g += txt(56, H - 44, SCHEME_NOTE, { size: 12, fill: T.ink3 });
  return g;
}

/* ==========================================================================
   Планировки
   ========================================================================== */

const WALL_OUT = 0.32; // м
const WALL_IN = 0.12;

/**
 * Обмерный план. Комнаты задаются прямоугольниками в метрах от левого
 * верхнего угла квартиры. Площади считаются из геометрии, а не вписываются
 * руками, — так подписи не разъезжаются с чертежом.
 */
export function flatPlan(W, H, cfg) {
  const pad = { l: 96, r: 96, t: 176, b: 190 };
  const boxW = W - pad.l - pad.r;
  const boxH = H - pad.t - pad.b;
  const s = Math.min(boxW / cfg.w, boxH / cfg.d);
  const ox = pad.l + (boxW - cfg.w * s) / 2;
  const oy = pad.t + (boxH - cfg.d * s) / 2;
  const X = (v) => ox + v * s;
  const Y = (v) => oy + v * s;

  let g = '';
  let total = 0;

  /* Наружная стена: залитая полоса между внешним и внутренним контуром.
     Толстая обводка не годится — она ложится по обе стороны от линии
     и габарит перестаёт совпадать с размерной цепочкой. */
  const wo = WALL_OUT * s;
  g +=
    `<path d="M${X(0) - wo} ${Y(0) - wo} h${cfg.w * s + wo * 2} v${cfg.d * s + wo * 2} h${-(cfg.w * s + wo * 2)} Z ` +
    `M${X(0)} ${Y(0)} v${cfg.d * s} h${cfg.w * s} v${-cfg.d * s} Z" fill="${T.ink}" fill-rule="evenodd"/>` +
    `<rect x="${X(0)}" y="${Y(0)}" width="${cfg.w * s}" height="${cfg.d * s}" fill="#ffffff"/>`;

  /* Помещения */
  for (const r of cfg.rooms) {
    const area = r.w * r.d;
    if (!r.aux) total += area;
    g +=
      `<rect x="${X(r.x)}" y="${Y(r.y)}" width="${r.w * s}" height="${r.d * s}" ` +
      `fill="${r.aux ? T.surfaceAux || '#f3efe7' : '#ffffff'}" stroke="${T.ink2}" stroke-width="${WALL_IN * s}"/>`;
    const cx = X(r.x + r.w / 2);
    const cy = Y(r.y + r.d / 2);
    // Кегль подписи привязан к размеру помещения: в кладовой она мельче,
    // в гостиной крупнее, и нигде не вылезает за стены.
    const fit = Math.min(r.w * s / (r.n.length * 0.62), r.d * s / 3.4);
    const size = Math.max(11, Math.min(21, fit));
    g += txt(cx, cy - size * 0.22, r.n, { size, anchor: 'middle', fill: T.ink, weight: 600 });
    g += txt(cx, cy + size * 1.15, `${m(area, 1)} м²`, { size: size * 0.88, anchor: 'middle', fill: T.ink2 });
  }

  /* Окна: белые разрывы в наружной стене */
  for (const w of cfg.windows || []) {
    const horiz = w.d === undefined;
    if (horiz)
      g += `<rect x="${X(w.x)}" y="${Y(w.y) - WALL_OUT * s * 0.5}" width="${w.w * s}" height="${WALL_OUT * s}" fill="${T.paper}" stroke="${T.waterInk}" stroke-width="1.2"/>`;
    else
      g += `<rect x="${X(w.x) - WALL_OUT * s * 0.5}" y="${Y(w.y)}" width="${WALL_OUT * s}" height="${w.d * s}" fill="${T.paper}" stroke="${T.waterInk}" stroke-width="1.2"/>`;
  }

  /* Размеры */
  g += dimH(X(0), X(cfg.w), Y(0) - 44, `${m(cfg.w, 2)} м`, { from: Y(0) });
  g += dimV(Y(0), Y(cfg.d), X(0) - 50, `${m(cfg.d, 2)} м`, { from: X(0) });

  g += frame(W, H);
  g += titleBlock(
    pad.l - 40,
    92,
    cfg.title,
    `Общая площадь ${m(total, 1)} м² · ${cfg.rooms.filter((r) => !r.aux).length} помещений`,
    null
  );
  g += north(W - pad.r + 6, 96, 17);
  g += scaleBar(pad.l - 40, H - 92, s, { steps: [0, 2, 4] });
  g += txt(W - pad.r + 40, H - 92, 'Пример проектного решения.', { size: 12, anchor: 'end', fill: T.ink3 });
  g += txt(W - pad.r + 40, H - 73, 'Квартиры не являются предметом продажи.', { size: 12, anchor: 'end', fill: T.ink3 });
  return g;
}

export const FLATS = [
  {
    id: 'PLAN-STUDIO',
    title: 'Студия',
    w: 5.4, d: 6.2,
    rooms: [
      { n: 'Жилая зона', x: 0.15, y: 0.15, w: 5.1, d: 4.1 },
      { n: 'Санузел', x: 0.15, y: 4.45, w: 2.1, d: 1.6, aux: true },
      { n: 'Прихожая', x: 2.45, y: 4.45, w: 2.8, d: 1.6, aux: true },
    ],
    windows: [{ x: 1.2, y: 0.15, w: 2.9 }],
  },
  {
    id: 'PLAN-1',
    title: 'Одна комната',
    w: 6.6, d: 7.4,
    rooms: [
      { n: 'Кухня-гостиная', x: 0.15, y: 0.15, w: 4.0, d: 4.4 },
      { n: 'Спальня', x: 4.35, y: 0.15, w: 2.1, d: 4.4 },
      { n: 'Санузел', x: 0.15, y: 4.75, w: 2.2, d: 2.5, aux: true },
      { n: 'Прихожая', x: 2.55, y: 4.75, w: 3.9, d: 2.5, aux: true },
    ],
    windows: [{ x: 0.9, y: 0.15, w: 2.4 }, { x: 4.7, y: 0.15, w: 1.5 }],
  },
  {
    id: 'PLAN-2',
    title: 'Две комнаты',
    w: 8.2, d: 8.0,
    rooms: [
      { n: 'Кухня-гостиная', x: 0.15, y: 0.15, w: 4.6, d: 4.6 },
      { n: 'Спальня 1', x: 4.95, y: 0.15, w: 3.1, d: 4.6 },
      { n: 'Спальня 2', x: 0.15, y: 4.95, w: 3.4, d: 2.9 },
      { n: 'Санузел', x: 3.75, y: 4.95, w: 2.0, d: 2.9, aux: true },
      { n: 'Прихожая', x: 5.95, y: 4.95, w: 2.1, d: 2.9, aux: true },
    ],
    windows: [{ x: 1.1, y: 0.15, w: 2.6 }, { x: 5.6, y: 0.15, w: 1.9 }, { x: 0.9, y: 7.85, w: 2.0 }],
  },
  {
    id: 'PLAN-3',
    title: 'Три комнаты',
    w: 9.8, d: 9.2,
    rooms: [
      { n: 'Кухня-гостиная', x: 0.15, y: 0.15, w: 5.3, d: 5.0 },
      { n: 'Спальня 1', x: 5.65, y: 0.15, w: 4.0, d: 5.0 },
      { n: 'Спальня 2', x: 0.15, y: 5.35, w: 3.5, d: 3.7 },
      { n: 'Спальня 3', x: 3.85, y: 5.35, w: 3.0, d: 3.7 },
      { n: 'Санузел', x: 7.05, y: 5.35, w: 2.6, d: 1.8, aux: true },
      { n: 'Кладовая', x: 7.05, y: 7.35, w: 2.6, d: 1.7, aux: true },
    ],
    windows: [{ x: 1.4, y: 0.15, w: 2.8 }, { x: 6.4, y: 0.15, w: 2.5 }, { x: 0.9, y: 9.05, w: 2.2 }, { x: 4.4, y: 9.05, w: 1.9 }],
  },
  {
    id: 'PLAN-4P',
    title: 'Четыре комнаты с террасой',
    w: 11.4, d: 11.4,
    rooms: [
      { n: 'Кухня-гостиная', x: 0.15, y: 0.15, w: 6.0, d: 5.4 },
      { n: 'Мастер-спальня', x: 6.35, y: 0.15, w: 4.9, d: 3.8 },
      { n: 'Гардеробная', x: 6.35, y: 4.15, w: 2.3, d: 1.4, aux: true },
      { n: 'Санузел 1', x: 8.85, y: 4.15, w: 2.4, d: 1.4, aux: true },
      { n: 'Спальня 2', x: 0.15, y: 5.75, w: 3.6, d: 3.4 },
      { n: 'Спальня 3', x: 3.95, y: 5.75, w: 3.4, d: 3.4 },
      { n: 'Санузел 2', x: 7.55, y: 5.75, w: 2.2, d: 1.6, aux: true },
      { n: 'Прихожая', x: 7.55, y: 7.55, w: 3.7, d: 1.6, aux: true },
      { n: 'Терраса', x: 0.15, y: 9.35, w: 11.1, d: 1.9, aux: true },
    ],
    windows: [{ x: 1.5, y: 0.15, w: 3.2 }, { x: 7.4, y: 0.15, w: 2.8 }, { x: 0.15, y: 1.4, d: 2.6 }],
  },
];

/* ==========================================================================
   Разрезы и схемы этажности
   ========================================================================== */

const FLOOR_H = 3.2; // высота этажа, м

/** Схема террасной этажности: четыре корпуса ступенями от реки к лесу. */
export function steppedSection(W, H) {
  const corps = [
    { n: 'A', f: 16 },
    { n: 'B', f: 14 },
    { n: 'C', f: 12 },
    { n: 'D', f: 9 },
  ];
  const pad = { l: 130, r: 130, t: 180, b: 190 };
  const maxH = corps[0].f * FLOOR_H;
  const boxW = W - pad.l - pad.r;
  const boxH = H - pad.t - pad.b;
  const s = boxH / (maxH * 1.16);
  const cw = (boxW - 3 * 26) / 4;
  const ground = pad.t + boxH;

  let g = '';
  /* Земля и контекст */
  g += `<rect x="${pad.l - 90}" y="${ground}" width="${boxW + 180}" height="34" fill="${T.road}"/>`;
  g += `<line x1="${pad.l - 90}" y1="${ground}" x2="${pad.l + boxW + 90}" y2="${ground}" stroke="${T.ink}" stroke-width="2"/>`;
  g += `<rect x="${pad.l - 90}" y="${ground - 26}" width="76" height="26" fill="${T.water}"/>`;
  g += `<rect x="${pad.l - 90}" y="${ground - 26}" width="76" height="26" fill="url(#h-water)"/>`;
  g += txt(pad.l - 52, ground + 24, 'Кама', { size: 12.5, anchor: 'middle', fill: T.waterInk });

  corps.forEach((c, i) => {
    const x = pad.l + i * (cw + 26);
    const h = c.f * FLOOR_H * s;
    const y = ground - h;
    g += `<rect x="${x}" y="${y}" width="${cw}" height="${h}" fill="${T.build}" stroke="${T.ink}" stroke-width="1.6"/>`;
    // Перекрытия
    for (let fl = 1; fl < c.f; fl++)
      g += `<line x1="${x}" y1="${ground - fl * FLOOR_H * s}" x2="${x + cw}" y2="${ground - fl * FLOOR_H * s}" stroke="${T.hair}" stroke-width="1"/>`;
    // Террасы верхних уровней — ступень внутрь
    g += `<rect x="${x + cw * 0.58}" y="${y}" width="${cw * 0.42}" height="${FLOOR_H * s * 1.6}" fill="${T.paper}" stroke="${T.bronze}" stroke-width="1.4"/>`;
    g += txt(x + cw / 2, y - 40, c.n, { size: 20, anchor: 'middle', fill: T.ink, weight: 700 });
    g += txt(x + cw / 2, y - 18, `${c.f} этажей`, { size: 13.5, anchor: 'middle', fill: T.ink2 });
    g += dimV(y, ground, x + cw + 14, `${m(c.f * FLOOR_H, 1)} м`, { from: x + cw, size: 12.5 });
  });

  /* Лес справа */
  const fx = pad.l + boxW + 30;
  for (let i = 0; i < 5; i++) {
    const tx = fx + i * 17;
    const th = 90 + (i % 3) * 26;
    g += `<path d="M${tx} ${ground} l0 ${-th}" stroke="${T.forestInk}" stroke-width="2.4"/>`;
    g += `<path d="M${tx - 15} ${ground - th * 0.42} L${tx} ${ground - th - 20} L${tx + 15} ${ground - th * 0.42} Z" fill="${T.forest}" stroke="${T.forestInk}" stroke-width="1.2"/>`;
  }
  g += txt(fx + 34, ground + 24, 'Закамский Бор', { size: 12.5, anchor: 'middle', fill: '#6f7f58' });

  g += frame(W, H);
  g += titleBlock(pad.l - 90, 92, 'Террасная этажность', 'Объёмы понижаются от реки к кромке леса', null);
  g += legend(pad.l - 90, H - 118, [
    { fill: T.build, stroke: T.ink, text: 'Объём корпуса' },
    { fill: T.paper, stroke: T.bronze, text: 'Террасы верхних уровней' },
  ], { title: 'ОБОЗНАЧЕНИЯ' });
  g += txt(W - pad.r + 60, H - 92, `Высота этажа принята ${m(FLOOR_H, 1)} м.`, { size: 12, anchor: 'end', fill: T.ink3 });
  g += txt(W - pad.r + 60, H - 73, 'Значения уточняются по проектной документации.', { size: 12, anchor: 'end', fill: T.ink3 });
  return g;
}

/** Разрез по корпусу A: этажи, входная группа, терраса, отметки. */
export function corpusSection(W, H) {
  const floors = 16;
  const pad = { l: 210, r: 200, t: 170, b: 180 };
  const boxH = H - pad.t - pad.b;
  const s = boxH / (floors * FLOOR_H * 1.08);
  const cw = W - pad.l - pad.r;
  const ground = pad.t + boxH;

  let g = '';
  g += `<rect x="${pad.l - 120}" y="${ground}" width="${cw + 240}" height="40" fill="${T.road}"/>`;
  g += `<line x1="${pad.l - 120}" y1="${ground}" x2="${pad.l + cw + 120}" y2="${ground}" stroke="${T.ink}" stroke-width="2"/>`;

  const h = floors * FLOOR_H * s;
  g += `<rect x="${pad.l}" y="${ground - h}" width="${cw}" height="${h}" fill="#ffffff" stroke="${T.ink}" stroke-width="2"/>`;

  for (let f = 0; f < floors; f++) {
    const y = ground - (f + 1) * FLOOR_H * s;
    g += `<line x1="${pad.l}" y1="${y}" x2="${pad.l + cw}" y2="${y}" stroke="${T.hair}" stroke-width="1.2"/>`;
    // Балконная плита с внешней стороны
    if (f > 0)
      g += `<rect x="${pad.l + cw}" y="${y}" width="${34}" height="${5}" fill="${T.build}" stroke="${T.ink3}" stroke-width="1"/>`;
    // Отметка уровня
    if (f % 4 === 0 || f === floors - 1)
      g +=
        `<line x1="${pad.l - 66}" y1="${y}" x2="${pad.l}" y2="${y}" stroke="${T.hair}" stroke-width="1"/>` +
        txt(pad.l - 72, y - 4, `+${m(f * FLOOR_H + FLOOR_H, 2)}`, { size: 12, anchor: 'end', fill: T.ink2 });
  }

  /* Первый этаж: входная группа */
  g += `<rect x="${pad.l}" y="${ground - FLOOR_H * s}" width="${cw}" height="${FLOOR_H * s}" fill="${T.build}" opacity=".55"/>`;
  g += txt(pad.l + cw / 2, ground - FLOOR_H * s / 2 + 5, 'ВХОДНАЯ ГРУППА И КОММЕРЦИЯ', {
    size: 12.5, anchor: 'middle', fill: T.ink2, weight: 600, ls: 1.4,
  });

  /* Кровля-терраса */
  g += `<rect x="${pad.l + cw * 0.44}" y="${ground - h - 16}" width="${cw * 0.56}" height="16" fill="${T.bronze}" opacity=".22" stroke="${T.bronze}" stroke-width="1.4"/>`;
  g += txt(pad.l + cw * 0.72, ground - h - 26, 'Кровля-терраса', { size: 13, anchor: 'middle', fill: T.bronzeInk, weight: 600 });

  /* Габарит */
  g += dimV(ground - h, ground, pad.l + cw + 96, `${m(floors * FLOOR_H, 1)} м`, { from: pad.l + cw + 34 });

  g += frame(W, H);
  g += titleBlock(pad.l - 120, 92, 'Разрез по корпусу A', `${floors} этажей · высота этажа ${m(FLOOR_H, 1)} м`, null);
  g += scaleBar(pad.l - 120, H - 88, s, { steps: [0, 5, 10] });
  g += txt(W - 90, H - 88, 'Схема. Отметки и габариты уточняются', { size: 12, anchor: 'end', fill: T.ink3 });
  g += txt(W - 90, H - 69, 'по проектной документации.', { size: 12, anchor: 'end', fill: T.ink3 });
  return g;
}
