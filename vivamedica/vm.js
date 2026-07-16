/* ============================================================
   VivaMedica · vm — универсальная система декоративных анимаций.
   Конфиг ниже — единственное место привязки к конкретной странице:
   те же компоненты переносятся на любую страницу сайта.
   ============================================================ */
(function () {
  'use strict';
  var REDUCE = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var NS = 'http://www.w3.org/2000/svg';

  var CFG = {
    heroId: '6cd3ded7',            // hero-секция: волны снизу + glow
    darkId: '49ce7c06',            // тёмно-зелёный контейнер: волны + кубики
    numbersId: '61470111',         // секция 01-05: кубики у цифр
    borderCards: [                 // «линия вокруг блока»
      '[data-id="5c5a4c60"] .feature-card',          // карточки преимуществ
      '[data-id="6acd534e"] .e-loop-item'            // карточки блога
    ],
    ringNumbers: '[data-id="61470111"] .elementor-heading-title', // кольца вокруг цифр 01-05
    glowHosts: ['6cd3ded7', '5c5a4c60', '4c9fd4d'],
    arrowButtons: '.elementor-button',
    routeFrom: 2                   // маршрут начиная с границы после hero
  };

  function el(tag, cls, attrs) {
    var n = tag === 'svg' || tag === 'path' || tag === 'rect' || tag === 'line' || tag === 'circle' || tag === 'g' || tag === 'polygon'
      ? document.createElementNS(NS, tag) : document.createElement(tag);
    if (cls) n.setAttribute('class', cls);
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    return n;
  }
  function sections() {
    return Array.prototype.filter.call(document.querySelectorAll('.e-con.e-parent'), function (s) {
      return !s.closest('.e-con.e-parent .e-con.e-parent') && s.offsetHeight > 120;
    });
  }
  function byId(id) { return document.querySelector('[data-id="' + id + '"]'); }
  function relativize(host) {
    if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
  }

  /* ---------- reveal + IntersectionObserver ---------- */
  var io;
  function setupReveal() {
    sections().forEach(function (sec) {
      var inner = sec.querySelector(':scope > .e-con-inner') || sec;
      Array.prototype.forEach.call(inner.children, function (k) {
        if (/marquee|sticky|scroll-container|swiper|vm-/.test(k.className)) return;
        k.classList.add('vm-rv');
      });
    });
    if (REDUCE) return;
    io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var root = e.target, i = 0;
        var items = root.querySelectorAll('.vm-rv, .vm-border-host, .vm-ring-host');
        Array.prototype.forEach.call(items, function (n) {
          if (n.__vm) return; n.__vm = true;
          n.style.transitionDelay = Math.min(i, 6) * 80 + 'ms';
          n.classList.add('is-visible'); i++;
        });
        if (root.matches('.vm-rv, .vm-border-host, .vm-ring-host') && !root.__vm) {
          root.__vm = true; root.classList.add('is-visible');
        }
        io.unobserve(root);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    sections().forEach(function (s) { io.observe(s); });
  }

  /* ---------- подчёркивания заголовков ---------- */
  function setupHeadingLines() {
    Array.prototype.forEach.call(document.querySelectorAll('.anim-heading .elementor-heading-title, .anim-heading h1, .anim-heading h2'), function (t) {
      if (t.querySelector('.vm-hline')) return;
      var line = el('span', 'vm-hline' + (getComputedStyle(t).textAlign === 'center' ? ' c' : ''));
      t.appendChild(line);
    });
  }

  /* ---------- волны ---------- */
  function wavePath(y, amp, phase) {
    var d = 'M0 ' + y, x = 0, per = 360, up = true, k;
    for (k = phase; x < 2880; k++) {
      d += ' C' + (x + per * 0.37) + ' ' + (y + (up ? -amp : amp)) + ' ' + (x + per * 0.63) + ' ' + (y + (up ? -amp : amp)) + ' ' + (x + per) + ' ' + y;
      x += per; up = !up;
    }
    return d;
  }
  function buildWaves(host, opts) {
    relativize(host);
    var box = el('div', 'vm-waves', { 'aria-hidden': 'true' });
    box.style.height = opts.h + 'px';
    box.style[opts.at] = '0';
    var svg = el('svg', null, { viewBox: '0 0 1440 ' + opts.h, preserveAspectRatio: 'none' });
    svg.setAttribute('width', '100%'); svg.setAttribute('height', '100%');
    opts.waves.forEach(function (w, i) {
      var g = el('g', 'vm-wave-g w' + (i + 1));
      var p = el('path', null, { d: wavePath(w.y, w.amp, i) });
      p.style.stroke = w.color; p.style.strokeOpacity = w.op;
      g.appendChild(p);
      svg.appendChild(g);
    });
    box.appendChild(svg);
    host.appendChild(box);
  }

  /* ---------- обводка карточек ---------- */
  var borderHosts = [];
  function buildBorders() {
    CFG.borderCards.forEach(function (sel) {
      Array.prototype.forEach.call(document.querySelectorAll(sel), function (c) {
        if (c.offsetWidth < 180 || c.offsetHeight < 120 || c.__vmb) return;
        c.__vmb = true;
        relativize(c);
        c.classList.add('vm-border-host');
        var svg = el('svg', 'vm-border', { 'aria-hidden': 'true' });
        var mk = function (cls) {
          return el('rect', cls, { x: 1.5, y: 1.5, pathLength: 100 });
        };
        svg.appendChild(mk('vm-draw'));
        svg.appendChild(mk('vm-spark'));
        c.appendChild(svg);
        borderHosts.push(c);
      });
    });
    sizeBorders();
  }
  function sizeBorders() {
    borderHosts.forEach(function (c) {
      var svg = c.querySelector(':scope > .vm-border');
      if (!svg) return;
      var w = c.offsetWidth, h = c.offsetHeight;
      var r = parseFloat(getComputedStyle(c).borderRadius) || 18;
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
      Array.prototype.forEach.call(svg.querySelectorAll('rect'), function (rc) {
        rc.setAttribute('width', Math.max(0, w - 3));
        rc.setAttribute('height', Math.max(0, h - 3));
        rc.setAttribute('rx', Math.min(r, h / 2));
      });
    });
  }

  /* ---------- пунктирный маршрут ---------- */
  var routeBox;
  function buildRoute() {
    if (routeBox) routeBox.remove();
    if (matchMedia('(max-width: 767px)').matches) return;
    var secs = sections();
    if (secs.length < CFG.routeFrom + 2) return;
    routeBox = el('div', null, { id: 'vm-route', 'aria-hidden': 'true' });
    var docTop = function (n) { var r = n.getBoundingClientRect(); return r.top + window.pageYOffset; };
    routeBox.style.height = document.documentElement.scrollHeight + 'px';
    var segH = 150;
    for (var i = CFG.routeFrom; i < secs.length - 1; i++) {
      var boundary = docTop(secs[i + 1]);
      var seg = el('div', 'vm-route-seg');
      seg.style.left = '50%';
      seg.style.top = (boundary - segH * 0.55) + 'px';
      seg.style.height = segH + 'px';
      var svg = el('svg', null, { viewBox: '0 0 26 ' + segH });
      svg.appendChild(el('line', null, { x1: 13, y1: 6, x2: 13, y2: segH - 18 }));
      svg.appendChild(el('circle', 'n', { cx: 13, cy: segH - 10, r: 4 }));
      svg.appendChild(el('circle', 'p', { cx: 13, cy: segH - 10, r: 7 }));
      seg.appendChild(svg);
      routeBox.appendChild(seg);
    }
    document.body.appendChild(routeBox);
  }

  /* ---------- кольца вокруг цифр 01-05 (circle-cycle) ---------- */
  function buildRings() {
    Array.prototype.forEach.call(document.querySelectorAll(CFG.ringNumbers), function (t) {
      if (t.__vmr || !/^0\d$/.test(t.textContent.trim())) return;
      t.__vmr = true;
      relativize(t);
      t.classList.add('vm-ring-host');
      var rng = document.createRange();
      rng.selectNodeContents(t);
      var tb = rng.getBoundingClientRect(), hb = t.getBoundingClientRect();
      var size = Math.round(Math.max(tb.width, tb.height) + 30);
      var svg = el('svg', 'vm-ring', { viewBox: '0 0 ' + size + ' ' + size, 'aria-hidden': 'true' });
      svg.style.width = size + 'px'; svg.style.height = size + 'px';
      svg.style.left = (tb.left - hb.left + tb.width / 2) + 'px';
      svg.style.top = (tb.top - hb.top + tb.height / 2) + 'px';
      svg.style.transform = 'translate(-50%,-50%)';
      var c = size / 2, r = c - 2;
      svg.appendChild(el('circle', 'r-dash', { cx: c, cy: c, r: r, pathLength: 100 }));
      svg.appendChild(el('circle', 'r-arc', { cx: c, cy: c, r: r, pathLength: 100 }));
      t.appendChild(svg);
    });
  }

  /* ---------- кубики ---------- */
  function cubeSvg(size, tone) {
    var s = size, h = s / 2;
    var svg = el('svg', null, { viewBox: '0 0 100 116', width: s, height: s * 1.16 });
    var col = tone === 'mint' ? '50,219,190' : '16,67,45';
    [['50,2 98,30 50,58 2,30', .34], ['2,30 50,58 50,114 2,86', .18], ['98,30 50,58 50,114 98,86', .10]].forEach(function (f) {
      var p = el('polygon', null, { points: f[0] });
      p.style.fill = 'rgba(' + col + ',' + f[1] + ')';
      p.style.stroke = 'rgba(' + col + ',.55)';
      p.style.strokeWidth = '2';
      svg.appendChild(p);
    });
    return svg;
  }
  function buildCubes(host, spots) {
    if (!host) return;
    relativize(host);
    var box = el('div', 'vm-cubes', { 'aria-hidden': 'true' });
    box.style.inset = '0';
    spots.forEach(function (sp, i) {
      var c = el('div', 'vm-cube c' + (i + 1));
      c.style.left = sp.x; c.style.top = sp.y;
      c.appendChild(cubeSvg(sp.s, sp.tone));
      box.appendChild(c);
    });
    host.appendChild(box);
  }

  /* ---------- glow ---------- */
  function buildGlow() {
    CFG.glowHosts.forEach(function (id, i) {
      var host = byId(id);
      if (!host) return;
      relativize(host);
      var g = el('div', 'vm-glow', { 'aria-hidden': 'true' });
      var size = 420 + i * 60;
      g.style.width = size + 'px'; g.style.height = size + 'px';
      g.style[i % 2 ? 'left' : 'right'] = '-6%';
      g.style.top = i % 2 ? '55%' : '8%';
      g.style.animationDelay = -(i * 3) + 's';
      host.insertBefore(g, host.firstChild);
    });
  }

  /* ---------- стрелки CTA ---------- */
  function buildArrows() {
    Array.prototype.forEach.call(document.querySelectorAll(CFG.arrowButtons), function (b) {
      if (b.__vma || b.querySelector('.vm-arr')) return;
      if (getComputedStyle(b, '::before').content !== 'none') return; // у кнопки уже есть родная стрелка
      var txt = b.querySelector('.elementor-button-text') || b;
      if (!txt.textContent.trim()) return;
      b.__vma = true;
      var sp = el('span', 'vm-arr', { 'aria-hidden': 'true' });
      var svg = el('svg', null, { viewBox: '0 0 22 12', width: 22, height: 12 });
      svg.appendChild(el('path', 'a-line', { d: 'M1 6 H19 M14 1.5 L19.5 6 L14 10.5' }));
      sp.appendChild(svg);
      txt.appendChild(sp);
    });
  }

  /* ---------- параллакс ---------- */
  var paras = [];
  function setupParallax() {
    if (REDUCE || matchMedia('(max-width: 767px)').matches) return;
    var picked = 0;
    Array.prototype.forEach.call(document.querySelectorAll('.elementor-widget-image img'), function (img) {
      if (picked >= 3) return;
      if ((parseInt(img.getAttribute('width'), 10) || 0) < 500) return;
      if (img.closest('.sticky-section, .scroll-container-parent, header, footer')) return;
      img.classList.add('vm-para');
      paras.push(img); picked++;
    });
    if (!paras.length) return;
    var ticking = false;
    function frame() {
      ticking = false;
      var vh = window.innerHeight;
      paras.forEach(function (img) {
        var r = img.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        var p = (r.top + r.height / 2 - vh / 2) / vh;
        img.style.transform = 'translateY(' + (-p * 26).toFixed(1) + 'px)';
      });
    }
    addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(frame); }
    }, { passive: true });
    frame();
  }

  /* ---------- init ---------- */
  function init() {
    document.documentElement.classList.add('vm-on');
    setupHeadingLines();
    buildBorders();
    buildRings();
    buildGlow();
    buildArrows();
    var hero = byId(CFG.heroId);
    if (hero) buildWaves(hero, { at: 'bottom', h: 170, waves: [
      { y: 95, amp: 42, color: '#10432d', op: .28 },
      { y: 120, amp: 30, color: '#32dbbe', op: .38 },
      { y: 75, amp: 56, color: '#10432d', op: .14 }
    ]});
    var dark = byId(CFG.darkId);
    if (dark) buildWaves(dark, { at: 'bottom', h: 130, waves: [
      { y: 70, amp: 34, color: '#32dbbe', op: .30 },
      { y: 92, amp: 24, color: '#eef3ed', op: .22 }
    ]});
    buildCubes(byId(CFG.numbersId), [
      { x: '30%', y: '78%', s: 34, tone: 'ink' },
      { x: '38%', y: '86%', s: 20, tone: 'mint' },
      { x: '25%', y: '89%', s: 14, tone: 'ink' }
    ]);
    buildCubes(dark, [
      { x: '93%', y: '9%', s: 24, tone: 'mint' },
      { x: '88%', y: '22%', s: 14, tone: 'mint' }
    ]);
    buildRoute();
    setupReveal();
    setupParallax();
    if (REDUCE) {
      Array.prototype.forEach.call(document.querySelectorAll('.vm-rv, .vm-border-host, .vm-ring-host'), function (n) {
        n.classList.add('is-visible');
      });
    }
    var rT;
    addEventListener('resize', function () {
      clearTimeout(rT);
      rT = setTimeout(function () { sizeBorders(); buildRoute(); }, 220);
    }, { passive: true });
    /* маршрут зависит от финальной высоты документа (ленивые картинки) */
    addEventListener('load', function () { setTimeout(buildRoute, 600); });
  }

  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
