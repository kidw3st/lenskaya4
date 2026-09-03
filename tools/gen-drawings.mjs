/* ==========================================================================
   Чертежи «Ленской»: схемы участков, генплан, зелёный каркас.

   Запуск: node tools/gen-drawings.mjs

   Всё считается из site/data/land.json и territory.json, поэтому чертёж
   не может разойтись с каталогом: поменялись размеры участка — поменялась
   и его схема. Ничего не рисуется «на глаз».
   ========================================================================== */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { T, svg, txt, label, dimH, dimV, gapH, gapV, frame, north, scaleBar, titleBlock, legend, m } from './draw-lib.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const IMG = resolve(ROOT, 'site/assets/img');
const land = JSON.parse(readFileSync(resolve(ROOT, 'site/data/land.json'), 'utf8'));
const terr = JSON.parse(readFileSync(resolve(ROOT, 'site/data/territory.json'), 'utf8'));

let written = 0;
const put = (id, content) => {
  writeFileSync(resolve(IMG, `${id}.svg`), content, 'utf8');
  written++;
};

/* ==========================================================================
   1. Схема участка
   ========================================================================== */

const ROAD_M = 7; // полоса проезда, попадающая в кадр схемы

function plotSheet(p, W, H, opts = {}) {
  const explain = !!opts.explain;
  const pad = { l: explain ? 96 : 150, r: explain ? 470 : 150, t: 190, b: explain ? 210 : 275 };
  const boxW = W - pad.l - pad.r;
  const boxH = H - pad.t - pad.b;

  const totalD = p.depth_m + ROAD_M;
  const s = Math.min(boxW / p.width_m, boxH / totalD); // px на метр

  const pw = p.width_m * s;
  const pd = p.depth_m * s;
  const rd = ROAD_M * s;

  const x0 = pad.l + (boxW - pw) / 2;
  const y0 = pad.t + (boxH - (pd + rd)) / 2;
  const x1 = x0 + pw;
  const y1 = y0 + pd;

  // Пятно застройки: отступы от границ
  const bx = x0 + p.setback_side_m * s;
  const bx2 = x1 - p.setback_side_m * s;
  const by = y0 + p.setback_rear_m * s;
  const by2 = y1 - p.setback_front_m * s;

  let g = '';

  /* Проезд вдоль фасадной границы */
  g +=
    `<rect x="${x0 - 40}" y="${y1}" width="${pw + 80}" height="${rd}" fill="${T.road}"/>` +
    `<line x1="${x0 - 40}" y1="${y1 + rd}" x2="${x1 + 40}" y2="${y1 + rd}" stroke="${T.roadInk}" stroke-width="1.2"/>` +
    `<line x1="${x0 - 40}" y1="${y1 + rd / 2}" x2="${x1 + 40}" y2="${y1 + rd / 2}" stroke="${T.roadInk}" stroke-width="1" stroke-dasharray="14 12"/>` +
    txt(x0 + pw / 2, y1 + rd + 26, 'ПРОЕЗД', { size: 11.5, anchor: 'middle', fill: T.ink3, ls: 2 });

  /* Границы участка */
  g += `<rect x="${x0}" y="${y0}" width="${pw}" height="${pd}" fill="#ffffff" stroke="${T.ink}" stroke-width="2"/>`;

  /* Пятно застройки */
  g +=
    `<rect x="${bx}" y="${by}" width="${bx2 - bx}" height="${by2 - by}" fill="${T.bronze}" opacity=".10"/>` +
    `<rect x="${bx}" y="${by}" width="${bx2 - bx}" height="${by2 - by}" fill="url(#h-build)"/>` +
    `<rect x="${bx}" y="${by}" width="${bx2 - bx}" height="${by2 - by}" fill="none" stroke="${T.bronze}" stroke-width="1.6" stroke-dasharray="9 6"/>`;

  /* Межевые точки в углах */
  for (const [cx, cy] of [[x0, y0], [x1, y0], [x0, y1], [x1, y1]])
    g += `<circle cx="${cx}" cy="${cy}" r="4.5" fill="${T.paper}" stroke="${T.ink}" stroke-width="1.8"/>`;

  /* Размеры сторон */
  g += dimH(x0, x1, y0 - 46, `${m(p.width_m, 2)} м`, { from: y0 });
  g += dimV(y0, y1, x0 - 52, `${m(p.depth_m, 2)} м`, { from: x0 });

  /* Отступы */
  g += gapH(x0, bx, y0 + pd * 0.5, `${m(p.setback_side_m)}`);
  g += gapH(bx2, x1, y0 + pd * 0.5, `${m(p.setback_side_m)}`);
  g += gapV(y0, by, x0 + pw * 0.5, `${m(p.setback_rear_m)}`);
  g += gapV(by2, y1, x0 + pw * 0.5, `${m(p.setback_front_m)}`);

  /* Подпись пятна */
  g += txt((bx + bx2) / 2, (by + by2) / 2 - 4, 'ЗОНА ЗАСТРОЙКИ', {
    size: 12.5, anchor: 'middle', fill: T.bronzeInk, weight: 700, ls: 1.6,
  });
  g += txt((bx + bx2) / 2, (by + by2) / 2 + 18, `${m(p.buildable_area_sqm, 0)} м²`, {
    size: 15, anchor: 'middle', fill: T.bronzeInk,
  });

  /* Шапка и служебная графика */
  g += frame(W, H);
  g += titleBlock(
    pad.l - (explain ? 0 : 90),
    92,
    explain ? 'Как читать схему участка' : `Участок №${p.plot_number}`,
    explain
      ? 'Что показывает чертёж в карточке каждого участка'
      : `${m(p.area_ares)} сот · ${m(p.area_sqm, 0)} м² · ${p.land_use_label}`,
    explain ? null : `Кадастровый номер: ${p.cadastral_number || 'уточняется'}`
  );
  const mx = explain ? pad.l : pad.l - 90; // левое поле листа
  g += north(W - (explain ? 96 : 118), 108, 20);

  // Подвал: легенда выше, масштабная линейка ниже — они не соседствуют
  // по горизонтали, иначе линейка длиной в 20 м наезжает на подписи.
  g += legend(
    explain ? W - pad.r + 30 : mx,
    explain ? 520 : H - 200,
    [
      { fill: '#ffffff', stroke: T.ink, text: 'Границы участка' },
      { fill: 'none', stroke: T.bronze, dash: '5 4', pattern: 'h-build', text: 'Где допускается дом' },
      { fill: T.road, stroke: T.roadInk, text: 'Проезд' },
    ],
    { title: 'ОБОЗНАЧЕНИЯ' }
  );
  g += scaleBar(mx, H - 92, s, { steps: [0, 10, 20] });

  /* Пояснения — только на разъясняющем листе */
  if (explain) {
    const lx = W - pad.r + 30;
    let ly = 150;
    const para = (title, body) => {
      let out = txt(lx, ly, title, { size: 15.5, fill: T.ink, weight: 600 });
      ly += 22;
      for (const line of body) {
        out += txt(lx, ly, line, { size: 13.5, fill: T.ink2 });
        ly += 19;
      }
      ly += 16;
      return out;
    };
    g += para('Сплошной контур', ['Границы участка. В углах — межевые', 'точки, размеры сторон в метрах.']);
    g += para('Пунктир и штриховка', ['Зона, в которой допускается разместить', 'дом. Её площадь подписана внутри.']);
    g += para('Стрелки к границам', ['Нормативные отступы. От проезда', 'больше, от боковых и задней — меньше.']);
    g += txt(lx, H - 150, 'Отступы демонстрационные.', { size: 12.5, fill: T.bronzeInk, weight: 600 });
    g += txt(lx, H - 131, 'Фактические значения определяются', { size: 12.5, fill: T.ink3 });
    g += txt(lx, H - 113, 'ГПЗУ, ПЗЗ и техническими условиями.', { size: 12.5, fill: T.ink3 });
  } else {
    const rx = W - mx;
    g += txt(rx, H - 92, 'Отступы демонстрационные и подлежат', { size: 12, anchor: 'end', fill: T.ink3 });
    g += txt(rx, H - 73, 'уточнению по ГПЗУ, ПЗЗ и техусловиям.', { size: 12, anchor: 'end', fill: T.ink3 });
  }

  return g;
}

