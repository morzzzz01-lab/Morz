/* MORZ Christmas: continuous snowfall (white snow + a few gold sparkles). */
(function () {
  if (window.__xmSnow) return;
  if (window.Shopify && Shopify.designMode) return;
  window.__xmSnow = true;

  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var c = document.createElement('canvas');
  c.className = 'xm-snow';
  c.setAttribute('aria-hidden', 'true');
  var ctx = c.getContext('2d');
  document.body.appendChild(c);

  var W = 0, H = 0, flakes = [], raf = 0;

  function make(init) {
    var gold = Math.random() < 0.07;
    return {
      x: Math.random() * W,
      y: init ? Math.random() * H : -10,
      r: gold ? 1.1 + Math.random() * 1.0 : 0.7 + Math.random() * 2.6,
      rot: Math.random() * 6.28, rs: (Math.random() - 0.5) * 0.02,
      v: 0.4 + Math.random() * 1.1,
      p: Math.random() * 6.28,
      s: 0.4 + Math.random() * 0.9,
      a: 0.45 + Math.random() * 0.5,
      g: gold
    };
  }

  function size() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    c.width = W * dpr; c.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var n = Math.round(Math.min(110, Math.max(40, W / 12)));
    while (flakes.length < n) flakes.push(make(true));
    flakes.length = n;
    if (reduce) draw(0);
  }

  /* six-armed snowflake with little side branches */
  function crystal(f) {
    var R = f.r * 1.6, k, i;
    f.rot += f.rs;
    ctx.save();
    ctx.translate(f.x, f.y); ctx.rotate(f.rot);
    ctx.strokeStyle = 'rgba(255,255,255,' + Math.min(1, f.a + 0.2) + ')';
    ctx.lineWidth = Math.max(0.6, R / 7); ctx.lineCap = 'round';
    ctx.beginPath();
    for (k = 0; k < 6; k++) {
      ctx.moveTo(0, 0); ctx.lineTo(0, -R);
      for (i = 1; i <= 2; i++) {
        var y = -R * (0.35 + i * 0.28), b = R * (0.34 - i * 0.07);
        ctx.moveTo(0, y); ctx.lineTo(-b, y - b * 0.8);
        ctx.moveTo(0, y); ctx.lineTo(b, y - b * 0.8);
      }
      ctx.rotate(1.0472);
    }
    ctx.stroke();
    ctx.restore();
  }

  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < flakes.length; i++) {
      var f = flakes[i];
      if (!reduce) {
        f.y += f.v * (f.r / 2.2 + 0.35);
        f.x += Math.sin(t / 1600 + f.p) * f.s * 0.5;
        if (f.y > H + 10) { flakes[i] = f = make(false); }
        if (f.x > W + 10) f.x = -10; else if (f.x < -10) f.x = W + 10;
      }
      if (f.g || f.r < 1.9) {
        ctx.beginPath();
        ctx.fillStyle = f.g ? 'rgba(255,210,74,' + f.a + ')' : 'rgba(255,255,255,' + f.a + ')';
        ctx.arc(f.x, f.y, Math.min(f.r, 1.4), 0, 6.283);
        ctx.fill();
      } else {
        crystal(f);
      }
    }
  }

  function loop(t) { draw(t); raf = requestAnimationFrame(loop); }
  var ready = false;
  function start() { if (ready && !reduce && !raf) raf = requestAnimationFrame(loop); }
  function stop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }

  window.addEventListener('resize', size);
  document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });
  /* do not compete with the loading screen: begin snowing once it is gone */
  function afterIntro(fn) {
    var h = document.documentElement, fired = false;
    function fire() { if (fired) return; fired = true; fn(); }
    if (!h.classList.contains('intro-on')) return fire();
    var mo = new MutationObserver(function () { if (!h.classList.contains('intro-on')) { mo.disconnect(); fire(); } });
    mo.observe(h, { attributes: true, attributeFilter: ['class'] });
    setTimeout(fire, 15000);
  }
  size();
  afterIntro(function () { ready = true; start(); document.dispatchEvent(new CustomEvent('xm:ready')); });
})();

/* Smooth scroll reveal: sections fade and glide up one after another. */
(function () {
  if (!('IntersectionObserver' in window)) return;
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.Shopify && Shopify.designMode) return;
  function run() {
    var els = [].slice.call(document.querySelectorAll('#MainContent .shopify-section:not(:first-child) .wrap > *:not(.prods), .xm-banner .wrap > *'));
    if (!els.length) return;
    var html = document.documentElement;
    els.forEach(function (el, i) { el.setAttribute('data-rv', ''); el.style.setProperty('--rd', ((i % 4) * 80) + 'ms'); });
    html.classList.add('rv-on');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    els.forEach(function (el) { io.observe(el); });
  }
  var h = document.documentElement;
  if (!h.classList.contains('intro-on')) return run();
  var mo = new MutationObserver(function () { if (!h.classList.contains('intro-on')) { mo.disconnect(); run(); } });
  mo.observe(h, { attributes: true, attributeFilter: ['class'] });
  setTimeout(function () { mo.disconnect(); run(); }, 15000);
})();

