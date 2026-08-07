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

/* ------------------------------------------------------------------ */
/* Квартиры — 709 лотов                                                */
/* ------------------------------------------------------------------ */

const BUILDINGS = [
  { id: 'A', title: 'Корпус A', floors: 16, sections: 3, count: 192, riverFacing: true },
  { id: 'B', title: 'Корпус B', floors: 14, sections: 3, count: 184, riverFacing: true },
  { id: 'C', title: 'Корпус C', floors: 12, sections: 2, count: 176, riverFacing: false },
  { id: 'D', title: 'Корпус D', floors: 9, sections: 2, count: 157, riverFacing: false },
];

const ROOM_TYPES = [
  { key: 'studio', label: 'Студия', short: 'Ст', w: 12, area: [28, 37], kitchen: null },
  { key: '1', label: '1 комната', short: '1К', w: 26, area: [38, 49], kitchen: [10, 14] },
  { key: '2', label: '2 комнаты', short: '2К', w: 34, area: [57, 75], kitchen: [13, 18] },
  { key: '3', label: '3 комнаты', short: '3К', w: 20, area: [82, 105], kitchen: [16, 22] },
  { key: '4_plus', label: '4 комнаты и более', short: '4К+', w: 8, area: [118, 154], kitchen: [20, 27] },
];

function pickRoomType() {
  const total = ROOM_TYPES.reduce((s, r) => s + r.w, 0);
  let t = rnd() * total;
  for (const r of ROOM_TYPES) {
    t -= r.w;
    if (t <= 0) return r;
  }
  return ROOM_TYPES[2];
}

const FINISHING = [
  { key: 'none', label: 'Без отделки', w: 45 },
  { key: 'pre_finish', label: 'Предчистовая', w: 40 },
  { key: 'turnkey', label: 'С отделкой', w: 15 },
];
function pickFinishing() {
  const total = FINISHING.reduce((s, r) => s + r.w, 0);
  let t = rnd() * total;
  for (const r of FINISHING) {
    t -= r.w;
    if (t <= 0) return r;
  }
  return FINISHING[0];
}

const flats = [];
let seq = 0;

for (const b of BUILDINGS) {
  let made = 0;
  let floor = 2;
  while (made < b.count) {
    const perFloor = Math.min(b.count - made, intBetween(4, 7));
    for (let i = 0; i < perFloor; i++) {
      seq += 1;
      made += 1;
      const rt = pickRoomType();
      const section = String(intBetween(1, b.sections));
      const areaTotal = round2(between(rt.area[0], rt.area[1]));
      const areaKitchen = rt.kitchen ? round2(between(rt.kitchen[0], rt.kitchen[1])) : null;
      const areaLiving = round2(areaTotal * between(0.44, 0.56));
      const isTerraceFloor = floor >= b.floors - 3;
      const areaTerrace = isTerraceFloor && chance(0.55) ? round2(between(6, 19)) : null;

      const view = [];
      if (b.riverFacing && floor >= 5 && chance(0.72)) view.push('river');
      if (chance(0.5)) view.push('forest');
      if (chance(0.45)) view.push('yard');
      if (floor >= 9 && chance(0.3)) view.push('city');
      if (view.length === 0) view.push('yard');

      const features = [];
      if (areaTerrace) features.push('terrace');
      if (floor >= 4 && chance(0.42)) features.push('panoramic_glazing');
      if (i === 0 || i === perFloor - 1) features.push('corner');
      if (chance(0.18)) features.push('two_side');

      // Цена: база + этаж + вид + терраса. Демонстрационная, не утверждена.
      let perSqm = 168000;
      perSqm += Math.min(floor, 12) * 1450;
      if (view.includes('river')) perSqm += 21000;
      if (view.includes('forest')) perSqm += 7000;
      if (features.includes('panoramic_glazing')) perSqm += 6500;
      if (areaTerrace) perSqm += 9000;
      perSqm = Math.round((perSqm * between(0.97, 1.04)) / 1000) * 1000;

      const r = rnd();
      let status = 'free';
      if (r < 0.03) status = 'unpublished';
      else if (r < 0.17) status = 'sold';
      else if (r < 0.26) status = 'reserved';

      const priceOnRequest = chance(0.06);
      const price = priceOnRequest ? null : Math.round((perSqm * areaTotal) / 1000) * 1000;

      const fin = pickFinishing();

      flats.push({
        id: `F-${b.id}-${String(seq).padStart(4, '0')}`,
        object_type: 'flat',
        lot_number: `${b.id}-${String(floor).padStart(2, '0')}${String(i + 1).padStart(2, '0')}`,
        building: b.id,
        building_title: b.title,
        section,
        floor,
        floors_total: b.floors,
        flat_number: String(made),
        rooms: rt.key,
        rooms_label: rt.label,
        rooms_short: rt.short,
        area_total: areaTotal,
        area_living: areaLiving,
        area_kitchen: areaKitchen,
        area_terrace: areaTerrace,
        layout_type: `${rt.short}-${String(intBetween(1, 6)).padStart(2, '0')}`,
        finishing: fin.key,
        finishing_label: fin.label,
        view,
        features,
        price,
        price_per_sqm: price ? Math.round(price / areaTotal) : null,
        status,
        updated_at: daysAgo(intBetween(0, 26)),
        plan_image: `PLAN-${rt.key.toUpperCase().replace('_PLUS', 'P')}`,
        interior_images: chance(0.6) ? ['INT-01', 'INT-02'] : ['INT-01'],
        view_image: view.includes('river') ? 'VIEW-RIVER' : view.includes('forest') ? 'VIEW-FOREST' : 'VIEW-YARD',
        floor_plan: `FLOOR-${b.id}`,
        tour_url: null,
        is_published: status !== 'unpublished',
      });
    }
    floor += 1;
    if (floor > b.floors) floor = 2;
  }
}

