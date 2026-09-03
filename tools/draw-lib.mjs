/* ==========================================================================
   Примитивы чертёжной графики для «Ленской».

   Язык — архитектурный чертёж, а не инфографика: волосяные линии,
   настоящие размерные цепочки с выносками и засечками, штриховка под 45°,
   масштабная линейка, штамп листа. Один акцентный цвет — бронза, и он
   достаётся только тому, ради чего чертёж существует.

   Все листы рисуются на светлой бумаге. Тёмную тему сайт делает сам:
   к таким изображениям применяется фильтр --doc-dim, поэтому инвертировать
   ничего не нужно, а вот полагаться на прозрачный фон — нельзя.
   ========================================================================== */

export const T = {
  paper: '#faf8f4',
  frame: '#ddd6c9',
  hair: '#c6bfb1', // выноски, вспомогательные линии
  ink: '#2c332e', // основной контур
  ink2: '#5a615a', // размерные подписи
  ink3: '#7c8279', // третьестепенное
  bronze: '#a8814f',
  bronzeInk: '#7d5c2c',
  olive: '#6e7a55',
  oliveInk: '#55603f',
  water: '#ccd8dc',
  waterInk: '#7d939b',
  forest: '#dde6d2',
  forestInk: '#9fb188',
  road: '#ece6db',
  roadInk: '#cfc6b6',
  build: '#e2dcd0',
  sold: '#e8e3da',
};

export const FONT =
  "'TT Commons Pro',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";
export const FONT_D = "'TT Ramillas','Playfair Display',Georgia,'Times New Roman',serif";

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Число без хвостовых нулей: 41.88 -> «41,88», 45 -> «45» */
export const m = (v, d = 1) =>
  (Math.round(v * 10 ** d) / 10 ** d).toString().replace('.', ',');

export function svg(w, h, body, title) {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" ` +
    `role="img" aria-label="${esc(title)}" font-family="${FONT}">` +
    `<title>${esc(title)}</title>` +
    defs() +
    `<rect width="${w}" height="${h}" fill="${T.paper}"/>` +
    body +
    `</svg>`
  );
}

function defs() {
  return (
    '<defs>' +
    // Штриховка пятна застройки
    `<pattern id="h-build" patternUnits="userSpaceOnUse" width="9" height="9" patternTransform="rotate(45)">` +
    `<line x1="0" y1="0" x2="0" y2="9" stroke="${T.bronze}" stroke-width="1.1" opacity=".5"/></pattern>` +
    // Штриховка проданного
    `<pattern id="h-sold" patternUnits="userSpaceOnUse" width="7" height="7" patternTransform="rotate(45)">` +
    `<line x1="0" y1="0" x2="0" y2="7" stroke="${T.ink3}" stroke-width="1" opacity=".45"/></pattern>` +
    // Лесной массив: точечная фактура
    `<pattern id="h-forest" patternUnits="userSpaceOnUse" width="14" height="14">` +
    `<circle cx="4" cy="4" r="1.5" fill="${T.forestInk}" opacity=".55"/>` +
    `<circle cx="11" cy="10" r="1.1" fill="${T.forestInk}" opacity=".4"/></pattern>` +
    // Вода: горизонтальная рябь
    `<pattern id="h-water" patternUnits="userSpaceOnUse" width="26" height="12">` +
    `<path d="M0 6q6.5 -3 13 0t13 0" fill="none" stroke="${T.waterInk}" stroke-width="1" opacity=".35"/></pattern>` +
    '</defs>'
  );
}

/* ---------- Текст ---------- */

export function txt(x, y, s, o = {}) {
  const a = {
    size: 15,
    fill: T.ink2,
    anchor: 'start',
    weight: 400,
    ls: 0,
    family: FONT,
    baseline: null,
    ...o,
  };
  return (
    `<text x="${x}" y="${y}" font-size="${a.size}" fill="${a.fill}" text-anchor="${a.anchor}" ` +
    `font-weight="${a.weight}"${a.ls ? ` letter-spacing="${a.ls}"` : ''}` +
    `${a.family !== FONT ? ` font-family="${a.family}"` : ''}` +
    `${a.baseline ? ` dominant-baseline="${a.baseline}"` : ''}>${esc(s)}</text>`
  );
}

