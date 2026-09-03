/* ==========================================================================
   ЖК «Ленская» — общее поведение интерфейса
   Реализует разделы 2.1–2.3, 2.17, 6, 7 и 9.4 спецификации.
   ========================================================================== */

(function () {
  'use strict';

  const LK = (window.LK = {});
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.prototype.slice.call((ctx || document).querySelectorAll(sel));

  LK.$ = $;
  LK.$$ = $$;

  /* ====================================================================
     Аналитика. В продакшене — Яндекс Метрика (цели раздела 9.4).
     ==================================================================== */

  window.dataLayer = window.dataLayer || [];
  LK.track = function (event, params) {
    const payload = Object.assign({ event: event, page: location.pathname }, params || {});
    window.dataLayer.push(payload);
    if (window.LK_DEBUG) console.debug('[track]', event, payload);
  };

  /* ====================================================================
     Форматирование
     ==================================================================== */

  const NBSP = ' ';

  LK.num = function (n) {
    return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  };

  LK.money = function (n) {
    if (n == null) return 'Цена по запросу';
    return LK.num(n) + NBSP + '₽';
  };

  LK.dec = function (n, d) {
    return Number(n).toFixed(d == null ? 1 : d).replace('.', ',');
  };

  LK.area = function (n) {
    return LK.dec(n, 1) + NBSP + 'м²';
  };

  LK.ares = function (n) {
    return LK.dec(n, 2) + NBSP + 'сотки';
  };

  // Склонение существительного при числе: plural(5, ['лот','лота','лотов'])
  LK.plural = function (n, forms) {
    const a = Math.abs(n) % 100;
    const b = a % 10;
    if (a > 10 && a < 20) return forms[2];
    if (b > 1 && b < 5) return forms[1];
    if (b === 1) return forms[0];
    return forms[2];
  };

  LK.dateRu = function (iso) {
    if (!iso) return '';
    const m = [
      'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
      'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
    ];
    const d = new Date(iso + 'T00:00:00');
    return d.getDate() + NBSP + m[d.getMonth()] + NBSP + d.getFullYear();
  };

  LK.STATUS = {
    free: { label: 'Свободна', labelLand: 'Свободен', cls: 'status--free' },
    reserved: { label: 'Бронь', labelLand: 'Бронь', cls: 'status--reserved' },
    sold: { label: 'Продано', labelLand: 'Продан', cls: 'status--sold' },
  };

  LK.statusHtml = function (key, isLand) {
    const s = LK.STATUS[key] || LK.STATUS.free;
    return '<span class="status ' + s.cls + '">' + (isLand ? s.labelLand : s.label) + '</span>';
  };

  // Слоты, для которых Заказчик предоставил реальные материалы (JPEG).
  // Остальные остаются SVG-плейсхолдерами до получения съёмки или рендера.
  LK.PHOTO_SLOTS = {
    'HERO-01F': 1,
    'MASTERPLAN-02': 1,
    'LOCATION-01': 1,
    'LOCATION-02': 1,
    'ARCH-01': 1,
    'ARCH-08': 1,
    'ARCH-09': 1,
    'INFRA-01': 1,
    'YARD-03': 1,
    'ABOUT-01': 1,
  };

  LK.img = function (id) {
    return 'assets/img/' + id + (LK.PHOTO_SLOTS[id] ? '.jpg' : '.svg');
  };

  LK.esc = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  };

  LK.VIEW_LABELS = { river: 'Река', forest: 'Лес', yard: 'Двор', city: 'Город', inner: 'Внутренний' };
  LK.FEATURE_LABELS = {
    terrace: 'Терраса',
    panoramic_glazing: 'Панорамное остекление',
    corner: 'Угловая',
    two_side: 'Две стороны света',
  };
  LK.UTILITY_LABELS = {
    electricity: 'Электричество',
    water: 'Водоснабжение',
    gas: 'Газ',
    sewerage: 'Канализация',
    road: 'Дорога с твёрдым покрытием',
  };
  LK.UTIL_STATUS = {
    connected: 'подведено',
    at_border: 'по границе участка',
    planned: 'планируется',
  };

  // ЕДИНАЯ ПОЛИТИКА ЦЕН.
  // Участки — основной продукт: цену называет менеджер по телефону.
  // Корпуса — готовый проект, показанный инвесторам, а не розничная продажа
  // квартир, поэтому ценники по лотам там тоже не публикуются.
  // Цены в land.json и flats.json сохранены: они нужны CRM и выгрузкам.
  // Чтобы вернуть публикацию — поставить нужный флаг в true.
  LK.LAND_PRICE_PUBLIC = false;
  LK.FLAT_PRICE_PUBLIC = false;

  LK.landPriceLabel = function (p) {
    if (p && p.status === 'sold') return 'Продан';
    return 'Цена по запросу';
  };

  LK.DISC3 = 'Иллюстративная визуализация. Итоговый вид определяется выбранным проектом застройки.';

  /* ====================================================================
     Загрузка данных
     ==================================================================== */

  const cache = {};

  // Версия берётся из ссылки на сам скрипт (assets/js/site.js?v=N) и
  // добавляется к запросам данных. Иначе хостинг отдаёт JSON из кэша,
  // и цены со статусами могут отставать от свежей выкладки.
  const ASSET_VERSION = (function () {
    const el = document.currentScript || $('script[src*="site.js"]');
    const m = el && /[?&]v=(\d+)/.exec(el.getAttribute('src') || '');
    return m ? m[1] : '';
  })();

  LK.load = function (name) {
    if (!cache[name]) {
      const url = 'data/' + name + '.json' + (ASSET_VERSION ? '?v=' + ASSET_VERSION : '');
      cache[name] = fetch(url).then(function (r) {
        if (!r.ok) throw new Error('Не удалось загрузить ' + name);
        return r.json();
      });
    }
    return cache[name];
  };

  /* ====================================================================
     Избранное — localStorage, без регистрации (раздел 2.17)
     ==================================================================== */

  const FAV_KEY = 'lenskaya_favorites';

  function readFav() {
    try {
      const raw = localStorage.getItem(FAV_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function writeFav(list) {
    try {
      localStorage.setItem(FAV_KEY, JSON.stringify(list));
    } catch (e) {
      /* приватный режим — избранное просто не сохранится */
    }
    updateFavCount();
    document.dispatchEvent(new CustomEvent('lk:favchange'));
  }

  LK.fav = {
    list: readFav,
    has: function (type, id) {
      return readFav().some(function (f) {
        return f.object_type === type && f.id === id;
      });
    },
    of: function (type) {
      return readFav().filter(function (f) {
        return f.object_type === type;
      });
    },
    toggle: function (type, id, snapshot) {
      const list = readFav();
      const i = list.findIndex(function (f) {
        return f.object_type === type && f.id === id;
      });
      let added;
      if (i >= 0) {
        list.splice(i, 1);
        added = false;
      } else {
        list.push({
          object_type: type,
          id: id,
          added_at: new Date().toISOString(),
          snapshot: snapshot || null,
        });
        added = true;
      }
      writeFav(list);
      LK.track(added ? 'favorite_add' : 'favorite_remove', { object_type: type, object_id: id });
      LK.toast(added ? 'Добавлено в избранное' : 'Убрано из избранного');
      return added;
    },
    remove: function (type, id) {
      writeFav(
        readFav().filter(function (f) {
          return !(f.object_type === type && f.id === id);
        })
      );
    },
    clear: function () {
      writeFav([]);
    },
  };

  function updateFavCount() {
    const n = readFav().length;
    $$('[data-fav-count]').forEach(function (el) {
      el.textContent = n > 99 ? '99+' : String(n);
      el.hidden = n === 0;
    });
  }

  // Делегирование кликов по кнопкам избранного на карточках.
  document.addEventListener('click', function (e) {
    const btn = e.target.closest('[data-fav]');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    const type = btn.getAttribute('data-fav');
    const id = btn.getAttribute('data-fav-id');
    let snap = null;
    try {
      snap = JSON.parse(btn.getAttribute('data-fav-snapshot') || 'null');
    } catch (err) {
      snap = null;
    }
    const added = LK.fav.toggle(type, id, snap);
    btn.setAttribute('aria-pressed', added ? 'true' : 'false');
    const label = btn.getAttribute('data-label') || 'объект';
    btn.setAttribute('aria-label', (added ? 'Убрать из избранного: ' : 'Добавить в избранное: ') + label);
  });

  LK.syncFavButtons = function (root) {
    $$('[data-fav]', root || document).forEach(function (btn) {
      const on = LK.fav.has(btn.getAttribute('data-fav'), btn.getAttribute('data-fav-id'));
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  };

  /* ====================================================================
     Тосты
     ==================================================================== */

  let toastWrap;
  LK.toast = function (text, kind) {
    if (!toastWrap) {
      toastWrap = document.createElement('div');
      toastWrap.className = 'toast-wrap';
      toastWrap.setAttribute('role', 'status');
      toastWrap.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastWrap);
    }
    const t = document.createElement('div');
    t.className = 'toast' + (kind === 'error' ? ' toast--error' : '');
    t.textContent = text;
    toastWrap.appendChild(t);
    setTimeout(function () {
      t.remove();
    }, 4000);
  };

  /* ====================================================================
     Тема: светлая / тёмная
     По умолчанию — системная настройка. Выбор пользователя приоритетнее
     и хранится в localStorage. Атрибут data-theme ставится ещё в <head>,
     поэтому вспышки чужой темы при загрузке нет.
     ==================================================================== */

  const THEME_KEY = 'lenskaya_theme';

  function systemTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  LK.currentTheme = function () {
    const set = document.documentElement.getAttribute('data-theme');
    return set === 'dark' || set === 'light' ? set : systemTheme();
  };

  LK.setTheme = function (theme, remember) {
    document.documentElement.setAttribute('data-theme', theme);
    if (remember) {
      try {
        localStorage.setItem(THEME_KEY, theme);
      } catch (e) {
        /* приватный режим — тема не сохранится */
      }
    }
    $$('[data-theme-toggle]').forEach(function (btn) {
      btn.setAttribute('aria-label', theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему');
      btn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
    });
    document.dispatchEvent(new CustomEvent('lk:themechange', { detail: { theme: theme } }));
  };

  function initTheme() {
    let stored = null;
    try {
      stored = localStorage.getItem(THEME_KEY);
    } catch (e) {
      stored = null;
    }
    LK.setTheme(stored === 'dark' || stored === 'light' ? stored : systemTheme(), false);

    // Пока пользователь не выбрал тему сам — следуем за системой.
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onSystem = function () {
      let saved = null;
      try {
        saved = localStorage.getItem(THEME_KEY);
      } catch (e) {
        saved = null;
      }
      if (!saved) LK.setTheme(systemTheme(), false);
    };
    if (mq.addEventListener) mq.addEventListener('change', onSystem);
    else if (mq.addListener) mq.addListener(onSystem);

    document.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-theme-toggle]');
      if (!btn) return;
      const next = LK.currentTheme() === 'dark' ? 'light' : 'dark';
      LK.setTheme(next, true);
      LK.track('theme_change', { value: next });
    });
  }

  /* ====================================================================
     Header: скролл, мобильное меню, выпадающее меню
     ==================================================================== */

  function initHeader() {
    const header = $('.site-header');
    if (!header) return;
    const overlay = header.hasAttribute('data-over-hero');
    let last = window.scrollY;

    function onScroll() {
      const y = window.scrollY;
      if (overlay) {
        header.classList.toggle('is-transparent', y <= 80);
      }
      header.classList.toggle('is-scrolled', y > 80);
      if (y > 600 && y > last + 4) header.classList.add('is-hidden');
      else if (y < last - 4 || y <= 600) header.classList.remove('is-hidden');
      last = y;
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    // Выпадающее меню «Проект»
    $$('.nav-item[data-dropdown]').forEach(function (item) {
      const trigger = $('.nav-link', item);
      let closeTimer = null;

      const open = function (v) {
        clearTimeout(closeTimer);
        closeTimer = null;
        item.classList.toggle('is-open', v);
        trigger.setAttribute('aria-expanded', v ? 'true' : 'false');
      };

      // Закрытие с отсрочкой: курсор успевает соскользнуть с кнопки
      // и вернуться, не потеряв меню. Возврат внутрь отменяет таймер.
      const closeSoon = function () {
        clearTimeout(closeTimer);
        closeTimer = setTimeout(function () {
          open(false);
        }, 260);
      };

      item.addEventListener('mouseenter', function () {
        open(true);
      });
      item.addEventListener('mouseleave', closeSoon);
      trigger.addEventListener('click', function (e) {
        e.preventDefault();
        open(!item.classList.contains('is-open'));
      });
      item.addEventListener('focusout', function (e) {
        if (!item.contains(e.relatedTarget)) open(false);
      });
      item.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
          open(false);
          trigger.focus();
        }
      });
    });

    // Мобильное меню
    const menu = $('#mobile-menu');
    const burger = $('[data-menu-open]');
    if (menu && burger) {
      const closeBtn = $('[data-menu-close]', menu);
      let lastFocus = null;

      const setOpen = function (v) {
        if (v) {
          lastFocus = document.activeElement;
          menu.hidden = false;
          requestAnimationFrame(function () {
            menu.classList.add('is-open');
          });
          document.body.classList.add('is-locked');
          burger.setAttribute('aria-expanded', 'true');
          (closeBtn || menu).focus();
        } else {
          menu.classList.remove('is-open');
          document.body.classList.remove('is-locked');
          burger.setAttribute('aria-expanded', 'false');
          setTimeout(function () {
            menu.hidden = true;
          }, 300);
          if (lastFocus) lastFocus.focus();
        }
      };

      burger.addEventListener('click', function () {
        setOpen(menu.hidden);
      });
      if (closeBtn) closeBtn.addEventListener('click', function () { setOpen(false); });
      menu.addEventListener('click', function (e) {
        if (e.target.closest('a')) setOpen(false);
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && !menu.hidden) setOpen(false);
      });
      trapFocus(menu);

      // Аккордеон «Проект» внутри мобильного меню
      $$('[data-acc]', menu).forEach(function (btn) {
        const sub = $('#' + btn.getAttribute('data-acc'));
        btn.addEventListener('click', function () {
          const open = sub.classList.toggle('is-open');
          btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        });
      });
    }
  }

  function trapFocus(container) {
    container.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      const f = $$(
        'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
        container
      ).filter(function (el) {
        return el.offsetParent !== null;
      });
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });
  }
  LK.trapFocus = trapFocus;

  /* ====================================================================
     Интро — 5 с, 3 фазы, только при первом визите за сессию (раздел 2.1)
     ==================================================================== */

  function initIntro() {
    const intro = $('#intro');
    if (!intro) return;

    const seen = sessionStorage.getItem('lenskaya_intro_shown') === '1';
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const conn = navigator.connection || {};
    const lite = conn.saveData === true || /2g/.test(conn.effectiveType || '');
    const direct = location.search.indexOf('utm_') > -1;

    if (seen || direct) {
      intro.remove();
      return;
    }

    sessionStorage.setItem('lenskaya_intro_shown', '1');
    document.body.classList.add('is-locked');

    const phases = $$('.intro-phase', intro);
    const shots = $$('.intro-media img', intro);
    const bar = $('.intro-progress', intro);
    const total = reduced ? 1200 : lite ? 3000 : 5000;
    const marks = [0, 0.32, 0.68];
    let timers = [];
    let done = false;

    LK.track('intro_view', { mode: reduced ? 'reduced' : lite ? 'lite' : 'full' });

    function show(i) {
      phases.forEach(function (p, n) {
        p.classList.toggle('is-on', n === i);
      });
      shots.forEach(function (s, n) {
        s.classList.toggle('is-on', n === i);
      });
    }

    const started = Date.now();
    show(0);
    if (bar) {
      bar.style.transition = 'width ' + total + 'ms linear';
      requestAnimationFrame(function () {
        bar.style.width = '100%';
      });
    }
    marks.forEach(function (m, i) {
      if (i === 0) return;
      timers.push(setTimeout(function () { show(i); }, total * m));
    });
    timers.push(setTimeout(finish, total));

    function finish(skipped) {
      if (done) return;
      done = true;
      timers.forEach(clearTimeout);
      if (skipped) LK.track('intro_skip', { time_ms: Date.now() - started });
      intro.classList.add('is-leaving');
      document.body.classList.remove('is-locked');
      setTimeout(function () {
        intro.remove();
        const h1 = $('main h1');
        if (h1) {
          h1.setAttribute('tabindex', '-1');
          h1.focus({ preventScroll: true });
        }
      }, 320);
    }

    $('[data-intro-skip]', intro).addEventListener('click', function () { finish(true); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') finish(true);
    });
    window.addEventListener('wheel', function () { finish(true); }, { once: true, passive: true });
    intro.addEventListener('touchstart', function () { finish(true); }, { passive: true });
  }

  /* ====================================================================
     Модальные окна
     ==================================================================== */

  let modalLastFocus = null;

  LK.openModal = function (id, ctx) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modalLastFocus = document.activeElement;
    modal.hidden = false;
    document.body.classList.add('is-locked');

    if (ctx) {
      const t = $('[data-modal-context]', modal);
      if (t) {
        t.textContent = ctx.title || '';
        t.hidden = !ctx.title;
      }
      const form = $('form', modal);
      if (form) {
        ['object_type', 'object_id', 'object_title', 'house_project_id'].forEach(function (k) {
          const f = form.elements[k];
          if (f && ctx[k] != null) f.value = ctx[k];
        });
      }
    }
    const focusable = $('input, select, textarea, button', modal);
    if (focusable) focusable.focus();
    LK.track('form_open', { form_id: id, object_type: (ctx && ctx.object_type) || 'general' });
  };

  LK.closeModal = function (modal) {
    modal.hidden = true;
    document.body.classList.remove('is-locked');
    if (modalLastFocus) modalLastFocus.focus();
  };

  function initModals() {
    $$('.modal').forEach(function (modal) {
      trapFocus(modal);
      modal.addEventListener('click', function (e) {
        if (e.target === modal || e.target.closest('[data-modal-close]')) LK.closeModal(modal);
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && !modal.hidden) LK.closeModal(modal);
      });
    });

    document.addEventListener('click', function (e) {
      const trigger = e.target.closest('[data-modal]');
      if (!trigger) return;
      e.preventDefault();
      let ctx = {};
      try {
        ctx = JSON.parse(trigger.getAttribute('data-modal-ctx') || '{}');
      } catch (err) {
        ctx = {};
      }
      LK.openModal(trigger.getAttribute('data-modal'), ctx);
    });
  }

  /* ====================================================================
     Lightbox
     ==================================================================== */

  let lbItems = [];
  let lbIndex = 0;

  LK.lightbox = function (items, index) {
    const lb = $('#lightbox');
    if (!lb || !items.length) return;
    lbItems = items;
    lbIndex = index || 0;
    lb.hidden = false;
    document.body.classList.add('is-locked');
    renderLb();
    $('[data-lb-close]', lb).focus();
    LK.track('gallery_open', { media_id: items[lbIndex].id || '' });
  };

  function renderLb() {
    const lb = $('#lightbox');
    const it = lbItems[lbIndex];
    $('[data-lb-img]', lb).src = it.src;
    $('[data-lb-img]', lb).alt = it.caption || '';
    $('[data-lb-caption]', lb).textContent = it.caption || '';
    const disc = $('[data-lb-disc]', lb);
    disc.textContent = it.disclaimer || '';
    disc.hidden = !it.disclaimer;
    $('[data-lb-counter]', lb).textContent = lbIndex + 1 + ' / ' + lbItems.length;
  }

  function stepLb(d) {
    lbIndex = (lbIndex + d + lbItems.length) % lbItems.length;
    renderLb();
  }

  function initLightbox() {
    const lb = $('#lightbox');
    if (!lb) return;
    trapFocus(lb);
    const close = function () {
      lb.hidden = true;
      document.body.classList.remove('is-locked');
    };
    lb.addEventListener('click', function (e) {
      if (e.target.closest('[data-lb-close]')) close();
      else if (e.target.closest('[data-lb-prev]')) stepLb(-1);
      else if (e.target.closest('[data-lb-next]')) stepLb(1);
    });
    document.addEventListener('keydown', function (e) {
      if (lb.hidden) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') stepLb(-1);
      if (e.key === 'ArrowRight') stepLb(1);
    });
    let x0 = null;
    lb.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', function (e) {
      if (x0 == null) return;
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 50) stepLb(dx < 0 ? 1 : -1);
      x0 = null;
    });

    // Делегирование: любая группа [data-lb-group] с элементами [data-lb-item]
    document.addEventListener('click', function (e) {
      const item = e.target.closest('[data-lb-item]');
      if (!item) return;
      const group = item.closest('[data-lb-group]') || document;
      const nodes = $$('[data-lb-item]', group);
      const items = nodes.map(function (n) {
        return {
          id: n.getAttribute('data-lb-id') || '',
          src: n.getAttribute('data-lb-src') || (n.querySelector('img') || {}).src,
          caption: n.getAttribute('data-lb-caption') || '',
          disclaimer: n.getAttribute('data-lb-disc') || '',
        };
      });
      LK.lightbox(items, nodes.indexOf(item));
    });
  }

  /* ====================================================================
     Формы (раздел 7)
     ==================================================================== */

  const PHONE_RE = /^\+7\d{10}$/;
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const NAME_RE = /^[А-Яа-яЁёA-Za-z][А-Яа-яЁёA-Za-z\s'-]{1,59}$/;

  function normalizePhone(v) {
    let d = v.replace(/\D/g, '');
    if (d.startsWith('8')) d = '7' + d.slice(1);
    if (d.startsWith('9') && d.length === 10) d = '7' + d;
    if (!d.startsWith('7')) d = '7' + d;
    return '+' + d.slice(0, 11);
  }

  function formatPhone(v) {
    const d = normalizePhone(v).slice(2); // без +7
    let out = '+7';
    if (d.length) out += ' (' + d.slice(0, 3);
    if (d.length >= 3) out += ') ' + d.slice(3, 6);
    if (d.length >= 6) out += '-' + d.slice(6, 8);
    if (d.length >= 8) out += '-' + d.slice(8, 10);
    return out;
  }

  function fieldOf(input) {
    return input.closest('.field') || input.closest('.consent') || input.parentElement;
  }

  function setError(input, msg) {
    const f = fieldOf(input);
    if (!f) return;
    f.classList.add('has-error');
    input.setAttribute('aria-invalid', 'true');
    const box = f.querySelector('.field-error');
    if (box) box.textContent = msg;
  }

  function clearError(input) {
    const f = fieldOf(input);
    if (!f) return;
    f.classList.remove('has-error');
    input.removeAttribute('aria-invalid');
  }

  function validateField(input) {
    const type = input.getAttribute('data-validate') || input.type;
    const v = (input.value || '').trim();
    const required = input.hasAttribute('required');

    if (input.type === 'checkbox') {
      if (required && !input.checked) {
        setError(input, input.getAttribute('data-msg') || 'Необходимо согласие');
        return false;
      }
      clearError(input);
      return true;
    }
    if (!v) {
      if (required) {
        setError(input, input.getAttribute('data-msg-empty') || 'Заполните поле');
        return false;
      }
      clearError(input);
      return true;
    }
    if (type === 'tel' && !PHONE_RE.test(normalizePhone(v))) {
      setError(input, 'Введите телефон в формате +7 (999) 123-45-67');
      return false;
    }
    if (type === 'email' && !EMAIL_RE.test(v)) {
      setError(input, 'Проверьте адрес электронной почты');
      return false;
    }
    if (type === 'name' && !NAME_RE.test(v)) {
      setError(input, 'Укажите имя');
      return false;
    }
    clearError(input);
    return true;
  }

  function initForms() {
    $$('form[data-form]').forEach(function (form) {
      const id = form.getAttribute('data-form');
      const draftKey = 'lenskaya_draft_' + id;

      // Скрытые поля источника (раздел 7.1, п. 9)
      const params = new URLSearchParams(location.search);
      const hidden = {
        page_url: location.href,
        referrer: document.referrer || '',
        utm_source: params.get('utm_source') || '',
        utm_medium: params.get('utm_medium') || '',
        utm_campaign: params.get('utm_campaign') || '',
        utm_content: params.get('utm_content') || '',
        utm_term: params.get('utm_term') || '',
        form_id: id,
        ts: String(Date.now()),
      };
      Object.keys(hidden).forEach(function (k) {
        if (form.elements[k]) {
          form.elements[k].value = hidden[k];
          return;
        }
        const i = document.createElement('input');
        i.type = 'hidden';
        i.name = k;
        i.value = hidden[k];
        form.appendChild(i);
      });

      // Черновик: восстановление и сохранение (данные не теряются при ошибке)
      try {
        const draft = JSON.parse(sessionStorage.getItem(draftKey) || 'null');
        if (draft) {
          Object.keys(draft).forEach(function (k) {
            const el = form.elements[k];
            if (el && el.type !== 'hidden' && el.type !== 'checkbox') el.value = draft[k];
          });
        }
      } catch (e) {
        /* пустой черновик */
      }

      const saveDraft = function () {
        const data = {};
        $$('input, textarea, select', form).forEach(function (el) {
          if (el.name && el.type !== 'hidden' && el.type !== 'checkbox' && el.value) data[el.name] = el.value;
        });
        try {
          sessionStorage.setItem(draftKey, JSON.stringify(data));
        } catch (e) {
          /* хранилище недоступно */
        }
      };

      let started = false;
      form.addEventListener('input', function (e) {
        if (!started) {
          started = true;
          LK.track('form_start', { form_id: id });
        }
        if (e.target.type === 'tel') {
          const pos = e.target.selectionStart === e.target.value.length;
          e.target.value = formatPhone(e.target.value);
          if (pos) e.target.setSelectionRange(e.target.value.length, e.target.value.length);
        }
        if (fieldOf(e.target) && fieldOf(e.target).classList.contains('has-error')) validateField(e.target);
        saveDraft();
      });

      form.addEventListener(
        'blur',
        function (e) {
          if (e.target.matches('input, textarea, select') && e.target.value) validateField(e.target);
        },
        true
      );

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        const alert = $('.form-alert', form);
        if (alert) alert.classList.remove('is-on');

        // Антиспам: honeypot + отсечка слишком быстрой отправки
        const hp = form.elements.company_website;
        if (hp && hp.value) return;
        if (Date.now() - Number(form.elements.ts.value) < 2000) {
          LK.toast('Проверьте данные и отправьте ещё раз', 'error');
          return;
        }

        const fields = $$('[required], [data-validate]', form).filter(function (el) {
          return el.matches('input, textarea, select');
        });
        let ok = true;
        let firstBad = null;
        fields.forEach(function (el) {
          if (!validateField(el)) {
            ok = false;
            if (!firstBad) firstBad = el;
          }
        });

        if (!ok) {
          if (alert) {
            alert.textContent = 'Проверьте отмеченные поля.';
            alert.classList.add('is-on');
          }
          if (firstBad) firstBad.focus();
          LK.track('form_error', { form_id: id, error_field: firstBad ? firstBad.name : '' });
          return;
        }

        const btn = $('button[type="submit"]', form);
        if (btn) {
          btn.classList.add('is-loading');
          btn.setAttribute('aria-busy', 'true');
        }
        $$('input, textarea, select', form).forEach(function (el) {
          el.readOnly = true;
        });

        // Демонстрационная отправка. В продакшене — POST /api/lead,
        // серверная валидация и передача в CRM (раздел 8.1).
        const payload = {};
        new FormData(form).forEach(function (v, k) {
          payload[k] = v;
        });
        if (payload.phone) payload.phone = normalizePhone(payload.phone);
        payload.consent_at = new Date().toISOString();

        setTimeout(function () {
          try {
            const leads = JSON.parse(localStorage.getItem('lenskaya_leads') || '[]');
            leads.push(payload);
            localStorage.setItem('lenskaya_leads', JSON.stringify(leads));
          } catch (err) {
            /* демо-хранилище недоступно */
          }
          try {
            sessionStorage.removeItem(draftKey);
          } catch (err) {
            /* игнорируем */
          }

          if (btn) {
            btn.classList.remove('is-loading');
            btn.removeAttribute('aria-busy');
          }
          const success = form.parentElement.querySelector('.form-success');
          if (success) {
            form.hidden = true;
            success.classList.add('is-on');
            // Быстрое действие ведёт в каталог, соответствующий заявке.
            // Для заявок без типа объекта — в каталог участков: это основной
            // продукт проекта (раздел 11.1, п. 4 спецификации).
            const type = payload.object_type || 'general';
            const link = success.querySelector('[data-success-catalog]');
            if (link) {
              const toFlats = type === 'flat';
              link.href = toFlats ? 'flats.html' : 'land.html';
              link.textContent = toFlats ? 'Изучить проект корпусов' : 'Смотреть каталог участков';
            }
            success.setAttribute('tabindex', '-1');
            success.focus();
          }
          LK.track('form_success', {
            form_id: id,
            object_type: payload.object_type || 'general',
            object_id: payload.object_id || '',
          });
          if (payload.object_type === 'land') LK.track('land_lead', { object_id: payload.object_id || '', form_id: id });
        }, 700);
      });
    });
  }

  /* ====================================================================
     Cookie-согласие (раздел 8.5)
     ==================================================================== */

  function initCookie() {
    const bar = $('#cookie-bar');
    if (!bar) return;
    let saved = null;
    try {
      saved = localStorage.getItem('lenskaya_cookie');
    } catch (e) {
      saved = 'all';
    }
    if (saved) return;
    bar.hidden = false;
    // Баннер закреплён снизу — добавляем запас, чтобы он не перекрывал контент.
    document.body.classList.add('has-bottom-bar');
    bar.addEventListener('click', function (e) {
      const b = e.target.closest('[data-cookie]');
      if (!b) return;
      try {
        localStorage.setItem('lenskaya_cookie', b.getAttribute('data-cookie'));
      } catch (err) {
        /* игнорируем */
      }
      bar.hidden = true;
      if (!$('.sticky-bar.is-on')) document.body.classList.remove('has-bottom-bar');
      LK.track('cookie_choice', { value: b.getAttribute('data-cookie') });
    });
  }

  /* ====================================================================
     Появление секций, липкая панель, трекинг контактов
     ==================================================================== */

  function initReveal() {
    const els = $$('.reveal');
    if (!els.length || !('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    const io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            en.target.classList.add('is-in');
            io.unobserve(en.target);
          }
        });
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.12 }
    );
    els.forEach(function (el) { io.observe(el); });
  }

  function initStickyBar() {
    const bar = $('.sticky-bar');
    if (!bar) return;
    const on = function () {
      const show = window.scrollY > 400;
      bar.classList.toggle('is-on', show);
      // Запас снизу, чтобы панель не перекрывала последний блок страницы.
      if (show) document.body.classList.add('has-bottom-bar');
      else if (($('#cookie-bar') || {}).hidden !== false) document.body.classList.remove('has-bottom-bar');
    };
    on();
    window.addEventListener('scroll', on, { passive: true });
  }

  function initContactTracking() {
    document.addEventListener('click', function (e) {
      const a = e.target.closest('a[href^="tel:"], a[href^="mailto:"], a[data-messenger]');
      if (!a) return;
      const placement = a.getAttribute('data-placement') || 'page';
      if (a.hasAttribute('data-messenger')) {
        LK.track('messenger_click', { channel: a.getAttribute('data-messenger'), placement: placement });
      } else if (a.href.startsWith('tel:')) {
        LK.track('phone_click', { placement: placement });
      } else {
        LK.track('email_click', { placement: placement });
      }
    });

    document.addEventListener('click', function (e) {
      const c = e.target.closest('[data-cta]');
      if (!c) return;
      LK.track('cta_click', { cta_id: c.getAttribute('data-cta'), section: c.getAttribute('data-section') || '' });
    });
  }

  function initMapPlaceholders() {
    $$('[data-map-activate]').forEach(function (holder) {
      const btn = $('button', holder);
      if (!btn) return;
      btn.addEventListener('click', function () {
        LK.track('map_activate', { layer: holder.getAttribute('data-map-activate') });
        LK.toast('Интерактивная карта подключается на этапе разработки (Яндекс Карты, раздел 8.3)');
      });
    });
  }

  function initYear() {
    $$('[data-year]').forEach(function (el) {
      el.textContent = String(new Date().getFullYear());
    });
  }

  /* ====================================================================
     Старт
     ==================================================================== */

  function boot() {
    initTheme();
    initIntro();
    initHeader();
    initModals();
    initLightbox();
    initForms();
    initCookie();
    initReveal();
    initStickyBar();
    initContactTracking();
    initMapPlaceholders();
    initYear();
    updateFavCount();
    LK.syncFavButtons();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