/* ------------------------------------------------------------------ */
/* Земельные участки                                                   */
/* ------------------------------------------------------------------ */

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

const progress = [
  {
    id: 'stage-05',
    date: '2026-07',
    title: 'Архитектурная концепция',
    current: true,
    text: 'Концепция сформирована и вынесена на согласование. Строительство не начато.',
    images: ['MASTERPLAN-02'],
  },
  {
    id: 'stage-04',
    date: '2026-05',
    title: 'Генеральный план территории',
    current: false,
    text: 'Определена посадка корпусов, границы дворов, трассировка зелёных коридоров и нарезка земельных участков.',
    images: ['MASTERPLAN-01', 'LAND-PLOT-SCHEME'],
  },
  {
    id: 'stage-03',
    date: '2026-03',
    title: 'Изыскания на площадке',
    current: false,
    text: 'Выполнены геодезические и геологические изыскания, обследование зелёных насаждений.',
    images: ['LOCATION-01'],
  },
  {
    id: 'stage-02',
    date: '2026-01',
    title: 'Формирование земельного массива',
    current: false,
    text: 'Оформлены права на земельный массив, определены границы будущей территории проекта.',
    images: [],
  },
  {
    id: 'stage-01',
    date: '2025-10',
    title: 'Предпроектные исследования',
    current: false,
    text: 'Анализ участка, видовых характеристик и связей с набережной и лесным массивом.',
    images: [],
  },
];

/* ------------------------------------------------------------------ */

const meta = {
  generated_at: TODAY.toISOString().slice(0, 10),
  flats_total: flats.length,
  flats_published: flats.filter((f) => f.is_published).length,
  land_total: land.length,
  land_published: land.filter((l) => l.is_published).length,
  disclaimer: 'Демонстрационные данные. Цены, площади и статусы подлежат письменному утверждению Заказчиком.',
};

const write = (name, data) => {
  writeFileSync(resolve(OUT, name), JSON.stringify(data), 'utf8');
  console.log(`${name}: ${Array.isArray(data) ? data.length + ' записей' : 'ok'}`);
};

write('flats.json', flats);
write('land.json', land);
write('house-projects.json', houseProjects);
write('gallery.json', gallery);
write('news.json', news);
write('progress.json', progress);
write('meta.json', meta);
write('utility-labels.json', UTILITY_LABELS);

console.log(`\nВсего квартир: ${meta.flats_total} (опубликовано ${meta.flats_published})`);
console.log(`Всего участков: ${meta.land_total} (опубликовано ${meta.land_published})`);
