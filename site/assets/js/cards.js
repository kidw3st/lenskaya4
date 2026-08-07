/* ==========================================================================
   ЖК «Ленская» — рендер карточек лотов.
   Карточка квартиры и карточка участка — РАЗНЫЕ типы (раздел 3.1 спецификации):
   разное соотношение сторон, рамка, акцентный цвет и метка типа объекта.
   Ни одна функция не смешивает два типа в одной выдаче.
   ========================================================================== */

(function () {
  'use strict';
  const LK = window.LK;

  function heartSvg() {
    return (
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7.5-4.6-7.5-9.4A4.1 4.1 0 0 1 12 8a4.1 4.1 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20Z"/></svg>'
    );
  }

  function favBtn(type, id, label, snapshot) {
    return (
      '<button type="button" class="fav-btn" data-fav="' +
      type +
      '" data-fav-id="' +
      LK.esc(id) +
      '" data-label="' +
      LK.esc(label) +
      '" data-fav-snapshot="' +
      LK.esc(JSON.stringify(snapshot)) +
      '" aria-pressed="false" aria-label="Добавить в избранное: ' +
      LK.esc(label) +
      '">' +
      heartSvg() +
      '</button>'
    );
  }

  /* ---------- Карточка КВАРТИРЫ: вертикальная 4:5, оливковый код ---------- */

  LK.cardFlat = function (f) {
    const title = f.rooms_short + ' · ' + LK.area(f.area_total);
    const priceHtml =
      f.status === 'sold'
        ? '<span class="muted">Продано</span>'
        : f.price
        ? LK.money(f.price) + '<small>Актуально на ' + LK.dateRu(f.updated_at) + '</small>'
        : 'Цена по запросу<small>Актуально на ' + LK.dateRu(f.updated_at) + '</small>';

    const snap = {
      title: title,
      price: f.price,
      status: f.status,
      image: f.plan_image,
      url: 'flat.html?id=' + f.id,
    };

    return (
      '<article class="card-wrap"><a class="card-flat" href="flat.html?id=' +
      f.id +
      '">' +
      '<div class="media media--4-5">' +
      '<div class="card-top">' +
      LK.statusHtml(f.status, false) +
      favBtn('flat', f.id, title, snap) +
      '</div>' +
      '<img src="' +
      LK.img(f.plan_image) +
      '" alt="Схема планировки: ' +
      LK.esc(f.rooms_label) +
      ', ' +
      LK.area(f.area_total) +
      '" loading="lazy" width="1120" height="1400">' +
      '</div>' +
      '<h3 class="card-title">' +
      LK.esc(title) +
      '</h3>' +
      '<p class="card-meta">' +
      LK.esc(f.building_title) +
      ' · этаж ' +
      f.floor +
      ' из ' +
      f.floors_total +
      ' · ' +
      LK.esc(f.finishing_label) +
      '</p>' +
      '<p class="card-price">' +
      priceHtml +
      '</p>' +
      '</a></article>'
    );
  };

  /* ---------- Карточка УЧАСТКА: горизонтальная 3:2, бронзовая рамка ---------- */

  LK.cardLand = function (p) {
    const title = 'Участок №' + p.plot_number;
    const priceHtml =
      p.status === 'sold'
        ? '<span class="muted">Продан</span>'
        : p.price
        ? LK.money(p.price) + '<small>' + LK.num(p.price_per_are) + ' ₽ за сотку · на ' + LK.dateRu(p.updated_at) + '</small>'
        : 'Цена по запросу<small>Актуально на ' + LK.dateRu(p.updated_at) + '</small>';

    const utils = p.utilities
      .slice(0, 3)
      .map(function (u) {
        return '<span class="util">' + LK.esc(LK.UTILITY_LABELS[u]) + '</span>';
      })
      .join('');

    const snap = {
      title: title,
      price: p.price,
      status: p.status,
      image: p.plot_images[0],
      url: 'land-plot.html?id=' + p.id,
    };

    return (
      '<article class="card-wrap"><a class="card-land" href="land-plot.html?id=' +
      p.id +
      '">' +
      '<div class="media media--3-2">' +
      '<div class="card-top">' +
      '<span class="badge badge--type">Участок</span>' +
      LK.statusHtml(p.status, true) +
      '</div>' +
      '<img src="' +
      LK.img(p.plot_images[0]) +
      '" alt="Земельный участок №' +
      LK.esc(p.plot_number) +
      '" loading="lazy" width="1500" height="1000">' +
      '</div>' +
      '<div class="card-land-body">' +
      '<div class="card-land-head">' +
      '<h3 class="card-title">' +
      LK.esc(title) +
      '</h3>' +
      favBtn('land', p.id, title, snap) +
      '</div>' +
      '<p class="card-meta">' +
      LK.ares(p.area_ares) +
      ' · ' +
      LK.num(p.area_sqm) +
      ' м² · ' +
      LK.esc(p.land_use_label) +
      '</p>' +
      '<div class="util-list">' +
      utils +
      '</div>' +
      '<p class="card-price">' +
      priceHtml +
      '</p>' +
      '</div>' +
      '</a></article>'
    );
  };

  /* ---------- Скелетоны ---------- */

  LK.skeletons = function (n, ratio) {
    let out = '';
    for (let i = 0; i < n; i++) {
      out +=
        '<div class="sk-card" aria-hidden="true">' +
        '<div class="skeleton" style="aspect-ratio:' +
        (ratio || '4/5') +
        '"></div>' +
        '<div class="skeleton sk-line" style="width:60%"></div>' +
        '<div class="skeleton sk-line" style="width:40%"></div>' +
        '</div>';
    }
    return out;
  };

  /* ---------- Пустое состояние (единый компонент, раздел 2.17 п.6) ---------- */

  LK.emptyState = function (opts) {
    return (
      '<div class="empty">' +
      '<span class="empty-icon" aria-hidden="true">◍</span>' +
      '<p class="h3">' +
      LK.esc(opts.title) +
      '</p>' +
      '<p class="caption" style="max-width:44ch">' +
      LK.esc(opts.text) +
      '</p>' +
      (opts.action
        ? '<a class="btn ' + (opts.land ? 'btn--land' : 'btn--flats') + '" href="' + opts.action.href + '">' + LK.esc(opts.action.label) + '</a>'
        : '') +
      (opts.secondary
        ? '<button type="button" class="btn btn--ghost" ' + opts.secondary.attrs + '>' + LK.esc(opts.secondary.label) + '</button>'
        : '') +
      '</div>'
    );
  };
})();
