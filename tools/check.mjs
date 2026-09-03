// Статическая проверка сайта. Запуск: node tools/check.mjs
// Проверяет: битые локальные ссылки и медиа, количество H1, наличие alt,
// подключение общих скриптов, наличие дисклеймеров рядом с визуализациями застройки.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = resolve(ROOT, 'site');

const htmlFiles = readdirSync(SITE).filter((f) => f.endsWith('.html'));
const problems = [];
const warn = (file, msg) => problems.push({ file, msg, level: 'ошибка' });
const note = (file, msg) => problems.push({ file, msg, level: 'замечание' });

// Медиа, на которые ссылается JS через LK.img(ID) — собираем из данных.
const dataDir = resolve(SITE, 'data');
const readJson = (n) => JSON.parse(readFileSync(join(dataDir, n), 'utf8'));

const referencedMedia = new Set();
for (const p of readJson('land.json')) {
  p.plot_images.forEach((m) => referencedMedia.add(m));
  if (p.plot_scheme) referencedMedia.add(p.plot_scheme);
}
for (const hp of readJson('house-projects.json')) {
  hp.viz_images.forEach((m) => referencedMedia.add(m));
  if (hp.viz_video) referencedMedia.add(hp.viz_video);
  if (!hp.disclaimer || !hp.disclaimer.trim()) {
    warn('house-projects.json', `Типовой проект ${hp.id}: пустой дисклеймер (запрещено публиковать)`);
  }
}
for (const g of readJson('gallery.json')) referencedMedia.add(g.media_id);
for (const n of readJson('news.json')) referencedMedia.add(n.cover);

// Слот считается закрытым, если есть либо реальное фото (.jpg),
// либо SVG-плейсхолдер. Одно из двух обязательно.
for (const id of referencedMedia) {
  const hasPhoto = existsSync(resolve(SITE, 'assets/img', id + '.jpg'));
  const hasPlaceholder = existsSync(resolve(SITE, 'assets/img', id + '.svg'));
  if (!hasPhoto && !hasPlaceholder) {
    warn('data/*.json', `Нет ни фото, ни плейсхолдера: assets/img/${id}`);
  }
}

// Разбор HTML
for (const file of htmlFiles) {
  const html = readFileSync(resolve(SITE, file), 'utf8');
  // Разметка без содержимого <script>: внутри скриптов лежат шаблоны строк,
  // которые не являются реальными ссылками и тегами.
  const markup = html.replace(/<script\b[\s\S]*?<\/script>/g, '');

  // H1
  const h1 = (markup.match(/<h1[\s>]/g) || []).length;
  const dynamicH1 = /id="lot"|id="article-head"/.test(html);
  if (h1 === 0 && !dynamicH1) warn(file, 'Нет H1 (и нет контейнера для динамического H1)');
  if (h1 > 1) warn(file, `H1 больше одного: ${h1}`);

  // Локальные ссылки и ресурсы
  const refs = [...markup.matchAll(/(?:href|src)="([^"#][^"]*)"/g)].map((m) => m[1]);
  for (const ref of refs) {
    if (/^(https?:|mailto:|tel:|data:|\/\/)/.test(ref)) continue;
    const clean = ref.split('?')[0].split('#')[0];
    if (!clean) continue;
    // Ведущий «/» — корень сайта, а не корень диска.
    const target = clean.startsWith('/') ? resolve(SITE, '.' + clean) : resolve(SITE, clean);
    const isDirRoot = clean === '/';
    if (!isDirRoot && !existsSync(target)) warn(file, `Битая ссылка: ${ref}`);
  }

  // alt у изображений
  const imgs = [...markup.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);
  imgs.forEach((tag) => {
    if (!/\balt=/.test(tag)) warn(file, `У <img> нет alt: ${tag.slice(0, 90)}`);
  });

  // Общие скрипты
  if (!/assets\/js\/site\.js/.test(html)) warn(file, 'Не подключён site.js');

  // Формы: согласие обязательно и не предзаполнено
  const forms = [...html.matchAll(/<form\b[\s\S]*?<\/form>/g)].map((m) => m[0]);
  forms.forEach((form) => {
    const id = (form.match(/data-form="([^"]+)"/) || [])[1];
    if (!id) return; // фильтры каталога — не форма лидогенерации
    if (!/name="consent"[^>]*required/.test(form)) warn(file, `Форма ${id}: чекбокс согласия не обязателен`);
    if (/name="consent"[^>]*\bchecked\b/.test(form)) warn(file, `Форма ${id}: согласие предзаполнено — запрещено`);
    if (!/company_website/.test(form)) note(file, `Форма ${id}: нет honeypot-поля`);
  });

  // Визуализации застройки: рядом должен быть дисклеймер
  if (/HOUSE-VIZ-\d+\.svg/.test(html)) {
    const vizCount = (html.match(/HOUSE-VIZ-\d+\.svg/g) || []).length;
    const discCount = (html.match(/Иллюстративная визуализация/g) || []).length;
    if (discCount === 0) warn(file, 'Есть HOUSE-VIZ без дисклеймера DISC-03');
    else if (discCount * 2 < vizCount) {
      note(file, `HOUSE-VIZ: ${vizCount} упоминаний, дисклеймеров ${discCount} — проверьте покрытие`);
    }
  }

  // Квартиры сняты с сайта: ни карточки, ни ссылки на удалённый каталог
  if (/class="card-flat"/.test(html)) warn(file, 'Найдена карточка квартиры — раздел снят с сайта');
  if (/href="flats?\.html/.test(html)) warn(file, 'Ссылка на удалённый каталог квартир');
}

// Реестр LK.PHOTO_SLOTS должен точно совпадать с .jpg на диске:
// разойдутся — сайт запросит .svg там, где лежит фото, и наоборот.
{
  const siteJs = readFileSync(resolve(SITE, 'assets/js/site.js'), 'utf8');
  const a = siteJs.indexOf('LK.PHOTO_SLOTS = {');
  const b = a < 0 ? -1 : siteJs.indexOf('};', a);
  const m = a < 0 || b < 0 ? null : [null, siteJs.slice(a + 18, b)];
  if (!m) {
    warn('assets/js/site.js', 'Не найден реестр LK.PHOTO_SLOTS');
  } else {
    const declared = new Set(m[1].split(String.fromCharCode(39)).filter((_, k) => k % 2 === 1));
    const onDisk = new Set(readdirSync(resolve(SITE, 'assets/img')).filter((f) => f.endsWith('.jpg')).map((f) => f.slice(0, -4)));
    for (const id of onDisk)
      if (!declared.has(id)) warn('assets/js/site.js', 'Фото ' + id + '.jpg есть на диске, но не объявлено в LK.PHOTO_SLOTS');
    for (const id of declared)
      if (!onDisk.has(id)) warn('assets/js/site.js', 'В LK.PHOTO_SLOTS объявлен ' + id + ', но файла ' + id + '.jpg нет');
  }
}

// Итог
const errors = problems.filter((p) => p.level === 'ошибка');
const notes = problems.filter((p) => p.level === 'замечание');

console.log(`Проверено страниц: ${htmlFiles.length}`);
console.log(`Медиа, на которые ссылаются данные: ${referencedMedia.size}`);
console.log(`\nОшибок: ${errors.length}, замечаний: ${notes.length}\n`);

for (const p of errors) console.log(`  [ошибка] ${p.file}: ${p.msg}`);
for (const p of notes) console.log(`  [замечание] ${p.file}: ${p.msg}`);

if (!problems.length) console.log('Проблем не найдено.');
process.exit(errors.length ? 1 : 0);
