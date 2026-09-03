// Генератор демо-данных каталогов ЖК «Ленская».
// Запуск: node tools/gen-data.mjs
// Результат: site/data/*.json — те же поля, что в модели данных спецификации (раздел 4).
// Данные демонстрационные: до письменного утверждения Заказчиком не являются офертой.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'site/data');
mkdirSync(OUT, { recursive: true });

// Детерминированный ГПСЧ, чтобы пересборка не меняла каталог.
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20260806);
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const between = (min, max) => min + rnd() * (max - min);
const intBetween = (min, max) => Math.floor(between(min, max + 1));
const round2 = (n) => Math.round(n * 100) / 100;
const chance = (p) => rnd() < p;

const TODAY = new Date('2026-08-06T00:00:00Z');
function daysAgo(n) {
  const d = new Date(TODAY.getTime() - n * 86400000);
  return d.toISOString().slice(0, 10);
}

/* ------------------------------------------------------------------ */
/* Типовые проекты застройки (справочник house_project)                */
/* ------------------------------------------------------------------ */

const DISCLAIMER = 'Иллюстративная визуализация. Итоговый вид определяется выбранным проектом застройки.';

// Габариты пятна застройки нужны, чтобы показать посадку дома на участке,
// а не только красивый рендер: это переводит визуализацию из «картинки»
// в проверяемый сценарий освоения земли.
const houseProjects = [
  {
    id: 'HP-01',
    title: 'Кромка',
    type: 'house',
    type_label: 'Частный дом',
    floors: 2,
    area_total: 168,
    footprint_w_m: 12.0,
    footprint_d_m: 9.0,
    min_plot_ares: 6,
    description:
      'Компактный двухэтажный дом с вынесенной гостиной и остеклением в сторону воды. Спальная группа отделена от общественной зоны переходом.',
    viz_images: ['HOUSE-VIZ-01', 'HOUSE-VIZ-02'],
    viz_video: null,
    disclaimer: DISCLAIMER,
  },
  {
    id: 'HP-02',
    title: 'Терраса',
    type: 'house',
    type_label: 'Частный дом',
    floors: 2,
    area_total: 214,
    footprint_w_m: 14.5,
    footprint_d_m: 10.5,
    min_plot_ares: 9,
    description:
      'Ступенчатый объём с эксплуатируемой кровлей нижнего яруса. Терраса второго уровня раскрыта на юго-запад.',
    viz_images: ['HOUSE-VIZ-03', 'HOUSE-VIZ-04'],
    viz_video: 'HOUSE-VIZ-VIDEO-01',
    disclaimer: DISCLAIMER,
  },
  {
    id: 'HP-03',
    title: 'Бор',
    type: 'townhouse',
    type_label: 'Таунхаус',
    floors: 3,
    area_total: 142,
    footprint_w_m: 7.5,
    footprint_d_m: 11.0,
    min_plot_ares: 4,
    description:
      'Блокированная застройка на узком участке. Внутренний двор-патио изолирован от проезда, вход через буферную зону.',
    viz_images: ['HOUSE-VIZ-05', 'HOUSE-VIZ-06'],
    viz_video: null,
    disclaimer: DISCLAIMER,
  },
  {
    id: 'HP-04',
    title: 'Пойма',
    type: 'apartment',
    type_label: 'Малоэтажный дом',
    floors: 3,
    area_total: 96,
    footprint_w_m: 16.0,
    footprint_d_m: 12.0,
    min_plot_ares: 12,
    description:
      'Малоэтажный дом на несколько квартир. Показана типовая квартира 96 м² с угловым остеклением и выходом на террасу.',
    viz_images: ['HOUSE-VIZ-07', 'HOUSE-VIZ-08'],
    viz_video: 'HOUSE-VIZ-VIDEO-02',
    disclaimer: DISCLAIMER,
  },
];

