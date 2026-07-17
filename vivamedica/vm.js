/* ============================================================
   VivaMedica · vm v5 — модульная система анимаций с тумблерами.
   Слияние лучшего из A/B теста (opus/fable) в базу v4.
   Каждый эффект = модуль {build(bag)}; переключение любого
   тумблера пересобирает все включённые модули заново, поэтому
   геометрия (волны, обводки, фигуры) всегда согласована.
   Панель видна только с ?panel в URL — клиентка её не видит.
   Набор кодируется в ссылку: #vm=ключи,через,запятую
   ============================================================ */
(function () {
  'use strict';
  var REDUCE = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var NS = 'http://www.w3.org/2000/svg';
  var STORE_KEY = 'vm5-state'; /* v5: сменился состав модулей — старый ключ не читаем */
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
    ringNumbers: '[data-id="61470111"] .elementor-heading-title',
    glowHosts: ['6cd3ded7', '5c5a4c60', '4c9fd4d'],
    arrowButtons: '.elementor-button',
    waButton: '.elementor-element-d498011',
    footer: 'footer.elementor-location-footer',
    blogId: '6acd534e',
    articlesBtnId: '1a3c26b5',      // кнопка «Alle Artikel anzeigen»: в снапшоте потерян класс button1
    /* фигуры: секция, тип, позиция в %, размер px, глубина параллакса, m=true — есть и на мобиле */
    shapes: [
      { sec: '6cd3ded7', type: 'ring',  x: 86, y: 5,  s: 110, depth: 14, m: true },
      { sec: '6cd3ded7', type: 'cross', x: 4,  y: 70, s: 22,  depth: -8, m: false },
      { sec: '5d04cfcc', type: 'dots',  x: 91, y: 1,  s: 46,  depth: 0,  m: false },
      { sec: '5c5a4c60', type: 'cross', x: 93, y: 5,  s: 20,  depth: -10, m: false },
      { sec: '5c5a4c60', type: 'dots',  x: 2,  y: 96, s: 42,  depth: 8,  m: false },
      { sec: '79928337', type: 'arcs',  x: 94, y: 1,  s: 56,  depth: 10, m: true },
      { sec: '61470111', type: 'ring',  x: 88, y: 8,  s: 84,  depth: 14, m: false },
      { sec: '61470111', type: 'cross', x: 94, y: 62, s: 16,  depth: 0,  m: false },
      /* блок статей (6acd534e) декорируется бегущим бликом обводки карточек —
         плавающие фигуры в плотной 3-колоночной сетке убраны (налезали на текст) */
      { sec: '4c9fd4d',  type: 'pulse', x: 26, y: 2,  mx: 58, my: 0.5, s: 68,  depth: 0,  m: true },
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
      node: function (n) { fns.push(function () { n.remove(); }); return n; },
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
  /* библиотека фигур (порт из fable-варианта); каждая — svg с анимацией через классы */
  var SHAPES = {
    ring: function () { /* пунктирный круг, медленно вращается («круговой цикл») */
      var svg = el('svg', null, { viewBox: '0 0 48 48' });
      var c = el('circle', 'sh-line sh-ring', { cx: 24, cy: 24, r: 22 });
      c.style.stroke = MINT; c.style.strokeOpacity = '.5';
      c.style.strokeWidth = '1.3'; c.style.strokeDasharray = '5 7';
      svg.appendChild(c);
      return svg;
    },
    cross: function () { /* медицинский плюс */
      var svg = el('svg', null, { viewBox: '0 0 24 24' });
      var p = el('path', 'sh-line', { d: 'M12 3 V21 M3 12 H21' });
      p.style.stroke = INK; p.style.strokeOpacity = '.3'; p.style.strokeWidth = '2';
      svg.appendChild(p);
      return svg;
    },
    arcs: function () { /* концентрические дуги-«волны», рисуются с задержкой */
      var svg = el('svg', null, { viewBox: '0 0 48 48' });
      [10, 16, 22].forEach(function (r, i) {
        var a = el('circle', 'sh-line sh-draw', { cx: 24, cy: 24, r: r, pathLength: 100 });
        a.style.stroke = MINT; a.style.strokeOpacity = String(.55 - i * .12);
        a.style.strokeWidth = '1.5';
        a.style.strokeDasharray = '55 45'; /* дуга, не полный круг */
        a.style.transitionDelay = (i * 180) + 'ms';
        a.style.transform = 'rotate(' + (i * 40 - 120) + 'deg)';
        a.style.transformOrigin = 'center';
        a.style.transformBox = 'fill-box';
        svg.appendChild(a);
      });
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
    },
    pulse: function () { /* линия пульса — рисуется при появлении */
      var svg = el('svg', null, { viewBox: '0 0 64 24' });
      var p = el('path', 'sh-line sh-draw', { d: 'M0 13 H18 L25 4 L33 21 L40 13 H64', pathLength: 100 });
      p.style.stroke = MINT; p.style.strokeOpacity = '.65'; p.style.strokeWidth = '1.8';
      svg.appendChild(p);
      return svg;
    }
  };

  /* ============================================================
     МОДУЛИ. def: включён ли по умолчанию. Порядок = порядок сборки.
     ============================================================ */
  var MODULES = [

    /* ---------- Поведение блоков ---------- */
    { key: 'reveal', label: 'Reveal блоков (вход снизу)', group: 'Поведение блоков', def: true,
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

    { key: 'headmask', label: 'Заголовки: выезд из маски + волнистая линия', group: 'Поведение блоков', def: true,
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
          /* волнистое подчёркивание только у крупных заголовков секций:
             базовая линия рисуется при появлении, потом по ней бегает блик */
          if (parseFloat(getComputedStyle(t).fontSize) >= 28) {
            var wrap = el('span', 'vm-squig' + (getComputedStyle(t).textAlign === 'center' ? ' c' : ''), { 'aria-hidden': 'true' });
            var svg = el('svg', null, { viewBox: '0 0 96 12' });
            var d = 'M2 7 Q14 1 26 7 T50 7 T74 7 T94 7';
            svg.appendChild(el('path', 'q-draw', { d: d, pathLength: 100 }));
            svg.appendChild(el('path', 'q-spark', { d: d, pathLength: 100 }));
            wrap.appendChild(svg);
            bag.node(wrap); t.appendChild(wrap);
          }
        });
        seenIO(bag, heads, 0);
      } },

    { key: 'hover', label: 'Hover карточек (lift + zoom фото)', group: 'Поведение блоков', def: true,
      build: function (bag) { bag.cls(document.documentElement, 'vm-m-hover'); } },

    { key: 'pinfx', label: 'Лента услуг: вход + живой центр', group: 'Поведение блоков', def: true,
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

    { key: 'rows', label: 'Список 01-05: линии + вход строк', group: 'Поведение блоков', def: true,
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

    { key: 'iconpop', label: 'Иконки Stärken: появление + дуга', group: 'Поведение блоков', def: true,
      build: function (bag) {
        var items = [];
        qa('[data-id="' + CFG.staerkenId + '"] .feature-card .elementor-icon').forEach(function (ic) {
          relativize(ic);
          bag.cls(ic, 'vm-icon');
          /* дуга вокруг видимого значка, а не вокруг .elementor-icon (он выше и шире) */
          var pict = ic.querySelector('svg, .e-font-icon-svg, i') || ic;
          var svg = el('svg', 'vm-icon-arc', { 'aria-hidden': 'true' });
          /* инлайном: CSS темы (.elementor-icon svg) специфичнее класса и перебивает position */
          svg.style.position = 'absolute';
          svg.style.transform = 'translate(-50%,-50%)';
          var circ = el('circle', null, { pathLength: 100 });
          svg.appendChild(circ);
          bag.node(svg); ic.appendChild(svg);
          items.push({ ic: ic, pict: pict, svg: svg, circ: circ });
        });
        function place() {
          items.forEach(function (it) {
            var pb = it.pict.getBoundingClientRect(), ib = it.ic.getBoundingClientRect();
            if (!pb.width) return;
            var size = Math.round(Math.max(pb.width, pb.height)) + 18;
            it.svg.setAttribute('viewBox', '0 0 ' + size + ' ' + size);
            it.svg.style.width = size + 'px'; it.svg.style.height = size + 'px';
            it.svg.style.left = (pb.left - ib.left + pb.width / 2) + 'px';
            it.svg.style.top = (pb.top - ib.top + pb.height / 2) + 'px';
            var c = size / 2;
            it.circ.setAttribute('cx', c); it.circ.setAttribute('cy', c); it.circ.setAttribute('r', c - 2);
          });
        }
        place();
        var rT;
        bag.listen(window, 'resize', function () { clearTimeout(rT); rT = setTimeout(place, 220); });
        seenIO(bag, qa('[data-id="' + CFG.staerkenId + '"] .feature-card'), 80);
      } },

    { key: 'quiz', label: 'Stärken: тап — карточка раскрывается', group: 'Поведение блоков', def: true,
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

    { key: 'darktext', label: 'Тёмный блок: текст проявляется скроллом', group: 'Поведение блоков', def: true,
      build: function (bag) {
        /* длинный текст блока живёт в p.elementor-heading-title (виджет-заголовок как абзац);
           фильтр >30 слов отсекает настоящий заголовок, а обёрнутые headmask'ом отпадают по children */
        var ps = qa('[data-id="' + CFG.darkTopId + '"] p.elementor-heading-title, [data-id="' + CFG.darkTopId + '"] .elementor-widget-text-editor p').filter(function (p) {
          return !p.children.length && p.textContent.trim().split(/\s+/).length > 30;
        });
        if (!ps.length) return;
        var items = [];
        ps.forEach(function (p) {
          var orig = p.textContent;
          bag.own(function () { p.textContent = orig; });
          var words = orig.trim().split(/\s+/);
          p.textContent = '';
          var spans = words.map(function (w, i) {
            var s = document.createElement('span');
            s.className = 'vm-w';
            s.textContent = w;
            p.appendChild(s);
            if (i < words.length - 1) p.appendChild(document.createTextNode(' '));
            return s;
          });
          items.push({ p: p, spans: spans, lit: 0 });
        });
        if (REDUCE) {
          items.forEach(function (it) { it.spans.forEach(function (s) { s.classList.add('lit'); }); });
          return;
        }
        var ticking = false;
        function frame() {
          ticking = false;
          var vh = innerHeight;
          items.forEach(function (it) {
            var r = it.p.getBoundingClientRect();
            if (r.top > vh || r.bottom < 0) return;
            var pr = Math.max(0, Math.min(1, (vh * 0.88 - r.top) / (vh * 0.43 + r.height)));
            var n = Math.round(pr * it.spans.length);
            while (it.lit < n) it.spans[it.lit++].classList.add('lit');
            while (it.lit > n) it.spans[--it.lit].classList.remove('lit');
          });
        }
        bag.listen(window, 'scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(frame); } });
        frame();
      } },

    { key: 'curtain', label: 'Фото входят шторкой', group: 'Поведение блоков', def: true,
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

    { key: 'parallax', label: 'Параллакс крупных фото (выкл)', group: 'Поведение блоков', def: false,
      build: function (bag) {
        if (REDUCE || matchMedia('(max-width: 767px)').matches) return;
        var paras = [];
        qa('.elementor-widget-image img').forEach(function (img) {
          if (paras.length >= 3) return;
          if ((parseInt(img.getAttribute('width'), 10) || 0) < 500) return;
          if (img.closest('.sticky-section, .scroll-container-parent, header, footer')) return;
          bag.cls(img, 'vm-para');
          bag.own(function () { img.style.transform = ''; });
          paras.push(img);
        });
        if (!paras.length) return;
        var ticking = false;
        function frame() {
          ticking = false;
          var vh = innerHeight;
          paras.forEach(function (img) {
            var r = img.getBoundingClientRect();
            if (r.bottom < 0 || r.top > vh) return;
            img.style.transform = 'translateY(' + (-((r.top + r.height / 2 - vh / 2) / vh) * 26).toFixed(1) + 'px)';
          });
        }
        bag.listen(window, 'scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(frame); } });
        frame();
      } },

    /* ---------- Декор ---------- */
    { key: 'waves', label: 'Волны (hero + тёмный блок)', group: 'Декор', def: true,
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

    { key: 'border', label: 'Обводка карточек + блик (её скрин)', group: 'Декор', def: true,
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

    { key: 'glow', label: 'Свечения за блоками', group: 'Декор', def: true,
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

    { key: 'darklight', label: 'Луч света в тёмном блоке', group: 'Декор', def: true,
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

    { key: 'rings', label: 'Кольца вокруг цифр 01-05', group: 'Декор', def: true,
      build: function (bag) {
        /* на мобиле строки стакаются и кольцо гарантированно лезет на текст — не строим */
        if (isMobile()) return;
        var hosts = [], items = [];
        qa(CFG.ringNumbers).forEach(function (t) {
          if (!/^0\d$/.test(t.textContent.trim())) return;
          relativize(t);
          bag.cls(t, 'vm-ring-host');
          var svg = el('svg', 'vm-ring', { 'aria-hidden': 'true' });
          svg.style.transform = 'translate(-50%,-50%)';
          var dash = el('circle', 'r-dash', { pathLength: 100 });
          var arc = el('circle', 'r-arc', { pathLength: 100 });
          svg.appendChild(dash); svg.appendChild(arc);
          bag.node(svg); t.appendChild(svg);
          items.push({ t: t, svg: svg, circles: [dash, arc] });
          hosts.push(t);
        });
        function place() {
          items.forEach(function (it) {
            var t = it.t;
            /* svg на время замера прячем: Range по содержимому захватил бы и его
               (свежесозданный svg без viewBox — это дефолтные 300x150) */
            it.svg.style.display = 'none';
            var rng = document.createRange();
            rng.selectNodeContents(t);
            var tb = rng.getBoundingClientRect(), hb = t.getBoundingClientRect();
            var size = Math.round(Math.max(tb.width, tb.height) + 30);
            /* защита от налезания: если кольцо пересечёт текст соседей по строке — прячем его */
            var row = t.closest('.feature-left') || t.parentElement;
            var cx = tb.left + tb.width / 2, cy = tb.top + tb.height / 2;
            var ringR = { l: cx - size / 2, r: cx + size / 2, t: cy - size / 2, b: cy + size / 2 };
            var hit = qa('h1, h2, h3, p, a', row).some(function (n) {
              if (n === t || t.contains(n) || n.contains(t)) return false;
              var b = n.getBoundingClientRect();
              if (!b.width || !b.height) return false;
              return ringR.l < b.right - 4 && ringR.r > b.left + 4 && ringR.t < b.bottom - 4 && ringR.b > b.top + 4;
            });
            it.svg.style.display = hit ? 'none' : '';
            if (hit) return;
            it.svg.setAttribute('viewBox', '0 0 ' + size + ' ' + size);
            it.svg.style.width = size + 'px'; it.svg.style.height = size + 'px';
            it.svg.style.left = (tb.left - hb.left + tb.width / 2) + 'px';
            it.svg.style.top = (tb.top - hb.top + tb.height / 2) + 'px';
            var c = size / 2, r = c - 2;
            it.circles.forEach(function (ci) { ci.setAttribute('cx', c); ci.setAttribute('cy', c); ci.setAttribute('r', r); });
          });
        }
        place();
        var rT;
        bag.listen(window, 'resize', function () { clearTimeout(rT); rT = setTimeout(place, 220); });
        seenIO(bag, hosts, 0);
      } },

    { key: 'shapes', label: 'Фигуры по секциям (круг, крест, дуги, пульс)', group: 'Декор', def: true,
      build: function (bag) {
        var mob = isMobile();
        var drift = [];   /* элементы с параллакс-глубиной */
        var seen = [];    /* элементы с прорисовкой (arcs, pulse) */
        CFG.shapes.forEach(function (sp) {
          if (mob && !sp.m) return;
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
    { key: 'arrows', label: 'Стрелки у кнопок CTA', group: 'Мелочи', def: true,
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

    { key: 'wapulse', label: 'Пульс WhatsApp-кнопки', group: 'Мелочи', def: true,
      build: function (bag) {
        var wa = document.querySelector(CFG.waButton);
        if (!wa) return;
        bag.cls(wa, 'vm-wa');
        var icon = wa.querySelector('.elementor-icon');
        if (icon) { relativize(icon); bag.cls(icon, 'vm-wa-icon'); }
      } },

    { key: 'footline', label: 'Футер: линия + вход колонок', group: 'Мелочи', def: true,
      build: function (bag) {
        var f = document.querySelector(CFG.footer);
        if (!f) return;
        relativize(f);
        var line = bag.node(el('div', 'vm-footline', { 'aria-hidden': 'true' }));
        f.insertBefore(line, f.firstChild);
        bag.cls(f, 'vm-foot');
        seenIO(bag, [f], 0);
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
    MODULES.forEach(function (m) {
      if (!state[m.key]) return;
      var bag = makeBag();
      try { m.build(bag); } catch (e) { /* один упавший модуль не валит остальные */ }
      bags[m.key] = bag;
    });
  }

  /* ============================================================
     Панель (только с ?panel / #panel в URL)
     ============================================================ */
  function buildPanel() {
    /* локально панель всегда; на публичном URL (Pages для клиентки) — только с ?panel */
    var isLocal = /^(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)$/.test(location.hostname);
    if (!isLocal && !/[?#&]panel/.test(location.search + location.hash)) return;
    var p = el('div', null, { id: 'vm-panel' });
    if (matchMedia('(max-width: 767px)').matches) p.classList.add('closed');
    var head = el('div', 'vm-p-head');
    head.textContent = 'vm · анимации';
    var body = el('div', 'vm-p-body');
    head.addEventListener('click', function () { p.classList.toggle('closed'); });
    var groups = {};
    MODULES.forEach(function (m) {
      if (!groups[m.group]) {
        var g = el('div', 'vm-p-group');
        var t = el('div', 'vm-p-gtitle');
        t.textContent = m.group;
        g.appendChild(t);
        body.appendChild(g);
        groups[m.group] = g;
      }
      var row = el('label', 'vm-p-row');
      var cb = el('input', null, { type: 'checkbox' });
      cb.dataset.key = m.key; /* маппинг по ключу, не по позиции — реордер панели ничего не ломает */
      cb.checked = state[m.key];
      cb.addEventListener('change', function () {
        state[m.key] = cb.checked;
        saveState(state);
        history.replaceState(null, '', location.pathname + location.search); // пресет из hash больше не главнее
        applyState();
      });
      var sp = el('span'); sp.textContent = m.label;
      row.appendChild(cb); row.appendChild(sp);
      groups[m.group].appendChild(row);
    });
    var tools = el('div', 'vm-p-tools');
    var link = el('button', 'vm-p-btn'); link.textContent = 'Ссылка с этим набором';
    link.addEventListener('click', function () {
      var keys = MODULES.filter(function (m) { return state[m.key]; }).map(function (m) { return m.key; });
      var url = location.origin + location.pathname + '#vm=' + keys.join(',');
      (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(
        function () { link.textContent = 'Скопирована ✓'; setTimeout(function () { link.textContent = 'Ссылка с этим набором'; }, 1500); },
        function () { prompt('Скопируйте ссылку:', url); }
      );
    });
    var reset = el('button', 'vm-p-btn'); reset.textContent = 'Сброс к дефолту';
    reset.addEventListener('click', function () {
      state = defaults(); saveState(state); applyState();
      qa('input[data-key]', body).forEach(function (cb) { cb.checked = !!state[cb.dataset.key]; });
    });
    tools.appendChild(link); tools.appendChild(reset);
    body.appendChild(tools);
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
    var lastMobile = isMobile(), rzT;
    addEventListener('resize', function () {
      clearTimeout(rzT);
      rzT = setTimeout(function () {
        if (isMobile() !== lastMobile) { lastMobile = isMobile(); applyState(); }
      }, 300);
    }, { passive: true });
  }

  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