/* Home page background: a big glowing Christmas tree and Santa (red hat) flying by on his sleigh. */
(function () {
  if (window.__xmScene) return;
  window.__xmScene = true;
  if (window.Shopify && Shopify.designMode) return;
  var cols = ['#ff3b30', '#ffc83a', '#35d56a', '#39a8ff'];
  function tree(cls) {
    var tiers = [[150, 40, 105, 110], [150, 95, 85, 165], [150, 150, 65, 225], [150, 205, 45, 285]], i, b = '', x, y, n;
    var d = '';
    tiers.forEach(function (t, k) {
      var cx = t[0], top = t[1], hw = t[2] + 40 - k * 6, base = top + 90 + k * 8;
      d += '<path d="M' + cx + ' ' + top + ' L' + (cx - hw) + ' ' + base + ' Q' + cx + ' ' + (base + 14) + ' ' + (cx + hw) + ' ' + base + ' Z" fill="url(#xt-g)"/>';
      for (i = 0; i < 6 + k * 2; i++) {
        var f = (i + 0.5) / (6 + k * 2), yy = top + 20 + f * (base - top - 24);
        var half = (yy - top) / (base - top) * hw * 0.82;
        x = cx + (((i * 53 + k * 29) % 100) / 100 * 2 - 1) * half; y = yy;
        b += '<circle class="xt-b" cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="5.5" fill="' + cols[(i + k) % 4] + '" style="--c:' + cols[(i + k) % 4] + ';animation-delay:-' + ((i * 0.37 + k * 0.6) % 2.4).toFixed(2) + 's"/>';
      }
    });
    return '<svg class="' + cls + '" viewBox="0 0 300 420" aria-hidden="true"><defs><linearGradient id="xt-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1f8f4e"/><stop offset="1" stop-color="#0b4a28"/></linearGradient><radialGradient id="xt-s"><stop offset="0" stop-color="#fff6c2"/><stop offset=".5" stop-color="#ffd24a"/><stop offset="1" stop-color="#ffd24a00"/></radialGradient></defs>' +
      '<rect x="134" y="335" width="32" height="55" rx="4" fill="#5a3418"/>' + d +
      '<path d="M60 150 Q150 190 240 150 M40 215 Q150 262 260 215 M22 285 Q150 340 278 285" fill="none" stroke="#ffd24a" stroke-width="2.4" stroke-linecap="round" opacity=".85"/>' + b +
      '<circle cx="150" cy="34" r="30" fill="url(#xt-s)" class="xt-glow"/><path d="M150 14l5.5 14.5 15.5.8-12 9.8 4 15-13-8.4-13 8.4 4-15-12-9.8 15.5-.8z" fill="#ffd24a"/></svg>';
  }
  var santa = '<svg class="xm-santa" viewBox="0 0 420 150" aria-hidden="true">' +
    '<g transform="translate(250 8)">' +
      '<path d="M-6 96 Q60 92 66 60 L66 30 Q40 40 18 40 L-6 40 Z" fill="#b3122a"/><path d="M-12 100 Q70 108 84 58" fill="none" stroke="#ffd24a" stroke-width="5" stroke-linecap="round"/>' +
      '<rect x="-4" y="100" width="76" height="4" rx="2" fill="#ffd24a"/>' +
      '<rect x="10" y="12" width="26" height="34" rx="8" fill="#e8c9a0" opacity="0"/>' +
      '<circle cx="30" cy="22" r="13" fill="#f6d9bd"/><path d="M16 26 Q30 56 44 26 Q30 36 16 26Z" fill="#fff"/>' +
      '<path d="M16 18 Q30 -14 52 6 L50 14 Q34 6 17 20Z" fill="#d1182f"/><rect x="14" y="14" width="34" height="9" rx="4.5" fill="#fff"/><circle cx="56" cy="8" r="6" fill="#fff"/>' +
      '<rect x="14" y="36" width="34" height="30" rx="10" fill="#d1182f"/><rect x="14" y="52" width="34" height="5" fill="#2a1a10"/>' +
      '<rect x="64" y="62" width="30" height="26" rx="5" fill="#2e8b57"/><path d="M64 70h30" stroke="#ffd24a" stroke-width="3"/>' +
    '</g>' +
    '<path d="M330 78 Q350 70 372 74" stroke="#ffd24a" stroke-width="2.4" fill="none"/>' +
    '<g transform="translate(372 52)" fill="#8a5a33"><ellipse cx="14" cy="22" rx="22" ry="11"/><rect x="26" y="26" width="5" height="26"/><rect x="2" y="28" width="5" height="24"/><ellipse cx="42" cy="8" rx="9" ry="7"/><circle cx="50" cy="9" r="3.5" fill="#ff3b30" class="xt-b" style="--c:#ff3b30"/><path d="M40 2L34 -10M44 2L50 -12M34 -10L28 -8M50 -12L56 -8" stroke="#5a3418" stroke-width="2.4" fill="none" stroke-linecap="round"/></g>' +
    '<g stroke="#ffd24a" stroke-width="1.6" opacity=".7"><path d="M0 70l40 4M30 90l50-4M10 110l60-8"/></g>' +
    '</svg>';
  var SC = window.MORZ_SNOW || {};
  if (SC.santa) {
    var su = SC.santa.indexOf('//') === 0 ? 'https:' + SC.santa : SC.santa, N = 28, parts = '', L, k;
    ['b', 'l'].forEach(function (L) {
      parts += '<b class="xl ' + L + '">';
      for (k = 0; k < N; k++) parts += '<i style="left:' + (k * 100 / N).toFixed(3) + '%;width:calc(' + (100 / N).toFixed(3) + '% + .6px);background-position:' + (k / (N - 1) * 100).toFixed(2) + '% 0;animation-delay:-' + (k * (L === 'b' ? 38 : 22)) + 'ms"></i>';
      parts += '</b>';
    });
    santa = '<span class="xm-sg" aria-hidden="true" style="--img:url(' + su + ')">' + parts + '</span>';
  }
  window.__xmSanta = santa;
  function build() {
    var w = document.createElement('div');
    w.className = 'xm-scene'; w.setAttribute('aria-hidden', 'true');
    w.innerHTML = tree('xm-tree xm-tree--r') + tree('xm-tree xm-tree--l') + '<div class="xm-fly">' + santa + '</div>';
    document.body.appendChild(w);
  }
  function afterIntro() {
    var h = document.documentElement, done = false;
    function go() { if (done) return; done = true; build(); }
    if (!h.classList.contains('intro-on')) return go();
    var mo = new MutationObserver(function () { if (!h.classList.contains('intro-on')) { mo.disconnect(); go(); } });
    mo.observe(h, { attributes: true, attributeFilter: ['class'] });
    setTimeout(go, 15000);
  }
  afterIntro();
})();

/* Snowball: press and hold on the Home page. The ball follows your finger/mouse and slowly grows; let go and it drops and
   bursts into a spray of snow. Drop smaller balls on top of each other (big, medium, small) to build your own snowman,
   which then puts on a hat and scarf from the shop's products. Hold very long and the whole site is buried in snow,
   then the wind blows it away from the top. */
