/* ==========================================================================
   ЖК «Ленская» — карточки лотов.
   LK.initPlot() — карточка земельного участка (land-plot.html?id=…).
   ========================================================================== */

(function () {
  'use strict';
  const LK = window.LK;
  const $ = LK.$;
  const $$ = LK.$$;

  const DISC2 = 'Архитектурная визуализация. Не является отображением фактически построенного объекта.';

  function idFromUrl() {
    return new URLSearchParams(location.search).get('id');
  }

  function notFound(box, isLand) {
    box.innerHTML =
      '<div class="empty"><p class="h3">Лот не найден</p>' +
      '<p class="caption max-44">Возможно, он снят с публикации или ссылка устарела.</p>' +
      '<a class="btn btn--land" href="land.html">В каталог участков</a></div>';
  }

  function galleryHtml(items) {
    const main = items[0];
    return (
      '<div data-lb-group>' +
      '<div class="media gallery-main" data-gallery-main data-lb-item data-lb-src="' + main.src + '" data-lb-caption="' + LK.esc(main.caption) + '" data-lb-disc="' + LK.esc(main.disc || '') + '" style="aspect-ratio:' + (main.ratio || '3/2') + '">' +
      '<img src="' + main.src + '" alt="' + LK.esc(main.caption) + '" width="1500" height="1000">' +
      '</div>' +
      (main.disc ? '<p class="disclaimer">' + LK.esc(main.disc) + '</p>' : '') +
      '<div class="thumbs">' +
      items
        .map(function (it, i) {
          return (
            '<button type="button" data-thumb="' + i + '" aria-current="' + (i === 0 ? 'true' : 'false') + '" aria-label="Показать: ' + LK.esc(it.caption) + '">' +
            '<img src="' + it.src + '" alt="" loading="lazy"></button>'
          );
        })
        .join('') +
      '</div></div>'
    );
  }

  function bindGallery(root, items) {
    const main = $('[data-gallery-main]', root);
    if (!main) return;
    const cap = main.nextElementSibling;
    $$('[data-thumb]', root).forEach(function (btn) {
      btn.addEventListener('click', function () {
        const i = Number(btn.getAttribute('data-thumb'));
        const it = items[i];
        main.querySelector('img').src = it.src;
        main.querySelector('img').alt = it.caption;
        main.setAttribute('data-lb-src', it.src);
        main.setAttribute('data-lb-caption', it.caption);
        main.setAttribute('data-lb-disc', it.disc || '');
        main.style.aspectRatio = it.ratio || '3/2';
        if (cap && cap.classList.contains('disclaimer')) {
          cap.textContent = it.disc || '';
          cap.hidden = !it.disc;
        }
        $$('[data-thumb]', root).forEach(function (b) {
          b.setAttribute('aria-current', b === btn ? 'true' : 'false');
        });
      });
    });
  }

  function ctaBlock(obj, isLand) {
    const title = isLand ? 'Участок №' + obj.plot_number : obj.rooms_short + ' · ' + LK.area(obj.area_total);
    const ctx = JSON.stringify({
      object_type: 'land',
      object_id: obj.id,
      object_title: title,
      title: 'Заявка по лоту: ' + title,
    });

    if (obj.status === 'sold') {
      return (
        '<div class="cta-stack">' +
        '<p class="note-strip">Лот продан. Подберём похожий вариант из доступных.</p>' +
        '<a class="btn btn--land" href="land.html">' +
        (isLand ? 'Подобрать похожий участок' : 'Подобрать похожее') +
        '</a>' +
        '<div class="contact-row">' +
        '<a class="contact-btn" href="tel:+73422000000" data-placement="lot_card">Позвонить</a>' +
        '<a class="contact-btn" href="https://t.me/" data-messenger="telegram" data-placement="lot_card" rel="noopener" target="_blank">Telegram</a>' +
        '</div></div>'
      );
    }

    return (
      '<div class="cta-stack">' +
      '<button type="button" class="btn btn--land" data-modal="modal-consult" data-modal-ctx=\'' + ctx + '\' data-cta="lot_consult">' +
      (isLand ? 'Получить консультацию по участку' : 'Получить консультацию') +
      '</button>' +
      '<button type="button" class="btn btn--secondary" data-modal="modal-visit" data-modal-ctx=\'' + ctx + '\' data-cta="lot_visit">' +
      (isLand ? 'Записаться на просмотр' : 'Записаться в офис продаж') +
      '</button>' +
      '<div class="contact-row">' +
      '<a class="contact-btn" href="tel:+73422000000" data-placement="lot_card">Позвонить</a>' +
      '<a class="contact-btn" href="https://t.me/" data-messenger="telegram" data-placement="lot_card" rel="noopener" target="_blank">Telegram</a>' +
      '<a class="contact-btn" href="https://wa.me/" data-messenger="whatsapp" data-placement="lot_card" rel="noopener" target="_blank">WhatsApp</a>' +
      '<button type="button" class="contact-btn" data-fav="land" data-fav-id="' + obj.id + '" data-label="' + LK.esc(title) + '" aria-pressed="false">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7.5-4.6-7.5-9.4A4.1 4.1 0 0 1 12 8a4.1 4.1 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20Z"/></svg> В избранное</button>' +
      '</div></div>'
    );
  }

  function priceBlock(obj, updated, isLand) {
    if (obj.status === 'sold') return '<p class="lot-price muted">' + (isLand ? 'Продан' : 'Продано') + '</p>';
    // Цены не публикуются — их сообщает менеджер
    if (!LK.LAND_PRICE_PUBLIC) {
      return (
        '<p class="lot-price">Цена по запросу</p>' +
        '<p class="caption mt-2">Стоимость сообщаем по телефону ' +
        '<a href="tel:+73422000000" data-placement="lot_price">+7 (342) 200-00-00</a> ' +
        'или в ответ на заявку. Условия не являются публичной офертой.</p>'
      );
    }
    if (!obj.price)
      return (
        '<p class="lot-price">Цена по запросу</p>' +
        '<p class="caption mt-2">Актуально на ' + LK.dateRu(updated) + '. Не является публичной офертой.</p>'
      );
    return (
      '<p class="lot-price">' + LK.money(obj.price) + '</p>' +
      '<p class="caption mt-2">Актуально на ' + LK.dateRu(updated) + '. Не является публичной офертой.</p>'
    );
  }

  function row(label, value) {
    if (value == null || value === '') return '';
    return '<tr><th scope="row">' + LK.esc(label) + '</th><td>' + value + '</td></tr>';
  }


  /* ====================================================================
     Схема посадки дома: границы, отступы, зона застройки, пятно дома.
     Задача блока — показать вместимость участка, а не эстетику дома.
     ==================================================================== */

  function sitePlanSvg(p, hp) {
    const pad = 46; // поле под размерные подписи
    const scale = 520 / Math.max(p.width_m, p.depth_m);
    const W = p.width_m * scale;
    const D = p.depth_m * scale;
    const VW = W + pad * 2;
    const VH = D + pad * 2;

    const sF = p.setback_front_m * scale;
    const sS = p.setback_side_m * scale;
    const sR = p.setback_rear_m * scale;
    const bx = pad + sS;
    const by = pad + sR;
    const bw = Math.max(0, W - sS * 2);
    const bd = Math.max(0, D - sF - sR);

    let out =
      '<svg viewBox="0 0 ' + VW.toFixed(0) + ' ' + VH.toFixed(0) + '" class="siteplan" role="img" ' +
      'aria-label="Схема участка №' + LK.esc(p.plot_number) + ': границы, отступы и зона допустимого размещения дома">';

    // участок
    out += '<rect x="' + pad + '" y="' + pad + '" width="' + W.toFixed(1) + '" height="' + D.toFixed(1) + '" class="sp-plot"/>';
    // зона застройки
    out += '<rect x="' + bx.toFixed(1) + '" y="' + by.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + bd.toFixed(1) + '" class="sp-build"/>';

    // пятно дома по центру зоны застройки
    if (hp) {
      const hw = hp.footprint_w_m * scale;
      const hd = hp.footprint_d_m * scale;
      const fits = hp.footprint_w_m <= p.width_m - p.setback_side_m * 2 && hp.footprint_d_m <= p.depth_m - p.setback_front_m - p.setback_rear_m;
      const hx = bx + (bw - hw) / 2;
      const hy = by + (bd - hd) / 2;
      out += '<rect x="' + hx.toFixed(1) + '" y="' + hy.toFixed(1) + '" width="' + hw.toFixed(1) + '" height="' + hd.toFixed(1) + '" class="sp-house' + (fits ? '' : ' sp-house--over') + '"/>';
      out +=
        '<text x="' + (hx + hw / 2).toFixed(1) + '" y="' + (hy + hd / 2 + 5).toFixed(1) + '" text-anchor="middle" class="sp-house-label">' +
        LK.esc(hp.title) + '</text>';
      out +=
        '<text x="' + (hx + hw / 2).toFixed(1) + '" y="' + (hy + hd / 2 + 24).toFixed(1) + '" text-anchor="middle" class="sp-house-sub">' +
        LK.dec(hp.footprint_w_m, 1) + ' × ' + LK.dec(hp.footprint_d_m, 1) + ' м</text>';
    }

    // подъезд снизу (передний отступ отсчитывается от него)
    out += '<path d="M ' + pad + ' ' + (pad + D + 14).toFixed(1) + ' H ' + (pad + W).toFixed(1) + '" class="sp-road"/>';
    out += '<text x="' + (pad + W / 2).toFixed(1) + '" y="' + (pad + D + 34).toFixed(1) + '" text-anchor="middle" class="sp-dim">подъезд</text>';

    // размеры
    out += '<text x="' + (pad + W / 2).toFixed(1) + '" y="' + (pad - 16) + '" text-anchor="middle" class="sp-dim">' + LK.dec(p.width_m, 1) + ' м</text>';
    out +=
      '<text x="' + (pad - 16) + '" y="' + (pad + D / 2).toFixed(1) + '" text-anchor="middle" class="sp-dim" ' +
      'transform="rotate(-90 ' + (pad - 16) + ' ' + (pad + D / 2).toFixed(1) + ')">' + LK.dec(p.depth_m, 1) + ' м</text>';

    // север
    out += '<g transform="translate(' + (VW - 26) + ' 26)"><circle r="14" class="sp-compass"/><path d="M 0 -10 L 4 4 L 0 1 L -4 4 Z" class="sp-north"/></g>';
    out += '</svg>';
    return out;
  }

  function renderSitePlan(box, p, projects) {
    if (!box) return;
    let active = projects.length ? projects[0] : null;

    const draw = function () {
      box.innerHTML =
        '<div class="siteplan-wrap">' + sitePlanSvg(p, active) + '</div>' +
        '<ul class="legend mt-4">' +
        '<li><i class="lg-plot"></i>Границы участка · ' + LK.dec(p.width_m, 1) + ' × ' + LK.dec(p.depth_m, 1) + ' м</li>' +
        '<li><i class="lg-build"></i>Зона застройки · ' + LK.num(p.buildable_area_sqm) + ' м²</li>' +
        (active ? '<li><i class="lg-house"></i>Пятно дома · ' + LK.num(Math.round(active.footprint_w_m * active.footprint_d_m)) + ' м²</li>' : '') +
        '</ul>' +
        (projects.length > 1
          ? '<div class="chips mt-5" role="group" aria-label="Проект для схемы посадки">' +
            projects
              .map(function (hp) {
                return (
                  '<button type="button" class="chip" data-siteplan="' + hp.id + '" aria-pressed="' +
                  (active && hp.id === active.id ? 'true' : 'false') + '">' + LK.esc(hp.title) + '</button>'
                );
              })
              .join('') +
            '</div>'
          : '') +
        '<p class="caption mt-4">Отступы приняты ' + p.setback_front_m + ' м от подъезда и ' + p.setback_side_m +
        ' м от боковых границ, коэффициент застройки — ' + LK.dec(p.max_build_ratio * 100, 0) +
        ' %. Значения демонстрационные: итоговые параметры определяются градостроительным планом участка, ПЗЗ и техническими условиями.</p>';

      LK.$$('[data-siteplan]', box).forEach(function (btn) {
        btn.addEventListener('click', function () {
          active = projects.find(function (x) { return x.id === btn.getAttribute('data-siteplan'); });
          LK.track('siteplan_project_change', { object_id: p.id, house_project_id: active.id });
          draw();
        });
      });
    };
    draw();
  }

  /* ====================================================================
     Слайдер «участок → пример застройки»
     ==================================================================== */

  function renderCompare(box, p, hp) {
    if (!box || !hp) return;
    const before = LK.img(p.plot_images[0]);
    const after = LK.img(hp.viz_images[0]);
    box.innerHTML =
      '<h3 class="h3">Участок сейчас и пример застройки</h3>' +
      '<p class="caption mt-3 max-60">Слева — фотография участка, справа — как на нём может выглядеть дом по проекту «' +
      LK.esc(hp.title) + '». Потяните ползунок.</p>' +
      '<div class="compare mt-5" data-compare>' +
      '<img class="compare-before" src="' + before + '" alt="Участок №' + LK.esc(p.plot_number) + ' — фактическое состояние" loading="lazy">' +
      '<div class="compare-after" style="--pos:50%">' +
      '<img src="' + after + '" alt="Пример возможной застройки участка по проекту «' + LK.esc(hp.title) + '» — иллюстративная визуализация" loading="lazy">' +
      '<span class="viz-badge">Визуализация</span>' +
      '</div>' +
      '<span class="compare-handle" aria-hidden="true"></span>' +
      '<label class="visually-hidden" for="cmp-' + p.id + '">Сравнение: участок и пример застройки</label>' +
      '<input id="cmp-' + p.id + '" class="compare-range" type="range" min="0" max="100" value="50" aria-valuetext="50 % примера застройки">' +
      // Правую сторону подписывает бейдж «Визуализация» — второй ярлык был бы дублем
      '<span class="compare-tag compare-tag--l">Участок сейчас</span>' +
      '</div>' +
      '<p class="disclaimer">Иллюстративная визуализация. Итоговый вид определяется выбранным проектом застройки.</p>';

    const wrap = $('[data-compare]', box);
    const range = $('.compare-range', wrap);
    const after_ = $('.compare-after', wrap);
    const handle = $('.compare-handle', wrap);
    const set = function (v) {
      after_.style.setProperty('--pos', v + '%');
      handle.style.left = v + '%';
      range.setAttribute('aria-valuetext', v + ' % примера застройки');
    };
    set(50);
    range.addEventListener('input', function () { set(range.value); });
    LK.track('compare_shown', { object_id: p.id, house_project_id: hp.id });
  }

  /* ====================================================================
     Что входит в стоимость: земля и строительство разведены
     ==================================================================== */

  function renderEconomics(box, p) {
    if (!box) return;
    box.innerHTML =
      '<h2 class="h3">Что входит в стоимость</h2>' +
      '<ul class="incl mt-5">' +
      '<li class="incl-yes"><b>Земельный участок</b><span>' +
      (p.status === 'sold'
        ? 'Продан'
        : LK.LAND_PRICE_PUBLIC && p.price
        ? LK.money(p.price) + ' · ' + LK.num(p.price_per_are) + ' ₽ за сотку'
        : 'Стоимость сообщаем по телефону: <a href="tel:+73422000000" data-placement="plot_economics">+7 (342) 200-00-00</a>') +
      '</span></li>' +
      '<li class="incl-no"><b>Дом и строительство</b><span>Не входят в стоимость участка. Стоимость строительства по типовому проекту — по запросу.</span></li>' +
      '<li class="incl-no"><b>Подключение коммуникаций</b><span>Условия и стоимость подключения уточняются по техническим условиям.</span></li>' +
      '</ul>' +
      '<div class="cta-stack mt-6">' +
      '<button type="button" class="btn btn--land" data-modal="modal-consult" data-modal-ctx=\'' +
      JSON.stringify({ object_type: 'land', object_id: p.id, object_title: 'Участок №' + p.plot_number, title: 'План участка №' + p.plot_number }) +
      '\' data-cta="plot_plan_request">Получить план участка</button>' +
      '<button type="button" class="btn btn--secondary-land" data-modal="modal-visit" data-modal-ctx=\'' +
      JSON.stringify({ object_type: 'land', object_id: p.id, object_title: 'Участок №' + p.plot_number, title: 'Выезд на участок №' + p.plot_number }) +
      '\' data-cta="plot_visit_request">Запросить выезд на участок</button>' +
      '</div>' +
      '<p class="disclaimer mt-4">Цены и условия не являются публичной офертой и подлежат подтверждению у менеджера.</p>';
  }

  /* ====================================================================
     Карточка УЧАСТКА
     ==================================================================== */

  LK.initPlot = function () {
    const box = $('#lot');
    const id = idFromUrl();

    Promise.all([LK.load('land'), LK.load('house-projects')])
      .then(function (res) {
        const land = res[0];
        const projects = res[1];
        const p = land.filter(function (x) { return x.is_published; }).find(function (x) { return x.id === id; });

        if (!p) {
          notFound(box, true);
          document.title = 'Участок не найден — ЖК «Ленская»';
          return;
        }

        const title = 'Участок №' + p.plot_number;
        document.title = title + ' — земельные участки ЖК «Ленская»';
        const crumb = $('#crumb-current');
        if (crumb) crumb.textContent = title;

        const items = p.plot_images.map(function (m, i) {
          return { src: LK.img(m), caption: 'Участок №' + p.plot_number + ', фотография ' + (i + 1), ratio: '3/2' };
        });
        if (p.plot_scheme) items.push({ src: LK.img(p.plot_scheme), caption: 'Схема границ участка №' + p.plot_number, ratio: '1/1' });

        const utils = p.utilities
          .map(function (u) { return LK.UTILITY_LABELS[u]; })
          .join(', ');

        box.innerHTML =
          '<div class="lot-layout">' +
          '<div>' +
          galleryHtml(items) +
          '<p class="media-note">Фотографии и схема границ участка. Материалы предоставляются Заказчиком.</p>' +
          '</div>' +
          '<div class="stack-lg">' +
          '<div>' +
          '<div class="lot-head"><h1 class="h2">' + LK.esc(title) + '</h1>' + LK.statusHtml(p.status, true) + '</div>' +
          '<p class="caption mt-3">' + LK.ares(p.area_ares) + ' · ' + LK.num(p.area_sqm) + ' м² · ' + LK.esc(p.land_use_label) + '</p>' +
          (p.status === 'reserved' && p.reserved_until
            ? '<p class="note-strip mt-4">Участок забронирован до ' + LK.dateRu(p.reserved_until) + '.</p>'
            : '') +
          '<div class="mt-5">' + priceBlock(p, p.updated_at, true) + '</div>' +
          (LK.LAND_PRICE_PUBLIC && p.price ? '<p class="caption mt-2">' + LK.num(p.price_per_are) + ' ₽ за сотку</p>' : '') +
          '</div>' +
          ctaBlock(p, true) +
          '</div></div>';

        box.removeAttribute('aria-busy');
        bindGallery(box, items);
        LK.syncFavButtons(box);

        /* ---- Блок «Что можно здесь построить» ---- */

        const vizBox = $('#house-projects');
        const list = projects.filter(function (hp) { return p.house_project_ids.indexOf(hp.id) > -1; });

        // Схема посадки, сравнение и экономика — до рендеров по смыслу:
        // сначала вместимость участка, потом внешний вид дома.
        renderSitePlan($('#plot-siteplan'), p, list);
        renderEconomics($('#plot-economics'), p);
        if (list.length) renderCompare($('#plot-compare'), p, list[0]);

        // Строка вместимости: продаём потенциал земли, а не готовый дом
        const capacity = $('#capacity-line');
        if (capacity && list.length) {
          const areas = list.map(function (hp) { return hp.area_total; });
          const min = Math.min.apply(null, areas);
          const max = Math.max.apply(null, areas);
          capacity.textContent =
            'На этом участке можно разместить дом площадью ' +
            (min === max ? LK.num(min) + ' м²' : 'от ' + LK.num(min) + ' до ' + LK.num(max) + ' м²') +
            '. Ниже — примеры возможной застройки; в стоимость входит только земельный участок.';
        }

        if (!list.length) {
          vizBox.innerHTML =
            '<p class="caption">Материалы по типовым проектам для этого участка готовятся.</p>' +
            '<button type="button" class="btn btn--land mt-4" data-modal="modal-consult" data-modal-ctx=\'{"object_type":"land","object_id":"' + p.id + '","title":"Запрос материалов по типовым проектам"}\'>Запросить материалы по проектам</button>';
        } else {
          vizBox.innerHTML =
            '<div class="viz-grid" data-lb-group>' +
            list
              .map(function (hp) {
                const img = LK.img(hp.viz_images[0]);
                return (
                  '<article class="viz-card">' +
                  '<div class="media media--16-9" data-lb-item data-lb-src="' + img + '" data-lb-caption="' + LK.esc(hp.title) + '" data-lb-disc="' + LK.esc(hp.disclaimer) + '" data-viz="' + hp.id + '">' +
                  '<img src="' + img + '" alt="Типовой проект «' + LK.esc(hp.title) + '» — иллюстративная визуализация" loading="lazy" width="1600" height="900">' +
                  // Маркировка внутри кадра: галерею часто листают, не читая подписей
                  '<span class="viz-badge">Визуализация</span>' +
                  '</div>' +
                  '<p class="disclaimer viz-disc">' + LK.esc(hp.disclaimer) + '</p>' +
                  '<div class="viz-body">' +
                  '<h3 class="h4">' + LK.esc(hp.title) + '</h3>' +
                  '<div class="viz-specs"><span>' + LK.esc(hp.type_label) + '</span><span><b>' + hp.floors + '</b> эт.</span><span><b>' + LK.num(hp.area_total) + '</b> м²</span><span>пятно <b>' + LK.dec(hp.footprint_w_m, 1) + ' × ' + LK.dec(hp.footprint_d_m, 1) + '</b> м</span></div>' +
                  '<p class="caption">' + LK.esc(hp.description) + '</p>' +
                  '<p class="viz-note">Дом не входит в стоимость участка</p>' +
                  '<button type="button" class="btn btn--secondary-land btn--sm" data-project="' + hp.id + '" style="margin-top:auto">Подробнее о проекте</button>' +
                  '</div></article>'
                );
              })
              .join('') +
            '</div>';

          // Модальное окно проекта
          vizBox.addEventListener('click', function (e) {
            const b = e.target.closest('[data-project]');
            if (b) {
              const hp = list.find(function (x) { return x.id === b.getAttribute('data-project'); });
              openProject(hp, p);
              return;
            }
            const v = e.target.closest('[data-viz]');
            if (v) LK.track('land_viz_open', { object_id: p.id, house_project_id: v.getAttribute('data-viz'), media_type: 'image' });
          });
        }

        /* ---- Параметры участка ---- */

        const paramsBox = $('#plot-params');
        paramsBox.innerHTML =
          '<table class="params"><caption class="visually-hidden">Параметры участка</caption><tbody>' +
          row('Номер участка', '№' + LK.esc(p.plot_number)) +
          row('Площадь', LK.ares(p.area_ares) + ' (' + LK.num(p.area_sqm) + ' м²)') +
          row('Габариты', LK.dec(p.width_m, 1) + ' × ' + LK.dec(p.depth_m, 1) + ' м') +
          row('Зона застройки', LK.num(p.buildable_area_sqm) + ' м² с учётом отступов') +
          row('Максимальное пятно дома', LK.num(p.max_footprint_sqm) + ' м² при коэффициенте застройки ' + LK.dec(p.max_build_ratio * 100, 0) + ' %') +
          row('Отступы', p.setback_front_m + ' м от подъезда, ' + p.setback_side_m + ' м от боковых, ' + p.setback_rear_m + ' м от задней границы') +
          row('Кадастровый номер', p.cadastral_number ? LK.esc(p.cadastral_number) : null) +
          row('Назначение земли', LK.esc(p.land_use_label)) +
          row('Категория земель', LK.esc(p.land_category)) +
          row('Коммуникации', utils ? LK.esc(utils) + ' — ' + LK.esc(LK.UTIL_STATUS[p.utilities_status]) : null) +
          row('Видовые характеристики', p.view.map(function (v) { return LK.VIEW_LABELS[v]; }).join(', ')) +
          row('Рельеф', p.terrain_notes ? LK.esc(p.terrain_notes) : null) +
          row('Статус', (LK.STATUS[p.status] || {}).labelLand) +
          row('Обновлено', LK.dateRu(p.updated_at)) +
          '</tbody></table>';

        // Липкая панель
        const bar = $('.sticky-bar');
        if (bar) {
          bar.innerHTML =
            '<div><p class="micro">' + LK.esc(title) + '</p>' +
            '<p style="font-weight:600">' + (p.status === 'sold' ? 'Продан' : LK.LAND_PRICE_PUBLIC && p.price ? LK.money(p.price) : 'Цена по запросу') + '</p></div>' +
            (p.status === 'sold'
              ? '<a class="btn btn--land" href="land.html">Похожие</a>'
              : '<button type="button" class="btn btn--land" data-modal="modal-consult" data-modal-ctx=\'' +
                JSON.stringify({ object_type: 'land', object_id: p.id, object_title: title, title: 'Заявка по участку: ' + title }) +
                '\'>Консультация</button>');
        }

        LK.track('land_card_view', { object_id: p.id, status: p.status, price_available: !!p.price });

        // Похожие — ТОЛЬКО участки
        const similar = land
          .filter(function (x) {
            return (
              x.is_published &&
              x.id !== p.id &&
              x.status !== 'sold' &&
              Math.abs(x.area_ares - p.area_ares) / p.area_ares < 0.35
            );
          })
          .slice(0, 3);
        const simBox = $('#similar');
        if (simBox) {
          if (similar.length) simBox.innerHTML = similar.map(LK.cardLand).join('');
          else simBox.innerHTML = '<p class="caption">Похожих доступных участков сейчас нет.</p>';
          LK.syncFavButtons(simBox);
        }
      })
      .catch(function (e) {
        if (window.console) console.error("initPlot:", e);
        box.innerHTML = '<div class="empty"><p class="h3">Не удалось загрузить участок</p><a class="btn btn--land" href="land.html">В каталог участков</a></div>';
      });
  };

  function openProject(hp, plot) {
    const modal = document.getElementById('modal-project');
    if (!modal || !hp) return;
    $('#modal-project-title').textContent = 'Типовой проект «' + hp.title + '»';
    $('#modal-project-body').innerHTML =
      '<div data-lb-group>' +
      hp.viz_images
        .map(function (m) {
          return (
            '<figure class="mt-4">' +
            '<div class="media media--16-9" data-lb-item data-lb-src="' + LK.img(m) + '" data-lb-caption="' + LK.esc(hp.title) + '" data-lb-disc="' + LK.esc(hp.disclaimer) + '" style="cursor:zoom-in">' +
            '<img src="' + LK.img(m) + '" alt="Типовой проект «' + LK.esc(hp.title) + '» — иллюстративная визуализация" loading="lazy" width="1600" height="900">' +
            '<span class="viz-badge">Визуализация</span></div>' +
            '<figcaption class="disclaimer">' + LK.esc(hp.disclaimer) + '</figcaption></figure>'
          );
        })
        .join('') +
      (hp.viz_video
        ? '<figure class="mt-4"><div class="media media--16-9"><img src="' + LK.img(hp.viz_video) + '" alt="Кадр видеооблёта проекта «' + LK.esc(hp.title) + '»" loading="lazy"></div>' +
          '<figcaption class="disclaimer">Видеооблёт проекта. ' + LK.esc(hp.disclaimer) + '</figcaption></figure>'
        : '') +
      '</div>' +
      '<div class="viz-specs mt-5"><span>' + LK.esc(hp.type_label) + '</span><span>Этажей: <b>' + hp.floors + '</b></span><span>Площадь: <b>' + LK.num(hp.area_total) + '</b> м²</span><span>Минимальный участок: <b>' + hp.min_plot_ares + '</b> соток</span></div>' +
      '<p class="mt-4">' + LK.esc(hp.description) + '</p>' +
      '<button type="button" class="btn btn--land mt-5" data-modal="modal-consult" data-modal-ctx=\'' +
      JSON.stringify({
        object_type: 'land',
        object_id: plot.id,
        object_title: 'Участок №' + plot.plot_number,
        house_project_id: hp.id,
        title: 'Участок №' + plot.plot_number + ' · проект «' + hp.title + '»',
      }) +
      '\'>Обсудить этот проект</button>';

    modal.hidden = false;
    document.body.classList.add('is-locked');
    $('.modal-close', modal).focus();
    LK.track('land_viz_open', { object_id: plot.id, house_project_id: hp.id, media_type: 'modal' });
  }
})();
