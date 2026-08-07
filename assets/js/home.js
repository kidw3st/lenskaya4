/* ==========================================================================
   Главная страница: превью каталога квартир, превью участков, ход проекта.
   Две выдачи строятся независимо и никогда не смешиваются (раздел 3.1).
   ========================================================================== */

(function () {
  'use strict';
  const LK = window.LK;
  const $ = LK.$;

  /* ---------- Блок 9. Превью квартир ---------- */

  const flatsBox = $('#flats-preview-list');
  const summary = $('[data-flats-summary]');

  if (flatsBox) {
    flatsBox.innerHTML = LK.skeletons(4, '4/5');

    Promise.all([LK.load('flats'), LK.load('meta')])
      .then(function (res) {
        const flats = res[0];
        const meta = res[1];
        const published = flats.filter(function (f) {
          return f.is_published;
        });

        if (summary) {
          const areas = published.map(function (f) {
            return f.area_total;
          });
          summary.textContent =
            LK.num(published.length) +
            ' ' +
            LK.plural(published.length, ['лот', 'лота', 'лотов']) +
            ' · студии, 1–4 комнаты · площади от ' +
            LK.area(Math.min.apply(null, areas)) +
            ' до ' +
            LK.area(Math.max.apply(null, areas)) +
            ' · данные актуальны на ' +
            LK.dateRu(meta.generated_at);
        }

        // В ленту — только свободные лоты с ценой; иначе — свободные без цены.
        let pool = published.filter(function (f) {
          return f.status === 'free' && f.price;
        });
        if (pool.length < 4) {
          pool = published.filter(function (f) {
            return f.status === 'free';
          });
        }

        // Разная комнатность, чтобы лента была информативной.
        const seen = {};
        const pick = [];
        pool.forEach(function (f) {
          if (pick.length >= 4) return;
          if (seen[f.rooms]) return;
          seen[f.rooms] = true;
          pick.push(f);
        });
        while (pick.length < 4 && pool.length > pick.length) {
          const next = pool[pick.length];
          if (pick.indexOf(next) === -1) pick.push(next);
          else break;
        }

        if (!pick.length) {
          // Свёрнутый вид: заголовок и CTA остаются, пустая сетка не показывается.
          flatsBox.remove();
          return;
        }

        flatsBox.innerHTML = pick.map(LK.cardFlat).join('');
        flatsBox.removeAttribute('aria-busy');
        LK.syncFavButtons(flatsBox);
      })
      .catch(function () {
        flatsBox.innerHTML =
          '<p class="note-strip">Каталог временно недоступен. Позвоните: <a href="tel:+73422000000">+7 (342) 200-00-00</a></p>';
        flatsBox.removeAttribute('aria-busy');
        if (summary) summary.textContent = '';
      });
  }

  /* ---------- Блок 10. Превью земельных участков ---------- */

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

  /* ---------- Блок 12. Ход проекта ---------- */

  const progressBox = $('#home-progress');

  if (progressBox) {
    LK.load('progress')
      .then(function (items) {
        progressBox.innerHTML = items
          .slice(0, 4)
          .map(function (s) {
            const d = s.date.split('-');
            const months = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
            return (
              '<div class="timeline-item' + (s.current ? ' is-current' : '') + '">' +
              '<p class="micro" style="color:var(--c-bronze-text)">' + months[Number(d[1]) - 1] + ' ' + d[0] + (s.current ? ' · текущая стадия' : '') + '</p>' +
              '<h3 class="h4">' + LK.esc(s.title) + '</h3>' +
              '<p class="caption">' + LK.esc(s.text) + '</p>' +
              '</div>'
            );
          })
          .join('');
      })
      .catch(function () {
        progressBox.innerHTML = '<p class="caption">Хронология временно недоступна.</p>';
      });
  }
})();