const LAND_USE = [
  { key: 'izhs', label: 'ИЖС' },
  { key: 'lph', label: 'ЛПХ' },
];
const UTILITY_LABELS = {
  electricity: 'Электричество',
  water: 'Водоснабжение',
  gas: 'Газ',
  sewerage: 'Канализация',
  road: 'Дорога с твёрдым покрытием',
};

const land = [];
const LAND_COUNT = 48;

for (let n = 1; n <= LAND_COUNT; n++) {
  const view = n <= 14 ? ['river', 'forest'] : n <= 30 ? ['forest'] : ['inner'];
  const areaSqm = Math.round(between(600, 1650) / 10) * 10;
  const areaAres = round2(areaSqm / 100);

  const utilities = ['electricity'];
  if (chance(0.82)) utilities.push('water');
  if (chance(0.64)) utilities.push('gas');
  if (chance(0.48)) utilities.push('sewerage');
  if (chance(0.7)) utilities.push('road');

  let perAre = 300000;
  if (view.includes('river')) perAre += 190000;
  else if (view.includes('forest')) perAre += 95000;
  if (utilities.includes('gas')) perAre += 24000;
  if (utilities.includes('sewerage')) perAre += 18000;
  perAre = Math.round((perAre * between(0.96, 1.05)) / 1000) * 1000;

  const r = rnd();
  let status = 'free';
  if (r < 0.04) status = 'unpublished';
  else if (r < 0.18) status = 'sold';
  else if (r < 0.3) status = 'reserved';

  const priceOnRequest = chance(0.08);
  const price = priceOnRequest ? null : Math.round((perAre * areaAres) / 10000) * 10000;

  // Габариты участка: прямоугольник с пропорцией, близкой к реальной нарезке.
  const widthM = round2(Math.sqrt(areaSqm / 1.45));
  const depthM = round2(areaSqm / widthM);

  // Отступы по нормам ИЖС — демонстрационные, подлежат проверке
  // по градостроительному плану и ПЗЗ конкретного участка.
  const setbackFront = 5;
  const setbackSide = 3;
  const setbackRear = 3;
  const buildW = Math.max(0, widthM - setbackSide * 2);
  const buildD = Math.max(0, depthM - setbackFront - setbackRear);
  const buildableArea = Math.round(buildW * buildD);
  const maxBuildRatio = 0.3; // коэффициент застройки
  const maxFootprint = Math.round(Math.min(buildableArea, areaSqm * maxBuildRatio));

  // Проект подходит, если его пятно помещается в зону застройки
  const fitting = houseProjects.filter(
    (p) =>
      p.min_plot_ares <= areaAres &&
      p.footprint_w_m <= buildW &&
      p.footprint_d_m <= buildD &&
      p.footprint_w_m * p.footprint_d_m <= maxFootprint
  );
  const projects = (fitting.length >= 2 ? fitting : houseProjects.slice(0, 2))
    .slice(0, chance(0.5) ? 4 : 3)
    .map((p) => p.id);

  land.push({
    id: `L-${String(n).padStart(3, '0')}`,
    object_type: 'land',
    plot_number: String(n),
    area_sqm: areaSqm,
    area_ares: areaAres,
    width_m: widthM,
    depth_m: depthM,
    setback_front_m: setbackFront,
    setback_side_m: setbackSide,
    setback_rear_m: setbackRear,
    buildable_area_sqm: buildableArea,
    max_footprint_sqm: maxFootprint,
    max_build_ratio: maxBuildRatio,
    cadastral_number: chance(0.72)
      ? `59:32:${String(intBetween(1000000, 4999999)).padStart(7, '0')}:${intBetween(10, 990)}`
      : null,
    land_use: pick(LAND_USE).key,
    land_use_label: null, // заполняется ниже
    land_category: 'Земли населённых пунктов',
    utilities,
    utilities_status: chance(0.35) ? 'connected' : chance(0.6) ? 'at_border' : 'planned',
    status,
    reserved_until: status === 'reserved' ? daysAgo(-intBetween(6, 40)) : null,
    price,
    price_per_are: price ? Math.round(price / areaAres / 1000) * 1000 : null,
    view,
    terrain_notes: chance(0.4)
      ? pick([
          'Ровный рельеф, перепад высот в пределах 0,4 м.',
          'Небольшой уклон в сторону воды, южная экспозиция.',
          'Сохранены взрослые сосны по северной границе.',
          'Участок угловой, два выезда на внутренний проезд.',
        ])
      : null,
    updated_at: daysAgo(intBetween(0, 21)),
    plot_images: ['LAND-PLOT-A', 'LAND-PLOT-B'],
    plot_scheme: `LAND-SCHEME-${String(n).padStart(3, '0')}`,
    house_project_ids: projects,
    is_published: status !== 'unpublished',
  });
}
for (const p of land) {
  p.land_use_label = LAND_USE.find((u) => u.key === p.land_use).label;
}