/** Подпись с подложкой цвета бумаги — чтобы линия не шла сквозь буквы. */
export function label(x, y, s, o = {}) {
  const size = o.size || 14;
  const w = String(s).length * size * 0.56 + 10;
  const h = size * 1.35;
  const anchor = o.anchor || 'middle';
  const rx = anchor === 'middle' ? x - w / 2 : anchor === 'end' ? x - w : x;
  return (
    `<rect x="${rx}" y="${y - h * 0.78}" width="${w}" height="${h}" fill="${o.bg || T.paper}"/>` +
    txt(x, y, s, { size, anchor, fill: o.fill || T.ink2, weight: o.weight || 400 })
  );
}

/* ---------- Размерные цепочки ---------- */

const TICK = 5.5; // длина засечки под 45°

/** Горизонтальный размер: выноски вниз/вверх от объекта к линии на y. */
export function dimH(x1, x2, y, text, o = {}) {
  const from = o.from ?? y; // откуда идут выноски (край объекта)
  const c = o.color || T.hair;
  const ext =
    `<line x1="${x1}" y1="${from}" x2="${x1}" y2="${y + (y > from ? 6 : -6)}" stroke="${c}" stroke-width="1"/>` +
    `<line x1="${x2}" y1="${from}" x2="${x2}" y2="${y + (y > from ? 6 : -6)}" stroke="${c}" stroke-width="1"/>`;
  return (
    (o.noExt ? '' : ext) +
    `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${c}" stroke-width="1"/>` +
    tick(x1, y) +
    tick(x2, y) +
    label((x1 + x2) / 2, y - 7, text, { size: o.size || 14, fill: o.fill || T.ink2 })
  );
}

/** Вертикальный размер. */
export function dimV(y1, y2, x, text, o = {}) {
  const from = o.from ?? x;
  const c = o.color || T.hair;
  const ext =
    `<line x1="${from}" y1="${y1}" x2="${x + (x > from ? 6 : -6)}" y2="${y1}" stroke="${c}" stroke-width="1"/>` +
    `<line x1="${from}" y1="${y2}" x2="${x + (x > from ? 6 : -6)}" y2="${y2}" stroke="${c}" stroke-width="1"/>`;
  const my = (y1 + y2) / 2;
  return (
    (o.noExt ? '' : ext) +
    `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="${c}" stroke-width="1"/>` +
    tick(x, y1) +
    tick(x, y2) +
    `<g transform="translate(${x},${my}) rotate(-90)">` +
    label(0, -7, text, { size: o.size || 14, fill: o.fill || T.ink2 }) +
    '</g>'
  );
}

/** Засечка под 45° — чертёжная замена стрелке. */
function tick(x, y) {
  return `<line x1="${x - TICK}" y1="${y + TICK}" x2="${x + TICK}" y2="${y - TICK}" stroke="${T.ink2}" stroke-width="1.3"/>`;
}

/** Короткий размер отступа: стрелка с двумя остриями внутри узкого просвета. */
export function gapH(x1, x2, y, text, o = {}) {
  const c = o.color || T.bronzeInk;
  return (
    `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${c}" stroke-width="1"/>` +
    arrow(x1, y, 1) +
    arrow(x2, y, -1) +
    label((x1 + x2) / 2, y - 6, text, { size: o.size || 12.5, fill: c })
  );
}

export function gapV(y1, y2, x, text, o = {}) {
  const c = o.color || T.bronzeInk;
  return (
    `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="${c}" stroke-width="1"/>` +
    arrowV(x, y1, 1) +
    arrowV(x, y2, -1) +
    `<g transform="translate(${x},${(y1 + y2) / 2}) rotate(-90)">` +
    label(0, -6, text, { size: o.size || 12.5, fill: c }) +
    '</g>'
  );
}

