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
      var t = ((q && q.value) || '').toLowerCase().trim().split(/\s+/).filter(Boolean), y = sel ? sel.value : '', n = 0;
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
      if (out) out.value = n + ' of ' + cards.length + extra;
      if (empty) empty.hidden = n > 0;
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
    // a capture can open an area: index.html#area=physics
    var m = /area=([a-z-]+)/.exec(location.hash);
    if (m) pick(m[1]);
    if (q) q.addEventListener('input', apply);
    if (sel) sel.addEventListener('change', apply);
    apply();
  }

  // ------------------------------------------------------------ Expand all / Collapse all (the visible cards)
  // Wired on its own, not inside the filters, and decided from the real state of the <details> (not from the
  // button's label): if anything above fails, the button still works. The page loads papers.js?v=<hash>, so a
  // browser never pairs a new index.html with an old cached papers.js that has no handler for this button (25-nov:
  // that pairing is what left «Expand all» dead after the v2 deploy).
  var allBtn = document.querySelector('.expand-all');
  function folds(all) {
    return cards.filter(function (c) { return all || !c.hidden; })
      .map(function (c) { return c.querySelector('details.more'); }).filter(Boolean);
  }
  function syncAll() {
    if (!allBtn) return;
    var ds = folds(false), anyClosed = !ds.length || ds.some(function (d) { return !d.open; });
    allBtn.textContent = anyClosed ? 'Expand all' : 'Collapse all';
    allBtn.setAttribute('aria-pressed', anyClosed ? 'false' : 'true');
  }
  if (allBtn) {
    allBtn.addEventListener('click', function () {
      var ds = folds(false), open = ds.some(function (d) { return !d.open; });
      ds.forEach(function (d) { d.open = open; });
      syncAll();
    });
    syncAll();
  }

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
    c.style.setProperty('--ry', ((px - 0.5) * 6).toFixed(2) + 'deg');
    c.style.setProperty('--rx', ((0.5 - py) * 5).toFixed(2) + 'deg');
  }
  if (!reduce && !touch) {
    cards.forEach(function (c) {
      if (!c.querySelector('details.more')) return;              // the home page cards stay still, as before
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

  // ------------------------------------------------------------ the avatar gem in 3D (canvas 2D, no library)
  // A real faceted gem, as in diamante.svg / avatar_diamante_final.png: a pyramid of ten fan facets up to the point,
  // the girdle, a short band of vertical facets down to the table. Each face is lit by its normal (diffuse +
  // specular), so the light runs over the facets as it turns; white edges, twinkling four-point sparkles, a small
  // rainbow leaving the girdle corner, a soft shadow below. It turns slowly and without stop (11 s per turn, right to
  // left); on hover (or a tap) it speeds up and tips its point 27° toward the viewer; on leave it slows down and comes
  // back, all by smooth interpolation (no jumps). Reduced motion: the model, still, with its light. No canvas or no
  // JS: the SVG underneath.
  document.querySelectorAll('.avatar').forEach(gem3d);
  function gem3d(av) {
    var cv = document.createElement('canvas'), g = null;
    try { g = cv.getContext('2d'); } catch (ex) { g = null; }
    if (!g) return;
    cv.className = 'gem-3d'; cv.setAttribute('aria-hidden', 'true');
    av.appendChild(cv); av.classList.add('has-3d');
    var N = 10, H = 1.22, C = 0.46, TR = 0.56, V = [], F = [], i, t;
    V.push([0, H, 0]);                                                                     // 0: the point
    for (i = 0; i < N; i++) { t = 2 * Math.PI * i / N; V.push([Math.cos(t), 0, Math.sin(t)]); }            // girdle
    for (i = 0; i < N; i++) { t = 2 * Math.PI * i / N; V.push([TR * Math.cos(t), -C, TR * Math.sin(t)]); }  // table
    for (i = 0; i < N; i++) {
      var a = 1 + i, b = 1 + (i + 1) % N, ta = 1 + N + i, tb = 1 + N + (i + 1) % N;
      F.push({ v: [0, b, a], k: 0, odd: i % 2 });            // the pyramid (fan facets to the point)
      F.push({ v: [a, b, tb, ta], k: 1, odd: i % 2 });       // the band of vertical facets
    }
    var tab = []; for (i = N - 1; i >= 0; i--) tab.push(1 + N + i);
    F.push({ v: tab, k: 2, odd: 0 });                        // the table
    // the blues of the drawing: [shadow, light] per kind of face
    var COL = [[[26, 98, 205], [168, 210, 250]], [[18, 66, 160], [22, 156, 240]], [[11, 45, 125], [45, 120, 220]]];
    function norm(v) { var n = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / n, v[1] / n, v[2] / n]; }
    var L = norm([-0.5, 0.7, 0.6]), HV = norm([L[0], L[1], L[2] + 1]);
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    function size() { var w = av.clientWidth || 104; cv.width = w * dpr; cv.height = w * dpr; }
    size(); window.addEventListener('resize', size);
    var D = 6, RAYS = ['255,93,93', '255,200,61', '79,209,122', '90,160,255', '155,107,255'];
    function star(x, y, r, a) {
      g.save(); g.globalAlpha = a; g.translate(x, y); g.beginPath();
      g.moveTo(0, -r); g.quadraticCurveTo(r * 0.12, -r * 0.12, r, 0); g.quadraticCurveTo(r * 0.12, r * 0.12, 0, r);
      g.quadraticCurveTo(-r * 0.12, r * 0.12, -r, 0); g.quadraticCurveTo(-r * 0.12, -r * 0.12, 0, -r);
      g.fillStyle = '#fff'; g.fill(); g.lineWidth = 1.1 * dpr; g.strokeStyle = 'rgba(111,179,245,.95)'; g.stroke();
      g.restore();
    }
    function draw(yaw, pitch, now) {
      var w = cv.width, s = w * 0.355, cx = w / 2, cy = w / 2 + 0.10 * s;
      var cyw = Math.cos(yaw), syw = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
      var P = V.map(function (p) {
        var x = p[0] * cyw + p[2] * syw, z = -p[0] * syw + p[2] * cyw, y = p[1] - 0.30;
        var y2 = y * cp - z * sp, z2 = y * sp + z * cp;                  // pitch > 0: the point comes forward
        var f = D / (D - z2);
        return { x: x, y: y2, z: z2, sx: cx + x * s * f, sy: cy - y2 * s * f };
      });
      g.clearRect(0, 0, w, w);
      // soft shadow below
      var by = cy + (C + 0.36) * s, sh = g.createRadialGradient(cx, by, 0, cx, by, 1.05 * s);
      sh.addColorStop(0, 'rgba(2,8,26,.6)'); sh.addColorStop(1, 'rgba(2,8,26,0)');
      g.save(); g.translate(cx, by); g.scale(1, 0.2); g.translate(-cx, -by); g.fillStyle = sh;
      g.fillRect(0, by - 1.1 * s, w, 2.2 * s); g.restore();
      var faces = [];
      F.forEach(function (fc) {
        var p0 = P[fc.v[0]], p1 = P[fc.v[1]], p2 = P[fc.v[2]];
        var u = [p1.x - p0.x, p1.y - p0.y, p1.z - p0.z], v = [p2.x - p0.x, p2.y - p0.y, p2.z - p0.z];
        var n = norm([u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]);
        var c = [0, 0, 0];
        fc.v.forEach(function (k) { c[0] += P[k].x; c[1] += P[k].y; c[2] += P[k].z; });
        c = c.map(function (q) { return q / fc.v.length; });
        if (n[0] * -c[0] + n[1] * -c[1] + n[2] * (D - c[2]) <= 0) return;   // back face
        faces.push({ fc: fc, n: n, z: c[2] });
      });
      faces.sort(function (p, q) { return p.z - q.z; });
      g.lineJoin = 'round'; g.lineWidth = 1.5 * dpr; g.strokeStyle = 'rgba(255,255,255,.92)';
      faces.forEach(function (o) {
        var n = o.n, dif = Math.max(0, n[0] * L[0] + n[1] * L[1] + n[2] * L[2]);
        var spec = Math.pow(Math.max(0, n[0] * HV[0] + n[1] * HV[1] + n[2] * HV[2]), 30);
        var k = Math.min(0.88, 0.1 + 0.85 * dif * dif) * (o.fc.odd ? 0.9 : 1), cc = COL[o.fc.k];
        var rgb = [0, 1, 2].map(function (j) {
          return Math.round(Math.min(255, cc[0][j] + (cc[1][j] - cc[0][j]) * k + 255 * 0.55 * spec));
        });
        g.beginPath();
        o.fc.v.forEach(function (vi, m) { var p = P[vi]; if (m) g.lineTo(p.sx, p.sy); else g.moveTo(p.sx, p.sy); });
        g.closePath(); g.fillStyle = 'rgb(' + rgb.join(',') + ')'; g.fill(); g.stroke();
      });
      // the rainbow: the inner light leaves by the girdle corner on the right, spread into its colours
      var cor = P[1]; for (i = 2; i <= N; i++) if (P[i].sx > cor.sx) cor = P[i];
      var len = 0.75 * s, ang = -0.42;
      RAYS.forEach(function (col, j) {
        var a0 = ang + j * 0.11, a1 = a0 + 0.11, gr = g.createLinearGradient(cor.sx, cor.sy, cor.sx + len, cor.sy);
        gr.addColorStop(0, 'rgba(' + col + ',.85)'); gr.addColorStop(1, 'rgba(' + col + ',0)');
        g.beginPath(); g.moveTo(cor.sx, cor.sy);
        g.lineTo(cor.sx + len * Math.cos(a0), cor.sy + len * Math.sin(a0));
        g.lineTo(cor.sx + len * Math.cos(a1), cor.sy + len * Math.sin(a1)); g.closePath();
        g.fillStyle = gr; g.fill();
      });
      // twinkling four-point sparkles: on the point and on two edges
      var tw = function (ph) { return 0.55 + 0.45 * Math.sin(now / 520 + ph); };
      star(P[0].sx, P[0].sy, 0.16 * s * (0.8 + 0.2 * tw(0)), 1);
      star(cx + 0.95 * s, cy - 0.95 * s, 0.13 * s * tw(1.7), tw(1.7));
      star(cx - 1.02 * s, cy - 0.45 * s, 0.09 * s * tw(3.4), tw(3.4));
    }
    // motion: yaw speed and pitch follow their targets with a time constant (smooth, from wherever they are)
    var REST_W = -2 * Math.PI / 11000, FAST_W = -2 * Math.PI / 1400, TILT = 0.47;
    var yaw = Math.PI / N / 2, w = REST_W, pitch = 0, hot = false, last = performance.now(), visible = true, tmr = 0;
    function on() { hot = true; }
    function off() { hot = false; clearTimeout(tmr); }
    av.addEventListener('pointerenter', function (ev) { if (ev.pointerType === 'mouse') on(); });
    av.addEventListener('pointerleave', function (ev) { if (ev.pointerType === 'mouse') off(); });
    av.addEventListener('pointerdown', function (ev) {
      if (ev.pointerType === 'mouse') return;
      if (hot) { off(); return; }
      on(); clearTimeout(tmr); tmr = setTimeout(off, 2000);
    });
    av._gem = { on: on, off: off };                                       // for the captures
    if (reduce) { draw(yaw, 0, 0); return; }
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(av);
    function frame(now) {
      var dt = Math.min(60, now - last); last = now;
      var kw = 1 - Math.exp(-dt / (hot ? 280 : 650)), kp = 1 - Math.exp(-dt / 260);
      w += ((hot ? FAST_W : REST_W) - w) * kw;
      pitch += ((hot ? TILT : 0) - pitch) * kp;
      yaw += w * dt;
      if (visible && !document.hidden) draw(yaw, pitch, now);
      requestAnimationFrame(frame);
    }
    draw(yaw, 0, last);
    requestAnimationFrame(frame);
  }

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