/* ------------------------------------------------------------------ */
/* Галерея, новости, ход проекта                                       */
/* ------------------------------------------------------------------ */

const gallery = [
  ['ARCH-01', 'Фасады со стороны реки', 'architecture', '3:2'],
  ['ARCH-02', 'Ступенчатые террасы верхних уровней', 'architecture', '4:5'],
  ['ARCH-03', 'Известняк в отделке цоколя', 'architecture', '3:2'],
  ['ARCH-04', 'Панорамное остекление, деталь', 'architecture', '4:5'],
  ['ARCH-05', 'Бронзовые профили ограждений', 'architecture', '3:2'],
  ['ARCH-06', 'Схема террасной этажности', 'architecture', '16:9'],
  ['YARD-01', 'Двор без транзитного проезда', 'territory', '3:2'],
  ['YARD-02', 'Пешеходная связь к набережной', 'territory', '4:5'],
  ['YARD-03', 'Детская зона в тени сосен', 'territory', '3:2'],
  ['YARD-04', 'Вечерний сценарий освещения', 'territory', '16:9'],
  ['YARD-05', 'Утро во дворе', 'territory', '3:2'],
  ['INT-01', 'Гостиная с угловым остеклением', 'interiors', '3:2'],
  ['INT-02', 'Кухня-столовая', 'interiors', '4:5'],
  ['INT-03', 'Спальня, вид на лес', 'interiors', '3:2'],
  ['VIEW-RIVER', 'Вид на Каму с верхних этажей', 'views', '16:9'],
  ['VIEW-FOREST', 'Вид на Закамский Бор', 'views', '3:2'],
  ['VIEW-YARD', 'Вид во двор', 'views', '4:5'],
  ['LOCATION-01', 'Аэросъёмка: река, участок, лес', 'views', '16:9'],
  ['MASTERPLAN-01', 'Генеральный план территории', 'masterplan', '16:10'],
  ['MASTERPLAN-02', 'Аксонометрия комплекса', 'masterplan', '16:9'],
  ['MASTERPLAN-03', 'Схема зелёных коридоров', 'masterplan', '16:10'],
  ['LAND-PLOT-A', 'Участок, съёмка с уровня земли', 'land', '3:2'],
  ['LAND-PLOT-B', 'Участок, съёмка с высоты', 'land', '3:2'],
  ['LAND-PLOT-SCHEME', 'Схема нарезки участков', 'land', '16:10'],
  ['HOUSE-VIZ-01', 'Проект «Кромка», главный фасад', 'projects', '16:9'],
  ['HOUSE-VIZ-03', 'Проект «Терраса», вид с юго-запада', 'projects', '16:9'],
  ['HOUSE-VIZ-05', 'Проект «Бор», внутренний двор', 'projects', '16:9'],
  ['HOUSE-VIZ-07', 'Проект «Пойма», типовая квартира', 'projects', '16:9'],
].map(([media_id, title, tag, ar], i) => ({
  id: `G-${String(i + 1).padStart(3, '0')}`,
  media_id,
  title,
  tag,
  aspect: ar,
  // Визуализации застройки участков несут отдельный дисклеймер DISC-03.
  disclaimer: tag === 'projects' ? 'DISC-03' : 'DISC-02',
}));