for (const p of land) {
  const id = p.plot_scheme;
  if (!id) continue;
  put(id, svg(1400, 1400, plotSheet(p, 1400, 1400), `Схема участка №${p.plot_number}: границы, отступы и зона застройки`));
}

put(
  'LAND-PLOT-SCHEME',
  svg(1800, 1200, plotSheet(land[0], 1800, 1200, { explain: true }), 'Как читать схему земельного участка')
);

/* ==========================================================================
   2. Генплан территории
   ========================================================================== */

function territorySheet(W, H, mode) {
  const green = mode === 'green';
  // Территория почти квадратная, лист — 16:9, поэтому масштаб упирается
  // в высоту. План прижимаем влево, а правую колонку ставим сразу за ним:
  // иначе между чертежом и легендой зияет пустая треть листа.
  const pad = { l: 82, r: 360, t: 104, b: 104 };
  const boxW = W - pad.l - pad.r;
  const boxH = H - pad.t - pad.b;
  const s = Math.min(boxW / terr.width_m, boxH / terr.depth_m);

  const planW = terr.width_m * s;
  const ox = pad.l;
  const oy = pad.t + (boxH - terr.depth_m * s) / 2;
  const colX = Math.min(ox + planW + 92, W - pad.r + 44);
  const X = (mx) => ox + mx * s;
  const Y = (my) => oy + (terr.depth_m - my) * s;

  let g = '';

  /* Вода по югу */
  const waterTop = Y(terr.promenade_m);
  g +=
    `<rect x="${ox - 40}" y="${waterTop}" width="${terr.width_m * s + 80}" height="${oy + terr.depth_m * s - waterTop + 40}" fill="${T.water}"/>` +
    `<rect x="${ox - 40}" y="${waterTop}" width="${terr.width_m * s + 80}" height="${oy + terr.depth_m * s - waterTop + 40}" fill="url(#h-water)"/>` +
    txt(ox + 24, waterTop + 42, 'К А М А', { size: 15, fill: T.waterInk, weight: 600, ls: 6 });

  /* Лес по северу */
  const forestBot = Y(terr.rows[3].y_m + terr.rows[3].depth_m + 6);
  g +=
    `<rect x="${ox - 40}" y="${oy - 40}" width="${terr.width_m * s + 80}" height="${forestBot - oy + 40}" fill="${T.forest}"/>` +
    `<rect x="${ox - 40}" y="${oy - 40}" width="${terr.width_m * s + 80}" height="${forestBot - oy + 40}" fill="url(#h-forest)"/>` +
    txt(ox + 24, oy + 4, 'З А К А М С К И Й   Б О Р', { size: 14, fill: '#6f7f58', weight: 600, ls: 3 });

  /* Набережная */
  g +=
    `<rect x="${ox}" y="${Y(terr.promenade_m)}" width="${terr.width_m * s}" height="${terr.promenade_m * s}" fill="${T.road}" opacity=".7"/>` +
    `<path d="M${ox} ${Y(terr.promenade_m * 0.5)} L${ox + terr.width_m * s} ${Y(terr.promenade_m * 0.5)}" stroke="${T.roadInk}" stroke-width="1.4" stroke-dasharray="3 7"/>`;

  /* Полоса корпусов */
  const cbY = Y(terr.promenade_m + terr.corpus_band_m);
  const cbH = terr.corpus_band_m * s;
  const corpusW = (terr.width_m * s - 3 * 26) / 4;
  ['A', 'B', 'C', 'D'].forEach((n, i) => {
    const cx = ox + i * (corpusW + 26);
    g +=
      `<rect x="${cx}" y="${cbY + cbH * 0.16}" width="${corpusW}" height="${cbH * 0.68}" ` +
      `fill="${green ? T.build : T.build}" stroke="${T.ink3}" stroke-width="1.2"/>` +
      txt(cx + corpusW / 2, cbY + cbH * 0.56, n, { size: 17, anchor: 'middle', fill: T.ink2, weight: 700 });
  });
  g += txt(ox, cbY - 12, 'ЖИЛЫЕ КОРПУСА', { size: 11, fill: T.ink3, ls: 2 });

  /* Участки */
  for (const p of land) {
    const px = X(p.plan_x_m);
    const py = Y(p.plan_y_m + p.plan_d_m);
    const pw = p.plan_w_m * s;
    const ph = p.plan_d_m * s;
    const isSold = p.status === 'sold';
    const isRes = p.status === 'reserved';

    if (green) {
      g += `<rect x="${px}" y="${py}" width="${pw}" height="${ph}" fill="#ffffff" opacity=".55" stroke="${T.hair}" stroke-width=".8"/>`;
      continue;
    }
    g +=
      `<rect x="${px}" y="${py}" width="${pw}" height="${ph}" ` +
      `fill="${isSold ? T.sold : isRes ? '#ffffff' : T.bronze}" ` +
      `${isSold ? '' : `opacity="${isRes ? 1 : 0.16}" `}stroke="${T.ink3}" stroke-width="1"/>`;
    if (isSold) g += `<rect x="${px}" y="${py}" width="${pw}" height="${ph}" fill="url(#h-sold)"/>`;
    if (isRes)
      g += `<rect x="${px}" y="${py}" width="${pw}" height="${ph}" fill="none" stroke="${T.bronze}" stroke-width="1.6" stroke-dasharray="5 4"/>`;
    if (pw > 22)
      g += txt(px + pw / 2, py + ph / 2 + 4, p.plot_number, {
        size: Math.min(13, pw * 0.42),
        anchor: 'middle',
        fill: isSold ? T.ink3 : T.bronzeInk,
        weight: 600,
      });
  }

  /* Зелёные коридоры — только на схеме каркаса */
  if (green) {
    const corr = [0.14, 0.42, 0.7, 0.93];
    for (const c of corr) {
      const cx = ox + terr.width_m * s * c;
      g +=
        `<path d="M${cx} ${forestBot} L${cx} ${Y(terr.promenade_m)}" stroke="${T.olive}" stroke-width="${terr.boulevard_m * s * 0.8}" opacity=".22" stroke-linecap="round"/>`;
    }
    // Поперечный бульвар между парами рядов
    const bY = Y(terr.rows[1].y_m + terr.rows[1].depth_m + terr.boulevard_m / 2);
    g += `<path d="M${ox} ${bY} L${ox + terr.width_m * s} ${bY}" stroke="${T.olive}" stroke-width="${terr.boulevard_m * s * 0.7}" opacity=".22" stroke-linecap="round"/>`;
    g += txt(ox + 14, bY - terr.boulevard_m * s * 0.45, 'ЗЕЛЁНЫЙ БУЛЬВАР', { size: 11, fill: T.oliveInk, ls: 1.8, weight: 600 });
  }

  /* Улицы */
  for (const r of [0, 2]) {
    const row = terr.rows[r];
    const sy = Y(row.y_m + row.depth_m + terr.street_m);
    g +=
      `<rect x="${ox - 26}" y="${sy}" width="${terr.width_m * s + 52}" height="${terr.street_m * s}" fill="${T.road}"/>` +
      `<line x1="${ox - 26}" y1="${sy + terr.street_m * s / 2}" x2="${ox + terr.width_m * s + 26}" y2="${sy + terr.street_m * s / 2}" stroke="${T.roadInk}" stroke-width="1" stroke-dasharray="12 10"/>`;
  }

  /* Контур территории */
  g += `<rect x="${ox}" y="${oy}" width="${terr.width_m * s}" height="${terr.depth_m * s}" fill="none" stroke="${T.ink}" stroke-width="1.6" stroke-dasharray="14 7"/>`;

  /* Размеры территории */
  g += dimH(ox, ox + terr.width_m * s, oy - 34, `${m(terr.width_m, 0)} м`, { from: oy });
  g += dimV(oy, oy + terr.depth_m * s, ox - 40, `${m(terr.depth_m, 0)} м`, { from: ox });

  /* Правая колонка листа */
  const lx = colX;
  g += frame(W, H);
  g += titleBlock(
    lx,
    132,
    green ? 'Зелёный каркас' : 'Генеральный план',
    green ? 'Связи леса, бульваров и набережной' : `${land.length} земельных участков · ${m(terr.width_m, 0)} × ${m(terr.depth_m, 0)} м`,
    null
  );
  g += north(W - 92, 128, 22);

  if (green) {
    g += legend(lx, 235, [
      { fill: T.forest, stroke: T.forestInk, pattern: 'h-forest', text: 'Закамский Бор' },
      { fill: T.olive, stroke: 'none', text: 'Зелёные коридоры' },
      { fill: T.road, stroke: T.roadInk, text: 'Набережная' },
      { fill: '#ffffff', stroke: T.hair, text: 'Земельные участки' },
    ], { title: 'ОБОЗНАЧЕНИЯ' });
    let ty = 380;
    for (const line of [
      'Четыре продольных коридора выводят',
      'лес к воде и не дают застройке',
      'сомкнуться в сплошную стену.',
      '',
      'Поперечный бульвар связывает их',
      'между собой: от любого участка',
      'до зелени — меньше ста метров.',
    ]) {
      g += txt(lx, ty, line, { size: 13.5, fill: T.ink2 });
      ty += 21;
    }
  } else {
    const free = land.filter((p) => p.status === 'free').length;
    const res = land.filter((p) => p.status === 'reserved').length;
    const sold = land.filter((p) => p.status === 'sold').length;
    g += legend(lx, 235, [
      { fill: T.bronze, stroke: T.ink3, text: `Свободен — ${free}` },
      { fill: '#ffffff', stroke: T.bronze, dash: '5 4', text: `Бронь — ${res}` },
      { fill: T.sold, stroke: T.ink3, pattern: 'h-sold', text: `Продан — ${sold}` },
      { fill: T.build, stroke: T.ink3, text: 'Жилые корпуса' },
      { fill: T.forest, stroke: T.forestInk, pattern: 'h-forest', text: 'Лесной массив' },
      { fill: T.water, stroke: T.waterInk, pattern: 'h-water', text: 'Река Кама' },
    ], { title: 'ОБОЗНАЧЕНИЯ' });
    let ty = 430;
    for (const line of [
      'Участки нарезаны четырьмя рядами',
      'вдоль двух внутренних проездов.',
      'Ряды 2 и 3 разделены бульваром —',
      'он же зелёный коридор от леса к воде.',
    ]) {
      g += txt(lx, ty, line, { size: 13.5, fill: T.ink2 });
      ty += 21;
    }
  }

  g += scaleBar(lx, H - 150, s, { steps: [0, 25, 50, 75] });
  g += txt(lx, H - 84, 'Демонстрационная посадка. Фактические границы', { size: 11.5, fill: T.ink3 });
  g += txt(lx, H - 67, 'определяются межеванием.', { size: 11.5, fill: T.ink3 });

  return g;
}

