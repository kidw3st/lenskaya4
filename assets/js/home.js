/* ==========================================================================
   Главная страница: превью каталога земельных участков.
   ========================================================================== */

(function () {
  'use strict';
  const LK = window.LK;
  const $ = LK.$;

  /* ---------- Превью земельных участков ---------- */

  const landBox = $('#land-preview-list');
  const landSummary = $('[data-land-summary]');

  if (landBox) {
    landBox.innerHTML = LK.skeletons(3, '3/2');

    Promise.all([LK.load('land'), LK.load('meta')])
      .then(function (res) {
        const land = res[0];
        const meta = res[1];

        if (landSummary) {
          const published = land.filter(function (p) { return p.is_published; });
          const areas = published.map(function (p) { return p.area_ares; });
          landSummary.textContent =
            LK.num(published.length) +
            ' ' +
            LK.plural(published.length, ['участок', 'участка', 'участков']) +
            ' · от ' +
            LK.dec(Math.min.apply(null, areas), 1) +
            ' до ' +
            LK.dec(Math.max.apply(null, areas), 1) +
            ' сотки · данные актуальны на ' +
            LK.dateRu(meta.generated_at);
        }

        const free = land.filter(function (p) {
          return p.is_published && p.status === 'free';
        });
        const pool = free.length >= 3 ? free : land.filter(function (p) { return p.is_published; });

        if (!pool.length) {
          landBox.innerHTML = LK.emptyState({
            title: 'Свободных участков сейчас нет',
            text: 'Оставьте контакты — сообщим, когда появятся новые участки.',
            land: true,
            action: { href: 'contacts.html', label: 'Сообщить о появлении' },
          });
          landBox.removeAttribute('aria-busy');
          return;
        }

        // Показываем участки с разными видовыми характеристиками.
        const byView = { river: null, forest: null, inner: null };
        pool.forEach(function (p) {
          const key = p.view[0];
          if (byView[key] === null) byView[key] = p;
        });
        let pick = Object.keys(byView)
          .map(function (k) { return byView[k]; })
          .filter(Boolean);
        pool.forEach(function (p) {
          if (pick.length < 3 && pick.indexOf(p) === -1) pick.push(p);
        });
        pick = pick.slice(0, 3);

        landBox.innerHTML = pick.map(LK.cardLand).join('');
        landBox.removeAttribute('aria-busy');
        LK.syncFavButtons(landBox);
      })
      .catch(function () {
        landBox.innerHTML =
          '<p class="note-strip">Каталог участков временно недоступен. Позвоните: <a href="tel:+73422000000">+7 (342) 200-00-00</a></p>';
        landBox.removeAttribute('aria-busy');
        if (landSummary) landSummary.textContent = '';
      });
  }

})();
