/* ============================================================
   VivaMedica · vm v5 — модульная система анимаций с тумблерами.
   Слияние лучшего из A/B теста (opus/fable) в базу v4.
   Каждый эффект = модуль {build(bag)}; переключение любого
   тумблера пересобирает все включённые модули заново, поэтому
   геометрия (волны, обводки, фигуры) всегда согласована.
   Панель видна всегда, кроме ?nopanel в URL.
   Набор кодируется в ссылку: #vm=ключи,через,запятую
   ============================================================ */
(function () {
  'use strict';
  var REDUCE = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var NS = 'http://www.w3.org/2000/svg';
  var STORE_KEY = 'vm9-state'; /* v9: спайн-эксперименты откатаны, штатный wirbel; сброс сохранённого состояния */
  function isMobile() { return matchMedia('(max-width: 767px)').matches; }

  var CFG = {
    heroId: '6cd3ded7',
    darkTopId: '5a1034bc',          // тёмная секция верхнего уровня
    darkInnerId: '49ce7c06',        // её внутренний контейнер (волны/кубы)
    numbersId: '61470111',          // секция 01-05
    numbersListId: '482e583b',      // левая колонка со строками и дивайдерами
    pinId: '5d04cfcc',              // pin-скролл услуг
    pinCards: '[data-id="7e2342a5"] .panel',
    staerkenId: '5c5a4c60',
    borderCards: [
      '[data-id="5c5a4c60"] .feature-card',
      '[data-id="6acd534e"] .e-loop-item'
    ],
    glowHosts: ['6cd3ded7', '5c5a4c60', '4c9fd4d'],
    arrowButtons: '.elementor-button',
    waButton: '.elementor-element-d498011',
    footer: 'footer.elementor-location-footer',
    blogId: '6acd534e',
    articlesBtnId: '1a3c26b5',      // кнопка «Alle Artikel anzeigen»: в снапшоте потерян класс button1
    /* фигуры: секция, тип, позиция в %, размер px, глубина параллакса, m=true — есть и на мобиле.
       v6 (фидбек клиентки 22.07): круглые мотивы ring/arcs/pulse убраны — остались крест и точки */
    shapes: [
      { sec: '6cd3ded7', type: 'cross', x: 4,  y: 70, s: 22,  depth: -8, m: false, t: false },
      { sec: '5d04cfcc', type: 'dots',  x: 91, y: 1,  s: 46,  depth: 0,  m: false },
      { sec: '5c5a4c60', type: 'cross', x: 93, y: 5,  s: 20,  depth: -10, m: false, t: false },
      { sec: '5c5a4c60', type: 'dots',  x: 2,  y: 96, s: 42,  depth: 8,  m: false },
      { sec: '61470111', type: 'cross', x: 94, y: 62, s: 16,  depth: 0,  m: false },
      /* блок статей (6acd534e) декорируется бегущим бликом обводки карточек —
         плавающие фигуры в плотной 3-колоночной сетке убраны (налезали на текст) */
      { sec: '4c9fd4d',  type: 'dots',  x: 95, y: 2,  s: 36,  depth: 8,  m: false }
    ]
  };

  /* ---------- утилиты ---------- */
  function el(tag, cls, attrs) {
    var n = /^(svg|path|rect|line|circle|g|polygon)$/.test(tag)
      ? document.createElementNS(NS, tag) : document.createElement(tag);
    if (cls) n.setAttribute('class', cls);
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    return n;
  }
  function byId(id) { return document.querySelector('[data-id="' + id + '"]'); }
  function relativize(host) {
    if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
  }
  function sections() {
    return Array.prototype.filter.call(document.querySelectorAll('.e-con.e-parent'), function (s) {
      return !s.closest('.e-con.e-parent .e-con.e-parent') && s.offsetHeight > 120;
    });
  }
  function qa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* Каждый модуль складывает уборку сюда через own(fn) / ownNode(n) / ownClass(el, cls) */
  function makeBag() {
    var fns = [];
    return {
      own: function (fn) { fns.push(fn); },
      node: function (n) { try { n.setAttribute('data-vm', '1'); } catch (e) {} fns.push(function () { n.remove(); }); return n; },
      cls: function (elm, c) { elm.classList.add(c); fns.push(function () { elm.classList.remove(c); }); },
      io: function (opts) {
        var o = new IntersectionObserver(opts.cb, { threshold: opts.threshold || 0.15, rootMargin: opts.rootMargin || '0px 0px -40px 0px' });
        fns.push(function () { o.disconnect(); });
        return o;
      },
      listen: function (target, ev, fn, opt) {
        target.addEventListener(ev, fn, opt || { passive: true });
        fns.push(function () { target.removeEventListener(ev, fn, opt || { passive: true }); });
      },
      empty: function () {
        fns.reverse().forEach(function (f) { try { f(); } catch (e) {} });
        fns = [];
      }
    };
  }
  /* пометить el классом vm-seen при первом появлении (самодостаточно, без reveal) */
  function seenIO(bag, els, stagger) {
    if (REDUCE) { els.forEach(function (e) { bag.cls(e, 'vm-seen'); }); return; }
    var io = bag.io({ cb: function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('vm-seen');
        io.unobserve(e.target);
      });
    } });
    els.forEach(function (e, i) {
      if (stagger) e.style.transitionDelay = Math.min(i, 8) * stagger + 'ms';
      bag.own(function () { e.classList.remove('vm-seen'); if (stagger) e.style.transitionDelay = ''; });
      io.observe(e);
    });
  }

  function wavePath(y, amp, phase) {
    var d = 'M0 ' + y, x = 0, per = 360, up = true, k;
    for (k = phase; x < 2880; k++) {
      d += ' C' + (x + per * 0.37) + ' ' + (y + (up ? -amp : amp)) + ' ' + (x + per * 0.63) + ' ' + (y + (up ? -amp : amp)) + ' ' + (x + per) + ' ' + y;
      x += per; up = !up;
    }
    return d;
  }
  function buildWavesInto(bag, host, opts) {
    relativize(host);
    var box = bag.node(el('div', 'vm-waves', { 'aria-hidden': 'true' }));
    box.style.height = opts.h + 'px';
    box.style[opts.at] = '0';
    var svg = el('svg', null, { viewBox: '0 0 1440 ' + opts.h, preserveAspectRatio: 'none' });
    svg.setAttribute('width', '100%'); svg.setAttribute('height', '100%');
    opts.waves.forEach(function (w, i) {
      var g = el('g', 'vm-wave-g w' + (i + 1));
      var p = el('path', null, { d: wavePath(w.y, w.amp, i) });
      p.style.stroke = w.color; p.style.strokeOpacity = w.op;
      g.appendChild(p); svg.appendChild(g);
    });
    box.appendChild(svg);
    host.appendChild(box);
  }
  var MINT = '#32dbbe', INK = '#10432d';
  /* сегмент-«позвонок» из знака VivaMedica (вектор из шапки сайта) */
  var SEG = 'M36.9427 12.4982C35.0192 12.4982 33.4883 14.0358 33.4883 15.9677C33.4883 17.8996 35.0192 19.4767 36.9427 19.4767C37.6099 19.4767 38.1987 19.2795 38.7091 18.9641C42.3203 16.8745 44.0083 17.1505 46.8739 19.9104C47.816 20.9355 49.1898 21.5663 50.6813 21.5663C53.5076 21.5663 55.8237 19.2401 55.8237 16.4014C55.8237 13.5233 53.5076 11.1971 50.6813 11.1971C49.4253 11.1971 48.287 11.6702 47.384 12.4193C45.1466 14.2724 43.0662 16.0466 39.1017 13.2473C39.023 13.1684 38.9446 13.129 38.8662 13.0502C38.3165 12.6953 37.6492 12.4982 36.9427 12.4982Z';
  var SEG_VB = '33 10.7 23.3 11.4';
  var GREENS = ['#324024', '#435234', '#586849', '#6B7B5D'];
  function segSvg(fill, w) {
    var svg = el('svg', null, { viewBox: SEG_VB });
    svg.setAttribute('width', w); svg.setAttribute('height', Math.round(w / 2));
    svg.style.overflow = 'visible';
    var p = el('path', null, { d: SEG });
    p.style.fill = fill;
    svg.appendChild(p);
    return svg;
  }
  /* библиотека фигур (порт из fable-варианта); каждая — svg с анимацией через классы */
  var SHAPES = {
    /* v6: круглые ring/arcs/pulse убраны по фидбеку клиентки 22.07 */
    cross: function () { /* медицинский плюс */
      var svg = el('svg', null, { viewBox: '0 0 24 24' });
      var p = el('path', 'sh-line', { d: 'M12 3 V21 M3 12 H21' });
      p.style.stroke = INK; p.style.strokeOpacity = '.3'; p.style.strokeWidth = '2';
      svg.appendChild(p);
      return svg;
    },
    dots: function () { /* сетка точек 3x3 */
      var svg = el('svg', null, { viewBox: '0 0 48 48' });
      for (var r = 0; r < 3; r++) for (var c = 0; c < 3; c++) {
        var d = el('circle', null, { cx: 6 + c * 18, cy: 6 + r * 18, r: 1.8 });
        d.style.fill = INK; d.style.fillOpacity = '.22';
        svg.appendChild(d);
      }
      return svg;
    }
  };

  /* ============================================================
     МОДУЛИ. def: включён ли по умолчанию. Порядок = порядок сборки.
     ============================================================ */
  var MODULES = [

    /* ---------- Поведение блоков ---------- */
    { key: 'reveal', label: 'Block-Reveal (Einblenden von unten)', labelRu: 'Reveal блоков (вход снизу)', group: 'Blockverhalten', def: true,
      build: function (bag) {
        sections().forEach(function (sec) {
          var inner = sec.querySelector(':scope > .e-con-inner') || sec;
          Array.prototype.forEach.call(inner.children, function (k) {
            if (/marquee|sticky|scroll-container|swiper|vm-/.test(k.className)) return;
            bag.cls(k, 'vm-rv');
          });
        });
        if (REDUCE) { qa('.vm-rv').forEach(function (n) { bag.cls(n, 'is-visible'); }); return; }
        var io = bag.io({ threshold: 0.12, cb: function (es) {
          es.forEach(function (e) {
            if (!e.isIntersecting) return;
            var i = 0;
            qa('.vm-rv', e.target).concat(e.target.matches('.vm-rv') ? [e.target] : []).forEach(function (n) {
              if (n.classList.contains('is-visible')) return;
              n.style.transitionDelay = Math.min(i, 6) * 60 + 'ms';
              n.classList.add('is-visible'); i++;
            });
            io.unobserve(e.target);
          });
        } });
        sections().forEach(function (s) { io.observe(s); });
        bag.own(function () {
          qa('.vm-rv, .is-visible').forEach(function (n) { n.classList.remove('is-visible'); n.style.transitionDelay = ''; });
        });
      } },

    { key: 'headmask', label: 'Überschriften: Maskeneffekt', labelRu: 'Заголовки: выезд из маски', group: 'Blockverhalten', def: true,
      build: function (bag) {
        var heads = qa('.elementor-heading-title').filter(function (t) {
          if (t.closest('[data-id="' + CFG.numbersListId + '"]')) return false;   // строки 01-05 — не сюда
          if (t.closest('.e-loop-item')) return false;   // заголовки карточек статей — не секционные
          if (t.closest('.marquee, .swiper, .scroll-container-parent')) return false;   // бегущая строка/слайдеры — не заголовки секций
          if (t.children.length > 1) return false;
          var txt = t.textContent.trim();
          return txt.length > 8 && txt.length < 140 && !/^\d+$/.test(txt);
        });
        heads.forEach(function (t) {
          if (t.querySelector('.vm-mask')) return;
          var mask = el('span', 'vm-mask'), inner = el('span', 'vm-mask-in');
          while (t.firstChild) inner.appendChild(t.firstChild);
          mask.appendChild(inner); t.appendChild(mask);
          bag.own(function () {
            while (inner.firstChild) t.appendChild(inner.firstChild);
            mask.remove();
          });
          
        });
        seenIO(bag, heads, 0);
      } },

    { key: 'hover', label: 'Karten-Hover (Lift + Foto-Zoom)', labelRu: 'Hover карточек (lift + zoom фото)', group: 'Blockverhalten', def: true,
      build: function (bag) { bag.cls(document.documentElement, 'vm-m-hover'); } },

    { key: 'pinfx', label: 'Leistungs-Slider: Einstieg + aktive Mitte', labelRu: 'Лента услуг: вход + живой центр', group: 'Blockverhalten', def: true,
      build: function (bag) {
        var cards = qa(CFG.pinCards);
        if (!cards.length) return;
        cards.forEach(function (c, i) {
          bag.cls(c, 'vm-pin');
          c.style.transitionDelay = i * 60 + 'ms';
          bag.own(function () { c.style.transitionDelay = ''; c.style.transform = ''; c.style.opacity = ''; });
        });
        var pinSec = byId(CFG.pinId);
        seenIO(bag, [pinSec].filter(Boolean), 0);
        if (REDUCE) return;
        /* после входа — скролл-связанная жизнь: центр крупнее/ярче, края тише,
           чёт/нечет едут с чуть разной скоростью (глубина ленты) */
        var seenAt = 0, live = false, ticking = false;
        function frame() {
          ticking = false;
          if (!live) {
            if (!seenAt && pinSec && pinSec.classList.contains('vm-seen')) seenAt = performance.now();
            if (!seenAt || performance.now() - seenAt < 1300) return;
            live = true;
            cards.forEach(function (c) { c.classList.add('vm-pin-live'); });
            bag.own(function () { cards.forEach(function (c) { c.classList.remove('vm-pin-live'); }); });
          }
          var cx = innerWidth / 2;
          cards.forEach(function (c, i) {
            var r = c.getBoundingClientRect();
            if (r.right < -80 || r.left > innerWidth + 80) return;
            var d = Math.max(-1, Math.min(1, (r.left + r.width / 2 - cx) / cx));
            var f = Math.max(0, 1 - Math.abs(d) * 1.5);
            var dx = (i % 2 ? 1 : -1) * d * 12;
            c.style.transform = 'translateX(' + dx.toFixed(1) + 'px) scale(' + (0.94 + 0.1 * f).toFixed(3) + ')';
            c.style.opacity = (0.72 + 0.28 * f).toFixed(2);
          });
        }
        bag.listen(window, 'scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(frame); } });
        frame();
      } },

    { key: 'rows', label: 'Liste 01–05: Linien + Zeilen-Einstieg', labelRu: 'Список 01-05: линии + вход строк', group: 'Blockverhalten', def: true,
      build: function (bag) {
        var list = byId(CFG.numbersListId);
        if (!list) return;
        var inner = list.querySelector(':scope > .e-con-inner') || list;
        var kids = Array.prototype.slice.call(inner.children);
        var rows = kids.filter(function (k) { return /feature-left/.test(k.className); });
        var divs = kids.filter(function (k) { return /widget-divider/.test(k.className); });
        rows.forEach(function (r) { bag.cls(r, 'vm-row'); });
        divs.forEach(function (d) { bag.cls(d, 'vm-rowline'); });
        seenIO(bag, rows.concat(divs), 70);
      } },

    { key: 'iconpop', label: 'Stärken-Icons: Einblenden', labelRu: 'Иконки Stärken: появление', group: 'Blockverhalten', def: true,
      build: function (bag) {
        qa('[data-id="' + CFG.staerkenId + '"] .feature-card .elementor-icon').forEach(function (ic) {
          relativize(ic);
          bag.cls(ic, 'vm-icon');
        });
        seenIO(bag, qa('[data-id="' + CFG.staerkenId + '"] .feature-card'), 80);
      } },

    { key: 'quiz', label: 'Stärken: Tippen öffnet Karte', labelRu: 'Stärken: тап - карточка раскрывается', group: 'Blockverhalten', def: true,
      build: function (bag) {
        var cards = qa('[data-id="' + CFG.staerkenId + '"] .feature-card');
        if (!cards.length) return;
        var photo = document.querySelector('[data-id="' + CFG.staerkenId + '"] .elementor-widget-image img');
        var open = null;
        function setOpen(target) {
          open = target;
          cards.forEach(function (c) {
            c.classList.toggle('vm-open', c === target);
            c.classList.toggle('vm-dim', !!target && c !== target);
            c.setAttribute('aria-expanded', c === target ? 'true' : 'false');
          });
          if (photo) {
            if (target) {
              var left = target.getBoundingClientRect().left + target.offsetWidth / 2 < innerWidth / 2;
              photo.style.transform = 'rotate(' + (left ? -2.2 : 2.2) + 'deg) translateX(' + (left ? -8 : 8) + 'px)';
            } else photo.style.transform = '';
          }
        }
        cards.forEach(function (c) {
          bag.cls(c, 'vm-quiz');
          c.setAttribute('tabindex', '0');
          c.setAttribute('role', 'button');
          c.setAttribute('aria-expanded', 'false');
          bag.own(function () {
            c.removeAttribute('tabindex'); c.removeAttribute('role'); c.removeAttribute('aria-expanded');
            c.classList.remove('vm-open', 'vm-dim');
          });
          bag.listen(c, 'click', function (e) { e.stopPropagation(); setOpen(open === c ? null : c); });
          bag.listen(c, 'keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(open === c ? null : c); }
          }, { passive: false });
        });
        bag.listen(document, 'click', function () { if (open) setOpen(null); });
        bag.listen(document, 'keydown', function (e) { if (e.key === 'Escape' && open) setOpen(null); }, { passive: false });
        if (photo) { bag.cls(photo, 'vm-tilt'); bag.own(function () { photo.style.transform = ''; }); }
      } },

    { key: 'curtain', label: 'Fotos: Vorhang-Effekt', labelRu: 'Фото входят шторкой', group: 'Blockverhalten', def: true,
      build: function (bag) {
        var sels = [
          '[data-id="' + CFG.darkTopId + '"] .elementor-widget-image img',
          '[data-id="79928337"] .elementor-widget-image img',
          '[data-id="' + CFG.staerkenId + '"] .elementor-widget-image img'
        ];
        var imgs = [];
        sels.forEach(function (s) { qa(s).forEach(function (im) { if (imgs.indexOf(im) < 0) imgs.push(im); }); });
        /* наблюдаем родителя: полностью клипнутый img не пересекается с вьюпортом,
           и IntersectionObserver на нём самом не сработал бы никогда */
        var hosts = [];
        imgs.forEach(function (im, i) {
          bag.cls(im, 'vm-curtain');
          if (i % 2) bag.cls(im, 'r');
          var host = im.closest('.elementor-widget-image') || im.parentElement;
          bag.cls(host, 'vm-curtain-host');
          hosts.push(host);
        });
        seenIO(bag, hosts, 90);
      } },

    /* ---------- Декор ---------- */
    { key: 'waves', label: 'Wellen (Hero + dunkler Block)', labelRu: 'Волны (hero + тёмный блок)', group: 'Dekor', def: true,
      build: function (bag) {
        /* на мобиле полосы ниже — волны занимают меньше первого экрана */
        var k = isMobile() ? 0.72 : 1;
        function sc(v) { return Math.round(v * k); }
        var hero = byId(CFG.heroId);
        if (hero) buildWavesInto(bag, hero, { at: 'bottom', h: sc(110), waves: [
          { y: sc(62), amp: sc(30), color: '#10432d', op: .26 },
          { y: sc(80), amp: sc(22), color: '#32dbbe', op: .34 }
        ]});
        var dark = byId(CFG.darkInnerId);
        if (dark) buildWavesInto(bag, dark, { at: 'bottom', h: sc(90), waves: [
          { y: sc(48), amp: sc(24), color: '#32dbbe', op: .26 },
          { y: sc(64), amp: sc(17), color: '#eef3ed', op: .18 }
        ]});
      } },

    { key: 'border', label: 'Kartenrahmen + Lichtstreif', labelRu: 'Обводка карточек + блик', group: 'Dekor', def: true,
      build: function (bag) {
        var hosts = [];
        CFG.borderCards.forEach(function (sel) {
          qa(sel).forEach(function (c) {
            if (c.offsetWidth < 180 || c.offsetHeight < 120) return;
            relativize(c);
            bag.cls(c, 'vm-border-host');
            /* preserveAspectRatio=none: если карточка доросла (lazy-фото), рамка тянется,
               а не леттербоксится поверх картинки */
            var svg = el('svg', 'vm-border', { 'aria-hidden': 'true', preserveAspectRatio: 'none' });
            svg.appendChild(el('rect', 'vm-draw', { x: 1.5, y: 1.5, pathLength: 100 }));
            svg.appendChild(el('rect', 'vm-spark', { x: 1.5, y: 1.5, pathLength: 100 }));
            bag.node(svg); c.appendChild(svg);
            hosts.push(c);
          });
        });
        function radiusOf(c) {
          /* у .e-loop-item радиус 0 — реальное скругление живёт на внутренней карточке/ссылке */
          var r = parseFloat(getComputedStyle(c).borderRadius) || 0;
          if (!r) {
            var inner = c.querySelector(':scope > a, :scope > .e-con, :scope > div');
            if (inner) r = parseFloat(getComputedStyle(inner).borderRadius) || 0;
          }
          return r || 16;
        }
        function size() {
          hosts.forEach(function (c) {
            var svg = c.querySelector(':scope > .vm-border');
            if (!svg) return;
            var w = c.offsetWidth, h = c.offsetHeight;
            var r = radiusOf(c);
            svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
            qa('rect', svg).forEach(function (rc) {
              rc.setAttribute('width', Math.max(0, w - 3));
              rc.setAttribute('height', Math.max(0, h - 3));
              rc.setAttribute('rx', Math.min(r, h / 2));
            });
          });
        }
        size();
        var rT;
        function sizeSoon() { clearTimeout(rT); rT = setTimeout(size, 120); }
        bag.listen(window, 'resize', sizeSoon);
        /* карточки растут после ленивых фото — ResizeObserver ловит это без гаданий */
        if (window.ResizeObserver) {
          var ro = new ResizeObserver(sizeSoon);
          hosts.forEach(function (c) { ro.observe(c); });
          bag.own(function () { ro.disconnect(); });
        } else {
          bag.listen(window, 'load', function () { setTimeout(size, 400); });
        }
        /* блик — вечная purely-paint анимация: вне вьюпорта ставим на паузу */
        var pauseIO = bag.io({ threshold: 0, rootMargin: '120px 0px 120px 0px', cb: function (es) {
          es.forEach(function (e) { e.target.classList.toggle('vm-off', !e.isIntersecting); });
        } });
        hosts.forEach(function (c) {
          pauseIO.observe(c);
          bag.own(function () { c.classList.remove('vm-off'); });
        });
        seenIO(bag, hosts, 0);
      } },

    { key: 'glow', label: 'Leuchten hinter den Blöcken', labelRu: 'Свечения за блоками', group: 'Dekor', def: true,
      build: function (bag) {
        /* radial-градиент вместо filter:blur (порт из fable) — дёшево, живёт и на мобиле */
        var k = isMobile() ? 0.65 : 1;
        CFG.glowHosts.forEach(function (id, i) {
          var host = byId(id);
          if (!host) return;
          relativize(host);
          var g = bag.node(el('div', 'vm-glow', { 'aria-hidden': 'true' }));
          var size = Math.round((420 + i * 60) * k);
          g.style.width = size + 'px'; g.style.height = size + 'px';
          g.style[i % 2 ? 'left' : 'right'] = '-6%';
          g.style.top = i % 2 ? '55%' : '8%';
          g.style.animationDelay = -(i * 3) + 's';
          host.insertBefore(g, host.firstChild);
        });
      } },

    /* v9: выключен по фидбеку клиента — «позвонки в hero не к чему». Тумблер оставлен. */
    
    /* v9: заменён anatspine (анатомический хребет); выкл. по умолчанию, тумблер оставлен */
    
    { key: 'darklight', label: 'Lichtstrahl im dunklen Block', labelRu: 'Луч света в тёмном блоке', group: 'Dekor', def: true,
      build: function (bag) {
        /* blur-слой дорог на слабых телефонах — луч только с планшета */
        if (isMobile()) return;
        var dark = byId(CFG.darkTopId);
        if (!dark) return;
        bag.cls(document.documentElement, 'vm-m-darklight');
        relativize(dark);
        /* обёртка с overflow hidden: луч ездит на 240% и без неё раздувает документ вширь */
        var wrap = bag.node(el('div', 'vm-beam-wrap', { 'aria-hidden': 'true' }));
        wrap.appendChild(el('div', 'vm-beam'));
        dark.insertBefore(wrap, dark.firstChild);
      } },

    /* v6: модуль rings (кольца вокруг цифр 01-05) удалён — круглый мотив отвергнут клиенткой,
       владелец подтвердил снятие 22.07 */

    /* Отвергнутые спайн-эксперименты (wirbel/anatspine/spineband и др.) удалены 23.07 по слову
       владельца — оставлен сквозной хребет spinerail (+ вариант spineback на сравнение). */

    { key: 'shapes', label: 'Formen in den Sektionen (Kreuz, Punkte)', labelRu: 'Фигуры по секциям (крест, точки)', group: 'Dekor', def: true,
      build: function (bag) {
        var mob = isMobile();
        var narrow = matchMedia('(max-width: 1023px)').matches;
        var drift = [];   /* элементы с параллакс-глубиной */
        var seen = [];    /* элементы с прорисовкой (arcs, pulse) */
        CFG.shapes.forEach(function (sp) {
          if (mob && !sp.m) return;
          if (narrow && sp.t === false) return;   /* на планшете макет плотнее — эти фигуры без места */
          var host = byId(sp.sec);
          if (!host) return;
          relativize(host);
          var s = Math.round(sp.s * (mob ? 0.7 : 1));
          var box = bag.node(el('div', 'vm-shape' + (sp.type === 'cross' ? ' sh-float' : ''), { 'aria-hidden': 'true' }));
          /* mx/my — мобильные координаты: стакнутые секции меняют геометрию */
          box.style.left = ((mob && sp.mx != null) ? sp.mx : sp.x) + '%';
          box.style.top = ((mob && sp.my != null) ? sp.my : sp.y) + '%';
          box.style.width = s + 'px';
          box.style.height = s + 'px';
          box.appendChild(SHAPES[sp.type]());
          host.appendChild(box);
          if (sp.type === 'arcs' || sp.type === 'pulse') seen.push(box);
          if (sp.depth && !REDUCE && !mob) drift.push({ box: box, host: host, depth: sp.depth });
        });
        seenIO(bag, seen, 0);
        if (!drift.length) return;
        var ticking = false;
        function frame() {
          ticking = false;
          var vh = innerHeight;
          drift.forEach(function (it) {
            var r = it.host.getBoundingClientRect();
            if (r.bottom < 0 || r.top > vh) return;
            var p = Math.max(0, Math.min(1, (vh - r.top) / (vh + r.height)));
            it.box.style.transform = 'translateY(' + ((p - 0.5) * it.depth * 3).toFixed(1) + 'px)';
          });
        }
        bag.own(function () { drift.forEach(function (it) { it.box.style.transform = ''; }); });
        bag.listen(window, 'scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(frame); } });
        frame();
      } },

    /* ---------- Мелочи ---------- */
    { key: 'smooth', label: 'Sanfter Trägheits-Scroll (Desktop)', labelRu: 'Плавный инерционный скролл (десктоп)', group: 'Blockverhalten', def: true,
      build: function (bag) {
        if (REDUCE || isMobile() || !matchMedia('(pointer: fine)').matches) return;
        var target = scrollY, cur = scrollY, raf = null;
        function tick() {
          cur += (target - cur) * 0.12;
          if (Math.abs(target - cur) < 0.5) { cur = target; raf = null; } else raf = requestAnimationFrame(tick);
          scrollTo({ top: Math.round(cur), left: 0, behavior: 'instant' });
        }
        bag.listen(window, 'wheel', function (e) {
          if (e.ctrlKey) return;   /* pinch-zoom не трогаем */
          var t = e.target;        /* внутренние скролл-зоны (панель и т.п.) — нативно */
          while (t && t !== document.body && t.nodeType === 1) {
            if (t.scrollHeight > t.clientHeight + 4 && /(auto|scroll)/.test(getComputedStyle(t).overflowY)) return;
            t = t.parentElement;
          }
          e.preventDefault();
          if (raf === null) { cur = scrollY; target = scrollY; }
          target += e.deltaY * (e.deltaMode === 1 ? 16 : 1);
          var max = document.documentElement.scrollHeight - innerHeight;
          target = Math.max(0, Math.min(max, target));
          if (!raf) raf = requestAnimationFrame(tick);
        }, { passive: false });
        bag.listen(window, 'scroll', function () { if (!raf) { cur = target = scrollY; } });
        bag.own(function () { if (raf) cancelAnimationFrame(raf); });
      } },

    { key: 'heroscrub', label: 'Hero: leichter Scroll-Scrub', labelRu: 'Hero: лёгкий скраб при скролле', group: 'Blockverhalten', def: true,
      build: function (bag) {
        if (REDUCE) return;
        var mob = isMobile();
        var hero = byId(CFG.heroId);
        if (!hero) return;
        var inner = hero.querySelector(':scope > .e-con-inner');
        if (!inner) return;
        inner.style.transformOrigin = '50% 20%';
        inner.style.willChange = 'transform, opacity';
        bag.own(function () { inner.style.transform = ''; inner.style.opacity = ''; inner.style.transformOrigin = ''; inner.style.willChange = ''; });
        var ticking = false;
        function frame() {
          ticking = false;
          var p = Math.max(0, Math.min(1, scrollY / (innerHeight * 0.9)));
          inner.style.transform = mob ? 'translateY(' + (p * 18).toFixed(1) + 'px)' : 'translateY(' + (p * 34).toFixed(1) + 'px) scale(' + (1 - p * 0.045).toFixed(4) + ')';
          inner.style.opacity = (1 - p * 0.35).toFixed(3);
        }
        bag.listen(window, 'scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(frame); } });
        frame();
      } },

    /* v9: выключен по фидбеку — позвонки налезали на иконки/стрелки строк 01–05. Тумблер оставлен. */
    
    { key: 'menuwave', label: 'Menü: laufende Unterstreichung', labelRu: 'Меню: бегущее подчёркивание пунктов', group: 'Details', def: true,
      build: function (bag) { bag.cls(document.documentElement, 'vm-m-menuwave'); } },

    { key: 'magnetic', label: 'CTA-Buttons: magnetischer Hover', labelRu: 'Кнопки CTA: магнитный hover', group: 'Details', def: true,
      build: function (bag) {
        if (REDUCE || !matchMedia('(pointer: fine)').matches) return;
        qa(CFG.arrowButtons).forEach(function (b) {
          if (b.closest('.e-loop-item')) return;
          var host = b.closest('.elementor-widget-button');
          if (!host || host.getBoundingClientRect().width < 120) return;
          host.style.transition = 'transform .4s cubic-bezier(.22,1,.36,1)';
          host.style.willChange = 'transform';
          bag.own(function () { host.style.transform = ''; host.style.transition = ''; host.style.willChange = ''; });
          bag.listen(host, 'mousemove', function (e) {
            var r = host.getBoundingClientRect();
            var dx = (e.clientX - r.left - r.width / 2) / r.width;
            var dy = (e.clientY - r.top - r.height / 2) / r.height;
            host.style.transform = 'translate(' + (dx * 10).toFixed(1) + 'px,' + (dy * 8).toFixed(1) + 'px)';
          });
          bag.listen(host, 'mouseleave', function () { host.style.transform = ''; });
        });
      } },

    { key: 'arrows', label: 'Pfeile an CTA-Buttons', labelRu: 'Стрелки у кнопок CTA', group: 'Details', def: true,
      build: function (bag) {
        qa(CFG.arrowButtons).forEach(function (b) {
          if (b.querySelector('.vm-arr')) return;
          if (getComputedStyle(b, '::before').content !== 'none') return;
          if (b.closest('.e-loop-item')) return;              // кнопки внутри карточек статей не трогаем
          if (b.getBoundingClientRect().width < 160) return;  // узкая кнопка: стрелка даст перенос текста
          var txt = b.querySelector('.elementor-button-text') || b;
          if (!txt.textContent.trim()) return;
          var sp = el('span', 'vm-arr', { 'aria-hidden': 'true' });
          var svg = el('svg', null, { viewBox: '0 0 22 12', width: 22, height: 12 });
          svg.appendChild(el('path', 'a-line', { d: 'M1 6 H19 M14 1.5 L19.5 6 L14 10.5' }));
          sp.appendChild(svg);
          bag.node(sp); txt.appendChild(sp);
        });
      } },

    { key: 'wapulse', label: 'WhatsApp-Button: Puls', labelRu: 'Пульс WhatsApp-кнопки', group: 'Details', def: true,
      build: function (bag) {
        var wa = document.querySelector(CFG.waButton);
        if (!wa) return;
        bag.cls(wa, 'vm-wa');
        var icon = wa.querySelector('.elementor-icon');
        if (icon) { relativize(icon); bag.cls(icon, 'vm-wa-icon'); }
      } },

    { key: 'footline', label: 'Footer: Wirbelkette + Spalten-Einstieg', labelRu: 'Футер: цепочка позвонков + вход колонок', group: 'Details', def: true,
      build: function (bag) {
        var f = document.querySelector(CFG.footer);
        if (!f) return;
        relativize(f);
        var chain = bag.node(el('div', 'vm-footchain', { 'aria-hidden': 'true' }));
        for (var i = 0; i < 6; i++) {
          var svg = segSvg(i % 2 ? '#32dbbe' : '#10432d', 34);
          svg.style.transitionDelay = (i * 0.12) + 's';
          chain.appendChild(svg);
        }
        f.insertBefore(chain, f.firstChild);
        bag.cls(f, 'vm-foot');
        seenIO(bag, [f], 0);
      } },

    /* ============================================================
       Идеи 22.07 — линейка «стандарт → нестандарт» под немецкий вкус.
       Каждая — отдельный тумблер для показа клиентке.
       ============================================================ */

    { key: 'count', label: 'Zahlen 01–05: Hochzählen beim Erscheinen', labelRu: 'Счётчик цифр 01-05 при появлении', group: 'Ideen 22.07', def: true,
      build: function (bag) {
        var digits = qa('[data-id="' + CFG.numbersId + '"] .elementor-heading-title').filter(function (t) {
          return /^0\d$/.test(t.textContent.trim());
        });
        if (!digits.length) return;
        digits.forEach(function (t) {
          var fin = t.textContent.trim();
          bag.own(function () { t.textContent = fin; });
        });
        if (REDUCE) return;
        var io = bag.io({ cb: function (es) {
          es.forEach(function (e) {
            if (!e.isIntersecting) return;
            io.unobserve(e.target);
            var t = e.target, fin = t.textContent.trim(), n = parseInt(fin, 10), i = -1;
            var iv = setInterval(function () {
              i++;
              if (i >= n) { clearInterval(iv); t.textContent = fin; return; }
              t.textContent = '0' + i;
            }, 110);
            bag.own(function () { clearInterval(iv); });
          });
        } });
        digits.forEach(function (t) { io.observe(t); });
      } },

    { key: 'breath', label: 'Gemeinsamer Atem-Rhythmus des Dekors (~6 s)', labelRu: 'Единый ритм дыхания декора (~6с)', group: 'Ideen 22.07', def: true,
      build: function (bag) { bag.cls(document.documentElement, 'vm-m-breath'); } },

    /* v8: модуль align удалён — метафора «терапия вправляет» зашита в сам позвоночник-прогресс
       (позвонки из смещённых встают ровно при прохождении блока) */

    { key: 'region', label: 'Westerwald-Hügel im Footer', labelRu: 'Контур холмов Вестервальда в футере', group: 'Ideen 22.07', def: true,
      build: function (bag) {
        var f = document.querySelector(CFG.footer);
        if (!f) return;
        relativize(f);
        var mob = isMobile();
        var box = bag.node(el('div', 'vm-region', { 'aria-hidden': 'true' }));
        box.style.width = (mob ? 180 : 260) + 'px';
        box.style.height = (mob ? 34 : 48) + 'px';
        if (mob) { box.style.left = '20px'; box.style.bottom = '84px'; }
        else { box.style.right = '4%'; box.style.bottom = '64px'; }
        var svg = el('svg', null, { viewBox: '0 0 260 48', preserveAspectRatio: 'none' });
        [
          { d: 'M0 44 C 30 40, 46 24, 74 26 C 100 28, 112 14, 138 16 C 168 18, 180 34, 210 36 C 230 37, 245 42, 260 44', cls: 'rg-far' },
          { d: 'M0 46 C 40 44, 60 30, 92 33 C 124 36, 150 22, 186 27 C 214 31, 236 42, 260 46', cls: 'rg-near' }
        ].forEach(function (hp) {
          svg.appendChild(el('path', 'rg-line ' + hp.cls, { d: hp.d, pathLength: 100 }));
        });
        box.appendChild(svg);
        f.appendChild(box);
        seenIO(bag, [box], 0);
      } },

    /* v11 (23.07, одобрено владельцем): НАСТОЯЩИЙ хребет-прогресс во всю высоту.
       Ассет сгенерирован в Magnific из выбранного владельцем референса, перекрашен в бренд,
       фон/кольца выбиты в прозрачность (assets/spine-thread*.png). Фикс-рейл у правого края:
       бледный «несобранный» хребет + цветной, раскрывающийся сверху вниз по прогрессу скролла
       (метафора «выравниваем позвоночник»). В тёмном блоке подсветка становится мятной. */
    { key: 'spinerail', label: 'Wirbelsäule-Fortschritt (echtes Rückgrat, rechts)', labelRu: 'Позвоночник-прогресс (настоящий хребет, справа)', group: 'Dekor', def: true,
      build: function (bag) {
        /* v14: сквозной хребет теперь и на мобиле/планшете (владелец: «как на ПК, по всему сайту»).
           На узких экранах контенту добавляем правый жёлоб, чтобы хребет стоял в поле, не на тексте. */
        if (matchMedia('(max-width: 1023px)').matches) bag.cls(document.documentElement, 'vm-railgutter');
        var rail = bag.node(el('div', null, { id: 'vm-spinerail', 'aria-hidden': 'true' }));
        var base = el('img', 'sr-base', { src: 'assets/spine-thread.png', alt: '' });
        var fill = el('img', 'sr-fill', { src: 'assets/spine-thread.png', alt: '' });
        rail.appendChild(base); rail.appendChild(fill);
        document.body.appendChild(rail);
        if (REDUCE) { fill.style.clipPath = 'inset(0 0 0 0)'; return; }
        var ticking = false;
        function frame() {
          ticking = false;
          var docEl = document.documentElement, body = document.body;
          var st = window.scrollY || docEl.scrollTop || body.scrollTop || 0;   /* прокрутка живёт то на window, то на body/html */
          var max = Math.max(docEl.scrollHeight, body.scrollHeight) - innerHeight;
          var p = max > 0 ? Math.min(1, Math.max(0, st / max)) : 0;
          var hide = ((1 - p) * 100).toFixed(2) + '%';
          fill.style.clipPath = 'inset(0 0 ' + hide + ' 0)';
        }
        var onScroll = function () { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
        bag.listen(window, 'scroll', onScroll);
        bag.listen(document, 'scroll', onScroll, { passive: true, capture: true });   /* ловит скролл на body/html */
        bag.listen(window, 'resize', onScroll);
        frame();
      } },

    /* v15 (вариант на сравнение, 23.07): тот же хребет, но ПО ЦЕНТРУ за контентом, без сужения
       колонки. Полупрозрачный фикс-слой во всю высоту, контент во всю ширину поверх; собирается
       на скролле так же. По умолчанию OFF — включается в панели, чтобы сравнить со сквозным рейлом. */
    { key: 'spineback', label: 'Wirbelsäule mittig hinter dem Inhalt (Variante)', labelRu: 'Хребет по центру за контентом (вариант, без сужения)', group: 'Dekor', def: false,
      build: function (bag) {
        var box = bag.node(el('div', null, { id: 'vm-spineback', 'aria-hidden': 'true' }));
        var base = el('img', 'sb-base', { src: 'assets/spine-thread.png', alt: '' });
        var fill = el('img', 'sb-fill', { src: 'assets/spine-thread.png', alt: '' });
        box.appendChild(base); box.appendChild(fill);
        document.body.appendChild(box);
        if (REDUCE) { fill.style.clipPath = 'inset(0 0 0 0)'; return; }
        var ticking = false;
        function frame() {
          ticking = false;
          var docEl = document.documentElement, body = document.body;
          var st = window.scrollY || docEl.scrollTop || body.scrollTop || 0;
          var max = Math.max(docEl.scrollHeight, body.scrollHeight) - innerHeight;
          var p = max > 0 ? Math.min(1, Math.max(0, st / max)) : 0;
          fill.style.clipPath = 'inset(0 0 ' + ((1 - p) * 100).toFixed(2) + '% 0)';
        }
        var onScroll = function () { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
        bag.listen(window, 'scroll', onScroll);
        bag.listen(document, 'scroll', onScroll, { passive: true, capture: true });
        bag.listen(window, 'resize', onScroll);
        frame();
      } },

    /* ---- СОХРАНЁННЫЕ варианты (def:false) — не дефолт, но остаются тумблерами, чтобы владелец/клиент
       мог включать/выключать и сравнивать (владелец 23.07: «не убирай то, что сделали»). CSS всех
       ниже жив в vm.css. ---- */

    /* «Кости»: скелет-эмблема (рёбра+хребет+таз+кольца, Magnific) фоном в герое, кольца дышат. */
    { key: 'spineemblem', label: 'Signet-Skelett im Hero (Knochen, atmende Ringe)', labelRu: 'Скелет-эмблема в герое («кости», дышащие кольца)', group: 'Dekor', def: false,
      build: function (bag) {
        var hero = byId(CFG.heroId);
        if (!hero) return;
        relativize(hero);
        var box = bag.node(el('div', 'vm-emblem', { 'aria-hidden': 'true' }));
        box.appendChild(el('img', null, { src: 'assets/spine-emblem.png', alt: '' }));
        hero.insertBefore(box, hero.firstChild);
      } },

    /* Полоса-момент перед блоком Rückenschmerzen: глиф-позвонки собираются + заголовок + фото taping. */
    { key: 'spineband', label: 'Wirbelsäulen-Band vor „Rückenschmerzen“ (Variante)', labelRu: 'Полоса-хребет перед блоком «Боль в спине» (вариант)', group: 'Dekor', def: false,
      build: function (bag) {
        var anchor = null, heads = qa('.elementor-heading-title');
        for (var hi = 0; hi < heads.length; hi++) {
          if (!/Rückenschmerzen/i.test(heads[hi].textContent)) continue;
          var top = heads[hi].closest('.e-con.e-parent') || heads[hi].closest('[data-id]');
          if (top) { anchor = top; break; }
        }
        if (!anchor || !anchor.parentNode) return;
        var mob = isMobile();
        var n = mob ? 6 : 8;
        var sec = bag.node(el('section', 'vm-spineband', { 'aria-label': 'Wirbelsäule' }));
        var inner = el('div', 'vm-sb-inner');
        var spineCol = el('div', 'vm-sb-spine');
        spineCol.appendChild(el('div', 'vm-sb-line'));
        var verts = [];
        for (var k = 0; k < n; k++) {
          var vwrap = el('div', 'vm-sb-vert');
          vwrap.style.setProperty('--i', k);
          var svg = segSvg('#c3d2c0', mob ? 46 : 64);
          svg.setAttribute('class', 'sb-seg');
          vwrap.appendChild(svg);
          spineCol.appendChild(vwrap);
          verts.push({ wrap: vwrap, p: svg.firstChild, fill: (k % 2 ? MINT : INK) });
        }
        var textCol = el('div', 'vm-sb-text');
        var h = el('h2', 'vm-sb-h'); h.textContent = 'Wirbel für Wirbel zu Ihrer Genesung';
        var pgf = el('p', 'vm-sb-p'); pgf.textContent = 'Individuelle Physiotherapie, die Ihren Rücken Schritt für Schritt aufrichtet.';
        textCol.appendChild(h); textCol.appendChild(pgf);
        inner.appendChild(spineCol); inner.appendChild(textCol);
        var dark0 = byId(CFG.darkTopId);
        var pool = qa('.elementor img').filter(function (im) {
          return im.offsetWidth > 120 && !(dark0 && dark0.contains(im)) && !anchor.contains(im);
        });
        var srcImg = pool.filter(function (im) { return /taping/i.test(im.currentSrc || im.src); })[0] || pool[0];
        if (srcImg) {
          var imgCol = el('div', 'vm-sb-imgcol');
          imgCol.appendChild(el('img', 'vm-sb-img', { src: srcImg.currentSrc || srcImg.src, alt: '', loading: 'lazy' }));
          inner.appendChild(imgCol);
        }
        sec.appendChild(inner);
        anchor.parentNode.insertBefore(sec, anchor);
        if (REDUCE) { verts.forEach(function (v) { v.wrap.classList.add('on'); v.p.style.fill = v.fill; }); return; }
        var ticking = false;
        function frame() {
          ticking = false;
          var r = sec.getBoundingClientRect(), vh = innerHeight;
          var prog = (vh * 0.85 - r.top) / (r.height * 0.6 + vh * 0.2);
          prog = Math.max(0, Math.min(1, prog));
          var lit = Math.round(prog * n);
          verts.forEach(function (v, idx) {
            var on = idx < lit;
            v.wrap.classList.toggle('on', on);
            v.p.style.fill = on ? v.fill : '#c3d2c0';
          });
        }
        bag.listen(window, 'scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(frame); } });
        frame();
      } },

    /* Секция-момент по центру (мобайл/планшет): настоящий хребет, собирается при прокрутке через неё. */
    { key: 'spinesection', label: 'Wirbelsäule-Sektion (Mobil/Tablet, Variante)', labelRu: 'Секция-хребет по центру (мобайл/планшет, вариант)', group: 'Dekor', def: false,
      build: function (bag) {
        if (matchMedia('(min-width: 1024px)').matches) return;
        var anchor = null, heads = qa('.elementor-heading-title');
        for (var i = 0; i < heads.length; i++) {
          if (/Rückenschmerzen/i.test(heads[i].textContent)) { anchor = heads[i].closest('.e-con.e-parent') || heads[i].closest('[data-id]'); break; }
        }
        if (!anchor || !anchor.parentNode) return;
        var sec = bag.node(el('section', 'vm-spinesec', { 'aria-hidden': 'true' }));
        var head = el('div', 'vm-ss-head');
        var b = el('b'); b.textContent = 'Wirbel für Wirbel zu Ihrer Genesung';
        var s = el('span'); s.textContent = 'Individuelle Physiotherapie, die Ihren Rücken aufrichtet.';
        head.appendChild(b); head.appendChild(s);
        var boxWrap = el('div', 'vm-ss-inner'); var box = el('div', 'vm-ss-spine');
        var base = el('img', 'ss-base', { src: 'assets/spine-thread.png', alt: '' });
        var fill = el('img', 'ss-fill', { src: 'assets/spine-thread.png', alt: '' });
        box.appendChild(base); box.appendChild(fill); boxWrap.appendChild(box);
        sec.appendChild(head); sec.appendChild(boxWrap);
        anchor.parentNode.insertBefore(sec, anchor);
        if (REDUCE) { fill.style.clipPath = 'inset(0 0 0 0)'; return; }
        var ticking = false;
        function frame() {
          ticking = false;
          var r = box.getBoundingClientRect(), vh = innerHeight;
          var p = (vh * 0.8 - r.top) / (r.height + vh * 0.25);
          p = Math.max(0, Math.min(1, p));
          fill.style.clipPath = 'inset(0 0 ' + ((1 - p) * 100).toFixed(1) + '% 0)';
        }
        var onScroll = function () { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
        bag.listen(window, 'scroll', onScroll);
        bag.listen(document, 'scroll', onScroll, { passive: true, capture: true });
        frame();
      } },

    /* Хребет фоном за тёмным блоком (мобайл/планшет), сизый (не бирюза). */
    { key: 'spinebg', label: 'Wirbelsäule als Hintergrund im dunklen Block (Variante)', labelRu: 'Хребет фоном в тёмном блоке (вариант)', group: 'Dekor', def: false,
      build: function (bag) {
        if (matchMedia('(min-width: 1024px)').matches) return;
        var dark = byId(CFG.darkTopId);
        if (!dark) return;
        var host = dark.querySelector(':scope > .e-con-inner') || dark;
        relativize(host);
        var box = bag.node(el('div', 'vm-ss-bg', { 'aria-hidden': 'true' }));
        box.appendChild(el('img', null, { src: 'assets/spine-thread-pale.png', alt: '' }));
        host.appendChild(box);
      } },

    /* Старые глиф-варианты (тоже сохраняем тумблерами по слову владельца «не только костей»): */
    /* wirbel — прогресс-хребет из сегментов лого у правого края (тот самый «палка»-вариант). */
    { key: 'wirbel', label: 'Wirbel-Fortschritt aus Logo-Segmenten (rechts)', labelRu: 'Глиф-хребет из сегментов лого (справа, старый «палка»)', group: 'Dekor', def: false,
      build: function (bag) {
        var secs = sections();
        if (secs.length < 3) return;
        if (secs.length > 10) secs = secs.slice(0, 10);
        var slim = matchMedia('(max-width: 1299px)').matches;
        var box = bag.node(el('div', null, { id: 'vm-wirbel', 'aria-hidden': 'true' }));
        if (slim) box.classList.add('slim');
        var w = slim ? 24 : 36;
        var verts = secs.map(function (sec, i) {
          var svg = segSvg('#9fb4a1', w);
          svg.setAttribute('class', 'wb-v');
          if (!slim) {
            svg.classList.add('w-click');
            bag.listen(svg, 'click', function () {
              scrollTo({ top: sec.getBoundingClientRect().top + scrollY - 16, behavior: 'smooth' });
            });
          }
          box.appendChild(svg);
          return { svg: svg, p: svg.firstChild, sec: sec, fill: GREENS[i % 4] };
        });
        document.body.appendChild(box);
        if (REDUCE) { verts.forEach(function (v) { v.svg.classList.add('w-done'); v.p.style.fill = v.fill; }); return; }
        var shyEls = qa('.marquee').concat([byId(CFG.pinId)]).filter(Boolean);
        var ticking = false;
        function frame() {
          ticking = false;
          var line = innerHeight * 0.6;
          verts.forEach(function (v) {
            var done = v.sec.getBoundingClientRect().top < line;
            v.svg.classList.toggle('w-done', done);
            v.p.style.fill = done ? v.fill : '#9fb4a1';
          });
          var br = box.getBoundingClientRect();
          var shy = shyEls.some(function (s) {
            var r = s.getBoundingClientRect();
            return r.bottom > br.top && r.top < br.bottom;
          });
          box.classList.toggle('w-shy', shy);
        }
        bag.listen(window, 'scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(frame); } });
        frame();
      } },

    /* anatspine — анатомический глиф-хребет с лордоз-изгибом в тёмном блоке (сборка при появлении). */
    { key: 'anatspine', label: 'Dunkler Block: anatomische Wirbelsäule (Aufbau)', labelRu: 'Тёмный блок: анатомический глиф-хребет (старый)', group: 'Dekor', def: false,
      build: function (bag) {
        var dark = byId(CFG.darkTopId);
        if (!dark) return;
        var host = dark.querySelector(':scope > .e-con-inner') || dark;
        relativize(host);
        bag.cls(document.documentElement, 'vm-m-anatspine');
        var mob = isMobile();
        var n = mob ? 6 : 7, W = 140, PAD = 24, STEP = 44, BW = 64, BH = 30, WW = 24, WH = 17;
        var H = PAD * 2 + (n - 1) * STEP;
        function ax(t) { return W / 2 + Math.sin(t * Math.PI) * 8; }
        var svg = el('svg', 'vm-anatspine', { 'aria-hidden': 'true', viewBox: '0 0 ' + W + ' ' + H, preserveAspectRatio: 'xMidYMid meet' });
        for (var i = 0; i < n; i++) {
          var t = i / (n - 1);
          var cx = ax(t), cy = PAD + i * STEP;
          var dp = ax(Math.max(0, t - 1 / (n - 1))), dn = ax(Math.min(1, t + 1 / (n - 1)));
          var tilt = Math.max(-10, Math.min(10, (dn - dp) * 1.1));
          var seg = el('g', 'as-seg');
          seg.style.setProperty('--d', (i * 46) + 'ms');
          seg.style.setProperty('--w', (i * 60) + 'ms');
          var inner = el('g', null, { transform: 'translate(' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ') rotate(' + tilt.toFixed(1) + ')' });
          var lw = el('rect', 'as-wing', { x: -BW / 2 - WW + 7, y: -WH / 2 + 4, width: WW, height: WH, rx: 8, ry: 8 });
          var rw = el('rect', 'as-wing', { x: BW / 2 - 7, y: -WH / 2 + 4, width: WW, height: WH, rx: 8, ry: 8 });
          var body = el('rect', 'as-body', { x: -BW / 2, y: -BH / 2, width: BW, height: BH, rx: 12, ry: 12 });
          inner.appendChild(lw); inner.appendChild(rw); inner.appendChild(body);
          seg.appendChild(inner); svg.appendChild(seg);
        }
        var box = bag.node(el('div', 'vm-anatspine-box', { 'aria-hidden': 'true' }));
        box.appendChild(svg);
        host.insertBefore(box, host.firstChild);
        seenIO(bag, [box], 0);
        if (REDUCE) return;
        var waved = false;
        var wio = bag.io({ threshold: 0.28, cb: function (es) {
          es.forEach(function (e) {
            if (!e.isIntersecting || waved) return;
            waved = true;
            setTimeout(function () { box.classList.add('as-wave'); }, n * 42 + 520);
            wio.unobserve(e.target);
          });
        } });
        wio.observe(box);
      } }
  ];

  /* ============================================================
     Состояние: localStorage + пресет в #vm=… (пресет главнее).
     ============================================================ */
  function defaults() {
    var s = {};
    MODULES.forEach(function (m) { s[m.key] = m.def; });
    return s;
  }
  function readState() {
    var m = (location.hash || '').match(/vm=([\w,-]+)/);
    if (m) {
      var s = {};
      MODULES.forEach(function (md) { s[md.key] = false; });
      m[1].split(',').forEach(function (k) { if (k in s) s[k] = true; });
      return s;
    }
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        var st = JSON.parse(raw), d = defaults();
        Object.keys(d).forEach(function (k) { if (typeof st[k] === 'boolean') d[k] = st[k]; });
        return d;
      }
    } catch (e) {}
    return defaults();
  }
  function saveState(s) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch (e) {}
  }

  var state = readState();
  var bags = {};

  function applyState() {
    /* полная пересборка: сначала разобрать всё, потом собрать включённое */
    MODULES.forEach(function (m) { if (bags[m.key]) { bags[m.key].empty(); delete bags[m.key]; } });
    /* дворник: слайдер сайта клонирует слайды вместе с нашими узлами - клоны не в bag'ах.
       Всё инжектированное помечено data-vm, поэтому уцелевшее после teardown = сирота. */
    qa('[data-vm]').forEach(function (n) { if (n.parentNode) n.parentNode.removeChild(n); });
    MODULES.forEach(function (m) {
      if (!state[m.key]) return;
      var bag = makeBag();
      try { m.build(bag); } catch (e) { /* один упавший модуль не валит остальные */ }
      bags[m.key] = bag;
    });
  }

  /* ============================================================
     Панель тумблеров — видна всегда (демо для выбора набора клиенткой).
     Спрятать можно ?nopanel в URL (для будущей чистовой сборки без панели).
     ============================================================ */
  var PANEL_T = {
    de: { title: 'vm · Animationen', link: 'Link mit dieser Auswahl', copied: 'Kopiert ✓', copyPrompt: 'Link kopieren:', reset: 'Zurücksetzen', groups: {} },
    ru: { title: 'vm · анимации', link: 'Ссылка с этим набором', copied: 'Скопирована ✓', copyPrompt: 'Скопируйте ссылку:', reset: 'Сброс к дефолту',
          groups: { 'Blockverhalten': 'Поведение блоков', 'Dekor': 'Декор', 'Details': 'Мелочи', 'Ideen 22.07': 'Идеи 22.07' } }
  };
  var plang = 'de';
  try { plang = localStorage.getItem('vm-panel-lang') || 'de'; } catch (e) {}

  function buildPanel() {
    if (/[?#&]nopanel/.test(location.search + location.hash)) return;
    var p = el('div', null, { id: 'vm-panel' });
    p.classList.add('closed');   /* свёрнута по умолчанию — не закрывает hero */
    var head = el('div', 'vm-p-head');
    var headTitle = el('span', 'vm-p-title');
    var langBtn = el('button', 'vm-p-lang', { type: 'button' });
    head.appendChild(headTitle); head.appendChild(langBtn);
    var body = el('div', 'vm-p-body');
    head.addEventListener('click', function () { p.classList.toggle('closed'); });
    var groups = {}, gtitles = {}, rowSpans = {};
    MODULES.forEach(function (m) {
      if (!groups[m.group]) {
        var g = el('div', 'vm-p-group');
        var t = el('div', 'vm-p-gtitle');
        g.appendChild(t);
        body.appendChild(g);
        groups[m.group] = g; gtitles[m.group] = t;
      }
      var row = el('label', 'vm-p-row');
      var cb = el('input', null, { type: 'checkbox' });
      cb.dataset.key = m.key; /* маппинг по ключу, не по позиции — реордер панели ничего не ломает */
      cb.checked = state[m.key];
      cb.addEventListener('change', function () {
        state[m.key] = cb.checked;
        saveState(state);
        try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {} // пресет из hash больше не главнее
        applyState();
      });
      var sp = el('span'); rowSpans[m.key] = sp;
      row.appendChild(cb); row.appendChild(sp);
      groups[m.group].appendChild(row);
    });
    var tools = el('div', 'vm-p-tools');
    var link = el('button', 'vm-p-btn');
    var reset = el('button', 'vm-p-btn');
    function tr() { return PANEL_T[plang] || PANEL_T.de; }
    function applyLang() {
      var t = tr();
      headTitle.textContent = t.title;
      langBtn.textContent = plang === 'de' ? 'RU' : 'DE';
      Object.keys(gtitles).forEach(function (g) { gtitles[g].textContent = (t.groups && t.groups[g]) || g; });
      MODULES.forEach(function (m) { if (rowSpans[m.key]) rowSpans[m.key].textContent = (plang === 'ru' && m.labelRu) ? m.labelRu : m.label; });
      link.textContent = t.link;
      reset.textContent = t.reset;
    }
    langBtn.addEventListener('click', function (ev) {
      ev.stopPropagation(); /* клик по языку не сворачивает панель */
      plang = plang === 'de' ? 'ru' : 'de';
      try { localStorage.setItem('vm-panel-lang', plang); } catch (e) {}
      applyLang();
    });
    link.addEventListener('click', function () {
      var keys = MODULES.filter(function (m) { return state[m.key]; }).map(function (m) { return m.key; });
      var url = location.origin + location.pathname + '#vm=' + keys.join(',');
      (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(
        function () { link.textContent = tr().copied; setTimeout(function () { link.textContent = tr().link; }, 1500); },
        function () { prompt(tr().copyPrompt, url); }
      );
    });
    reset.addEventListener('click', function () {
      state = defaults(); saveState(state); applyState();
      qa('input[data-key]', body).forEach(function (cb) { cb.checked = !!state[cb.dataset.key]; });
    });
    tools.appendChild(link); tools.appendChild(reset);
    body.appendChild(tools);
    applyLang();
    p.appendChild(head); p.appendChild(body);
    document.body.appendChild(p);
  }

  /* синхронизация между вкладками */
  addEventListener('storage', function (e) {
    if (e.key !== STORE_KEY || !e.newValue) return;
    try { state = JSON.parse(e.newValue); } catch (err) { return; }
    applyState();
    qa('#vm-panel input[data-key]').forEach(function (cb) { cb.checked = !!state[cb.dataset.key]; });
  });

  /* ============================================================
     vmAudit() — dev-самопроверка геометрией (пиксели не нужны).
     Для каждого инжектированного [data-vm]: виден/спрятан, что перекрывает.
     covering = видимый декор налез на фото/заголовок/иконку (это баг). Инертна пока не вызвана.
     ============================================================ */
  window.vmAudit = function () {
    var de = document.documentElement;
    var rpt = { width: innerWidth, overflowPx: Math.max(0, de.scrollWidth - de.clientWidth), covering: [], all: [] };
    var content = [].slice.call(document.querySelectorAll('img, .elementor-heading-title, .elementor-icon'))
      .filter(function (c) { return !c.closest('[data-vm]'); });
    function ov(a, b) {
      var x = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
      var y = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
      return x * y;
    }
    [].forEach.call(document.querySelectorAll('[data-vm]'), function (v) {
      var r = v.getBoundingClientRect();
      if (r.width < 8 || r.height < 8) return;
      var area = r.width * r.height;
      var onscreen = r.bottom > 0 && r.top < innerHeight;
      var cx = Math.max(1, Math.min(innerWidth - 1, r.left + r.width / 2));
      var cy = Math.max(1, Math.min(innerHeight - 1, r.top + r.height / 2));
      var top = onscreen ? document.elementFromPoint(cx, cy) : null;
      var vis = !onscreen ? 'offscreen' : (top && v.contains(top) ? 'visible' : (top && top.closest('[data-vm]') ? 'over-vm' : 'covered'));
      var best = null;
      content.forEach(function (c) {
        var cr = c.getBoundingClientRect();
        if (cr.width < 8 || cr.height < 8) return;
        var a = ov(r, cr);
        if (a <= 0) return;
        var pct = Math.round(100 * a / area);
        if (!best || pct > best.pct) best = { el: (c.tagName + '.' + (c.className || '').toString().trim().split(/\s+/)[0]).slice(0, 40), pct: pct };
      });
      var cls = (v.getAttribute('class') || '').trim().split(/\s+/)[0];
      var name = (v.id ? '#' + v.id : (cls ? '.' + cls : v.tagName)).slice(0, 40);
      var row = { name: name, rect: { l: Math.round(r.left), t: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }, vis: vis, over: best };
      rpt.all.push(row);
      if (vis === 'visible' && best && best.pct >= 25 && !/vm-arr\b/.test(name)) rpt.covering.push(row); /* vm-arr = стрелка */
    });
    rpt.ok = rpt.overflowPx <= 2 && rpt.covering.length === 0;
    return rpt;
  };

  function init() {
    document.documentElement.classList.add('vm-on');
    /* ремонт страницы, не эффект: в снапшоте index.html у кнопки статей потерян класс
       button1 (на живом сайте он есть, его CSS лежит в самом index.html) — возвращаем */
    var ab = byId(CFG.articlesBtnId);
    if (ab && !ab.classList.contains('button1')) ab.classList.add('button1');
    applyState();
    buildPanel();
    /* смена мобайл/десктоп (поворот, ресайз окна) — пересобрать всё:
       модули читают ширину при build, снимок на загрузке устаревает */
    function bpState() {
      return (isMobile() ? 'm' : '') + (matchMedia('(max-width: 1023px)').matches ? 't' : '') +
             (matchMedia('(max-width: 1299px)').matches ? 's' : 'd');
    }
    var lastBp = bpState(), rzT;
    addEventListener('resize', function () {
      clearTimeout(rzT);
      rzT = setTimeout(function () {
        if (bpState() !== lastBp) { lastBp = bpState(); applyState(); }
      }, 300);
    }, { passive: true });
  }

  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