const news = [
  {
    slug: 'arhitekturnaya-koncepciya',
    date: '2026-07-28',
    category: 'Проект',
    title: 'Архитектурная концепция «Ленской» вынесена на обсуждение',
    lead: 'Бюро представило ступенчатую композицию из четырёх корпусов с раскрытием дворов в сторону набережной.',
    cover: 'ARCH-01',
    body: [
      'Концепция строится на одном принципе: ни один двор не должен быть проходным, и ни один корпус не должен закрывать соседнему выход к воде.',
      'Этажность снижается ступенями от 16 уровней в глубине участка до 9 у кромки леса. Такое решение сохраняет инсоляцию нижних дворов и раскрывает верхние террасы на юго-запад.',
      'Материалы фасадов — светлый известняк в уровне первых этажей, тёмный металл и стекло выше. Бронзовые профили ограждений повторяются в малых формах благоустройства.',
    ],
  },
  {
    slug: 'zemelnye-uchastki-novyy-format',
    date: '2026-07-20',
    category: 'Земельные участки',
    title: 'Новый формат: земельные участки на территории проекта',
    lead: 'Помимо квартир в корпусах, на территории выделены участки под индивидуальную застройку по типовым проектам.',
    cover: 'LAND-PLOT-A',
    body: [
      'Формат предполагает покупку земли, а не готового дома. Застройка ведётся по одному из типовых проектов, согласованных с архитектурной концепцией всей территории.',
      'Это сделано, чтобы индивидуальные дома не выпадали из общего языка проекта: высотность, материалы и посадка на участке заданы заранее.',
      'Все изображения домов в разделе — иллюстративные визуализации типовых проектов. Готовые дома в составе этого предложения не продаются.',
    ],
  },
  {
    slug: 'zelenye-koridory',
    date: '2026-07-06',
    category: 'Благоустройство',
    title: 'Зелёные коридоры: как лес заходит на территорию',
    lead: 'Три пешеходные связи соединяют Закамский Бор с набережной, проходя сквозь дворы без пересечения с проездами.',
    cover: 'YARD-02',
    body: [
      'Коридоры трассированы по существующим просекам, чтобы сохранить максимум взрослых сосен.',
      'Проезды и парковки вынесены на периметр территории. Внутри — только пешеходные и велосипедные связи.',
    ],
  },
  {
    slug: 'pervaya-liniya-berega',
    date: '2026-06-24',
    category: 'Расположение',
    title: 'Первая линия правого берега: что это значит на практике',
    lead: 'Между корпусами и урезом воды нет капитальной застройки — только благоустроенная набережная и прибрежная полоса.',
    cover: 'LOCATION-01',
    body: [
      'Правый берег Камы в этой части почти не застроен. Проект выходит к воде напрямую, без промежуточных участков.',
      'Расстояния и характеристики уточняются по итогам разработки проектной документации.',
    ],
  },
  {
    slug: 'materialy-fasadov',
    date: '2026-06-11',
    category: 'Архитектура',
    title: 'Известняк, стекло, тёмный металл',
    lead: 'Палитра фасадов собрана из трёх материалов и не меняется от корпуса к корпусу.',
    cover: 'ARCH-03',
    body: [
      'Светлый известняк работает в уровне пешехода — там, где материал видно вблизи и трогают руками.',
      'Выше начинается тёмный металл, который визуально облегчает верхние ярусы и подчёркивает ступенчатость.',
    ],
  },
  {
    slug: 'ofis-prodazh',
    date: '2026-05-29',
    category: 'Проект',
    title: 'Офис продаж принимает по записи',
    lead: 'Показ макета, генплана и материалов по земельным участкам — по предварительной записи.',
    cover: 'CONTACTS-01',
    body: ['Запись открыта на будние дни. Встречу можно назначить через форму на странице контактов или по телефону.'],
  },
];