put('MASTERPLAN-01', svg(2400, 1350, territorySheet(2400, 1350, 'plan'), 'Генеральный план: нарезка на 48 земельных участков, корпуса, набережная и лес'));
put('MASTERPLAN-03', svg(2400, 1350, territorySheet(2400, 1350, 'green'), 'Схема зелёного каркаса: коридоры от Закамского Бора к набережной'));

console.log(`Чертежей записано: ${written}`);
console.log(`Каталог: site/assets/img/`);

/* ==========================================================================
   3. Карты, планировки, разрезы
   ========================================================================== */

import { mapLocation, mapMini, mapReach, mapRoute, flatPlan, FLATS, steppedSection, corpusSection } from './draw-sheets.mjs';

put('MAP-01F', svg(2400, 1350, mapLocation(2400, 1350), 'Схема расположения: Пермь, Кама, Закамский Бор и участок проекта'));
put('MAP-02', svg(1200, 800, mapMini(1200, 800), 'Схема расположения проекта «Ленская»'));
put('MAP-03', svg(1800, 1200, mapReach(1800, 1200), 'Транспортная доступность: изохроны 10, 20 и 30 минут'));
put('MAP-04', svg(1800, 1200, mapRoute(1800, 1200), 'Схема проезда к офису продаж'));

for (const f of FLATS) put(f.id, svg(1600, 2000, flatPlan(1600, 2000, f), `Пример планировки: ${f.title}`));

put('ARCH-06', svg(2000, 1250, steppedSection(2000, 1250), 'Схема террасной этажности корпусов'));
put('ARCH-07', svg(1800, 1350, corpusSection(1800, 1350), 'Разрез по корпусу A'));

console.log(`Всего листов: ${written}`);