function arrow(x, y, dir) {
  return `<path d="M${x} ${y} l${5.5 * dir} -2.6 l0 5.2 Z" fill="${T.bronzeInk}"/>`;
}
function arrowV(x, y, dir) {
  return `<path d="M${x} ${y} l-2.6 ${5.5 * dir} l5.2 0 Z" fill="${T.bronzeInk}"/>`;
}

/* ---------- Служебная графика листа ---------- */

/** Рамка листа: тонкая линия по периметру, как на настоящем чертеже. */
export function frame(w, h, inset = 22) {
  return (
    `<rect x="${inset}" y="${inset}" width="${w - inset * 2}" height="${h - inset * 2}" ` +
    `fill="none" stroke="${T.frame}" stroke-width="1"/>`
  );
}

/** Стрелка севера. Нарисована путями, а не набрана глифом. */
export function north(x, y, r = 22) {
  return (
    `<g transform="translate(${x},${y})">` +
    `<path d="M0 ${-r} L${r * 0.42} ${r * 0.72} L0 ${r * 0.34} Z" fill="${T.bronze}"/>` +
    `<path d="M0 ${-r} L${-r * 0.42} ${r * 0.72} L0 ${r * 0.34} Z" fill="none" stroke="${T.bronzeInk}" stroke-width="1.2"/>` +
    txt(0, -r - 8, 'С', { size: 13, anchor: 'middle', fill: T.bronzeInk, weight: 700, ls: 0.5 }) +
    '</g>'
  );
}

/** Масштабная линейка: чередующиеся сегменты с подписями в метрах. */
export function scaleBar(x, y, pxPerM, opts = {}) {
  const steps = opts.steps || [0, 10, 20, 30];
  const seg = (steps[1] - steps[0]) * pxPerM;
  const n = steps.length - 1;
  let out = '';
  for (let i = 0; i < n; i++) {
    out +=
      `<rect x="${x + i * seg}" y="${y}" width="${seg}" height="7" ` +
      `fill="${i % 2 ? T.paper : T.ink2}" stroke="${T.ink2}" stroke-width="1"/>`;
  }
  steps.forEach((s, i) => {
    out += txt(x + i * seg, y + 22, i === n ? `${s} м` : String(s), {
      size: 12,
      anchor: 'middle',
      fill: T.ink3,
    });
  });
  return out;
}

/** Штамп листа: заголовок, подзаголовок и служебная строка. */
export function titleBlock(x, y, title, sub, note) {
  return (
    txt(x, y, title, { size: 27, fill: T.ink, family: FONT_D, weight: 600 }) +
    (sub ? txt(x, y + 24, sub, { size: 14.5, fill: T.ink2 }) : '') +
    (note ? txt(x, y + 46, note, { size: 12, fill: T.ink3 }) : '')
  );
}

/** Легенда: образец заливки + подпись, по строке на пункт. */
export function legend(x, y, items, o = {}) {
  const step = o.step || 26;
  let out = o.title
    ? txt(x, y - 24, o.title, { size: 11.5, fill: T.ink3, ls: 1.2, weight: 600 })
    : '';
  items.forEach((it, i) => {
    const yy = y + i * step;
    out +=
      `<rect x="${x}" y="${yy - 10}" width="20" height="13" fill="${it.fill || 'none'}" ` +
      `stroke="${it.stroke || T.hair}" stroke-width="1"${it.dash ? ` stroke-dasharray="${it.dash}"` : ''}/>` +
      (it.pattern ? `<rect x="${x}" y="${yy - 10}" width="20" height="13" fill="url(#${it.pattern})"/>` : '') +
      txt(x + 30, yy, it.text, { size: 13.5, fill: T.ink2 });
  });
  return out;
}
