/* ==========================================================================
   VAMOS — לוגיקת האתר
   1. תפריט מדינות + תפריט מובייל
   2. מפת דרום אמריקה אינטראקטיבית (SVG, נבנית מ-map-data.js)
   3. ספירת מידע לפי מדינה
   4. Reveal on scroll
   ניווט: כל הקישורים נבנים יחסית ל-BASE (data-base על <body>).
   ========================================================================== */
(function () {
  'use strict';

  var BASE = document.body.getAttribute('data-base') || '';
  var COUNTRIES = window.VAMOS_COUNTRIES || [];
  var ARTICLES = window.VAMOS_ARTICLES || [];
  var bySlug = {};
  COUNTRIES.forEach(function (c) { bySlug[c.slug] = c; });

  function url(p) { return BASE + p; }
  function countArticles(slug) {
    return ARTICLES.filter(function (a) { return a.country === slug; }).length;
  }
  function countLabel(n) {
    return n === 1 ? 'פריט מידע אחד' : n + ' פריטי מידע';
  }

  /* ---------------------------------------------------------------- nav ---- */
  function initNav() {
    var menuBtn = document.querySelector('.menu-btn');
    var menuPanel = document.getElementById('countries-menu');
    if (menuBtn && menuPanel) {
      menuBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        var open = menuPanel.classList.toggle('open');
        menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      document.addEventListener('click', function (e) {
        if (!menuPanel.contains(e.target) && e.target !== menuBtn) {
          menuPanel.classList.remove('open');
          menuBtn.setAttribute('aria-expanded', 'false');
        }
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
          menuPanel.classList.remove('open');
          menuBtn.setAttribute('aria-expanded', 'false');
        }
      });
    }

    var burger = document.querySelector('.burger');
    var drawer = document.getElementById('mobile-drawer');
    if (burger && drawer) {
      burger.addEventListener('click', function () {
        var open = drawer.classList.toggle('open');
        burger.setAttribute('aria-expanded', open ? 'true' : 'false');
        document.body.style.overflow = open ? 'hidden' : '';
      });
      drawer.addEventListener('click', function (e) {
        if (e.target.closest('a')) {
          drawer.classList.remove('open');
          burger.setAttribute('aria-expanded', 'false');
          document.body.style.overflow = '';
        }
      });
    }
  }

  /* ---------------------------------------------------------------- map ---- */
  var SVG_NS = 'http://www.w3.org/2000/svg';
  function el(name, attrs) {
    var n = document.createElementNS(SVG_NS, name);
    for (var k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    return n;
  }

  function initMap() {
    var host = document.getElementById('vamos-map');
    var data = window.VAMOS_MAP;
    if (!host || !data) return;

    var svg = el('svg', {
      viewBox: '0 0 ' + data.width + ' ' + data.height,
      role: 'img',
      'aria-label': 'מפה אינטראקטיבית של דרום ומרכז אמריקה — לחצו על מדינה כדי לראות את המידע שלה'
    });

    // context countries (not clickable)
    if (data.context) svg.appendChild(el('path', { d: data.context, class: 'map-ctx' }));

    var shapes = {};
    Object.keys(data.main).forEach(function (slug) {
      var c = bySlug[slug];
      if (!c) return;
      var n = countArticles(slug);
      var path = el('path', {
        d: data.main[slug],
        class: 'country' + (n === 0 ? ' is-empty' : ''),
        'data-slug': slug,
        tabindex: '0',
        role: 'link',
        'aria-label': c.he + ' — ' + (n ? countLabel(n) : 'עוד אין מידע')
      });
      var title = el('title');
      title.textContent = c.he + (n ? ' · ' + countLabel(n) : '');
      path.appendChild(title);
      svg.appendChild(path);
      shapes[slug] = path;
    });

    // leader lines for the small countries
    var leaders = data.leaders || {};
    Object.keys(leaders).forEach(function (slug) {
      var L = leaders[slug];
      svg.appendChild(el('line', { x1: L[0], y1: L[1], x2: L[2], y2: L[3], class: 'map-leader' }));
    });

    // labels
    var small = data.smallLabels || [];
    Object.keys(data.labels || {}).forEach(function (slug) {
      var c = bySlug[slug];
      if (!c) return;
      var p = data.labels[slug];
      var n = countArticles(slug);
      var cls = 'map-label' + (small.indexOf(slug) > -1 ? ' is-small' : '');
      var t = el('text', { x: p[0], y: p[1], class: cls });
      t.textContent = c.he;
      svg.appendChild(t);
    });

    host.innerHTML = '';
    host.appendChild(svg);

    // לחיצה על מדינה מנווטת ישר לעמוד המדינה
    function goTo(slug) {
      var c = bySlug[slug];
      if (c) window.location.href = url('countries/' + c.slug + '.html');
    }
    svg.addEventListener('click', function (e) {
      var p = e.target.closest ? e.target.closest('.country') : null;
      if (p) goTo(p.getAttribute('data-slug'));
    });
    svg.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var p = e.target.closest ? e.target.closest('.country') : null;
      if (p) { e.preventDefault(); goTo(p.getAttribute('data-slug')); }
    });
  }

  /* ------------------------------------------------------------- reveal ---- */
  function initReveal() {
    var items = document.querySelectorAll('.reveal');
    if (!items.length) return;
    if (!('IntersectionObserver' in window)) {
      items.forEach(function (n) { n.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry, i) {
        if (!entry.isIntersecting) return;
        var n = entry.target;
        setTimeout(function () { n.classList.add('in'); }, (i % 6) * 70);
        io.unobserve(n);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    items.forEach(function (n) { io.observe(n); });
  }

  /* ---------------------------------------------------------------- init --- */
  function init() {
    initNav();
    initMap();
    initReveal();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
