// encaje: asset de excovery.publicaciones (JS ligero del índice: filtros, desplegar todo, inclinación 3D, figura de cabecera); el contenido no depende de él.
(function () {
  'use strict';
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var touch = window.matchMedia && matchMedia('(hover: none), (pointer: coarse)').matches;

  // ------------------------------------------------------------ filters (area, year, search)
  var tools = document.querySelector('.tools');
  var cards = Array.prototype.slice.call(document.querySelectorAll('.card'));
  if (tools && cards.length) {
    tools.hidden = false;
    // level 1: one area at a time (click again to clear); level 2: its subareas, several at once
    var chips = Array.prototype.slice.call(tools.querySelectorAll('.chip[data-area]'));
    var subchips = Array.prototype.slice.call(tools.querySelectorAll('.chip-sub'));
    var rows = Array.prototype.slice.call(tools.querySelectorAll('.subchips'));
    var q = tools.querySelector('input[type=search]'), sel = tools.querySelector('select');
    var out = tools.querySelector('.count'), empty = document.querySelector('.empty');
    var area = '', subs = {};
    // what the search reads: title, authors, keywords, DOI (data-q) and the folded part (abstract, tags, links),
    // which is in the static HTML even while the card is closed; read once, before MathJax touches the formulas
    cards.forEach(function (c) {
      var more = c.querySelector('.more-body'), tz = c.querySelector('.teaser');
      c._q = (c.dataset.q + ' ' + (tz ? tz.textContent : '') + ' ' + (more ? more.textContent : ''))
        .replace(/\s+/g, ' ').toLowerCase();
    });
    function has(list, k) { return (' ' + list + ' ').indexOf(' ' + k + ' ') >= 0; }
    function apply() {
      var t = (q.value || '').toLowerCase().trim().split(/\s+/).filter(Boolean), y = sel.value, n = 0;
      var anySub = Object.keys(subs).filter(function (k) { return subs[k]; });
      cards.forEach(function (c) {
        var ok = (!area || has(c.dataset.areas, area)) &&
          (!anySub.length || anySub.some(function (s) { return has(c.dataset.subs, s); })) &&
          (!y || c.dataset.year === y) && t.every(function (w) { return c._q.indexOf(w) >= 0; });
        c.hidden = !ok; if (ok) n++;
      });
      document.querySelectorAll('section.group').forEach(function (s) {
        s.hidden = !s.querySelector('.card:not([hidden])');
      });
      // with an area picked: the chip number (main area, = the section) plus the cross-listed ones, said apart
      var chip = area && tools.querySelector('.chip[data-area="' + area + '"]');
      var cross = chip ? +chip.dataset.cross : 0, extra = '';
      if (chip && cross && +chip.dataset.main && !anySub.length && !y && !t.length) {
        extra = ' (' + chip.dataset.main + ' + ' + cross + ' cross-listed)';
      }
      out.value = n + ' of ' + cards.length + extra;
      empty.hidden = n > 0;
      syncAll();
    }
    function pick(k) {
      area = area === k ? '' : k; subs = {};
      chips.forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.area === area ? 'true' : 'false'); });
      subchips.forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
      rows.forEach(function (r) { r.hidden = r.dataset.for !== area; });
      apply();
    }
    chips.forEach(function (b) { b.addEventListener('click', function () { pick(b.dataset.area); }); });
    subchips.forEach(function (b) {
      b.addEventListener('click', function () {
        var k = b.dataset.sub; subs[k] = !subs[k]; b.setAttribute('aria-pressed', subs[k] ? 'true' : 'false'); apply();
      });
    });
    // ---------------------------------------------------------- Expand all / Collapse all (the visible cards)
    var allBtn = tools.querySelector('.expand-all');
    function shown() { return cards.filter(function (c) { return !c.hidden; }); }
    function syncAll() {
      if (!allBtn) return;
      var vis = shown(), anyClosed = vis.some(function (c) { var d = c.querySelector('details.more'); return d && !d.open; });
      allBtn.textContent = anyClosed || !vis.length ? 'Expand all' : 'Collapse all';
      allBtn.setAttribute('aria-pressed', anyClosed || !vis.length ? 'false' : 'true');
    }
    tools._sync = syncAll;
    if (allBtn) {
      allBtn.addEventListener('click', function () {
        var open = allBtn.getAttribute('aria-pressed') !== 'true';
        shown().forEach(function (c) { var d = c.querySelector('details.more'); if (d) d.open = open; });
        syncAll();
      });
    }
    // a capture can open an area: index.html#area=physics
    var m = /area=([a-z-]+)/.exec(location.hash);
    if (m) pick(m[1]);
    q.addEventListener('input', apply); sel.addEventListener('change', apply);
    apply();
  }
  function syncAll() { if (tools && tools._sync) tools._sync(); }

  // ------------------------------------------------------------ folded cards: aria-expanded and state on the card
  cards.forEach(function (c) {
    var d = c.querySelector('details.more');
    if (!d) return;
    var s = d.querySelector('summary');
    function st() {
      s.setAttribute('aria-expanded', d.open ? 'true' : 'false');
      c.classList.toggle('is-open', d.open);
      if (d.open) { c.classList.remove('is-tilt'); c.style.removeProperty('--rx'); c.style.removeProperty('--ry'); }
    }
    st();
    d.addEventListener('toggle', function () { st(); syncAll(); });
  });
  // a capture can open one card: index.html#open=<slug>
  var mo = /open=([a-z0-9-]+)/.exec(location.hash);
  if (mo) {
    var link = document.querySelector('.card-title a[href="' + mo[1] + '/"]');
    var dd = link && link.closest('.card').querySelector('details.more');
    if (dd) { dd.open = true; setTimeout(function () { dd.closest('.card').scrollIntoView({ block: 'start' }); }, 0); }
  }

  // ------------------------------------------------------------ 3D tilt that follows the pointer (not on an open card)
  function tilt(c, px, py) {   // px, py in [0, 1]
    c.style.setProperty('--ry', ((px - 0.5) * 9).toFixed(2) + 'deg');
    c.style.setProperty('--rx', ((0.5 - py) * 7).toFixed(2) + 'deg');
  }
  if (!reduce && !touch) {
    cards.forEach(function (c) {
      c.addEventListener('pointermove', function (ev) {
        if (c.classList.contains('is-open')) return;
        var r = c.getBoundingClientRect();
        tilt(c, (ev.clientX - r.left) / r.width, (ev.clientY - r.top) / r.height);
      });
      c.addEventListener('pointerleave', function () { c.style.removeProperty('--rx'); c.style.removeProperty('--ry'); });
    });
  }
  // a capture can show the tilted state without a mouse: index.html#demo-tilt
  if (location.hash === '#demo-tilt' && cards[0]) { cards[0].classList.add('is-tilt'); tilt(cards[0], 0.85, 0.2); }

  // ------------------------------------------------------------ header figure: a slowly turning saddle with its planes
  var cv = document.querySelector('.hero-fig');
  if (!cv || !cv.getContext) return;
  var ctx = cv.getContext('2d'), dpr = Math.min(window.devicePixelRatio || 1, 2);
  function size() { var s = cv.clientWidth || 150; cv.width = s * dpr; cv.height = s * dpr; }
  size(); window.addEventListener('resize', size);
  var dark = window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches;
  var N = 9, pts = [];
  for (var i = 0; i <= N; i++) for (var j = 0; j <= N; j++) {
    var x = i / N * 2 - 1, y = j / N * 2 - 1; pts.push([x, y, (x * x - y * y) * 0.6]);
  }
  function proj(p, a) {
    var ca = Math.cos(a), sa = Math.sin(a), tx = 0.42;
    var x = p[0] * ca - p[1] * sa, y = p[0] * sa + p[1] * ca, z = p[2];
    var y2 = y * Math.cos(tx) - z * Math.sin(tx), z2 = y * Math.sin(tx) + z * Math.cos(tx);
    var d = 3.2 / (3.2 + y2), s = cv.width * 0.30;
    return [cv.width / 2 + x * s * d, cv.height / 2 - z2 * s * d, d];
  }
  function draw(a) {
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.lineWidth = 1.1 * dpr;
    // the three coordinate planes, faint
    [[[-1, -1, 0], [1, -1, 0], [1, 1, 0], [-1, 1, 0]], [[-1, 0, -0.6], [1, 0, -0.6], [1, 0, 0.6], [-1, 0, 0.6]],
     [[0, -1, -0.6], [0, 1, -0.6], [0, 1, 0.6], [0, -1, 0.6]]].forEach(function (pl, k) {
      ctx.beginPath();
      pl.forEach(function (p, m) { var q = proj(p, a); if (m) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); });
      ctx.closePath();
      ctx.fillStyle = ['hsla(262,70%,60%,.10)', 'hsla(205,70%,60%,.10)', 'hsla(28,80%,60%,.10)'][k];
      ctx.fill();
    });
    for (var i = 0; i <= N; i++) for (var j = 0; j <= N; j++) {
      var p = proj(pts[i * (N + 1) + j], a);
      [[i + 1, j], [i, j + 1]].forEach(function (n) {
        if (n[0] > N || n[1] > N) return;
        var q = proj(pts[n[0] * (N + 1) + n[1]], a), dep = (p[2] + q[2]) / 2;
        ctx.strokeStyle = 'hsla(' + (205 + 60 * (i / N)) + ',70%,' + (dark ? 70 : 42) + '%,' + (0.25 + 0.6 * (dep - 0.6)) + ')';
        ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
      });
    }
  }
  var a = 0.6, visible = true, last = 0;
  if (reduce) { draw(a); return; }
  if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(cv);
  function loop(t) {
    if (visible && !document.hidden && t - last > 33) { a += 0.006; draw(a); last = t; }
    requestAnimationFrame(loop);
  }
  draw(a);
  requestAnimationFrame(loop);
})();