/* ------------------------------------------------------------------ */

const meta = {
  generated_at: TODAY.toISOString().slice(0, 10),
  land_total: land.length,
  land_published: land.filter((l) => l.is_published).length,
  disclaimer: 'Демонстрационные данные. Цены, площади и статусы подлежат письменному утверждению Заказчиком.',
};

const write = (name, data) => {
  writeFileSync(resolve(OUT, name), JSON.stringify(data), 'utf8');
  console.log(`${name}: ${Array.isArray(data) ? data.length + ' записей' : 'ok'}`);
};

/* ------------------------------------------------------------------ */
/* Посадка участков на территории                                       */
/*                                                                      */
/* Каждому участку считается место в метрах от юго-западного угла        */
/* территории. Река идёт по югу, лес — по северу; между ними две улицы,  */
/* вдоль каждой участки по обе стороны. Координаты нужны генплану и      */
/* режиму «На схеме» в каталоге, поэтому живут в данных, а не в          */
/* рисовалке: обе картинки обязаны показывать одну и ту же территорию.   */
/*                                                                      */
/* ВАЖНО: раскладка демонстрационная. Фактические границы определяются   */
/* межеванием и подлежат замене на данные Заказчика.                     */
/* ------------------------------------------------------------------ */

const ROW_SIZE = 12; // участков в ряду
const STREET_W = 9; // ширина проезда, м
const GAP = 1.5; // межевой зазор между соседними участками, м
const PROMENADE = 28; // набережная между застройкой и водой, м
const CORPUS_BAND = 62; // полоса жилых корпусов у воды, м

// Ряды: 0 и 1 смотрят друг на друга через улицу А, 2 и 3 — через улицу Б.
// Ряды 1 и 2 разделены зелёным бульваром: это и есть коридор лес → река.
const BOULEVARD = 22;

let cursorY = PROMENADE + CORPUS_BAND; // отступ от воды
const rowGeom = [];
for (let r = 0; r < 4; r++) {
  const inRow = land.slice(r * ROW_SIZE, (r + 1) * ROW_SIZE);
  const depth = Math.max(...inRow.map((p) => p.depth_m));
  rowGeom.push({ y: cursorY, depth, plots: inRow, facesNorth: r % 2 === 1 });
  cursorY += depth;
  if (r === 0 || r === 2) cursorY += STREET_W; // улица между парой рядов
  if (r === 1) cursorY += BOULEVARD; // зелёный бульвар между парами
}

const territoryDepth = cursorY + 34; // + лесная опушка на севере
let territoryWidth = 0;

for (const row of rowGeom) {
  let x = 0;
  for (const p of row.plots) {
    p.plan_x_m = Math.round(x * 10) / 10;
    p.plan_y_m = Math.round(row.y * 10) / 10;
    p.plan_w_m = p.width_m;
    p.plan_d_m = p.depth_m;
    // Фасадная сторона обращена к проезду: у чётных рядов — на юг, у нечётных — на север
    p.plan_faces = row.facesNorth ? 'north' : 'south';
    x += p.width_m + GAP;
  }
  territoryWidth = Math.max(territoryWidth, x - GAP);
}

const territory = {
  width_m: Math.round(territoryWidth * 10) / 10,
  depth_m: Math.round(territoryDepth * 10) / 10,
  promenade_m: PROMENADE,
  corpus_band_m: CORPUS_BAND,
  street_m: STREET_W,
  boulevard_m: BOULEVARD,
  rows: rowGeom.map((r) => ({ y_m: Math.round(r.y * 10) / 10, depth_m: r.depth })),
  note: 'Демонстрационная посадка. Фактические границы определяются межеванием.',
};

write('territory.json', territory);

write('land.json', land);
write('house-projects.json', houseProjects);
write('gallery.json', gallery);
write('news.json', news);
write('meta.json', meta);
write('utility-labels.json', UTILITY_LABELS);

console.log(`Всего участков: ${meta.land_total} (опубликовано ${meta.land_published})`);
