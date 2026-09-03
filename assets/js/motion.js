/* ==========================================================================
   ЖК «Ленская» — движение и микровзаимодействия

   Модуль необязателен: без него сайт полностью работоспособен, весь контент
   виден. Классы анимации навешиваются только отсюда, поэтому при отключённом
   JS ничего не «зависает» невидимым.

   Всё движение отключается при prefers-reduced-motion (см. motion.css),
   а этот модуль в таком режиме сразу показывает контент без наблюдателей.
   ========================================================================== */

(function () {
  'use strict';

  var LK = window.LK || (window.LK = {});
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  LK.motion = {};

  /* ====================================================================
     1. Появление при скролле
     ==================================================================== */

  // Что анимируем: [селектор контейнера, селектор детей, класс]
  var GROUPS = [
    ['.section-head', ':scope > *', 'm-item'],
    ['.cards', ':scope > *', 'm-item'],
    ['.feature-list', ':scope > *', 'm-item'],
    ['.stat-grid', ':scope > *', 'm-item'],
    ['.viz-grid', ':scope > *', 'm-item'],
    ['.viz-strip', ':scope > *', 'm-media'],
    ['.timeline', ':scope > *', 'm-item'],
    ['.split', ':scope > *', 'm-item'],
    ['.masonry', ':scope > figure', 'm-media'],
    ['.hscroll', ':scope > *', 'm-media'],
  ];

  // Одиночные блоки
  var SINGLES = [
    '.container > figure',
    '.note-strip',
    '.disclaimer--boxed',
    '.doc-row',
    '.chips',
    '.results-bar',
    '.params',
    '.cta-stack',
    '.panel',
    '.plot-map',
    '.map-holder',
    '.btn-row',
    '.prose',
    '.tabs',
    '.form',
    '.form-success',
  ];

  var io = null;

  function ensureObserver() {
    if (io || !('IntersectionObserver' in window)) return io;
    io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          en.target.classList.add('is-in');
          io.unobserve(en.target);
          if (en.target.hasAttribute('data-count-target')) countUp(en.target);
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.06 }
    );
    return io;
  }

  function prepare(el, cls, delay) {
    if (el.hasAttribute('data-m')) return;
    // Внутри шапки, меню, модалок и героя своя анимация
    if (el.closest('.site-header, .mobile-menu, .modal, .lightbox, .hero, .intro, .cookie-bar')) return;
    // Геометрию читаем ДО записи классов и стилей. Иначе на каждом
    // элементе получается «записал — прочитал», и браузер пересчитывает
    // раскладку столько раз, сколько элементов в пачке.
    var r = el.getBoundingClientRect();
    var вКадре = r.top < window.innerHeight * 0.96 && r.bottom > 0;

    el.setAttribute('data-m', '1');
    el.classList.add(cls);
    if (delay) el.style.setProperty('--m-delay', delay + 'ms');

    // Уже в кадре при загрузке — показываем сразу, без ожидания скролла
    if (вКадре) {
      requestAnimationFrame(function () {
        el.classList.add('is-in');
        if (el.hasAttribute('data-count-target')) countUp(el);
      });
      return;
    }
    var obs = ensureObserver();
    if (obs) obs.observe(el);
    else el.classList.add('is-in');
  }

  LK.motion.scan = function (root) {
    if (reduce) return;
    var ctx = root && root.querySelectorAll ? root : document;

    GROUPS.forEach(function (g) {
      $$(g[0], ctx).forEach(function (box) {
        var kids;
        try {
          kids = Array.prototype.slice.call(box.querySelectorAll(g[1]));
        } catch (e) {
          kids = Array.prototype.slice.call(box.children);
        }
        kids.forEach(function (kid, i) {
          prepare(kid, g[2], Math.min(i, 5) * 70);
        });
      });
    });

    SINGLES.forEach(function (sel) {
      $$(sel, ctx).forEach(function (el) {
        // не дублируем то, что уже попало в группу
        if (el.hasAttribute('data-m')) return;
        prepare(el, 'm-item', 0);
      });
    });

    // Счётчики
    $$('.stat b', ctx).forEach(markCounter);
  };

  // Страховка: если что-то пошло не так, контент всё равно появится
  function safetyNet() {
    setTimeout(function () {
      $$('.m-item:not(.is-in), .m-media:not(.is-in)').forEach(function (el) {
        el.classList.add('is-in');
      });
    }, 3000);
  }

  /* ====================================================================
     2. Анимация чисел
     ==================================================================== */

  function parseNum(s) {
    var digits = String(s).replace(/[^\d]/g, '');
    return digits ? parseInt(digits, 10) : null;
  }

  function markCounter(el) {
    var v = parseNum(el.textContent);
    if (v == null || v === 0 || v > 99999999) return;
    if (el.getAttribute('data-count-target') === String(v)) return;
    el.setAttribute('data-count-target', String(v));
    el.setAttribute('data-count-raw', el.textContent);
    if (el.classList.contains('is-in')) countUp(el);
  }

  function countUp(el) {
    if (reduce) return;
    var target = parseNum(el.getAttribute('data-count-target'));
    if (target == null || el.getAttribute('data-counted') === String(target)) return;
    el.setAttribute('data-counted', String(target));
    var raw = el.getAttribute('data-count-raw') || el.textContent;
    var dur = 1100;
    var start = null;

    function frame(t) {
      if (start == null) start = t;
      var p = Math.min(1, (t - start) / dur);
      var eased = 1 - Math.pow(1 - p, 3);
      var val = Math.round(target * eased);
      el.textContent = LK.num ? LK.num(val) : String(val);
      if (p < 1) requestAnimationFrame(frame);
      else el.textContent = raw; // возвращаем исходное форматирование
    }
    requestAnimationFrame(frame);
  }

  // Числа в блоке «Ключевые цифры» приходят из fetch — ловим их появление
  function watchCounters() {
    if (reduce || !('MutationObserver' in window)) return;
    $$('.stat b').forEach(function (el) {
      new MutationObserver(function () {
        markCounter(el);
        if (el.classList.contains('is-in') || !el.classList.contains('m-item')) countUp(el);
      }).observe(el, { childList: true, characterData: true, subtree: true });
    });
  }

  /* ====================================================================
     3. Hero: вход, наплыв фона, параллакс
     ==================================================================== */

  function initHero() {
    var hero = $('.hero');
    if (!hero) return;

    // Класс включает скрытие в CSS: ставим его только когда точно сможем показать
    if (!reduce) hero.classList.add('is-anim');

    var start = function () {
      requestAnimationFrame(function () {
        hero.classList.add('is-ready');
      });
    };

    // Если есть интро — ждём, пока оно уйдёт
    var intro = $('#intro');
    if (intro && !reduce) {
      var mo = new MutationObserver(function () {
        if (!document.getElementById('intro')) {
          mo.disconnect();
          start();
        }
      });
      mo.observe(document.body, { childList: true });
      setTimeout(start, 6500); // страховка
    } else {
      start();
    }

    if (reduce) return;

    var media = $('.hero-media', hero);
    if (!media) return;
    var ticking = false;
    var onScroll = function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var y = window.scrollY;
        if (y < window.innerHeight * 1.2) {
          media.style.setProperty('--parallax', (y * 0.16).toFixed(1) + 'px');
        }
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ====================================================================
     4. Плавное проявление изображений
     ==================================================================== */

  function fadeImages(root) {
    $$('.media img', root || document).forEach(function (img) {
      if (img.classList.contains('img-in') || img.classList.contains('img-pending')) return;
      // Уже загруженное не трогаем — иначе мигнёт
      if (img.complete && img.naturalWidth > 0) return;
      if (reduce) return;
      img.classList.add('img-pending');
      var show = function () {
        img.classList.remove('img-pending');
        img.classList.add('img-in');
      };
      img.addEventListener('load', show, { once: true });
      img.addEventListener('error', show, { once: true });
      // Страховка: если событие не придёт, картинка всё равно покажется
      setTimeout(show, 6000);
    });
  }

  /* ====================================================================
     5. Прогресс чтения и кнопка «Наверх»
     ==================================================================== */

  function initProgressAndTop() {
    var header = $('.site-header');
    var bar = null;
    if (header) {
      bar = document.createElement('span');
      bar.className = 'scroll-progress';
      bar.setAttribute('aria-hidden', 'true');
      header.appendChild(bar);
    }

    var top = document.createElement('button');
    top.type = 'button';
    top.className = 'to-top';
    top.setAttribute('aria-label', 'Наверх страницы');
    top.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
    document.body.appendChild(top);
    top.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
      var h1 = $('main h1');
      if (h1) {
        h1.setAttribute('tabindex', '-1');
        h1.focus({ preventScroll: true });
      }
      if (LK.track) LK.track('to_top_click', {});
    });

    var resultsBar = $('.results-bar');
    var ticking = false;
    var onScroll = function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var y = window.scrollY;
        var max = document.documentElement.scrollHeight - window.innerHeight;
        if (bar) bar.style.setProperty('--progress', max > 0 ? Math.min(1, y / max).toFixed(4) : 0);
        top.classList.toggle('is-on', y > 900);
        if (resultsBar) {
          resultsBar.classList.toggle('is-stuck', resultsBar.getBoundingClientRect().top <= parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) + 1);
        }
        ticking = false;
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ====================================================================
     6. Микроотклики: тема, избранное, счётчик выдачи
     ==================================================================== */

  function initMicro() {
    // Переключатель темы
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-theme-toggle]');
      if (!btn || reduce) return;
      btn.classList.add('is-switching');
      setTimeout(function () { btn.classList.remove('is-switching'); }, 260);
    });

    // Сердце избранного
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-fav]');
      if (!btn || reduce) return;
      btn.classList.remove('is-pop');
      void btn.offsetWidth; // перезапуск анимации
      btn.classList.add('is-pop');
    });

    // Счётчик в шапке
    if (!reduce && 'MutationObserver' in window) {
      $$('[data-fav-count]').forEach(function (el) {
        new MutationObserver(function () {
          if (el.hidden) return;
          el.classList.remove('is-bump');
          void el.offsetWidth;
          el.classList.add('is-bump');
        }).observe(el, { childList: true, characterData: true, subtree: true });
      });

      var cnt = $('[data-count]');
      if (cnt) {
        new MutationObserver(function () {
          cnt.classList.remove('is-bump');
          void cnt.offsetWidth;
          cnt.classList.add('is-bump');
        }).observe(cnt, { childList: true, characterData: true, subtree: true });
      }
    }
  }

  /* ====================================================================
     7. Копирование контактов
     ==================================================================== */

  function initCopy() {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-copy]');
      if (!btn) return;
      e.preventDefault();
      var value = btn.getAttribute('data-copy');
      var done = function () {
        if (LK.toast) LK.toast('Скопировано: ' + value);
        if (LK.track) LK.track('copy_contact', { value_type: btn.getAttribute('data-copy-type') || 'text' });
      };
      // Запасной путь: Clipboard API может быть недоступен или отклонён
      // (нет разрешения, небезопасный контекст, отсутствие жеста пользователя).
      var legacy = function () {
        var ta = document.createElement('textarea');
        ta.value = value;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.top = '0';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        ta.setSelectionRange(0, ta.value.length);
        var ok = false;
        try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
        ta.remove();
        if (ok) done();
        else if (LK.toast) LK.toast('Не удалось скопировать. Выделите текст вручную', 'error');
      };

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(value).then(done, legacy);
      } else {
        legacy();
      }
    });
  }

  /* ====================================================================
     8. Предзагрузка страниц по наведению
     ==================================================================== */

  function initPrefetch() {
    var conn = navigator.connection || {};
    if (conn.saveData || /2g/.test(conn.effectiveType || '')) return;
    // Слабые устройства: предзагрузка там мешает больше, чем помогает
    if (navigator.deviceMemory && navigator.deviceMemory <= 4) return;

    var seen = {};
    var count = 0;
    var MAX = 4; // дальше четырёх страниц вперёд смотреть незачем
    var HOLD = 160; // мс осознанного наведения
    var timer = null;

    var start = function (path) {
      if (seen[path] || count >= MAX) return;
      seen[path] = true;
      count++;
      var link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = path;
      document.head.appendChild(link);
    };

    var pathOf = function (target) {
      var a = target && target.closest ? target.closest('a[href]') : null;
      if (!a) return null;
      var href = a.getAttribute('href');
      if (!href || href.charAt(0) === '#' || /^(https?:|mailto:|tel:)/.test(href)) return null;
      var path = href.split('?')[0].split('#')[0];
      if (!path || seen[path]) return null;
      return path;
    };

    // Наведение должно быть намеренным. Раньше курсор, проезжая по
    // выпадающему меню «Проект», за доли секунды пересекал пять ссылок —
    // и браузер разом тянул пять целых страниц. Именно в этот момент
    // сайт и подвисал.
    document.addEventListener(
      'mouseover',
      function (e) {
        var path = pathOf(e.target);
        clearTimeout(timer);
        if (!path) return;
        timer = setTimeout(function () {
          start(path);
        }, HOLD);
      },
      { passive: true }
    );
    document.addEventListener(
      'mouseout',
      function () {
        clearTimeout(timer);
      },
      { passive: true }
    );

    // На тапе намерение очевидно — ждать нечего
    document.addEventListener(
      'touchstart',
      function (e) {
        var path = pathOf(e.target);
        if (path) start(path);
      },
      { passive: true }
    );
  }

  /* ====================================================================
     9. Отслеживание динамического контента
     ==================================================================== */

  function watchDynamic() {
    if (!('MutationObserver' in window)) return;
    var timer = null;
    var pending = [];
    new MutationObserver(function (muts) {
      muts.forEach(function (m) {
        Array.prototype.forEach.call(m.addedNodes, function (nd) {
          if (nd.nodeType === 1) pending.push(nd);
        });
      });
      if (!pending.length) return;
      clearTimeout(timer);
      timer = setTimeout(function () {
        var nodes = pending.slice();
        pending = [];
        // Вставка 24 карточек — это 24 добавленных узла с одним родителем.
        // Сканировать этого родителя 24 раза незачем: собираем уникальные
        // контейнеры и проходим каждый ровно один раз.
        var roots = [];
        nodes.forEach(function (nd) {
          if (!nd.isConnected) return;
          fadeImages(nd);
          var root = nd.parentElement || nd;
          if (roots.indexOf(root) === -1) roots.push(root);
        });
        // Вложенные контейнеры отбрасываем: родитель уже их покроет.
        roots
          .filter(function (r) {
            return !roots.some(function (o) { return o !== r && o.contains(r); });
          })
          .forEach(function (r) { LK.motion.scan(r); });
      }, 90);
    }).observe(document.body, { childList: true, subtree: true });
  }

  /* ====================================================================
     Старт
     ==================================================================== */

  function boot() {
    initHero();
    fadeImages();
    initProgressAndTop();
    initMicro();
    initCopy();
    initPrefetch();
    if (!reduce) {
      LK.motion.scan(document);
      watchCounters();
      watchDynamic();
      safetyNet();
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
