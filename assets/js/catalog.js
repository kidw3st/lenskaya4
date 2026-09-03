/* ==========================================================================
   ЖК «Ленская» — движок каталога земельных участков.
   ========================================================================== */

(function () {
  'use strict';
  const LK = window.LK;
  const $ = LK.$;
  const $$ = LK.$$;

  const CONFIGS = {
    land: {
      data: 'land',
      card: function (x) { return LK.cardLand(x); },
      isLand: true,
      perPage: function () { return window.innerWidth < 768 ? 9 : 12; },
      countWord: ['участок', 'участка', 'участков'],
      emptyAction: { href: 'land/', label: 'Сбросить фильтры' },
      defaults: { status: ['free'] },
      groups: {
        status: { field: 'status', mode: 'or', label: 'Статус', names: { free: 'Свободен', reserved: 'Бронь', sold: 'Продан' } },
        land_use: { field: 'land_use', mode: 'or', label: 'Назначение', names: { izhs: 'ИЖС', lph: 'ЛПХ' } },
        utilities: { field: 'utilities', mode: 'and', array: true, label: 'Коммуникации', names: LK.UTILITY_LABELS },
        view: { field: 'view', mode: 'or', array: true, label: 'Вид', names: LK.VIEW_LABELS },
      },
      // Цены участков не публикуются, поэтому фильтра и сортировки
      // по цене в этом каталоге нет — они вводили бы в заблуждение.
      ranges: {
        area: { field: 'area_ares', label: 'Площадь', unit: 'сот.' },
      },
      selects: {},
      sorters: {
        default: function (a, b) { return Number(a.plot_number) - Number(b.plot_number); },
        area_asc: function (a, b) { return a.area_ares - b.area_ares; },
        area_desc: function (a, b) { return b.area_ares - a.area_ares; },
        updated: function (a, b) { return a.updated_at < b.updated_at ? 1 : -1; },
      },
    },
  };

  LK.initCatalog = function (kind) {
    const cfg = CONFIGS[kind];
    const form = $('#filters');
    const results = $('#results');
    const applied = $('#applied');
    const pagination = $('#pagination');
    const pageInfo = $('#page-info');
    const countEl = $('[data-count]');
    const countWordEl = $('[data-count-word]');
    const sortEl = $('#sort');
    if (!results) return;

    let all = [];
    let filtered = [];
    let page = 1;

    const state = { groups: {}, ranges: {}, selects: {}, sort: 'default' };
    Object.keys(cfg.groups).forEach(function (g) {
      state.groups[g] = (cfg.defaults[g] || []).slice();
    });
    Object.keys(cfg.ranges).forEach(function (r) {
      state.ranges[r] = { from: null, to: null };
    });

    results.innerHTML = LK.skeletons(cfg.perPage() > 12 ? 8 : 6, cfg.isLand ? '3/2' : '4/5');

    /* ---------------- URL ---------------- */

    function readUrl() {
      const p = new URLSearchParams(location.search);
      Object.keys(cfg.groups).forEach(function (g) {
        if (p.has(g)) state.groups[g] = p.get(g).split(',').filter(Boolean);
      });
      Object.keys(cfg.ranges).forEach(function (r) {
        const f = p.get(r + '_from');
        const t = p.get(r + '_to');
        state.ranges[r] = { from: f ? Number(f) : null, to: t ? Number(t) : null };
      });
      Object.keys(cfg.selects).forEach(function (s) {
        if (p.has(s)) state.selects[s] = p.get(s);
      });
      if (p.has('sort')) state.sort = p.get('sort');
      if (p.has('page')) page = Math.max(1, Number(p.get('page')) || 1);
    }

    function writeUrl(replace) {
      const p = new URLSearchParams();
      Object.keys(state.groups).forEach(function (g) {
        const v = state.groups[g];
        const d = cfg.defaults[g] || [];
        if (v.length && v.join(',') !== d.join(',')) p.set(g, v.join(','));
      });
      Object.keys(state.ranges).forEach(function (r) {
        if (state.ranges[r].from != null) p.set(r + '_from', state.ranges[r].from);
        if (state.ranges[r].to != null) p.set(r + '_to', state.ranges[r].to);
      });
      Object.keys(state.selects).forEach(function (s) {
        if (state.selects[s]) p.set(s, state.selects[s]);
      });
      if (state.sort !== 'default') p.set('sort', state.sort);
      if (page > 1) p.set('page', page);
      const url = location.pathname + (p.toString() ? '?' + p.toString() : '');
      history[replace ? 'replaceState' : 'pushState']({}, '', url);
    }

    /* ---------------- Синхронизация контролов ---------------- */

    function syncControls() {
      $$('[data-multi]', form).forEach(function (el) {
        const g = el.getAttribute('data-multi');
        const v = el.getAttribute('data-value') || el.value;
        const on = (state.groups[g] || []).indexOf(v) > -1;
        if (el.type === 'checkbox') el.checked = on;
        else el.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      Object.keys(cfg.ranges).forEach(function (r) {
        const a = form.elements[r + '_from'];
        const b = form.elements[r + '_to'];
        if (a) a.value = state.ranges[r].from == null ? '' : state.ranges[r].from;
        if (b) b.value = state.ranges[r].to == null ? '' : state.ranges[r].to;
      });
      Object.keys(cfg.selects).forEach(function (s) {
        if (form.elements[s]) form.elements[s].value = state.selects[s] || '';
      });
      if (sortEl) sortEl.value = state.sort;
    }

    function readControls() {
      $$('[data-multi]', form).forEach(function (el) {
        const g = el.getAttribute('data-multi');
        const v = el.getAttribute('data-value') || el.value;
        const on = el.type === 'checkbox' ? el.checked : el.getAttribute('aria-pressed') === 'true';
        const arr = state.groups[g] || (state.groups[g] = []);
        const i = arr.indexOf(v);
        if (on && i === -1) arr.push(v);
        if (!on && i > -1) arr.splice(i, 1);
      });
      Object.keys(cfg.ranges).forEach(function (r) {
        const a = form.elements[r + '_from'];
        const b = form.elements[r + '_to'];
        state.ranges[r] = {
          from: a && a.value !== '' ? Number(a.value) : null,
          to: b && b.value !== '' ? Number(b.value) : null,
        };
      });
      Object.keys(cfg.selects).forEach(function (s) {
        state.selects[s] = form.elements[s] ? form.elements[s].value : '';
      });
    }

    /* ---------------- Фильтрация ---------------- */

    function apply() {
      filtered = all.filter(function (item) {
        // Непубликуемые лоты не отдаются в выдачу.
        if (!item.is_published) return false;

        for (const g in cfg.groups) {
          const sel = state.groups[g];
          if (!sel || !sel.length) continue;
          const conf = cfg.groups[g];
          const val = item[conf.field];
          if (conf.array) {
            if (conf.mode === 'and') {
              if (!sel.every(function (s) { return val.indexOf(s) > -1; })) return false;
            } else if (!sel.some(function (s) { return val.indexOf(s) > -1; })) return false;
          } else if (sel.indexOf(String(val)) === -1) return false;
        }

        for (const r in cfg.ranges) {
          const range = state.ranges[r];
          if (range.from == null && range.to == null) continue;
          const val = item[cfg.ranges[r].field];
          if (val == null) return false; // «цена по запросу» не проходит фильтр по цене
          if (range.from != null && val < range.from) return false;
          if (range.to != null && val > range.to) return false;
        }

        for (const s in cfg.selects) {
          const v = state.selects[s];
          if (v && String(item[cfg.selects[s].field]) !== v) return false;
        }

        return true;
      });

      filtered.sort(cfg.sorters[state.sort] || cfg.sorters.default);
    }

    /* ---------------- Отрисовка ---------------- */

    function renderApplied() {
      const chips = [];
      Object.keys(state.groups).forEach(function (g) {
        const conf = cfg.groups[g];
        const d = cfg.defaults[g] || [];
        state.groups[g].forEach(function (v) {
          if (d.length === 1 && d[0] === v && state.groups[g].length === 1) return;
          const name = (conf.names && conf.names[v]) || v;
          chips.push(
            '<span class="applied-chip">' + LK.esc(conf.label) + ': ' + LK.esc(name) +
            '<button type="button" data-drop-group="' + g + '" data-drop-value="' + LK.esc(v) + '" aria-label="Убрать фильтр ' + LK.esc(name) + '">×</button></span>'
          );
        });
      });
      Object.keys(state.ranges).forEach(function (r) {
        const range = state.ranges[r];
        if (range.from == null && range.to == null) return;
        const c = cfg.ranges[r];
        const txt =
          c.label + ': ' + (range.from != null ? 'от ' + LK.num(range.from) : '') +
          (range.to != null ? ' до ' + LK.num(range.to) : '') + ' ' + c.unit;
        chips.push(
          '<span class="applied-chip">' + LK.esc(txt.trim()) +
          '<button type="button" data-drop-range="' + r + '" aria-label="Убрать фильтр по параметру ' + LK.esc(c.label) + '">×</button></span>'
        );
      });
      Object.keys(state.selects).forEach(function (s) {
        const v = state.selects[s];
        if (!v) return;
        const c = cfg.selects[s];
        chips.push(
          '<span class="applied-chip">' + LK.esc(c.label) + ': ' + LK.esc(c.names[v] || v) +
          '<button type="button" data-drop-select="' + s + '" aria-label="Убрать фильтр">×</button></span>'
        );
      });

      applied.innerHTML = chips.length
        ? chips.join('') + '<button type="button" class="btn btn--ghost btn--sm" data-reset-all>Сбросить всё</button>'
        : '';
    }

    function render() {
      const per = cfg.perPage();
      const pages = Math.max(1, Math.ceil(filtered.length / per));
      if (page > pages) page = pages;
      const slice = filtered.slice((page - 1) * per, page * per);

      countEl.textContent = LK.num(filtered.length);
      if (countWordEl) countWordEl.textContent = LK.plural(filtered.length, cfg.countWord);

      const applyCount = $('[data-apply-count]');
      if (applyCount) applyCount.textContent = LK.num(filtered.length);

      if (!filtered.length) {
        results.innerHTML = LK.emptyState({
          title: 'Ничего не найдено',
          text: cfg.isLand
            ? 'По заданным параметрам свободных участков нет. Измените фильтры или оставьте заявку на подбор.'
            : 'По заданным параметрам лотов нет. Измените фильтры или оставьте заявку на подбор.',
          land: cfg.isLand,
          action: cfg.emptyAction,
        });
        pagination.innerHTML = '';
        pageInfo.textContent = '';
      } else {
        results.innerHTML = slice.map(cfg.card).join('');
        LK.syncFavButtons(results);
        renderPagination(pages);
        pageInfo.textContent =
          'Показано ' + LK.num(slice.length) + ' из ' + LK.num(filtered.length) + ' · страница ' + page + ' из ' + pages;
      }

      results.removeAttribute('aria-busy');
      results.classList.remove('is-busy');
      renderApplied();
      if (cfg.isLand && typeof renderScheme === 'function') renderScheme();
    }

    function renderPagination(pages) {
      if (pages <= 1) {
        pagination.innerHTML = '';
        return;
      }
      let html = '<button type="button" data-page="' + (page - 1) + '"' + (page === 1 ? ' disabled' : '') + ' aria-label="Предыдущая страница">←</button>';
      const nums = [];
      for (let i = 1; i <= pages; i++) {
        if (i === 1 || i === pages || Math.abs(i - page) <= 1) nums.push(i);
        else if (nums[nums.length - 1] !== '…') nums.push('…');
      }
      nums.forEach(function (n) {
        if (n === '…') html += '<span class="caption" style="padding:0 6px">…</span>';
        else html += '<button type="button" data-page="' + n + '"' + (n === page ? ' aria-current="page"' : '') + '>' + n + '</button>';
      });
      html += '<button type="button" data-page="' + (page + 1) + '"' + (page === pages ? ' disabled' : '') + ' aria-label="Следующая страница">→</button>';
      pagination.innerHTML = html;
    }

    /* ---------------- Схема нарезки участков ---------------- */

    let renderScheme = null;
    const schemeBox = $('#plot-scheme');

    if (cfg.isLand && schemeBox) {
      // Цвета берём из текущей темы, поэтому схема одинаково читается
      // и в светлом, и в тёмном оформлении.
      const themeColor = function (name, fallback) {
        const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
        return v || fallback;
      };

      renderScheme = function () {
        const cols = 8;
        const cw = 150;
        const ch = 120;
        const gap = 14;
        const rows = Math.ceil(all.length / cols);
        const W = cols * (cw + gap) + gap;
        const H = rows * (ch + gap) + gap + 44;
        const visible = {};
        filtered.forEach(function (p) { visible[p.id] = true; });

        const cSurface = themeColor('--surface', '#fff');
        const cText = themeColor('--text', '#1a201d');
        const cMuted = themeColor('--text-2', '#5a615a');
        const cFree = themeColor('--accent', '#6e7a55');
        const cRes = themeColor('--bronze', '#a8814f');
        const cSold = themeColor('--text-3', '#767d75');

        let svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Схема нарезки земельных участков">';
        svg += '<rect width="' + W + '" height="' + H + '" fill="' + cSurface + '"/>';
        svg += '<text x="' + gap + '" y="28" font-size="16" fill="' + cMuted + '" font-family="system-ui">Нажмите на участок, чтобы открыть карточку</text>';

        all.forEach(function (p, i) {
          if (!p.is_published) return;
          const x = gap + (i % cols) * (cw + gap);
          const y = 44 + gap + Math.floor(i / cols) * (ch + gap);
          const fill = p.status === 'free' ? cFree : p.status === 'reserved' ? cRes : cSold;
          const op = visible[p.id] ? 0.6 : 0.12;
          svg +=
            '<a href="' + LK.url('land-plot/?id=' + p.id) + '" class="plot-poly" aria-label="Участок №' + p.plot_number + ', ' + LK.dec(p.area_ares, 2) + ' сотки">' +
            '<rect x="' + x + '" y="' + y + '" width="' + cw + '" height="' + ch + '" rx="8" fill="' + fill + '" fill-opacity="' + op + '" stroke="' + cText + '" stroke-opacity="0.35" stroke-width="1.5"/>' +
            '<text x="' + (x + cw / 2) + '" y="' + (y + ch / 2 - 4) + '" text-anchor="middle" font-size="22" font-family="system-ui" fill="' + cText + '">№' + p.plot_number + '</text>' +
            '<text x="' + (x + cw / 2) + '" y="' + (y + ch / 2 + 22) + '" text-anchor="middle" font-size="15" font-family="system-ui" fill="' + cMuted + '">' + LK.dec(p.area_ares, 2).replace('.', ',') + ' сот.</text>' +
            '<title>Участок №' + p.plot_number + ' · ' + LK.dec(p.area_ares, 2) + ' сотки · ' + (LK.STATUS[p.status] || {}).labelLand + '</title>' +
            '</a>';
        });
        svg += '</svg>';
        schemeBox.innerHTML = svg;
      };

      // Перерисовываем схему при смене темы
      document.addEventListener('lk:themechange', function () {
        if (!$('#view-scheme').hidden) renderScheme();
      });

      $$('[data-view]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          const v = btn.getAttribute('data-view');
          $$('[data-view]').forEach(function (b) {
            b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
          });
          $('#view-list').hidden = v !== 'list';
          $('#view-scheme').hidden = v !== 'scheme';
          if (v === 'scheme') renderScheme();
          LK.track('catalog_view_change', { catalog: 'land', value: v });
        });
      });

    }

    /* ---------------- Обновление ---------------- */

    let timer = null;
    function update(opts) {
      results.classList.add('is-busy');
      clearTimeout(timer);
      timer = setTimeout(function () {
        apply();
        if (!opts || !opts.keepPage) page = 1;
        render();
        writeUrl(true);
        LK.track('filter_apply', {
          catalog: kind,
          results_count: filtered.length,
          fields: Object.keys(state.groups)
            .filter(function (g) { return state.groups[g].length; })
            .join(','),
        });
      }, 220);
    }

    /* ---------------- События ---------------- */

    form.addEventListener('click', function (e) {
      const chip = e.target.closest('.chip[data-multi]');
      if (chip) {
        chip.setAttribute('aria-pressed', chip.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
        readControls();
        update();
        return;
      }
      if (e.target.closest('[data-reset]')) {
        Object.keys(state.groups).forEach(function (g) {
          state.groups[g] = (cfg.defaults[g] || []).slice();
        });
        Object.keys(state.ranges).forEach(function (r) {
          state.ranges[r] = { from: null, to: null };
        });
        Object.keys(state.selects).forEach(function (s) {
          state.selects[s] = '';
        });
        syncControls();
        update();
        LK.track('filter_reset', { catalog: kind });
      }
      if (e.target.closest('[data-apply]')) closeSheet();
    });

    form.addEventListener('change', function (e) {
      if (e.target.matches('input[type="checkbox"][data-multi], select')) {
        readControls();
        update();
      }
    });

    form.addEventListener('input', function (e) {
      if (e.target.matches('input[type="number"]')) {
        readControls();
        update();
      }
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      closeSheet();
    });

    applied.addEventListener('click', function (e) {
      const g = e.target.closest('[data-drop-group]');
      if (g) {
        const key = g.getAttribute('data-drop-group');
        const val = g.getAttribute('data-drop-value');
        state.groups[key] = state.groups[key].filter(function (v) { return v !== val; });
        syncControls();
        update();
        return;
      }
      const r = e.target.closest('[data-drop-range]');
      if (r) {
        state.ranges[r.getAttribute('data-drop-range')] = { from: null, to: null };
        syncControls();
        update();
        return;
      }
      const s = e.target.closest('[data-drop-select]');
      if (s) {
        state.selects[s.getAttribute('data-drop-select')] = '';
        syncControls();
        update();
        return;
      }
      if (e.target.closest('[data-reset-all]')) {
        Object.keys(state.groups).forEach(function (k) { state.groups[k] = []; });
        Object.keys(state.ranges).forEach(function (k) { state.ranges[k] = { from: null, to: null }; });
        Object.keys(state.selects).forEach(function (k) { state.selects[k] = ''; });
        syncControls();
        update();
        LK.track('filter_reset', { catalog: kind });
      }
    });

    if (sortEl) {
      sortEl.addEventListener('change', function () {
        state.sort = sortEl.value;
        LK.track('sort_change', { catalog: kind, value: state.sort });
        update();
      });
    }

    pagination.addEventListener('click', function (e) {
      const b = e.target.closest('[data-page]');
      if (!b || b.disabled) return;
      page = Number(b.getAttribute('data-page'));
      render();
      writeUrl(false);
      LK.track('pagination_click', { catalog: kind, page: page });
      window.scrollTo({ top: results.getBoundingClientRect().top + window.scrollY - 120, behavior: 'smooth' });
    });

    // Мобильная панель фильтров
    const openBtn = $('[data-filters-open]');
    function closeSheet() {
      form.classList.remove('is-open');
      document.body.classList.remove('is-locked');
      if (openBtn) openBtn.setAttribute('aria-expanded', 'false');
    }
    if (openBtn) {
      openBtn.addEventListener('click', function () {
        const open = !form.classList.contains('is-open');
        form.classList.toggle('is-open', open);
        document.body.classList.toggle('is-locked', open);
        openBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && form.classList.contains('is-open')) closeSheet();
      });
    }

    window.addEventListener('popstate', function () {
      readUrl();
      syncControls();
      apply();
      render();
    });

    /* ---------------- Загрузка ---------------- */

    LK.load(cfg.data)
      .then(function (data) {
        all = data;
        readUrl();
        syncControls();
        apply();
        render();

        const meta = $('[data-catalog-meta]');
        if (meta) {
          const pub = all.filter(function (x) { return x.is_published; }).length;
          LK.load('meta').then(function (m) {
            meta.textContent =
              'В каталоге ' + LK.num(pub) + ' ' + LK.plural(pub, cfg.countWord) +
              '. Цены и статусы актуальны на ' + LK.dateRu(m.generated_at) +
              '. Информация не является публичной офертой.';
          });
        }
      })
      .catch(function () {
        results.innerHTML =
          '<div class="empty"><p class="h3">Каталог временно недоступен</p>' +
          '<p class="caption">Попробуйте обновить страницу или позвоните нам.</p>' +
          '<a class="btn" href="tel:+73422000000">+7 (342) 200-00-00</a></div>';
        results.removeAttribute('aria-busy');
        countEl.textContent = '—';
      });
  };

  /* ---------------- Чипы внутри форм лидогенерации ---------------- */

  document.addEventListener('click', function (e) {
    const chip = e.target.closest('.chip[data-form-chip]');
    if (!chip) return;
    const name = chip.getAttribute('data-form-chip');
    const form = chip.closest('form');
    if (!form || !form.elements[name]) return;
    chip.setAttribute('aria-pressed', chip.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
    const values = LK.$$('.chip[data-form-chip="' + name + '"][aria-pressed="true"]', form).map(function (c) {
      return c.getAttribute('data-value');
    });
    form.elements[name].value = values.join(',');
  });
})();
