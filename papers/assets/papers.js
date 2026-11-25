// encaje: asset de excovery.publicaciones (JS ligero del índice: filtros, inclinación 3D, figura de cabecera); el contenido no depende de él.
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
    function has(list, k) { return (' ' + list + ' ').indexOf(' ' + k + ' ') >= 0; }
    function apply() {
      var t = (q.value || '').toLowerCase().trim().split(/\s+/).filter(Boolean), y = sel.value, n = 0;
      var anySub = Object.keys(subs).filter(function (k) { return subs[k]; });
      cards.forEach(function (c) {
        var ok = (!area || has(c.dataset.areas, area)) &&
          (!anySub.length || anySub.some(function (s) { return has(c.dataset.subs, s); })) &&
          (!y || c.dataset.year === y) && t.every(function (w) { return c.dataset.q.indexOf(w) >= 0; });
        c.hidden = !ok; if (ok) n++;
      });
      document.querySelectorAll('section.group').forEach(function (s) {
        s.hidden = !s.querySelector('.card:not([hidden])');
      });
      out.value = n + ' of ' + cards.length;
      empty.hidden = n > 0;
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
    // a capture can open an area: index.html#area=physics
    var m = /area=([a-z-]+)/.exec(location.hash);
    if (m) pick(m[1]);
    q.addEventListener('input', apply); sel.addEventListener('change', apply);
    apply();
  }

  // ------------------------------------------------------------ 3D tilt that follows the pointer
  function tilt(c, px, py) {   // px, py in [0, 1]
    c.style.setProperty('--ry', ((px - 0.5) * 9).toFixed(2) + 'deg');
    c.style.setProperty('--rx', ((0.5 - py) * 7).toFixed(2) + 'deg');
  }
  if (!reduce && !touch) {
    cards.forEach(function (c) {
      c.addEventListener('pointermove', function (ev) {
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