(function () {
  if (window.__xmBall) return;
  window.__xmBall = true;
  if (window.Shopify && Shopify.designMode) return;
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var SKIP = 'a,button,input,select,textarea,label,summary,dialog,iframe,.mx-panel,.mx-fab,[role=button],[role=dialog]';
  var CFG = window.MORZ_SNOW || {};
  function abs(u) { return u && u.indexOf('//') === 0 ? 'https:' + u : u; }
  var BALL = abs(CFG.ball) || '', TWIG = abs(CFG.twig) || '';
  var S = 512, R0 = 253, GROW = 14000, cur = null, pend = null, live = 0, busy = false, PAT = null;
  var tower = { balls: [], shadow: null, skirt: null, dress: null, timer: 0 }, ACC = {};
  if (BALL) { var pre = new Image(); pre.src = BALL; }

  function pat() {
    if (PAT) return PAT;
    var c = document.createElement('canvas'); c.width = c.height = 220; var x = c.getContext('2d'), i;
    for (i = 0; i < 700; i++) {
      x.fillStyle = Math.random() < .5 ? 'rgba(255,255,255,' + (.3 + Math.random() * .5) + ')' : 'rgba(140,170,205,' + (.06 + Math.random() * .12) + ')';
      x.beginPath(); x.arc(Math.random() * 220, Math.random() * 220, .7 + Math.random() * 2.2, 0, 6.2832); x.fill();
    }
    return (PAT = c.toDataURL('image/png'));
  }
  function dims() {
    var W = window.innerWidth, H = window.innerHeight, big = Math.max(W, H);
    return { W: W, H: H, Rmax: big * .75, Rbury: Math.min(big * .35, H * .4) };
  }
  function ok(e) {
    if (!document.body.classList.contains('tpl-index') || busy) return false;
    if (document.documentElement.classList.contains('intro-on')) return false;
    if (e.pointerType === 'mouse' && e.button !== 0) return false;
    if (e.target.closest && e.target.closest(SKIP)) return false;
    var d = document.getElementById('MenuDrawer'); if (d && d.open) return false;
    return live < 5;
  }
  function place(b) {
    b.el.style.transform = 'translate3d(' + (b.x - S / 2) + 'px,' + (b.y - S / 2) + 'px,0) rotate(' + (b.rot || 0) + 'rad) scale(' + (b.r / R0 * (b.sx || 1)) + ',' + (b.r / R0 * (b.sy || 1)) + ')';
  }
  function newBall(x, y) {
    var el = document.createElement('div');
    el.className = 'xm-ball held'; el.setAttribute('aria-hidden', 'true');
    if (BALL) el.style.backgroundImage = 'url(' + BALL + ')';
    document.body.appendChild(el); live++;
    el.__t = Date.now();
    return { el: el, x: x, y: y, tx: x, ty: y, r: 8, rot: 0, vx: 0 };
  }

  /* spray of fine snow thrown sideways (it does not fall) */
  function spray(x, y, r) {
    var n = Math.min(46, 16 + Math.round(r / 4)), W = window.innerWidth, i;
    var puff = document.createElement('i'); puff.className = 'xm-puff';
    puff.style.cssText = 'left:' + (x - r * 1.1) + 'px;top:' + (y - r * .7) + 'px;width:' + r * 2.2 + 'px;height:' + r * 1.4 + 'px';
    document.body.appendChild(puff);
    puff.animate([{ transform: 'scale(.4)', opacity: .8 }, { transform: 'scale(1.5)', opacity: 0 }], { duration: 650, easing: 'ease-out', fill: 'forwards' }).onfinish = function () { puff.remove(); };
    for (i = 0; i < n; i++) {
      var p = document.createElement('i'); p.className = 'xm-bit';
      var sz = 2 + Math.random() * Math.max(2.5, r / 12) * (Math.random() < .15 ? 2.2 : 1);
      p.style.cssText = 'width:' + sz + 'px;height:' + sz * (.8 + Math.random() * .35) + 'px;left:' + x + 'px;top:' + y + 'px';
      document.body.appendChild(p);
      var dir = Math.random() < .5 ? -1 : 1, ang = (Math.random() - .5) * 1.0 - (Math.random() < .25 ? .5 : 0);
      var dist = (50 + Math.random() * 230) * (.55 + r / 150), dx = Math.cos(ang) * dist * dir, dy = Math.sin(ang) * dist * .8;
      p.animate([
        { transform: 'translate(0,0) scale(1)', opacity: 1 },
        { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.45)', opacity: 0 }
      ], { duration: 650 + Math.random() * 750, easing: 'cubic-bezier(.08,.75,.3,1)', fill: 'forwards' }).onfinish = (function (p) { return function () { p.remove(); }; })(p);
    }
  }

  /* ---------- tower / snowman ---------- */
  function fadeOut(el, ms) {
    if (!el || el.__fo) return; el.__fo = 1;
    var o = 1; try { o = parseFloat(getComputedStyle(el).opacity); if (isNaN(o)) o = 1; } catch (e) {}
    try { el.animate([{ opacity: o }, { opacity: 0 }], { duration: ms, easing: 'ease-in', fill: 'forwards' }); } catch (e) { el.style.transition = 'opacity ' + ms + 'ms'; el.style.opacity = '0'; }
    setTimeout(function () { if (el.parentNode) el.remove(); }, ms + 80);
  }
  function clearTower(quick) {
    clearTimeout(tower.timer);
    tower.balls.forEach(function (t) { if (!quick) spray(t.x, t.y, t.r * .7); fadeOut(t.el, quick ? 500 : 1500); });
    fadeOut(tower.shadow, quick ? 500 : 1500); fadeOut(tower.skirt, quick ? 500 : 1500); fadeOut(tower.dress, quick ? 500 : 1500);
    tower = { balls: [], shadow: null, skirt: null, dress: null, timer: 0 };
  }
  /* soft snow skirt around the foot of the bottom ball, so it sinks smoothly into the snow */
  function mkSkirt(x, y, r) {
    var k = document.createElement('i'); k.className = 'xm-skirt xm-tw';
    k.style.cssText = 'left:' + (x - r * 1.35) + 'px;top:' + (y + r * .48) + 'px;width:' + r * 2.7 + 'px;height:' + r * .7 + 'px';
    document.body.appendChild(k); return k;
  }
  function plan(b) {
    var d = dims(), n = tower.balls.length, top = tower.balls[n - 1];
    if (n && n < 3 && b.r <= top.r * .95 && Math.abs(b.x - top.x) < top.r * 1.1 + b.r * .5 && b.y < top.y + top.r * .3) {
      var ty = top.y - (top.r + b.r) * .93;
      if (ty - b.r > 12) return { stack: true, x: top.x, y: ty };
    }
    if (n) clearTower(true);
    return { stack: false, x: Math.max(b.r + 4, Math.min(d.W - b.r - 4, b.x)), y: d.H - b.r - 6 };
  }
  function drop(b, cb) {
    var pl = plan(b), vy = 0, last = performance.now(), bounced = 0;
    b.el.classList.remove('held');
    if (b.y > pl.y) b.y = pl.y - 2;
    (function step(t) {
      var dt = Math.min(32, t - last); last = t;
      vy += .0019 * dt; b.y += vy * dt;
      b.x += (pl.x - b.x) * Math.min(1, .01 * dt * (pl.stack ? 1.6 : 1)); b.rot += (pl.x - b.x) * .0004;
      if (b.y >= pl.y) {
        b.y = pl.y; b.x = pl.x;
        spray(b.x, b.y + b.r * .75, b.r);
        if (bounced < 1 && vy > .35) { vy = -vy * .2; bounced++; b.sy = .92; b.sx = 1.05; place(b); requestAnimationFrame(step); return; }
        b.el.style.transition = 'transform .28s cubic-bezier(.3,1.6,.5,1)'; b.sx = b.sy = 1; place(b);
        settle(b, pl);
        return;
      }
      b.sy = 1 + Math.min(.06, vy * .03); b.sx = 1 / b.sy;
      place(b); requestAnimationFrame(step);
    })(last);
  }
  function settle(b, pl) {
    live--; b.el.classList.add('xm-tw'); b.el.style.zIndex = 58;
    if (!pl.stack) {
      var sh = document.createElement('i'); sh.className = 'xm-shd xm-tw';
      sh.style.cssText = 'left:' + (b.x - b.r * 1.15) + 'px;top:' + (b.y + b.r * .82) + 'px;width:' + b.r * 2.3 + 'px;height:' + b.r * .34 + 'px';
      document.body.appendChild(sh); tower.shadow = sh; tower.skirt = mkSkirt(b.x, b.y, b.r);
    }
    tower.balls.push({ el: b.el, x: b.x, y: b.y, r: b.r });
    clearTimeout(tower.timer);
    if (tower.balls.length === 3) setTimeout(dress, 380);
    tower.timer = setTimeout(function () { if (tower.balls.length === 3) collapse(); else clearTower(false); }, tower.balls.length === 3 ? 14000 : 22000);
  }

  /* background cut-out for the shop's hat/scarf product photos */
  function cutout(url, cb) {
    var im = new Image(); im.crossOrigin = 'anonymous';
    im.onload = function () {
      try {
        var sc = Math.min(1, 420 / Math.max(im.naturalWidth, im.naturalHeight)), w = Math.round(im.naturalWidth * sc), h = Math.round(im.naturalHeight * sc);
        var c = document.createElement('canvas'); c.width = w; c.height = h; var x = c.getContext('2d'); x.drawImage(im, 0, 0, w, h);
        var id = x.getImageData(0, 0, w, h), a = id.data, seen = new Uint8Array(w * h), st = [], i;
        function px(i) { return [a[i * 4], a[i * 4 + 1], a[i * 4 + 2]]; }
        var c0 = px(0), c1 = px(w - 1), c2 = px((h - 1) * w), c3 = px(h * w - 1);
        var bg = [(c0[0] + c1[0] + c2[0] + c3[0]) / 4, (c0[1] + c1[1] + c2[1] + c3[1]) / 4, (c0[2] + c1[2] + c2[2] + c3[2]) / 4];
        function near(i) { return Math.abs(a[i * 4] - bg[0]) + Math.abs(a[i * 4 + 1] - bg[1]) + Math.abs(a[i * 4 + 2] - bg[2]) < 66; }
        for (i = 0; i < w; i++) { st.push(i, (h - 1) * w + i); }
        for (i = 0; i < h; i++) { st.push(i * w, i * w + w - 1); }
        while (st.length) {
          var k = st.pop(); if (seen[k] || !near(k)) continue; seen[k] = 1; a[k * 4 + 3] = 0;
          var cx = k % w; if (cx > 0) st.push(k - 1); if (cx < w - 1) st.push(k + 1); if (k >= w) st.push(k - w); if (k < w * (h - 1)) st.push(k + w);
        }
        x.putImageData(id, 0, 0);
        var x0 = w, y0 = h, x1 = 0, y1 = 0, yy, xx;
        for (yy = 0; yy < h; yy++) for (xx = 0; xx < w; xx++) if (a[(yy * w + xx) * 4 + 3]) { if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (yy < y0) y0 = yy; if (yy > y1) y1 = yy; }
        if (x1 <= x0 || y1 <= y0) return;
        var o = document.createElement('canvas'); o.width = x1 - x0 + 1; o.height = y1 - y0 + 1; o.getContext('2d').drawImage(c, x0, y0, o.width, o.height, 0, 0, o.width, o.height);
        cb({ src: o.toDataURL('image/png'), w: o.width, h: o.height });
      } catch (e) {}
    };
    im.src = abs(url);
  }
  function loadAcc() {
    if (CFG.hat) cutout(CFG.hat, function (r) { ACC.hat = r; });
    if (CFG.scarf) cutout(CFG.scarf, function (r) { ACC.scarf = r; });
  }

  /* face, buttons, arms, scarf and hat drawn over the three snowballs */
  function dress() {
    if (tower.balls.length !== 3 || tower.dress) return;
    var d = dims(), B = tower.balls, m = B[1], h = B[2], base = B[0];
    var hx = h.x, hy = h.y, hr = h.r, mx = m.x, my = m.y, mr = m.r, f = function (v) { return Math.round(v * 10) / 10; };
    var j = hy + hr * .74, g = '';
    var coal = function (cx, cy, r) { return '<g><circle cx="' + f(cx) + '" cy="' + f(cy) + '" r="' + f(r) + '" fill="url(#xc)"/><circle cx="' + f(cx - r * .3) + '" cy="' + f(cy - r * .35) + '" r="' + f(r * .26) + '" fill="#fff" opacity=".55"/></g>'; };
    var defs = '<defs>' +
      '<radialGradient id="xc" cx=".38" cy=".32" r=".8"><stop offset="0" stop-color="#6a6a6a"/><stop offset=".5" stop-color="#262626"/><stop offset="1" stop-color="#050505"/></radialGradient>' +
      '<linearGradient id="xn" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffb347"/><stop offset=".55" stop-color="#ff7a12"/><stop offset="1" stop-color="#c24a00"/></linearGradient>' +
      '<linearGradient id="xs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ee3347"/><stop offset=".55" stop-color="#c8132c"/><stop offset="1" stop-color="#7d0716"/></linearGradient>' +
      '<linearGradient id="xh" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f0384c"/><stop offset=".6" stop-color="#c8132c"/><stop offset="1" stop-color="#78061a"/></linearGradient>' +
      '<radialGradient id="xw" cx=".4" cy=".3" r=".85"><stop offset="0" stop-color="#fff"/><stop offset=".7" stop-color="#eef4fb"/><stop offset="1" stop-color="#b9cbe0"/></radialGradient>' +
      '<pattern id="xp" width="' + f(hr * .3) + '" height="' + f(hr * .3) + '" patternUnits="userSpaceOnUse"><rect width="' + f(hr * .3) + '" height="' + f(hr * .3) + '" fill="url(#xs)"/><rect width="' + f(hr * .3) + '" height="' + f(hr * .1) + '" y="' + f(hr * .1) + '" fill="#fff" opacity=".85"/></pattern>' +
      '<filter id="xf" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="1.5" dy="3" stdDeviation="2.2" flood-color="#0b1c33" flood-opacity=".45"/></filter><filter id="xb" x="-30%" y="-120%" width="160%" height="340%"><feGaussianBlur stdDeviation="3.2"/></filter></defs>';
    /* arms (sticks with twigs); the right one waves */
    var neck = function (u) { return '<ellipse cx="' + f(u.x) + '" cy="' + f(u.y + u.r * .9) + '" rx="' + f(u.r * .8) + '" ry="' + f(u.r * .14) + '" fill="#47688f" opacity=".3" filter="url(#xb)"/>'; };
    g += neck(h) + neck(m);
    var armMeta = [];
    function arm(sx, sy, ex, ey, cls, side) {
      var ix = sx - side * mr * .2, dx = ex - ix, dy = ey - sy, L = Math.sqrt(dx * dx + dy * dy), ang = Math.atan2(dx, -dy) * 180 / Math.PI;
      var th = L * 1.02, tw = th * .3;
      armMeta.push({ cls: cls, w: tw, h: th, ang: ang, side: side });
      /* a real twig (thin end pushed into the snow, branches pointing outwards) that wiggles around its socket */
      return '<g class="' + cls + '" style="transform-origin:' + f(ix) + 'px ' + f(sy) + 'px">' +
        '<g transform="translate(' + f(ix) + ' ' + f(sy) + ') rotate(' + f(ang) + ')">' +
        '<image href="' + TWIG + '" x="' + f(-tw / 2) + '" y="' + f(-th) + '" width="' + f(tw) + '" height="' + f(th) + '" preserveAspectRatio="none" filter="url(#xf)"/></g></g>' +
        '<ellipse cx="' + f(sx) + '" cy="' + f(sy + mr * .02) + '" rx="' + f(mr * .085) + '" ry="' + f(mr * .1) + '" fill="url(#xw)" opacity=".95"/>';
    }
    g += arm(mx - mr * .86, my - mr * .12, mx - mr * 1.95, my - mr * .72, 'xa-l', -1);
    g += arm(mx + mr * .86, my - mr * .12, mx + mr * 1.95, my - mr * .78, 'xa-r', 1);
    /* buttons */
    g += coal(mx, my - mr * .4, mr * .075) + coal(mx, my + mr * .02, mr * .08) + coal(mx, my + mr * .44, mr * .075);
    /* scarf */
    if (ACC.scarf) {
      var sw = hr * 2.7, sh = sw * ACC.scarf.h / ACC.scarf.w;
      g += '<image href="' + ACC.scarf.src + '" x="' + f(hx - sw / 2) + '" y="' + f(j - sh * .45) + '" width="' + f(sw) + '" height="' + f(sh) + '" filter="url(#xf)"/>';
    } else {
      g += '<g filter="url(#xf)"><path d="M' + f(hx + hr * .28) + ' ' + f(j + hr * .08) + ' l' + f(hr * .42) + ' ' + f(hr * .1) + ' l' + f(-hr * .06) + ' ' + f(hr * 1.0) + ' l' + f(-hr * .44) + ' ' + f(-hr * .06) + 'Z" fill="url(#xp)"/>' +
        '<rect x="' + f(hx - hr * .92) + '" y="' + f(j - hr * .17) + '" width="' + f(hr * 1.84) + '" height="' + f(hr * .36) + '" rx="' + f(hr * .17) + '" fill="url(#xp)" transform="rotate(-3 ' + f(hx) + ' ' + f(j) + ')"/>' +
        '<rect x="' + f(hx - hr * .92) + '" y="' + f(j - hr * .17) + '" width="' + f(hr * 1.84) + '" height="' + f(hr * .36) + '" rx="' + f(hr * .17) + '" fill="none" stroke="#7d0716" stroke-opacity=".35" stroke-width="1.2" transform="rotate(-3 ' + f(hx) + ' ' + f(j) + ')"/></g>';
    }
    /* face */
    g += coal(hx - hr * .33, hy - hr * .2, hr * .09) + coal(hx + hr * .33, hy - hr * .2, hr * .09);
    g += '<g filter="url(#xf)"><path d="M' + f(hx - hr * .08) + ' ' + f(hy - hr * .04) + ' Q' + f(hx + hr * .35) + ' ' + f(hy + hr * .02) + ' ' + f(hx + hr * .72) + ' ' + f(hy + hr * .17) + ' Q' + f(hx + hr * .3) + ' ' + f(hy + hr * .27) + ' ' + f(hx - hr * .08) + ' ' + f(hy + hr * .2) + 'Z" fill="url(#xn)" stroke="#b83f00" stroke-opacity=".5" stroke-width=".8" stroke-linejoin="round"/>' +
      '<path d="M' + f(hx + hr * .15) + ' ' + f(hy + hr * .02) + ' l' + f(hr * .02) + ' ' + f(hr * .17) + 'M' + f(hx + hr * .32) + ' ' + f(hy + hr * .05) + ' l' + f(hr * .02) + ' ' + f(hr * .15) + 'M' + f(hx + hr * .48) + ' ' + f(hy + hr * .09) + ' l' + f(hr * .01) + ' ' + f(hr * .1) + '" stroke="#c24a00" stroke-opacity=".55" stroke-width="1" fill="none"/></g>';
    for (var q = 0; q < 6; q++) { var an = (0.18 + q * 0.128) * Math.PI; g += coal(hx + Math.cos(an) * hr * .46, hy + hr * .26 + Math.sin(an) * hr * .3, hr * .045); }
    /* hat */
    if (ACC.hat) {
      var hw = hr * 2.1, hh = hw * ACC.hat.h / ACC.hat.w;
      g += '<image href="' + ACC.hat.src + '" x="' + f(hx - hw / 2) + '" y="' + f(hy - hr * .55 - hh) + '" width="' + f(hw) + '" height="' + f(hh) + '" filter="url(#xf)" transform="rotate(-5 ' + f(hx) + ' ' + f(hy) + ')"/>';
    } else {
      var by = hy - hr * .6;
      g += '<g filter="url(#xf)"><path d="M' + f(hx - hr * .86) + ' ' + f(by) + ' C' + f(hx - hr * .8) + ' ' + f(by - hr * 1.15) + ' ' + f(hx + hr * .1) + ' ' + f(by - hr * 1.45) + ' ' + f(hx + hr * .95) + ' ' + f(by - hr * .85) + ' C' + f(hx + hr * 1.05) + ' ' + f(by - hr * .7) + ' ' + f(hx + hr * .9) + ' ' + f(by - hr * .2) + ' ' + f(hx + hr * .86) + ' ' + f(by) + ' Z" fill="url(#xh)"/>' +
        '<path d="M' + f(hx - hr * .5) + ' ' + f(by - hr * .2) + ' C' + f(hx - hr * .3) + ' ' + f(by - hr * .9) + ' ' + f(hx + hr * .1) + ' ' + f(by - hr * 1.0) + ' ' + f(hx + hr * .4) + ' ' + f(by - hr * .98) + '" stroke="#ff7b8a" stroke-opacity=".45" stroke-width="' + f(hr * .06) + '" fill="none" stroke-linecap="round"/>' +
        '<rect x="' + f(hx - hr * .98) + '" y="' + f(by - hr * .15) + '" width="' + f(hr * 1.96) + '" height="' + f(hr * .32) + '" rx="' + f(hr * .16) + '" fill="url(#xw)"/>' +
        '<circle cx="' + f(hx + hr * .98) + '" cy="' + f(by - hr * .82) + '" r="' + f(hr * .21) + '" fill="url(#xw)"/></g>';
    }
    var el = document.createElement('div'); el.className = 'xm-dress xm-tw'; el.setAttribute('aria-hidden', 'true');
    el.innerHTML = '<svg width="' + d.W + '" height="' + d.H + '" viewBox="0 0 ' + d.W + ' ' + d.H + '">' + defs + g + '</svg>';
    document.body.appendChild(el); tower.dress = el; tower.armMeta = armMeta;
    el.animate([{ opacity: 0, transform: 'translateY(-14px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 650, easing: 'cubic-bezier(.2,.9,.3,1)', fill: 'forwards' });
    spray(hx, hy, hr);
  }

  /* ---------- the winter scene revealed under the snow ---------- */
  var BULB = ['#ff3b30', '#ffc83a', '#39a8ff', '#35d56a', '#ff7ad9'];
  function tree(cx, bt, h) {
    var o = '', bulbs = [], k, j, TW = Math.max(6, h * .06);
    o += '<rect x="' + (cx - TW / 2) + '" y="' + (bt - h * .08) + '" width="' + TW + '" height="' + h * .09 + '" fill="#3b2a1d"/>';
    for (k = 0; k < 4; k++) {
      var base = bt - h * .07 - k * h * .205, th = h * .34, top = base - th, hw = h * (.26 - k * .043) + h * .03, c = h * .035;
      o += '<path d="M' + cx + ' ' + top + ' L' + (cx + hw) + ' ' + base + ' Q' + (cx + hw * .66) + ' ' + (base + c) + ' ' + (cx + hw * .33) + ' ' + base + ' Q' + cx + ' ' + (base + c) + ' ' + (cx - hw * .33) + ' ' + base + ' Q' + (cx - hw * .66) + ' ' + (base + c) + ' ' + (cx - hw) + ' ' + base + ' Z" fill="url(#xtg)"/>';
      /* puffy snow along both slopes and the rim: round pieces with their own light and shadow = looks 3D */
      for (var sd = -1; sd <= 1; sd += 2) for (j = 0; j < 8; j++) {
        var t = (j + .5) / 8 * .94 + .03, rr = h * (.011 + .02 * t), ex = cx + sd * hw * t - sd * rr * .35, ey = top + th * t + rr * .15;
        o += '<circle cx="' + ex.toFixed(1) + '" cy="' + ey.toFixed(1) + '" r="' + rr.toFixed(1) + '" fill="url(#xsn)"/>';
      }
      for (j = 0; j < 5; j++) { var bx = cx + hw * (-.8 + j * .4), rr2 = h * .017; o += '<circle cx="' + bx.toFixed(1) + '" cy="' + (base + h * .008).toFixed(1) + '" r="' + rr2.toFixed(1) + '" fill="url(#xsn)"/>'; }
      o += '<circle cx="' + cx + '" cy="' + (top + h * .012) + '" r="' + h * .02 + '" fill="url(#xsn)"/>';
      /* garland + bulbs */
      var ly = top + th * .56, lx = hw * .56, sag = th * .2, nb = k === 3 ? 3 : 5;
      o += '<path d="M' + (cx - lx) + ' ' + ly + ' Q' + cx + ' ' + (ly + sag * 2) + ' ' + (cx + lx) + ' ' + ly + '" fill="none" stroke="#caa23a" stroke-opacity=".75" stroke-width="1.1"/>';
      for (j = 0; j < nb; j++) {
        var u = (j + .5) / nb, bxp = (1 - u) * (1 - u) * (cx - lx) + 2 * u * (1 - u) * cx + u * u * (cx + lx), byp = (1 - u) * (1 - u) * ly + 2 * u * (1 - u) * (ly + sag * 2) + u * u * ly;
        bulbs.push([bxp, byp, BULB[(j + k * 2) % 5], 0]);
      }
    }
    var sy = bt - h * .07 - 3 * h * .205 - h * .34;
    o += '<path d="M' + cx + ' ' + (sy - h * .075) + ' l' + h * .017 + ' ' + h * .05 + ' l' + h * .05 + ' ' + h * .004 + ' l' + (-h * .04) + ' ' + h * .033 + ' l' + h * .014 + ' ' + h * .05 + ' l' + (-h * .041) + ' ' + (-h * .03) + ' l' + (-h * .041) + ' ' + h * .03 + ' l' + h * .014 + ' ' + (-h * .05) + ' l' + (-h * .04) + ' ' + (-h * .033) + ' l' + h * .05 + ' ' + (-h * .004) + ' Z" fill="#ffd24a" stroke="#fff3b0" stroke-width=".8" transform="translate(0 ' + h * .045 + ')"/>';
    bulbs.push([cx, sy - h * .02, '#ffe27a', 1]);
    return { svg: o, bulbs: bulbs };
  }
  function scene(d) {
    var W = d.W, H = d.H, gy = Math.round(H * .79), i, g = '', lights = '', sk = document.createElement('div');
    sk.className = 'xm-scene2 xm-tw';
    for (i = 0; i < 40; i++) g += '<circle cx="' + Math.round(Math.random() * W) + '" cy="' + Math.round(Math.random() * H * .45) + '" r="' + (.5 + Math.random() * 1.3).toFixed(1) + '" fill="#fff" opacity="' + (.35 + Math.random() * .6).toFixed(2) + '"/>';
    g += '<path d="M0 ' + (gy - H * .1) + ' Q' + W * .25 + ' ' + (gy - H * .17) + ' ' + W * .5 + ' ' + (gy - H * .09) + ' T' + W + ' ' + (gy - H * .12) + ' V' + H + ' H0Z" fill="#28376f"/>';
    var tx = [.04, .13, .23, .82, .92, .985], th = [.36, .27, .21, .23, .35, .25];
    for (i = 0; i < tx.length; i++) {
      var tr = tree(W * tx[i], gy - H * (.012 + (i % 3) * .012), H * th[i]);
      g += tr.svg;
      tr.bulbs.forEach(function (q, n) { lights += '<i class="xtb' + (q[3] ? ' xts' : '') + '" style="left:' + q[0].toFixed(1) + 'px;top:' + q[1].toFixed(1) + 'px;--c:' + q[2] + ';--d:-' + (((n * 37) % 18) / 10).toFixed(1) + 's"></i>'; });
    }
    g += '<ellipse cx="' + W * .5 + '" cy="' + (gy - H * .02) + '" rx="' + W * .75 + '" ry="' + H * .12 + '" fill="url(#xgl)"/>';
    for (i = 0; i < 16; i++) g += '<circle cx="' + Math.round(Math.random() * W) + '" cy="' + Math.round(Math.random() * H * .6) + '" r="' + (3 + Math.random() * 7).toFixed(1) + '" fill="#fff" opacity="' + (.12 + Math.random() * .2).toFixed(2) + '"/>';
    g += '<path d="M0 ' + (gy - H * .045) + ' C' + W * .25 + ' ' + (gy - H * .1) + ' ' + W * .55 + ' ' + (gy - H * .02) + ' ' + W + ' ' + (gy - H * .075) + ' V' + H + ' H0Z" fill="#e8f1fa" opacity=".85"/>';
    g += '<path d="M0 ' + gy + ' Q' + W * .2 + ' ' + (gy - H * .035) + ' ' + W * .45 + ' ' + (gy - H * .005) + ' T' + W + ' ' + (gy - H * .02) + ' V' + H + ' H0Z" fill="url(#xgs)"/>';
    sk.innerHTML = '<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none"><defs>' +
      '<linearGradient id="xgs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#eaf2fb"/><stop offset="1" stop-color="#cadcf0"/></linearGradient><radialGradient id="xgl"><stop offset="0" stop-color="#bfe3ff" stop-opacity=".55"/><stop offset="1" stop-color="#bfe3ff" stop-opacity="0"/></radialGradient>' +
      '<linearGradient id="xtg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2f8f59"/><stop offset=".5" stop-color="#14573a"/><stop offset="1" stop-color="#082d1e"/></linearGradient>' +
      '<radialGradient id="xsn" cx=".34" cy=".3" r=".85"><stop offset="0" stop-color="#fff"/><stop offset=".5" stop-color="#f0f6fc"/><stop offset=".85" stop-color="#c4d7ed"/><stop offset="1" stop-color="#8aa6c7"/></radialGradient></defs>' + g + '</svg>' + lights;
    document.body.appendChild(sk);
    return {
      el: sk, gy: gy,
      /* Santa, the greeting: added when the wind starts */
      extras: function () {
        var f = document.createElement('div'); f.className = 'xm-fly2'; f.innerHTML = window.__xmSanta || ''; sk.appendChild(f);
        var gr = document.createElement('div'); gr.className = 'xm-greet'; gr.style.top = Math.round(gy + (H - gy) * .1) + 'px';
        function word(t, off, cls) { return '<div class="' + cls + '">' + t.split('').map(function (ch, n) { return '<span style="animation-delay:' + (off + n * 55) + 'ms">' + (ch === ' ' ? '&nbsp;' : ch) + '</span>'; }).join('') + '</div>'; }
        gr.innerHTML = word('Merry Christmas', 3700, 'g1') + word('from Morz', 4900, 'g2');
        gr.style.cssText += ';position:fixed;z-index:61;'; document.body.appendChild(gr); sk.__gr = gr;
      }
    };
  }
  function mkBall(x, y, r) {
    var el = document.createElement('div'); el.className = 'xm-ball xm-tw'; el.style.zIndex = 58; el.__t = Date.now();
    if (BALL) el.style.backgroundImage = 'url(' + BALL + ')';
    document.body.appendChild(el);
    return { el: el, x: x, y: y, r: r, rot: 0, sx: .001, sy: .001 };
  }
  function pop(b) {
    place(b);
    requestAnimationFrame(function () { requestAnimationFrame(function () { b.el.style.transition = 'transform .65s cubic-bezier(.3,1.5,.5,1)'; b.sx = b.sy = 1; place(b); }); });
  }
  function sceneMan(d, gy) {
    clearTower(true);
    var r0 = Math.max(46, Math.min(d.W * .22, d.H * .15)), r1 = r0 * .74, r2 = r0 * .54, x = d.W / 2;
    var y0 = gy - r0 * .82, y1 = y0 - (r0 + r1) * .93, y2 = y1 - (r1 + r2) * .93;
    var sh = document.createElement('i'); sh.className = 'xm-shd xm-tw';
    sh.style.cssText = 'left:' + (x - r0 * 1.15) + 'px;top:' + (gy - r0 * .1) + 'px;width:' + r0 * 2.3 + 'px;height:' + r0 * .34 + 'px';
    document.body.appendChild(sh); tower.shadow = sh; tower.skirt = mkSkirt(x, y0, r0);
    [[0, y0, r0], [550, y1, r1], [1100, y2, r2]].forEach(function (q) {
      setTimeout(function () {
        var b = mkBall(x, q[1], q[2]); pop(b); tower.balls.push({ el: b.el, x: b.x, y: b.y, r: b.r }); spray(b.x, b.y + b.r * .8, b.r * .8);
        if (tower.balls.length === 3) { setTimeout(dress, 450); clearTimeout(tower.timer); tower.timer = setTimeout(collapse, 8200); }
      }, q[0]);
    });
  }
  /* the snowman creaks, leans to one side, then falls with its full weight (faster and faster) and smashes into a heap of snow on that side */
  function collapse() {
    var B = tower.balls, dr = tower.dress;
    if (B.length < 3 || !dr) { clearTower(false); return; }
    clearTimeout(tower.timer);
    var base = B[0], px = base.x, py = base.y + base.r * .82, dir = Math.random() < .5 ? -1 : 1;
    var pvx = px + dir * base.r * .35, DEG = 66, SLIDE = .35;
    var grp = document.createElement('div'); grp.className = 'xm-grp xm-tw';
    grp.style.cssText = 'position:fixed;inset:0;z-index:58;pointer-events:none;transform-origin:' + pvx + 'px ' + py + 'px';
    document.body.appendChild(grp);
    B.forEach(function (t) { grp.appendChild(t.el); }); grp.appendChild(dr);
    var shadow = tower.shadow, skirt = tower.skirt, meta = tower.armMeta, balls = B.map(function (t) { return { x: t.x, y: t.y, r: t.r }; });
    tower = { balls: [], shadow: null, skirt: null, dress: null, timer: 0 };
    setTimeout(function () { dropArms(grp, py, dir, meta); }, 1900);
    var A = function (v) { return 'translateX(' + (dir * v * SLIDE).toFixed(1) + 'px) rotate(' + dir * v + 'deg)'; };
    var an = grp.animate([
      { transform: A(0), offset: 0 }, { transform: A(-1.6), offset: .1, easing: 'ease-in-out' }, { transform: A(2.4), offset: .22, easing: 'ease-in-out' },
      { transform: A(-2.2), offset: .34, easing: 'ease-in-out' }, { transform: A(4.5), offset: .5, easing: 'ease-in' }, { transform: A(10), offset: .64, easing: 'cubic-bezier(.45,0,.95,.7)' },
      { transform: A(34), offset: .84, easing: 'cubic-bezier(.5,0,.95,.6)' }, { transform: A(DEG), offset: 1 }
    ], { duration: 2500, fill: 'forwards' });
    an.onfinish = function () {
      var th = dir * DEG * Math.PI / 180, cs = Math.cos(th), sn = Math.sin(th), tr = dir * DEG * SLIDE;
      balls.forEach(function (b, i) {
        var dx = b.x - pvx, dy = b.y - py, x = pvx + dx * cs - dy * sn + tr, y = py + dx * sn + dy * cs;
        setTimeout(function () { spray(x, Math.min(y, py - 4), b.r * 1.1); chunks(x, Math.min(y, py - 4), b.r * 1.15, py, dir); }, i * 90);
      });
      heap(pvx + tr * .5, py, base.r, dir);
      try { grp.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 320, delay: 40, fill: 'forwards' }); } catch (e) {}
      setTimeout(function () { grp.remove(); }, 420);
      fadeOut(shadow, 900); fadeOut(skirt, 900);
    };
  }
  /* the pile of snow lumps that the fallen snowman leaves behind; it melts away again by itself */
  function heap(cx0, py, r, dir) {
    var rows = [[9, 0], [6, 1], [3, 2]], W = r * 4.6, cx = cx0 + dir * r * 1.3;
    rows.forEach(function (rw) {
      var n = rw[0], lv = rw[1], k;
      for (k = 0; k < n; k++) {
        var u = n > 1 ? k / (n - 1) * 2 - 1 : 0, sz = r * (.42 + Math.random() * .3) * (1 - lv * .08), w = W * (1 - lv * .3);
        var x = cx + u * w / 2 + (Math.random() - .5) * r * .25, y = py - sz * .42 - lv * sz * .62 + (Math.random() - .5) * 4;
        var c = document.createElement('i'); c.className = 'xm-chunk xm-heap xm-tw'; c.__t = Date.now();
        c.style.cssText = 'left:' + (x - sz / 2) + 'px;top:' + (y - sz / 2) + 'px;width:' + sz + 'px;height:' + sz * .88 + 'px;z-index:58';
        document.body.appendChild(c);
        c.animate([{ transform: 'scale(.15)', opacity: 0 }, { transform: 'scale(1.12)', opacity: 1, offset: .7 }, { transform: 'scale(1)', opacity: 1 }],
          { duration: 420, delay: 500 + lv * 260 + Math.random() * 420, easing: 'cubic-bezier(.3,1.4,.5,1)', fill: 'backwards' });
        setTimeout((function (c) { return function () { fadeOut(c, 2200); }; })(c), 4200 + lv * 300 + Math.random() * 600);
      }
    });
  }

  /* lumps of snow that break off, tumble through the air and roll to a stop */
  function chunks(x, y, r, py, dir) {
    var n = Math.min(12, Math.round(5 + r / 12)), k;
    for (k = 0; k < n; k++) {
      var sz = r * (.16 + Math.random() * .26), c = document.createElement('i'); c.className = 'xm-chunk xm-tw';
      c.style.cssText = 'left:' + (x - sz / 2) + 'px;top:' + (y - sz / 2) + 'px;width:' + sz + 'px;height:' + sz * .9 + 'px';
      document.body.appendChild(c);
      var dx = dir * r * (.3 + Math.random() * 1.7) + (Math.random() - .5) * r * .8, up = r * (.25 + Math.random() * .9),
          gy = py - sz * .42 - y + (Math.random() - .5) * 6, sp = (Math.random() - .5) * 240;
      var T = function (a, b, rot, sc) { return 'translate(' + a.toFixed(1) + 'px,' + b.toFixed(1) + 'px) rotate(' + rot.toFixed(0) + 'deg)' + (sc || ''); };
      c.animate([
        { transform: T(0, 0, 0), offset: 0, easing: 'cubic-bezier(.2,.8,.4,1)' },
        { transform: T(dx * .55, -up, sp * .4), offset: .4, easing: 'cubic-bezier(.5,0,.9,.6)' },
        { transform: T(dx * .95, gy, sp * .8, ' scale(1.06,.84)'), offset: .82, easing: 'cubic-bezier(.3,.7,.5,1)' },
        { transform: T(dx * 1.02, gy - sz * .2, sp * .9), offset: .91 },
        { transform: T(dx * 1.07, gy, sp, ' scale(1,.92)'), offset: 1 }
      ], { duration: 650 + Math.random() * 500, delay: Math.random() * 160, fill: 'forwards' });
      setTimeout((function (c) { return function () { fadeOut(c, 1600); }; })(c), 4300 + Math.random() * 600);
    }
  }

  /* when the snowman topples the twig arms drop off, fall, bounce and lie in the snow */
  function dropArms(grp, py, dir, meta) {
    if (!meta || !TWIG) return;
    var gang = 0;
    try { var mm = new DOMMatrixReadOnly(getComputedStyle(grp).transform); gang = Math.atan2(mm.b, mm.a) * 180 / Math.PI; } catch (e) {}
    meta.forEach(function (a) {
      var g = grp.querySelector('.' + a.cls); if (!g) return;
      var r = g.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      var img = document.createElement('img'); img.src = TWIG; img.alt = ''; img.className = 'xm-twig xm-tw';
      img.style.cssText = 'left:' + (cx - a.w / 2) + 'px;top:' + (cy - a.h / 2) + 'px;width:' + a.w + 'px;height:' + a.h + 'px';
      document.body.appendChild(img); g.style.opacity = '0';
      var r0 = a.ang + gang, end = a.side * (76 + Math.random() * 26), dxs = dir * (6 + Math.random() * 30) + a.side * 10,
          fall = Math.max(30, py - a.w * .4 - cy);
      var T = function (x, y, rot) { return 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) rotate(' + rot.toFixed(1) + 'deg)'; };
      img.animate([
        { transform: T(0, 0, r0), offset: 0, easing: 'cubic-bezier(.5,0,.9,.6)' },
        { transform: T(dxs * .7, fall, r0 + (end - r0) * .6), offset: .58, easing: 'cubic-bezier(.2,.6,.4,1)' },
        { transform: T(dxs * .88, fall - a.h * .13, end + a.side * 12), offset: .76, easing: 'cubic-bezier(.5,0,.8,.6)' },
        { transform: T(dxs, fall, end), offset: 1 }
      ], { duration: 1150, fill: 'forwards' }).onfinish = function () { spray(cx + dxs, py - 4, Math.max(14, a.h * .18)); };
      setTimeout(function () { fadeOut(img, 1800); }, 5200);
    });
  }

  /* streaks of wind sweeping from the top to the bottom of the screen */
  function gust(d) {
    var W = d.W, H = d.H, n = 12, i, p = '';
    for (i = 0; i < n; i++) {
      var y = H * (.03 + .94 * i / (n - 1)) + (Math.random() - .5) * 20, a = 24 + Math.random() * 40, sw = 1.2 + Math.random() * 2.4;
      p += '<path class="gst" pathLength="1" style="animation-delay:' + (i * 150 + Math.random() * 120).toFixed(0) + 'ms;animation-duration:' + (1100 + Math.random() * 700).toFixed(0) + 'ms" stroke-width="' + sw.toFixed(1) + '" d="M-120 ' + y.toFixed(0) +
        ' C' + (W * .18) + ' ' + (y - a) + ',' + (W * .3) + ' ' + (y + a) + ',' + (W * .46) + ' ' + (y - a * .2) + ' S' + (W * .66) + ' ' + (y - a * 1.2) + ',' + (W * .8) + ' ' + (y + a * .3) + ' S' + (W * .96) + ' ' + (y + a * .5) + ',' + (W + 140) + ' ' + (y - a * .3) + '"/>';
    }
    var el = document.createElement('div'); el.className = 'xm-gust';
    el.innerHTML = '<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" fill="none" stroke="#fff" stroke-linecap="round">' + p + '</svg>';
    document.body.appendChild(el); setTimeout(function () { el.remove(); }, 3800);
  }

  /* the snow cover is a canvas of small snow cells; the wind lifts them off in a wave from the top-left,
     each one accelerating, stretching and fading as it is carried away, so the cover erodes like real snow */
  function windCover(d, onWind, onDone) {
    var W = d.W, H = d.H, cs = Math.max(13, Math.round(Math.min(W, H) / 26)), cols = Math.ceil(W / cs), rows = Math.ceil(H / cs), i, j;
    var EDGE = Math.round(H * .42), sc = Math.max(.8, W / 420);
    function cv(z, h) { var c = document.createElement('canvas'); c.width = W; c.height = h; c.className = 'xm-cvs'; c.style.zIndex = z; c.style.height = h + 'px'; return c; }
    var C = cv(59, H + EDGE), F = cv(60, H), cx = C.getContext('2d'), fx = F.getContext('2d');
    /* avalanche powder cloud: soft grey-blue depth inside, bright billowing puffs, cauliflower-shaped leading edge */
    function puff(x, y, r, dark) {
      var p = cx.createRadialGradient(x - r * .2, y - r * .25, r * .05, x, y, r);
      if (dark) { p.addColorStop(0, 'rgba(176,196,222,.20)'); p.addColorStop(.6, 'rgba(176,196,222,.08)'); p.addColorStop(1, 'rgba(176,196,222,0)'); }
      else { p.addColorStop(0, 'rgba(255,255,255,.92)'); p.addColorStop(.5, 'rgba(250,252,255,.6)'); p.addColorStop(.8, 'rgba(246,250,255,.22)'); p.addColorStop(1, 'rgba(244,249,255,0)'); }
      cx.fillStyle = p; cx.beginPath(); cx.arc(x, y, r, 0, 6.2832); cx.fill();
    }
    var g = cx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#fbfdff'); g.addColorStop(.55, '#f2f7fc'); g.addColorStop(1, '#e3edf8'); cx.fillStyle = g; cx.fillRect(0, 0, W, H);
    for (i = 0; i < 14; i++) puff(Math.random() * W, Math.random() * H, (110 + Math.random() * 190) * sc, true);
    for (i = 0; i < 260; i++) puff(Math.random() * W, Math.random() * (H + EDGE * .2), (16 + Math.random() * 60) * sc, false);
    for (i = 0; i < 80; i++) { var ex = Math.random() * W * 1.1 - W * .05, ey = H - 12 + EDGE * (.02 + Math.random() * .5); puff(ex, ey, (40 + Math.random() * 90) * sc * (1 - (ey - H) / EDGE * .3), false); }
    var pc = document.createElement('canvas'); pc.width = pc.height = 220; var px = pc.getContext('2d');
    for (i = 0; i < 700; i++) { px.fillStyle = Math.random() < .5 ? 'rgba(255,255,255,' + (.3 + Math.random() * .5) + ')' : 'rgba(140,170,205,' + (.06 + Math.random() * .12) + ')'; px.beginPath(); px.arc(Math.random() * 220, Math.random() * 220, .7 + Math.random() * 2.2, 0, 6.2832); px.fill(); }
    cx.globalCompositeOperation = 'source-atop'; cx.fillStyle = cx.createPattern(pc, 'repeat'); cx.fillRect(0, 0, W, H + EDGE); cx.globalCompositeOperation = 'source-over';
    var spr = document.createElement('canvas'); spr.width = spr.height = 48; var sx = spr.getContext('2d'), sg = sx.createRadialGradient(24, 24, 1, 24, 24, 24);
    sg.addColorStop(0, 'rgba(255,255,255,1)'); sg.addColorStop(.55, 'rgba(250,252,255,.8)'); sg.addColorStop(1, 'rgba(240,247,255,0)'); sx.fillStyle = sg; sx.fillRect(0, 0, 48, 48);
    document.body.appendChild(C); document.body.appendChild(F);
    var a1 = C.animate([{ transform: 'translateY(-' + (H + EDGE + 10) + 'px)' }, { transform: 'translateY(0)' }], { duration: 1700, easing: 'cubic-bezier(.55,.06,.75,.9)', fill: 'forwards' });
    /* powder thrown up in front of the sliding cloud */
    var dust = setInterval(function () {
      try {
        var ly = new DOMMatrixReadOnly(getComputedStyle(C).transform).f + H + EDGE * .45;
        if (ly > -20 && ly < H + 40) spray(Math.random() * W, Math.max(10, Math.min(H - 10, ly)), 36 + Math.random() * 26);
      } catch (e) {}
    }, 110);
    a1.onfinish = function () {
      clearInterval(dust);
      C.style.animation = 'none'; C.style.transform = 'none'; a1.cancel();
      setTimeout(function () {
        onWind();
        var cells = [], sd = 0;
        for (j = 0; j < rows; j++) for (i = 0; i < cols; i++) {
          var x = i * cs + cs / 2, y = j * cs + cs / 2;
          cells.push({ x: x, y: y, s: (y / H) * 2300 + (x / W) * 550 + Math.sin(y * .018 + x * .01) * 170 + Math.random() * 260,
            vx: 30 + Math.random() * 70, ax: 1500 + Math.random() * 1100, vy: (Math.random() - .5) * 70, gy: 40 + Math.random() * 90, L: 1 + Math.random() * .9,
            z: 1.25 + Math.random() * .9, ph: Math.random() * 6.28, on: 0, dead: 0 });
        }
        var left = cells.length, T0 = performance.now(), end = false;
        (function frame(now) {
          var t = now - T0, k;
          fx.clearRect(0, 0, W, H);
          cx.globalCompositeOperation = 'destination-out';
          for (k = 0; k < cells.length; k++) {
            var c = cells[k]; if (c.dead) continue;
            if (!c.on) {
              if (t < c.s) continue;
              c.on = 1; var rr = cs * 1.15; cx.drawImage(spr, c.x - rr, c.y - rr, rr * 2, rr * 2);
            }
            var dt = (t - c.s) / 1000;
            if (dt > c.L) { c.dead = 1; left--; continue; }
            var u = dt / c.L, x = c.x + c.vx * dt + .5 * c.ax * dt * dt, y = c.y + c.vy * dt + c.gy * dt * dt + Math.sin(dt * 7 + c.ph) * 3,
              sz = cs * c.z * (1 - .4 * u), spd = c.vx + c.ax * dt, st = 1 + Math.min(2.6, spd / 520);
            fx.globalAlpha = Math.max(0, 1 - u * u * u);
            fx.drawImage(spr, x - sz * st / 2, y - sz * .8 / 2, sz * st, sz * .8);
          }
          cx.globalCompositeOperation = 'source-over'; fx.globalAlpha = 1;
          if (left > 0) requestAnimationFrame(frame); else { C.remove(); F.remove(); if (onDone) onDone(); }
        })(performance.now());
      }, 1400);
    };
  }

  /* huge ball: the site is buried in snow, the wind erodes it away and a winter scene with a snowman,
     Santa and a greeting is revealed underneath */
  function bury(b, k) {
    var d = dims(), sc;
    busy = true; b.el.classList.remove('held');
    b.el.style.transition = 'opacity .5s'; b.el.style.opacity = '0';
    spray(b.x, b.y, 150); spray(d.W / 2, d.H * .4, 150);
    sc = scene(d);
    windCover(d, function () {
      gust(d); sc.extras();
      setTimeout(function () { sceneMan(d, sc.gy); }, 1700);
      setTimeout(function () { fadeOut(sc.el, 1800); fadeOut(sc.el.__gr, 1800); }, 16000);
    }, function () { b.el.remove(); live--; busy = false; });
  }

  function start(e) {
    var b = cur = newBall(e.clientX, e.clientY); b.id = e.pointerId; b.t0 = performance.now();
    document.body.classList.add('xm-hold');
    (function grow(t) {
      if (cur !== b) return;
      var d = dims(), k = Math.min(1, (t - b.t0) / GROW), Rb = d.Rbury;
      b.k = k;
      b.r = k < .6 ? 8 + (Rb - 8) * Math.pow(k / .6, .9) : Rb + (d.Rmax - Rb) * ((k - .6) / .4);
      var nx = b.x + (b.tx - b.x) * .22, ny = b.y + (b.ty - b.y) * .22;
      b.vx = nx - b.x; b.x = nx; b.y = ny; b.rot += b.vx * .012 / Math.max(.35, b.r / 80);
      place(b); requestAnimationFrame(grow);
    })(performance.now());
  }
  document.addEventListener('pointerdown', function (e) {
    if (cur || pend || !e.isPrimary || !ok(e)) return;
    var q = pend = { id: e.pointerId, x: e.clientX, y: e.clientY };
    q.tm = setTimeout(function () { if (pend === q) { pend = null; start({ clientX: q.x, clientY: q.y, pointerId: q.id }); } }, 140);
  }, { passive: true });
  document.addEventListener('pointermove', function (e) {
    if (pend && e.pointerId === pend.id && Math.hypot(e.clientX - pend.x, e.clientY - pend.y) > 10) { clearTimeout(pend.tm); pend = null; }
    if (!cur || e.pointerId !== cur.id) return;
    cur.tx = e.clientX; cur.ty = e.clientY;
  }, { passive: true });
  document.addEventListener('touchmove', function (e) { if (cur && e.cancelable) e.preventDefault(); }, { passive: false });
  function end(e) {
    if (pend && e.pointerId === pend.id) { clearTimeout(pend.tm); pend = null; }
    if (!cur || e.pointerId !== cur.id) return;
    var b = cur, d = dims(); cur = null; document.body.classList.remove('xm-hold');
    if (b.r < 12) { b.el.remove(); live--; return; }
    if ((b.k || 0) >= .6) bury(b, b.k); else drop(b);
  }
  document.addEventListener('pointerup', end, { passive: true });
  document.addEventListener('pointercancel', end, { passive: true });
  document.addEventListener('contextmenu', function (e) { if (cur || pend) e.preventDefault(); });
  /* safety net: a ball that got stranded on the screen (finger lifted outside the page, app switched, ...) is removed */
  function sweep() {
    var keep = tower.balls.map(function (t) { return t.el; }), n = 0;
    if (cur) keep.push(cur.el);
    [].forEach.call(document.querySelectorAll('.xm-ball'), function (el) {
      if (keep.indexOf(el) > -1) return;
      var age = Date.now() - (el.__t || 0);
      if ((el.classList.contains('held') && !cur && !pend && age > 400) || (age > 45000 && !busy)) { el.remove(); return; }
      n++;
    });
    live = n + (cur ? 1 : 0);
  }
  setInterval(function () { sweep(); [].forEach.call(document.querySelectorAll('.xm-chunk,.xm-twig,.xm-mound,.xm-grp'), function (el) { if (!el.__t) el.__t = Date.now(); if (Date.now() - el.__t > 14000) el.remove(); }); }, 1200);
  function cancelAll() {
    if (pend) { clearTimeout(pend.tm); pend = null; }
    if (cur) { var b = cur; cur = null; document.body.classList.remove('xm-hold'); b.el.remove(); live = Math.max(0, live - 1); }
  }
  document.addEventListener('visibilitychange', function () { if (document.hidden) cancelAll(); });
  window.addEventListener('pagehide', cancelAll);
  document.addEventListener('touchend', function (e) { if (cur && !(e.touches && e.touches.length)) end({ pointerId: cur.id }); }, { passive: true });
  document.addEventListener('touchcancel', function () { if (cur) end({ pointerId: cur.id }); }, { passive: true });
  loadAcc();
})();
