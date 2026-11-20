/* Light / Dark: two buttons in the header menu. Light makes the shop white, Dark is the original look.
   The choice is remembered on this device (an inline script in the page head applies it before the first paint). */
(function () {
  if (window.__xmMode) return;
  window.__xmMode = true;
  var KEY = 'morz_mode', root = document.documentElement;
  function get() { try { return localStorage.getItem(KEY) === 'light' ? 'light' : 'dark'; } catch (e) { return 'dark'; } }
  function apply(m, save) {
    root.classList.toggle('xm-light', m === 'light');
    if (save) { try { localStorage.setItem(KEY, m); } catch (e) {} }
    var tc = document.querySelector('meta[name="theme-color"]');
    if (tc) { if (!tc.__orig) tc.__orig = tc.getAttribute('content'); tc.setAttribute('content', m === 'light' ? '#ffffff' : tc.__orig); }
    /* the logo's light-coloured wire would vanish on white: use the dark-wire version of the same logo */
    [].forEach.call(document.querySelectorAll('img.mark--xm'), function (im) {
      var src = im.getAttribute('src') || '';
      if (m === 'light' && src.indexOf('morz-logo-mini-light.png') > -1) im.setAttribute('src', src.replace('morz-logo-mini-light.png', 'morz-logo-mini.png'));
      else if (m !== 'light' && src.indexOf('morz-logo-mini.png') > -1 && im.__xmSwap) im.setAttribute('src', src.replace('morz-logo-mini.png', 'morz-logo-mini-light.png'));
      if (m === 'light') im.__xmSwap = 1;
    });
    [].forEach.call(document.querySelectorAll('.xm-mode button'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-mode') === m ? 'true' : 'false'); });
  }
  var sun = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"/></svg>';
  var moon = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.5 14.6A8.6 8.6 0 0 1 9.4 3.5a8.7 8.7 0 1 0 11.1 11.1z"/></svg>';
  function build() {
    if (document.querySelector('.xm-mode')) return;
    var g = document.createElement('div'); g.className = 'xm-mode'; g.setAttribute('role', 'group'); g.setAttribute('aria-label', 'Light or dark');
    g.innerHTML = '<button type="button" data-mode="light" aria-pressed="false">' + sun + '<span>Light</span></button><button type="button" data-mode="dark" aria-pressed="false">' + moon + '<span>Dark</span></button>';
    g.addEventListener('click', function (e) { var b = e.target.closest('button[data-mode]'); if (b) apply(b.getAttribute('data-mode'), true); });
    var nav = document.querySelector('header.top nav.main');
    if (nav) { var fab = nav.querySelector('.mx-fab'); if (fab) nav.insertBefore(g, fab); else nav.appendChild(g); }
    else { var w = document.querySelector('header.top .wrap'), cart = w && w.querySelector('.cartb'); if (w) w.insertBefore(g, cart || null); }
    apply(get(), false);
  }
  apply(get(), false);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
})();

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

/* Snowball: press and hold on the Home page. Loose snow gathers into a ball that follows your finger and grows; let go
   and it drops. Drop smaller balls on top of each other (big, medium, small) to build a snowman, which then puts on a hat
   and scarf from the shop's products. Tap the snowman and it falls over backwards; swipe it left or right and it tips
   that way and rolls, and every ball turns back into snow. Hold very long and the giant ball flies at the screen and
   smashes into the glass; the wind blows the snow away and a winter scene with its own snowman appears. */
(function () {
  if (window.__xmBall) return;
  window.__xmBall = true;
  if (window.Shopify && Shopify.designMode) return;
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var SKIP = 'a,button,input,select,textarea,label,summary,dialog,iframe,.mx-panel,.mx-fab,.xm-mode,[role=button],[role=dialog]';
  var CFG = window.MORZ_SNOW || {};
  function abs(u) { return u && u.indexOf('//') === 0 ? 'https:' + u : u; }
  var BALL = abs(CFG.ball) || '', TWIG = abs(CFG.twig) || '';
  var S = 512, R0 = 253, GROW = 14000, cur = null, pend = null, live = 0, busy = false, knock = null, SCN = null, PREP = null;
  var tower = { balls: [], shadow: null, skirt: null, dress: null, timer: 0, gy: 0, scene: false }, ACC = {};
  if (BALL) { var pre = new Image(); pre.src = BALL; }

  /* ---------- the stage: every piece of snow lives in one layer that is glued to the bottom of the screen,
     so the snow stays on the ground when the browser's address bar slides away or comes back ---------- */
  var STAGE = null, VW = window.innerWidth, VH = window.innerHeight, H0 = VH, OFF = 0;
  function stage() {
    if (!STAGE) {
      STAGE = document.createElement('div'); STAGE.className = 'xm-stage xm-tw'; STAGE.setAttribute('aria-hidden', 'true');
      document.body.appendChild(STAGE); H0 = VH; OFF = 0;
    }
    return STAGE;
  }
  function shift() { if (STAGE) STAGE.style.transform = 'translate3d(0,' + OFF + 'px,0)'; }
  function rebase() { stage(); H0 = VH; OFF = 0; shift(); }
  window.addEventListener('resize', function () { VW = window.innerWidth; VH = window.innerHeight; OFF = VH - H0; shift(); });
  function SY(y) { return y - OFF; }
  function add(el) { stage().appendChild(el); return el; }
  function dims() { var W = VW, H = H0, big = Math.max(W, H); return { W: W, H: H, Rmax: big * .75, Rbury: Math.min(big * .35, H * .4) }; }
  function lifeMs() { return tower.scene || SCN ? 60000 : 4300; }

  function ok(e) {
    if (knock) return false;
    if (!document.body.classList.contains('tpl-index') || busy) return false;
    if (document.documentElement.classList.contains('intro-on')) return false;
    if (e.pointerType === 'mouse' && e.button !== 0) return false;
    if (e.target.closest && e.target.closest(SKIP)) return false;
    var d = document.getElementById('MenuDrawer'); if (d && d.open) return false;
    return live < 5;
  }
  function tf(r, x, y, rot, sx, sy) {
    return 'translate3d(' + (x - S / 2) + 'px,' + (y - S / 2) + 'px,0) rotate(' + (rot || 0) + 'rad) scale(' + (r / R0 * (sx || 1)) + ',' + (r / R0 * (sy || 1)) + ')';
  }
  function place(b) { b.el.style.transform = tf(b.r, b.x, b.y, b.rot, b.sx, b.sy); }
  function newBall(x, y) {
    var el = document.createElement('div');
    el.className = 'xm-ball held'; el.setAttribute('aria-hidden', 'true');
    if (BALL) el.style.backgroundImage = 'url(' + BALL + ')';
    add(el); live++;
    el.__t = Date.now();
    return { el: el, x: x, y: y, tx: x, ty: y, r: 8, rot: 0, vx: 0 };
  }

  /* small pieces positioned only with transforms (no layout work while they fly) */
  function bit(cls, x, y, w, h) {
    var p = document.createElement('i'); p.className = cls;
    p.style.cssText = 'left:0;top:0;width:' + w.toFixed(1) + 'px;height:' + h.toFixed(1) + 'px;transform:translate(' + (x - w / 2).toFixed(1) + 'px,' + (y - h / 2).toFixed(1) + 'px)';
    return add(p);
  }
  function T(x, y, s) { return 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)' + (s !== undefined ? ' scale(' + s + ')' : ''); }

  /* spray of fine snow thrown sideways */
  function spray(x, y, r, n0) {
    var n = n0 || Math.min(30, 12 + Math.round(r / 5)), i;
    var pw = r * 2.2, ph = r * 1.4, puff = bit('xm-puff', x, y, pw, ph);
    puff.animate([{ transform: T(x - pw / 2, y - ph / 2, .4), opacity: .8 }, { transform: T(x - pw / 2, y - ph / 2, 1.5), opacity: 0 }], { duration: 650, easing: 'ease-out', fill: 'forwards' }).onfinish = function () { puff.remove(); };
    for (i = 0; i < n; i++) {
      var sz = 2 + Math.random() * Math.max(2.5, r / 12) * (Math.random() < .15 ? 2.2 : 1), sh = sz * (.8 + Math.random() * .35);
      var p = bit('xm-bit', x, y, sz, sh);
      var dir = Math.random() < .5 ? -1 : 1, ang = (Math.random() - .5) * 1.0 - (Math.random() < .25 ? .5 : 0);
      var dist = (50 + Math.random() * 230) * (.55 + r / 150), dx = Math.cos(ang) * dist * dir, dy = Math.sin(ang) * dist * .8;
      p.animate([{ transform: T(x - sz / 2, y - sh / 2, 1), opacity: 1 }, { transform: T(x - sz / 2 + dx, y - sh / 2 + dy, .45), opacity: 0 }],
        { duration: 650 + Math.random() * 750, easing: 'cubic-bezier(.08,.75,.3,1)', fill: 'forwards' }).onfinish = (function (p) { return function () { p.remove(); }; })(p);
    }
  }
  /* a fallen ball turns into fine powder: it is thrown up, drifts down and settles on the ground */
  function powder(x, y, r, py, dir) {
    var n = Math.min(60, Math.round(26 + r / 2.5)), k;
    for (k = 0; k < n; k++) {
      var sz = 1.4 + Math.random() * Math.max(2, r / 24), c = bit('xm-bit', x, y, sz, sz);
      var dx = dir ? dir * r * (.2 + Math.random() * 1.9) + (Math.random() - .5) * r : (Math.random() - .5) * r * 2.8,
          up = r * (.2 + Math.random() * 1.1), gd = Math.max(6, py - y - Math.random() * 8), sw = (Math.random() - .5) * r * .5, x0 = x - sz / 2, y0 = y - sz / 2;
      c.animate([
        { transform: T(x0, y0), opacity: 1, offset: 0, easing: 'cubic-bezier(.2,.8,.4,1)' },
        { transform: T(x0 + dx * .6, y0 - up), opacity: 1, offset: .35, easing: 'cubic-bezier(.45,.1,.8,.7)' },
        { transform: T(x0 + dx * .9 + sw, y0 + gd), opacity: .95, offset: .85 },
        { transform: T(x0 + dx + sw, y0 + gd), opacity: 0, offset: 1 }
      ], { duration: 1000 + Math.random() * 1300, delay: Math.random() * 220, fill: 'forwards' }).onfinish = (function (c) { return function () { c.remove(); }; })(c);
    }
  }

  function fadeOut(el, ms) {
    if (!el || el.__fo) return; el.__fo = 1;
    var o = 1; try { o = parseFloat(getComputedStyle(el).opacity); if (isNaN(o)) o = 1; } catch (e) {}
    try { el.animate([{ opacity: o }, { opacity: 0 }], { duration: ms, easing: 'ease-in', fill: 'forwards' }); } catch (e) { el.style.transition = 'opacity ' + ms + 'ms'; el.style.opacity = '0'; }
    setTimeout(function () { if (el.parentNode) el.remove(); }, ms + 80);
  }
  function freshTower() { return { balls: [], shadow: null, skirt: null, dress: null, timer: 0, gy: 0, scene: false }; }
  function clearTower(quick) {
    clearTimeout(tower.timer);
    tower.balls.forEach(function (t) { if (!quick) spray(t.x, t.y, t.r * .7); fadeOut(t.el, quick ? 500 : 1500); });
    fadeOut(tower.shadow, quick ? 500 : 1500); fadeOut(tower.skirt, quick ? 500 : 1500); fadeOut(tower.dress, quick ? 500 : 1500);
    tower = freshTower();
  }

  /* real-looking snow: a soft mound made of thousands of tiny grains. The top centre of the canvas is the highest
     point, both sides slope down to its bottom corners; `fade` lets the bottom melt into snowy ground */
  function snowCanvas(w, h, fade) {
    w = Math.max(4, w); h = Math.max(4, h);
    var c = document.createElement('canvas'), dpr = Math.min(2, window.devicePixelRatio || 1), i;
    c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); c.style.width = w + 'px'; c.style.height = h + 'px';
    var x = c.getContext('2d'), ph = Math.random() * 6.28, N = Math.min(2200, Math.round(w * h / 12));
    x.scale(dpr, dpr);
    function top(u) { return h * (1 - .96 * Math.pow(Math.max(0, 1 - u * u), .62) * (1 + .04 * Math.sin(u * 11 + ph))); }
    var g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#ffffff'); g.addColorStop(.45, '#f4f8fd'); g.addColorStop(1, '#dde8f5');
    x.fillStyle = g; x.beginPath(); x.moveTo(0, h);
    for (i = 0; i <= 48; i++) x.lineTo(i / 48 * w, top(i / 24 - 1));
    x.lineTo(w, h); x.closePath(); x.fill();
    var sg = x.createLinearGradient(0, 0, w, 0); sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(.62, 'rgba(255,255,255,0)'); sg.addColorStop(1, 'rgba(120,150,195,.16)');
    x.globalCompositeOperation = 'source-atop'; x.fillStyle = sg; x.fillRect(0, 0, w, h); x.globalCompositeOperation = 'source-over';
    for (i = 0; i < N; i++) {
      var px = Math.random() * w, ty = top(px / w * 2 - 1), py = ty - 4 + Math.random() * (h - ty + 4), dark = Math.random() < .28;
      x.fillStyle = dark ? 'rgba(130,160,200,' + (.06 + Math.random() * .12) + ')' : 'rgba(255,255,255,' + (.5 + Math.random() * .5) + ')';
      x.beginPath(); x.arc(px, py, .45 + Math.random() * 1.3, 0, 6.2832); x.fill();
    }
    if (fade) {
      var fg = x.createLinearGradient(0, 0, 0, h); fg.addColorStop(0, '#000'); fg.addColorStop(.55, '#000'); fg.addColorStop(1, 'rgba(0,0,0,0)');
      x.globalCompositeOperation = 'destination-in'; x.fillStyle = fg; x.fillRect(0, 0, w, h); x.globalCompositeOperation = 'source-over';
    }
    return c;
  }
  /* where the snow on the ground ends: the bottom of the screen, or (in the winter scene) a bit under the snowline */
  function floorOf(gy, r, scene) { return scene ? gy + Math.max(26, r * .55) : H0 + 2; }
  /* a low drift of real snow that grows where a ball fell, and melts away again */
  function drift(cx, gy, w, hAbove, delay, life, scene) {
    var top = gy - hAbove, el = snowCanvas(w, floorOf(gy, hAbove, scene) - top, scene); el.className = 'xm-drift'; el.__t = Date.now();
    el.style.left = (cx - w / 2).toFixed(1) + 'px'; el.style.top = top.toFixed(1) + 'px';
    add(el);
    el.animate([{ transform: 'scale(.55,.05)', opacity: 0 }, { transform: 'scale(1.03,1.06)', opacity: 1, offset: .65 }, { transform: 'scale(1)', opacity: 1 }], { duration: 900, delay: delay, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'backwards' });
    setTimeout(function () { fadeOut(el, 2400); }, delay + life);
    return el;
  }
  /* soft snow around the foot of the bottom ball, so it sits in the snow; it reaches down to the ground/screen edge */
  function mkSkirt(x, y, r) {
    var top = y + r * .5, w = r * 3.1, k = snowCanvas(w, floorOf(tower.gy || (y + r * .82), r, tower.scene) - top, tower.scene);
    k.className = 'xm-skirt'; k.style.left = (x - w / 2).toFixed(1) + 'px'; k.style.top = top.toFixed(1) + 'px';
    add(k);
    try { k.animate([{ transform: 'scale(.6,.15)', opacity: 0 }, { transform: 'scale(1.04,1.08)', opacity: 1, offset: .6 }, { transform: 'scale(1)', opacity: 1 }], { duration: 700, easing: 'cubic-bezier(.2,.8,.3,1)' }); } catch (e) {}
    return k;
  }
  function mkShadow(x, gy, r) {
    var sh = document.createElement('i'); sh.className = 'xm-shd';
    sh.style.cssText = 'left:' + (x - r * 1.15) + 'px;top:' + (gy - r * .02) + 'px;width:' + r * 2.3 + 'px;height:' + r * .34 + 'px';
    return add(sh);
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
  function drop(b) {
    var pl = plan(b), vy = 0, last = performance.now(), bounced = 0;
    b.el.classList.remove('held');
    if (b.y > pl.y) b.y = pl.y - 2;
    (function step(t) {
      var dt = Math.min(32, t - last); last = t;
      vy += .0019 * dt; b.y += vy * dt;
      b.x += (pl.x - b.x) * Math.min(1, .01 * dt * (pl.stack ? 1.6 : 1)); b.rot += (pl.x - b.x) * .0004;
      if (b.y >= pl.y) {
        b.y = pl.y; b.x = pl.x;
        spray(b.x, b.y + b.r * .75, b.r * (pl.stack ? 1 : 1.35));
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
    live--; b.el.__t = 0; b.el.style.zIndex = 58;
    if (!pl.stack) {
      tower.gy = b.y + b.r * .82; tower.scene = false;
      tower.shadow = mkShadow(b.x, tower.gy, b.r); tower.skirt = mkSkirt(b.x, b.y, b.r);
    }
    tower.balls.push({ el: b.el, x: b.x, y: b.y, r: b.r, rot: b.rot || 0 });
    clearTimeout(tower.timer);
    if (tower.balls.length === 3) setTimeout(dress, 380);
    tower.timer = setTimeout(function () { if (tower.balls.length === 3) fallBack(); else clearTower(false); }, tower.balls.length === 3 ? 14000 : 22000);
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
    /* volume: light from the top-left, cool shade bottom-right, so each ball reads as a round lump of snow */
    defs = defs.replace('</defs>', '<radialGradient id="xl" cx=".34" cy=".28" r=".85"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset=".5" stop-color="#fff" stop-opacity=".08"/><stop offset=".78" stop-color="#7f9cc4" stop-opacity=".12"/><stop offset="1" stop-color="#4a6c9c" stop-opacity=".42"/></radialGradient></defs>');
    [base, m, h].forEach(function (u) { g += '<circle cx="' + f(u.x) + '" cy="' + f(u.y) + '" r="' + f(u.r * .985) + '" fill="url(#xl)"/>'; });
    /* snow packed into the joints between the balls */
    [[h, m], [m, base]].forEach(function (pr, jn) {
      var up = pr[0], lo = pr[1], jy = up.y + up.r * .86, k, nn = 17;
      for (k = 0; k < nn; k++) {
        var u2 = k / (nn - 1) * 2 - 1, rr = up.r * (.085 + ((k * 37 + jn * 11) % 10) / 10 * .05), cx2 = up.x + u2 * up.r * .72, cy2 = jy - Math.abs(u2) * up.r * .09 + ((k * 53) % 7 - 3) * .8;
        g += '<circle cx="' + f(cx2) + '" cy="' + f(cy2) + '" r="' + f(rr) + '" fill="url(#xw)" opacity=".92"/><circle cx="' + f(cx2 + rr * .1) + '" cy="' + f(cy2 + rr * .55) + '" r="' + f(rr * .75) + '" fill="#9db6d6" opacity=".18" filter="url(#xb)"/>';
      }
    });
    var armMeta = [];
    function arm(sx, sy, ex, ey, cls, side) {
      var ix = sx - side * mr * .2, dx = ex - ix, dy = ey - sy, L = Math.sqrt(dx * dx + dy * dy), ang = Math.atan2(dx, -dy) * 180 / Math.PI;
      var th = L * 1.1, tw = th * .46;
      armMeta.push({ cls: cls, w: tw, h: th, ang: ang, side: side });
      /* a real twig (thin end pushed into the snow, branches pointing outwards) that wiggles around its socket */
      return '<g class="' + cls + '" style="transform-origin:' + f(ix) + 'px ' + f(sy) + 'px">' +
        '<g transform="translate(' + f(ix) + ' ' + f(sy) + ') rotate(' + f(ang) + ')">' +
        '<image href="' + TWIG + '" x="' + f(-tw / 2) + '" y="' + f(-th) + '" width="' + f(tw) + '" height="' + f(th) + '" preserveAspectRatio="none" filter="url(#xf)"/></g></g>' +
        '<ellipse cx="' + f(sx) + '" cy="' + f(sy + mr * .02) + '" rx="' + f(mr * .12) + '" ry="' + f(mr * .13) + '" fill="url(#xw)" opacity=".95"/>';
    }
    g += arm(mx - mr * .86, my - mr * .12, mx - mr * 2.15, my - mr * .8, 'xa-l', -1);
    g += arm(mx + mr * .86, my - mr * .12, mx + mr * 2.15, my - mr * .86, 'xa-r', 1);
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
    /* face: eyes pressed into the snow, a long carrot, a coal smile and rosy cheeks */
    var eyY = hy - hr * .16, eyX = hr * .34;
    [-1, 1].forEach(function (sd) {
      g += '<ellipse cx="' + f(hx + sd * eyX) + '" cy="' + f(eyY + hr * .035) + '" rx="' + f(hr * .17) + '" ry="' + f(hr * .15) + '" fill="#4f6f98" opacity=".28" filter="url(#xb)"/>';
      g += '<ellipse cx="' + f(hx + sd * eyX) + '" cy="' + f(eyY) + '" rx="' + f(hr * .115) + '" ry="' + f(hr * .125) + '" fill="url(#xc)"/>';
      g += '<ellipse cx="' + f(hx + sd * eyX - hr * .035) + '" cy="' + f(eyY - hr * .045) + '" rx="' + f(hr * .034) + '" ry="' + f(hr * .026) + '" fill="#fff" opacity=".85"/>';
    });
    g += '<ellipse cx="' + f(hx - hr * .6) + '" cy="' + f(hy + hr * .17) + '" rx="' + f(hr * .17) + '" ry="' + f(hr * .1) + '" fill="#ff8aa0" opacity=".32" filter="url(#xb)"/>' +
      '<ellipse cx="' + f(hx + hr * .6) + '" cy="' + f(hy + hr * .17) + '" rx="' + f(hr * .17) + '" ry="' + f(hr * .1) + '" fill="#ff8aa0" opacity=".32" filter="url(#xb)"/>';
    var nx0 = hx - hr * .05, ny0 = hy + hr * .07, nl = hr * .8;
    g += '<path d="M' + f(nx0 + hr * .05) + ' ' + f(ny0 + hr * .1) + ' Q' + f(nx0 + nl * .5) + ' ' + f(ny0 + hr * .2) + ' ' + f(nx0 + nl) + ' ' + f(ny0 + hr * .3) + ' Q' + f(nx0 + nl * .4) + ' ' + f(ny0 + hr * .24) + ' ' + f(nx0 + hr * .05) + ' ' + f(ny0 + hr * .2) + 'Z" fill="#7a2a00" opacity=".25" filter="url(#xb)"/>';
    g += '<g><path d="M' + f(nx0) + ' ' + f(ny0 - hr * .13) + ' Q' + f(nx0 + nl * .55) + ' ' + f(ny0 - hr * .05) + ' ' + f(nx0 + nl) + ' ' + f(ny0 + hr * .2) + ' Q' + f(nx0 + nl * .5) + ' ' + f(ny0 + hr * .2) + ' ' + f(nx0) + ' ' + f(ny0 + hr * .14) + 'Z" fill="url(#xn)" stroke="#a93800" stroke-opacity=".6" stroke-width="1" stroke-linejoin="round"/>' +
      '<path d="M' + f(nx0 + hr * .02) + ' ' + f(ny0 - hr * .1) + ' Q' + f(nx0 + nl * .5) + ' ' + f(ny0 - hr * .045) + ' ' + f(nx0 + nl * .9) + ' ' + f(ny0 + hr * .15) + '" stroke="#fff" stroke-opacity=".5" stroke-width="' + f(hr * .025) + '" fill="none" stroke-linecap="round"/>' +
      '<path d="M' + f(nx0 + nl * .2) + ' ' + f(ny0 - hr * .06) + ' l' + f(hr * .02) + ' ' + f(hr * .17) + 'M' + f(nx0 + nl * .4) + ' ' + f(ny0 - hr * .02) + ' l' + f(hr * .02) + ' ' + f(hr * .15) + 'M' + f(nx0 + nl * .6) + ' ' + f(ny0 + hr * .03) + ' l' + f(hr * .015) + ' ' + f(hr * .12) + '" stroke="#b34100" stroke-opacity=".6" stroke-width="1.1" fill="none"/></g>';
    for (var q = 0; q < 7; q++) {
      var an = (0.14 + q * 0.12) * Math.PI;
      g += coal(hx + Math.cos(an) * hr * .55, hy + hr * .2 + Math.sin(an) * hr * .3, hr * .058);
    }
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
    add(el); tower.dress = el; tower.armMeta = armMeta;
    el.animate([{ opacity: 0, transform: 'translateY(-14px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 650, easing: 'cubic-bezier(.2,.9,.3,1)', fill: 'forwards' });
    spray(hx, hy, hr);
  }


  /* ---------- falling over ---------- */
  function detach() { clearTimeout(tower.timer); var t = tower; tower = freshTower(); return t; }
  /* the snow left where a ball broke up */
  function burst(x, y, r, gy, dir, scene) {
    powder(x, Math.min(y, gy - 4), r * 1.15, gy, dir);
    spray(x, Math.min(y, gy - 4), r * .75, 10);
    drift(x + dir * r * .3, gy, r * 2.9, r * .55, 120, lifeMs(), scene);
  }
  /* the twig arms come loose, hop once and lie in the snow */
  function tossArms(meta, grp, gy, dir) {
    if (!meta || !TWIG) return;
    meta.forEach(function (a) {
      var g = grp.querySelector('.' + a.cls); if (!g) return;
      var r = g.getBoundingClientRect(), cx = r.left + r.width / 2, cy = SY(r.top + r.height / 2);
      var img = document.createElement('img'); img.src = TWIG; img.alt = ''; img.className = 'xm-twig';
      img.style.cssText = 'left:' + (cx - a.w / 2).toFixed(1) + 'px;top:' + (cy - a.h / 2).toFixed(1) + 'px;width:' + a.w.toFixed(1) + 'px;height:' + a.h.toFixed(1) + 'px';
      add(img); g.style.opacity = '0';
      var end = a.side * (80 + Math.random() * 18), r0 = a.ang + dir * 40, dxs = (dir || a.side) * (24 + Math.random() * 46) + a.side * 16,
          land = Math.max(-a.h * .2, gy - a.w * .35 - cy), up = Math.min(46, a.h * .28);
      var R = function (x, y, rot) { return 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) rotate(' + rot.toFixed(1) + 'deg)'; };
      img.animate([
        { transform: R(0, 0, r0), offset: 0, easing: 'cubic-bezier(.2,.7,.4,1)' },
        { transform: R(dxs * .35, -up, r0 + (end - r0) * .35), offset: .3, easing: 'cubic-bezier(.5,0,.9,.6)' },
        { transform: R(dxs * .85, land, end), offset: .78, easing: 'cubic-bezier(.2,.6,.4,1)' },
        { transform: R(dxs * .95, land - a.h * .07, end + a.side * 5), offset: .88 },
        { transform: R(dxs, land, end), offset: 1 }
      ], { duration: 1050, fill: 'forwards' }).onfinish = function () { spray(cx + dxs, gy - 4, Math.max(12, a.h * .15), 8); };
      setTimeout(function () { fadeOut(img, 1800); }, lifeMs() + 600);
    });
  }
  /* a tap from the front: the snowman tips over backwards, away from you, lands flat in the snow behind and breaks up */
  function fallBack() {
    var t = detach(), B = t.balls; if (!B.length) return;
    var d = dims(), base = B[0], px = base.x, gy = t.gy, hz = Math.max(70, d.H * .12), ms = 1250, hit = ms * .74;
    var wrap = document.createElement('div');
    wrap.style.cssText = 'position:fixed;left:0;top:0;width:' + d.W + 'px;height:' + d.H + 'px;pointer-events:none;z-index:58;perspective:' + Math.round(d.H * 1.15) + 'px;perspective-origin:' + px.toFixed(1) + 'px ' + (gy - hz).toFixed(1) + 'px';
    var grp = document.createElement('div');
    grp.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;transform-origin:' + px.toFixed(1) + 'px ' + gy.toFixed(1) + 'px';
    wrap.appendChild(grp); add(wrap);
    B.forEach(function (b) { grp.appendChild(b.el); }); if (t.dress) grp.appendChild(t.dress);
    grp.animate([
      { transform: 'rotateX(0deg)', offset: 0, easing: 'cubic-bezier(.42,0,.92,.5)' },
      { transform: 'rotateX(87deg)', offset: .74, easing: 'cubic-bezier(.2,.6,.4,1)' },
      { transform: 'rotateX(79deg)', offset: .86, easing: 'cubic-bezier(.5,0,.9,.6)' },
      { transform: 'rotateX(87deg)', offset: 1 }
    ], { duration: ms, fill: 'forwards' });
    setTimeout(function () {
      tossArms(t.armMeta, grp, gy, 0);
      B.forEach(function (b, i) {
        var r = b.el.getBoundingClientRect(), x = r.left + r.width / 2, y = SY(r.top + r.height / 2);
        setTimeout(function () { powder(x, y, b.r * 1.25, gy - 2, 0); spray(x, y, b.r * .8, 10); }, i * 50);
      });
      spray(px, gy - base.r * .2, base.r * 1.4);
      drift(px, gy, base.r * 4.4, base.r * .78, 60, lifeMs(), t.scene);
      try { grp.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, delay: 90, fill: 'forwards' }); } catch (e) {}
      setTimeout(function () { wrap.remove(); }, 420);
      fadeOut(t.shadow, 700);
      setTimeout(function () { fadeOut(t.skirt, 2400); }, lifeMs());
      fallen();
    }, hit);
  }
  /* a ball that has come off rolls along the ground (it turns as far as it travels) and breaks into snow where it stops */
  function rollBall(b, x0, y0, rot0, dir, gy, delay, scene) {
    var yg = gy - b.r * .86, dist = b.r * (1.5 + Math.random() * .7) + 50, x2 = x0 + dir * dist;
    x2 = Math.max(b.r * .55, Math.min(VW - b.r * .55, x2));
    var x1 = x0 + (x2 - x0) * .3, r1 = rot0 + (x1 - x0) / b.r, r2 = rot0 + (x2 - x0) / b.r;
    b.el.style.transition = 'none';
    var an = b.el.animate([
      { transform: tf(b.r, x0, y0, rot0), offset: 0, easing: 'cubic-bezier(.5,0,.9,.6)' },
      { transform: tf(b.r, x1, yg, r1, 1.04, .94), offset: .3, easing: 'cubic-bezier(.3,.8,.5,1)' },
      { transform: tf(b.r, x1 + (x2 - x1) * .08, yg, r1 + (r2 - r1) * .08), offset: .36, easing: 'cubic-bezier(.25,.65,.45,1)' },
      { transform: tf(b.r, x2, yg, r2), offset: 1 }
    ], { duration: 1150 + b.r * 2.2, delay: delay, fill: 'forwards' });
    an.onfinish = function () { burst(x2, yg, b.r, gy, dir, scene); fadeOut(b.el, 160); };
  }
  /* a swipe to the side: it tips over that way (no wobbling) and the balls roll on along the ground */
  function rollSide(dir) {
    var t = detach(), B = t.balls; if (!B.length) return;
    var base = B[0], gy = t.gy, pvx = base.x + dir * base.r * .7, TH = 68;
    var grp = document.createElement('div');
    grp.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:58;transform-origin:' + pvx.toFixed(1) + 'px ' + gy.toFixed(1) + 'px';
    add(grp); B.forEach(function (b) { grp.appendChild(b.el); }); if (t.dress) grp.appendChild(t.dress);
    var an = grp.animate([{ transform: 'rotate(0deg)', easing: 'cubic-bezier(.45,0,.95,.6)' }, { transform: 'rotate(' + dir * TH + 'deg)' }], { duration: 620, fill: 'forwards' });
    setTimeout(function () { tossArms(t.armMeta, grp, gy, dir); }, 360);
    an.onfinish = function () {
      var th = dir * TH * Math.PI / 180, cs = Math.cos(th), sn = Math.sin(th);
      if (t.dress) { spray(t.balls[B.length - 1].x + dir * base.r, gy - base.r * .6, base.r * .9); fadeOut(t.dress, 160); }
      B.forEach(function (b, i) {
        var dx = b.x - pvx, dy = b.y - gy, x = pvx + dx * cs - dy * sn, y = gy + dx * sn + dy * cs;
        add(b.el);
        rollBall(b, x, y, (b.rot || 0) + th, dir, gy, i * 40, t.scene);
      });
      setTimeout(function () { grp.remove(); }, 260);
      fadeOut(t.shadow, 700);
      setTimeout(function () { fadeOut(t.skirt, 2400); }, lifeMs());
      setTimeout(fallen, 900);
    };
  }
  /* one or two balls (no snowman yet) just roll away */
  function rollAway(dir) {
    var t = detach(), B = t.balls; if (!B.length) return;
    B.forEach(function (b, i) { rollBall(b, b.x, b.y, b.rot || 0, dir, t.gy, (B.length - 1 - i) * 90, t.scene); });
    fadeOut(t.shadow, 900);
    setTimeout(function () { fadeOut(t.skirt, 2400); }, lifeMs());
    setTimeout(fallen, 900);
  }
  function fallen() { if (SCN && !SCN.ending) setTimeout(endScene, 1900); }

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

  /* ---------- the winter scene revealed after the giant snowball ---------- */
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function f1(v) { return Math.round(v * 10) / 10; }
  /* a jagged mountain range with snow caps */
  function range(W, H, yTop, yLow, n, fill, cap) {
    var pts = [], i, o = '', caps = '';
    for (i = 0; i <= n; i++) {
      var x = -W * .06 + i / n * W * 1.12, pk = yTop + Math.random() * (yLow - yTop) * .55;
      pts.push([x, pk]);
      if (i < n) pts.push([x + W * 1.12 / n * (.4 + Math.random() * .2), yLow - Math.random() * (yLow - yTop) * .25]);
    }
    o = 'M' + f1(-W * .06) + ' ' + f1(yLow + H * .2) + pts.map(function (p) { return ' L' + f1(p[0]) + ' ' + f1(p[1]); }).join('') + ' L' + f1(W * 1.06) + ' ' + f1(yLow + H * .2) + 'Z';
    for (i = 0; i < pts.length; i += 2) {
      var p = pts[i], L = pts[i - 1] || [p[0] - W * .08, yLow], R = pts[i + 1] || [p[0] + W * .08, yLow], k = .26 + Math.random() * .1;
      var lx = p[0] + (L[0] - p[0]) * k, ly = p[1] + (L[1] - p[1]) * k, rx = p[0] + (R[0] - p[0]) * k, ry = p[1] + (R[1] - p[1]) * k;
      caps += '<path d="M' + f1(p[0]) + ' ' + f1(p[1]) + ' L' + f1(rx) + ' ' + f1(ry) + ' L' + f1(rx - (rx - p[0]) * .35) + ' ' + f1(ry - (ry - p[1]) * .25 + 3) +
        ' L' + f1(p[0] + (rx - p[0]) * .1) + ' ' + f1(ry + 2) + ' L' + f1(p[0] - (p[0] - lx) * .25) + ' ' + f1(ly - (ly - p[1]) * .3 + 2) + ' L' + f1(lx) + ' ' + f1(ly) + 'Z" fill="' + cap + '"/>';
    }
    return '<path d="' + o + '" fill="' + fill + '"/>' + caps;
  }
  /* little snowy pines along the far hill */
  function pine(x, b, h, c, snow) {
    var w = h * .42, o = '<rect x="' + f1(x - h * .03) + '" y="' + f1(b - h * .12) + '" width="' + f1(h * .06) + '" height="' + f1(h * .12) + '" fill="' + c + '"/>', k;
    for (k = 0; k < 3; k++) {
      var tb = b - h * .1 - k * h * .26, tt = tb - h * .42, hw = w * (1 - k * .25);
      o += '<path d="M' + f1(x) + ' ' + f1(tt) + ' L' + f1(x + hw) + ' ' + f1(tb) + ' L' + f1(x - hw) + ' ' + f1(tb) + 'Z" fill="' + c + '"/>' +
        '<path d="M' + f1(x) + ' ' + f1(tt) + ' L' + f1(x + hw * .42) + ' ' + f1(tt + h * .18) + ' Q' + f1(x) + ' ' + f1(tt + h * .23) + ' ' + f1(x - hw * .42) + ' ' + f1(tt + h * .18) + 'Z" fill="' + snow + '"/>';
    }
    return o;
  }
  /* a log cabin with a thick snowy roof and warm windows (wide screens only) */
  function cabin(cx, b, s, P) {
    var w = s, h = s * .58, x0 = cx - w / 2, rt = b - h, o = '', i;
    o += '<ellipse cx="' + f1(cx) + '" cy="' + f1(b - h * .45) + '" rx="' + f1(w * 1.1) + '" ry="' + f1(h * 1.05) + '" fill="url(#xwg)"/>';
    o += '<rect x="' + f1(x0) + '" y="' + f1(rt) + '" width="' + f1(w) + '" height="' + f1(h) + '" fill="url(#xwd)"/>';
    for (i = 1; i < 6; i++) o += '<path d="M' + f1(x0) + ' ' + f1(rt + h * i / 6) + 'h' + f1(w) + '" stroke="#3b2214" stroke-opacity=".45" stroke-width="1.2"/>';
    var ww = w * .17, wh = h * .34, wy = rt + h * .26;
    [x0 + w * .14, x0 + w * .69].forEach(function (wx) {
      o += '<rect x="' + f1(wx) + '" y="' + f1(wy) + '" width="' + f1(ww) + '" height="' + f1(wh) + '" rx="1.5" fill="' + P.win + '"/>' +
        '<path d="M' + f1(wx + ww / 2) + ' ' + f1(wy) + 'v' + f1(wh) + 'M' + f1(wx) + ' ' + f1(wy + wh / 2) + 'h' + f1(ww) + '" stroke="#5a321b" stroke-width="1.6"/>' +
        '<path d="M' + f1(wx - 2) + ' ' + f1(wy - 1) + 'h' + f1(ww + 4) + '" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>';
    });
    var dw = w * .2, dh = h * .62, dx = cx - dw / 2;
    o += '<rect x="' + f1(dx) + '" y="' + f1(b - dh) + '" width="' + f1(dw) + '" height="' + f1(dh) + '" rx="2" fill="#4a2a17"/>' +
      '<circle cx="' + f1(cx) + '" cy="' + f1(b - dh * .7) + '" r="' + f1(dw * .3) + '" fill="none" stroke="#2f8f4e" stroke-width="' + f1(dw * .14) + '"/><circle cx="' + f1(cx) + '" cy="' + f1(b - dh * .7 + dw * .3) + '" r="' + f1(dw * .07) + '" fill="#e0263b"/>';
    var chx = x0 + w * .74, ry = rt - w * .34;
    o += '<rect x="' + f1(chx) + '" y="' + f1(ry - w * .06) + '" width="' + f1(w * .1) + '" height="' + f1(w * .3) + '" fill="#6b3b2a"/><rect x="' + f1(chx - 2) + '" y="' + f1(ry - w * .09) + '" width="' + f1(w * .1 + 4) + '" height="' + f1(w * .05) + '" rx="3" fill="#fff"/>';
    o += '<path d="M' + f1(x0 - w * .1) + ' ' + f1(rt + 2) + ' L' + f1(cx) + ' ' + f1(ry) + ' L' + f1(x0 + w * 1.1) + ' ' + f1(rt + 2) + 'Z" fill="#3a2418"/>';
    o += '<path d="M' + f1(x0 - w * .14) + ' ' + f1(rt + 4) + ' Q' + f1(x0 - w * .16) + ' ' + f1(rt - 6) + ' ' + f1(x0 - w * .02) + ' ' + f1(rt - 9) + ' L' + f1(cx) + ' ' + f1(ry - 9) + ' L' + f1(x0 + w * 1.02) + ' ' + f1(rt - 9) +
      ' Q' + f1(x0 + w * 1.16) + ' ' + f1(rt - 6) + ' ' + f1(x0 + w * 1.14) + ' ' + f1(rt + 4) + ' Q' + f1(x0 + w * .9) + ' ' + f1(rt + 10) + ' ' + f1(x0 + w * .8) + ' ' + f1(rt + 3) + ' Q' + f1(x0 + w * .65) + ' ' + f1(rt + 13) + ' ' + f1(x0 + w * .5) + ' ' + f1(rt + 4) +
      ' Q' + f1(x0 + w * .3) + ' ' + f1(rt + 11) + ' ' + f1(x0 + w * .16) + ' ' + f1(rt + 4) + ' Q' + f1(x0) + ' ' + f1(rt + 9) + ' ' + f1(x0 - w * .14) + ' ' + f1(rt + 4) + 'Z" fill="url(#xsr)"/>';
    return { svg: o, smoke: [chx + w * .05, ry - w * .1] };
  }
  function scene(d) {
    var W = d.W, H = d.H, gy = Math.round(H * .79), i, g = '', html = '', lights = '', sk = document.createElement('div');
    var light = document.documentElement.classList.contains('xm-light');
    var P = light ? {
      sky: 'linear-gradient(180deg,#3f8ddb 0%,#76b6ee 30%,#b8dbf8 56%,#e6f3ff 72%,#fbfdff 82%)',
      far1: '#a6c2e6', far2: '#86a8d4', cap1: '#ffffff', cap2: '#f4f8fe', hill: '#b2cdeb', forest: '#5f87b4', fsnow: '#f6faff', win: '#ffcf63', glow: .35
    } : {
      sky: 'linear-gradient(180deg,#050a24 0%,#0d1848 26%,#213179 50%,#57599b 66%,#b0849f 77%,#f0bca6 85%)',
      far1: '#3a4a8c', far2: '#283670', cap1: '#dfe8fb', cap2: '#c9d6f1', hill: '#1d2b60', forest: '#121d47', fsnow: '#c3d1ee', win: '#ffc552', glow: .85
    };
    sk.className = 'xm-scene2 xm-tw'; sk.style.background = P.sky;
    var mn = Math.min(W, H);
    if (light) {
      g += '<circle cx="' + f1(W * .82) + '" cy="' + f1(H * .1) + '" r="' + f1(mn * .3) + '" fill="url(#xsun)"/><circle cx="' + f1(W * .82) + '" cy="' + f1(H * .1) + '" r="' + f1(mn * .055) + '" fill="#fffdf0"/>';
    } else {
      for (i = 0; i < 70; i++) g += '<circle cx="' + Math.round(Math.random() * W) + '" cy="' + Math.round(Math.random() * H * .55) + '" r="' + rnd(.4, 1.3).toFixed(1) + '" fill="#fff" opacity="' + rnd(.3, .9).toFixed(2) + '"/>';
      for (i = 0; i < 14; i++) html += '<i class="xs-st" style="left:' + f1(Math.random() * W) + 'px;top:' + f1(Math.random() * H * .5) + 'px;--d:-' + rnd(0, 2.4).toFixed(1) + 's"></i>';
      /* northern lights */
      for (i = 0; i < 3; i++) {
        var ay = H * (.12 + i * .07), aa = H * rnd(.03, .07), th2 = H * rnd(.05, .09);
        g += '<path d="M' + f1(-W * .1) + ' ' + f1(ay + aa) + ' C' + f1(W * .25) + ' ' + f1(ay - aa * 2) + ' ' + f1(W * .55) + ' ' + f1(ay + aa * 2) + ' ' + f1(W * 1.1) + ' ' + f1(ay - aa) +
          ' L' + f1(W * 1.1) + ' ' + f1(ay - aa + th2) + ' C' + f1(W * .55) + ' ' + f1(ay + aa * 2 + th2 * .6) + ' ' + f1(W * .25) + ' ' + f1(ay - aa * 2 + th2 * 1.3) + ' ' + f1(-W * .1) + ' ' + f1(ay + aa + th2) + 'Z" fill="url(#xau' + (i % 2) + ')" opacity="' + (.5 - i * .1).toFixed(2) + '" filter="url(#xab)"/>';
      }
      var mx = W * .8, my = H * .13, mr = mn * .062;
      g += '<circle cx="' + f1(mx) + '" cy="' + f1(my) + '" r="' + f1(mr * 4) + '" fill="url(#xmg)"/><circle cx="' + f1(mx) + '" cy="' + f1(my) + '" r="' + f1(mr) + '" fill="url(#xmo)"/>' +
        '<circle cx="' + f1(mx - mr * .3) + '" cy="' + f1(my - mr * .2) + '" r="' + f1(mr * .18) + '" fill="#d9c995" opacity=".45"/><circle cx="' + f1(mx + mr * .35) + '" cy="' + f1(my + mr * .3) + '" r="' + f1(mr * .12) + '" fill="#d9c995" opacity=".4"/><circle cx="' + f1(mx + mr * .1) + '" cy="' + f1(my - mr * .5) + '" r="' + f1(mr * .08) + '" fill="#d9c995" opacity=".4"/>';
    }
    g += range(W, H, H * .4, H * .62, 6, P.far1, P.cap1);
    g += range(W, H, H * .5, H * .69, 8, P.far2, P.cap2);
    /* the far hill with a pine forest */
    var hy0 = gy - H * .1, hyc = gy - H * .17, hy1 = gy - H * .09, hyc2 = gy - H * .01, hy2 = gy - H * .12;
    function hillY(x) { var t; if (x <= W / 2) { t = x / (W / 2); return (1 - t) * (1 - t) * hy0 + 2 * t * (1 - t) * hyc + t * t * hy1; } t = (x - W / 2) / (W / 2); return (1 - t) * (1 - t) * hy1 + 2 * t * (1 - t) * hyc2 + t * t * hy2; }
    g += '<path d="M0 ' + f1(hy0) + ' Q' + f1(W * .25) + ' ' + f1(hyc) + ' ' + f1(W * .5) + ' ' + f1(hy1) + ' T' + f1(W) + ' ' + f1(hy2) + ' V' + H + ' H0Z" fill="' + P.hill + '"/>';
    for (i = 0; i < 30; i++) { var px = (i + Math.random() * .6) / 30 * W, ph = H * rnd(.035, .065); g += pine(px, hillY(px) + ph * .25, ph, P.forest, P.fsnow); }
    var smoke = null;
    if (W > H * .8) { var cb = cabin(W * .66, hillY(W * .66) + H * .02, Math.min(W * .1, H * .17), P); g += cb.svg; smoke = cb.smoke; }
    g += '<ellipse cx="' + f1(W * .5) + '" cy="' + f1(gy - H * .02) + '" rx="' + f1(W * .75) + '" ry="' + f1(H * .12) + '" fill="url(#xgl)"/>';
    g += '<path d="M0 ' + f1(gy - H * .045) + ' C' + f1(W * .25) + ' ' + f1(gy - H * .1) + ' ' + f1(W * .55) + ' ' + f1(gy - H * .02) + ' ' + f1(W) + ' ' + f1(gy - H * .075) + ' V' + H + ' H0Z" fill="#eaf2fb" opacity=".9"/>';
    var tx = [.04, .13, .23, .82, .92, .985], th = [.36, .27, .21, .23, .35, .25];
    for (i = 0; i < tx.length; i++) {
      var tr = tree(W * tx[i], gy - H * (.012 + (i % 3) * .012), H * th[i]);
      g += tr.svg;
      tr.bulbs.forEach(function (q, n) { lights += '<i class="xtb' + (q[3] ? ' xts' : '') + '" style="left:' + q[0].toFixed(1) + 'px;top:' + q[1].toFixed(1) + 'px;--c:' + q[2] + ';--d:-' + (((n * 37) % 18) / 10).toFixed(1) + 's"></i>'; });
    }
    g += '<path d="M0 ' + gy + ' Q' + f1(W * .2) + ' ' + f1(gy - H * .035) + ' ' + f1(W * .45) + ' ' + f1(gy - H * .005) + ' T' + W + ' ' + f1(gy - H * .02) + ' V' + H + ' H0Z" fill="url(#xgs)"/>';
    for (i = 0; i < 46; i++) { var gx = Math.random() * W, gyy = gy + Math.random() * (H - gy); g += '<circle cx="' + f1(gx) + '" cy="' + f1(gyy) + '" r="' + rnd(.6, 1.5).toFixed(1) + '" fill="#fff" opacity="' + rnd(.6, 1).toFixed(2) + '"/>'; }
    for (i = 0; i < 28; i++) html += '<i class="xs-fl" style="left:' + f1(Math.random() * W) + 'px;--s:' + rnd(2, 5.5).toFixed(1) + 'px;--o:' + rnd(.5, .95).toFixed(2) + ';--t:' + rnd(6, 12).toFixed(1) + 's;--d:-' + rnd(0, 12).toFixed(1) + 's;--dx:' + Math.round(rnd(-40, 40)) + 'px"></i>';
    if (smoke) for (i = 0; i < 3; i++) html += '<i class="xs-smk" style="left:' + f1(smoke[0]) + 'px;top:' + f1(smoke[1]) + 'px;--w:' + f1(mn * .05) + 'px;--d:-' + (i * 1.5) + 's"></i>';
    sk.innerHTML = '<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '"><defs>' +
      '<linearGradient id="xgs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#eaf2fb"/><stop offset="1" stop-color="#cadcf0"/></linearGradient>' +
      '<radialGradient id="xgl"><stop offset="0" stop-color="' + (light ? '#ffffff' : '#bfe3ff') + '" stop-opacity=".55"/><stop offset="1" stop-color="#bfe3ff" stop-opacity="0"/></radialGradient>' +
      '<linearGradient id="xtg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2f8f59"/><stop offset=".5" stop-color="#14573a"/><stop offset="1" stop-color="#082d1e"/></linearGradient>' +
      '<radialGradient id="xsn" cx=".34" cy=".3" r=".85"><stop offset="0" stop-color="#fff"/><stop offset=".5" stop-color="#f0f6fc"/><stop offset=".85" stop-color="#c4d7ed"/><stop offset="1" stop-color="#8aa6c7"/></radialGradient>' +
      '<linearGradient id="xau0" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3cf2b4" stop-opacity="0"/><stop offset=".3" stop-color="#3cf2b4"/><stop offset=".7" stop-color="#5fc8ff"/><stop offset="1" stop-color="#a77bff" stop-opacity="0"/></linearGradient>' +
      '<linearGradient id="xau1" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7cffcf" stop-opacity="0"/><stop offset=".4" stop-color="#41d39a"/><stop offset=".8" stop-color="#2fa7d8"/><stop offset="1" stop-color="#2fa7d8" stop-opacity="0"/></linearGradient>' +
      '<filter id="xab" x="-10%" y="-60%" width="120%" height="220%"><feGaussianBlur stdDeviation="' + f1(mn * .03) + '"/></filter>' +
      '<radialGradient id="xmg"><stop offset="0" stop-color="#fff6d8" stop-opacity=".45"/><stop offset=".35" stop-color="#fff6d8" stop-opacity=".12"/><stop offset="1" stop-color="#fff6d8" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="xmo" cx=".4" cy=".38" r=".7"><stop offset="0" stop-color="#fffdf2"/><stop offset=".7" stop-color="#f6ecc6"/><stop offset="1" stop-color="#e8d9a6"/></radialGradient>' +
      '<radialGradient id="xsun"><stop offset="0" stop-color="#fffbe6" stop-opacity=".95"/><stop offset=".25" stop-color="#fff6cf" stop-opacity=".45"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="xwg"><stop offset="0" stop-color="#ffc552" stop-opacity="' + P.glow * .45 + '"/><stop offset="1" stop-color="#ffc552" stop-opacity="0"/></radialGradient>' +
      '<linearGradient id="xwd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a5532"/><stop offset="1" stop-color="#5e3520"/></linearGradient>' +
      '<linearGradient id="xsr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#dfe9f6"/></linearGradient>' +
      '</defs>' + g + '</svg>' + html + lights;
    document.body.appendChild(sk);
    return {
      el: sk, gy: gy,
      /* Santa and the greeting: added when the wind starts */
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
    var el = document.createElement('div'); el.className = 'xm-ball'; el.style.zIndex = 58;
    if (BALL) el.style.backgroundImage = 'url(' + BALL + ')';
    add(el);
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
    tower.gy = gy; tower.scene = true;
    tower.shadow = mkShadow(x, gy, r0); tower.skirt = mkSkirt(x, y0, r0);
    var mine = tower;
    [[0, y0, r0], [550, y1, r1], [1100, y2, r2]].forEach(function (q) {
      setTimeout(function () {
        if (tower !== mine) return;
        var b = mkBall(x, q[1], q[2]); pop(b); tower.balls.push({ el: b.el, x: b.x, y: b.y, r: b.r, rot: 0 }); spray(b.x, b.y + b.r * .8, b.r * .8);
        if (tower.balls.length === 3) { setTimeout(dress, 450); clearTimeout(tower.timer); tower.timer = setTimeout(fallBack, 8200); }
      }, q[0]);
    });
  }
  /* everything from the scene leaves at the same moment: sky, greeting, the fallen snowman's snow and twigs */
  function endScene() {
    if (!SCN || SCN.ending) return;
    var s = SCN, ms = 1800, keep = [];
    s.ending = 1; clearTimeout(s.safety);
    if (tower.scene) { var t = detach(); t.balls.forEach(function (b) { fadeOut(b.el, ms); }); fadeOut(t.dress, ms); fadeOut(t.skirt, ms); fadeOut(t.shadow, ms); }
    tower.balls.forEach(function (b) { keep.push(b.el); }); keep.push(tower.skirt, tower.shadow, tower.dress); if (cur) keep.push(cur.el);
    [].slice.call(stage().children).forEach(function (el) { if (keep.indexOf(el) < 0) fadeOut(el, ms); });
    fadeOut(s.el, ms); fadeOut(s.gr || s.el.__gr, ms);
    document.body.classList.remove('xm-busy');
    setTimeout(function () { if (SCN === s) SCN = null; }, ms + 100);
  }

  /* streaks of wind sweeping across the screen */
  function gust(d) {
    var W = d.W, H = d.H, n = 12, i, p = '';
    for (i = 0; i < n; i++) {
      var y = H * (.03 + .94 * i / (n - 1)) + (Math.random() - .5) * 20, a = 24 + Math.random() * 40, sw = 1.2 + Math.random() * 2.4;
      p += '<path class="gst" pathLength="1" style="animation-delay:' + (i * 150 + Math.random() * 120).toFixed(0) + 'ms;animation-duration:' + (1100 + Math.random() * 700).toFixed(0) + 'ms" stroke-width="' + sw.toFixed(1) + '" stroke-opacity="' + (.5 + Math.random() * .4).toFixed(2) + '" d="M' + (-W * .05) + ' ' + y +
        ' C' + (W * .18) + ' ' + (y - a) + ',' + (W * .3) + ' ' + (y + a) + ',' + (W * .46) + ' ' + (y - a * .2) + ' S' + (W * .66) + ' ' + (y - a * 1.2) + ',' + (W * .8) + ' ' + (y + a * .3) + ' S' + (W * .96) + ' ' + (y - a) + ',' + (W * 1.08) + ' ' + y + '"/>';
    }
    var el = document.createElement('div'); el.className = 'xm-gust';
    el.innerHTML = '<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" fill="none" stroke="#fff" stroke-linecap="round">' + p + '</svg>';
    document.body.appendChild(el); setTimeout(function () { el.remove(); }, 3800);
  }

  /* ---------- the giant ball hits the screen ---------- */
  /* the snow stuck on the glass: an uneven, lumpy white layer; where the ball hit, a thick splat of packed snow
     with chunks thrown outwards. Every lump has light on the top-left and a cool shadow bottom-right, so it looks 3D */
  function makeCover(W, H) {
    var dpr = Math.min(1.5, window.devicePixelRatio || 1), C = document.createElement('canvas'), i;
    C.width = Math.round(W * dpr); C.height = Math.round(H * dpr); C.className = 'xm-cvs'; C.style.zIndex = 59; C.style.width = W + 'px'; C.style.height = H + 'px';
    var x = C.getContext('2d'); x.scale(dpr, dpr);
    var ix = W / 2, iy = H * .45, M = Math.min(W, H), R = Math.hypot(W, H);
    function lump(cx, cy, rx, ry, rot, a) {
      x.save(); x.translate(cx, cy); x.rotate(rot); x.scale(1, ry / rx);
      var sg = x.createRadialGradient(rx * .22, rx * .3, 0, rx * .22, rx * .3, rx * 1.2);
      sg.addColorStop(0, 'rgba(105,135,182,' + (.2 * a).toFixed(3) + ')'); sg.addColorStop(.65, 'rgba(105,135,182,' + (.08 * a).toFixed(3) + ')'); sg.addColorStop(1, 'rgba(105,135,182,0)');
      x.fillStyle = sg; x.fillRect(-rx * 1.1, -rx * 1.1, rx * 2.6, rx * 2.6);
      var g = x.createRadialGradient(-rx * .35, -rx * .4, 0, 0, 0, rx);
      g.addColorStop(0, 'rgba(255,255,255,' + a + ')'); g.addColorStop(.6, 'rgba(248,251,255,' + (a * .95).toFixed(3) + ')'); g.addColorStop(.86, 'rgba(228,237,248,' + (a * .6).toFixed(3) + ')'); g.addColorStop(1, 'rgba(228,237,248,0)');
      x.fillStyle = g; x.beginPath(); x.arc(0, 0, rx, 0, 6.2832); x.fill(); x.restore();
    }
    function hash(k, sd) { var v = Math.sin(k * 12.9898 + sd * 78.233) * 43758.5453; return v - Math.floor(v); }
    function blob(cx, cy, r, sd) {
      var pts = [], n = 44, k;
      for (k = 0; k < n; k++) {
        var an = k / n * 6.2832, rr = r * (1 + .08 * Math.sin(an * 2 + sd) + .05 * Math.sin(an * 5 + sd * 2) + (hash(k, sd) - .5) * .07);
        if (hash(k + 50, sd) < .1) rr *= 1.07;
        pts.push([cx + Math.cos(an) * rr, cy + Math.sin(an) * rr]);
      }
      x.beginPath();
      for (k = 0; k <= n; k++) { var p0 = pts[k % n], p1 = pts[(k + 1) % n], mx = (p0[0] + p1[0]) / 2, my = (p0[1] + p1[1]) / 2; if (k === 0) x.moveTo(mx, my); else x.quadraticCurveTo(p0[0], p0[1], mx, my); }
      x.closePath();
    }
    var g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#f9fbfe'); g.addColorStop(.55, '#eff4fa'); g.addColorStop(1, '#e4ecf7');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    /* gentle unevenness over the whole layer */
    var nl = Math.round(W * H / 5000);
    for (i = 0; i < nl; i++) { var r = M * (.06 + Math.random() * .12); lump(Math.random() * W, Math.random() * H, r, r * (.7 + Math.random() * .3), Math.random() * 3, .45); }
    /* chunks thrown out from the hit, stretched along their flight */
    for (i = 0; i < 26; i++) {
      var an = Math.random() * 6.2832, dd = M * (.32 + Math.random() * .4), rr = M * (.028 + Math.random() * .045);
      lump(ix + Math.cos(an) * dd, iy + Math.sin(an) * dd * 1.1, rr * (1.6 + Math.random()), rr, an, .95);
    }
    for (i = 0; i < 46; i++) { var a2 = Math.random() * 6.2832, d2 = M * (.45 + Math.random() * .55), r2 = M * (.008 + Math.random() * .014); lump(ix + Math.cos(a2) * d2, iy + Math.sin(a2) * d2, r2 * 1.5, r2, a2, 1); }
    /* the splat: a thick pad of packed snow with a soft shadow under its rim and a bumpy top */
    var sr = M * .27, seed = Math.random() * 6;
    for (i = 4; i >= 0; i--) { blob(ix + M * .02, iy + M * .03, sr * (1 + i * .035), seed); x.fillStyle = 'rgba(100,130,178,.06)'; x.fill(); }
    blob(ix, iy, sr, seed);
    var bg = x.createRadialGradient(ix - sr * .3, iy - sr * .35, sr * .1, ix, iy, sr * 1.15);
    bg.addColorStop(0, '#ffffff'); bg.addColorStop(.62, '#f7fafd'); bg.addColorStop(1, '#dbe6f4');
    x.fillStyle = bg; x.fill();
    x.save(); blob(ix, iy, sr * .97, seed); x.clip();
    for (i = 0; i < 46; i++) { var ra = Math.random() * 6.2832, rd = Math.sqrt(Math.random()) * sr * .9, lr = M * (.03 + Math.random() * .05); lump(ix + Math.cos(ra) * rd, iy + Math.sin(ra) * rd, lr, lr * (.8 + Math.random() * .2), ra, .75); }
    x.restore();
    /* fine grain and a little glitter */
    var n = Math.min(9000, Math.round(W * H / 40));
    for (i = 0; i < n; i++) {
      var dk = Math.random() < .3, s = .6 + Math.random() * 1.1;
      x.fillStyle = dk ? 'rgba(120,150,196,' + (.05 + Math.random() * .1).toFixed(3) + ')' : 'rgba(255,255,255,' + (.6 + Math.random() * .4).toFixed(2) + ')';
      x.fillRect(Math.random() * W, Math.random() * H, s, s);
    }
    x.fillStyle = 'rgba(255,255,255,.95)';
    for (i = 0; i < 60; i++) { var gx = Math.random() * W, gy2 = Math.random() * H; x.fillRect(gx - 1.6, gy2 - .3, 3.2, .6); x.fillRect(gx - .3, gy2 - 1.6, .6, 3.2); }
    return { C: C, ctx: x, W: W, H: H };
  }
  /* the wind lifts the snow off the glass in small cells, in a wave from the top-left; each one speeds up,
     stretches and fades as it is carried away, so the cover erodes like real snow */
  function erode(cv, onDone) {
    var W = cv.W, H = cv.H, cx = cv.ctx, cs = Math.max(14, Math.round(Math.min(W, H) / 24)), cols = Math.ceil(W / cs), rows = Math.ceil(H / cs), i, j;
    var F = document.createElement('canvas'); F.width = W; F.height = H; F.className = 'xm-cvs'; F.style.zIndex = 60; document.body.appendChild(F);
    var fx = F.getContext('2d'), spr = document.createElement('canvas'); spr.width = spr.height = 48;
    var sx = spr.getContext('2d'), sg = sx.createRadialGradient(24, 24, 1, 24, 24, 24);
    sg.addColorStop(0, 'rgba(255,255,255,1)'); sg.addColorStop(.55, 'rgba(250,252,255,.8)'); sg.addColorStop(1, 'rgba(240,247,255,0)'); sx.fillStyle = sg; sx.fillRect(0, 0, 48, 48);
    /* the hole each cell leaves: solid in the middle, so neighbouring holes join cleanly without rings in between */
    var hole = document.createElement('canvas'); hole.width = hole.height = 48;
    var hx = hole.getContext('2d'), hg = hx.createRadialGradient(24, 24, 1, 24, 24, 24);
    hg.addColorStop(0, 'rgba(0,0,0,1)'); hg.addColorStop(.62, 'rgba(0,0,0,1)'); hg.addColorStop(1, 'rgba(0,0,0,0)'); hx.fillStyle = hg; hx.fillRect(0, 0, 48, 48);
    var cells = [];
    for (j = 0; j < rows; j++) for (i = 0; i < cols; i++) {
      var x = i * cs + cs / 2, y = j * cs + cs / 2;
      cells.push({ x: x, y: y, s: (y / H) * 2300 + (x / W) * 550 + Math.sin(y * .018 + x * .01) * 120 + Math.random() * 110,
        vx: 30 + Math.random() * 70, ax: 1500 + Math.random() * 1100, vy: (Math.random() - .5) * 70, gy: 40 + Math.random() * 90, L: 1 + Math.random() * .9,
        z: 1.8 + Math.random() * .8, ph: Math.random() * 6.28, on: 0, dead: 0 });
    }
    var left = cells.length, T0 = performance.now();
    (function frame(now) {
      var t = now - T0, k;
      fx.clearRect(0, 0, W, H);
      cx.globalCompositeOperation = 'destination-out';
      for (k = 0; k < cells.length; k++) {
        var c = cells[k]; if (c.dead) continue;
        if (!c.on) { if (t < c.s) continue; c.on = 1; var rr = cs * 1.05; cx.drawImage(hole, c.x - rr, c.y - rr, rr * 2, rr * 2); }
        var dt = (t - c.s) / 1000;
        if (dt > c.L) { c.dead = 1; left--; continue; }
        var u = dt / c.L, px = c.x + c.vx * dt + .5 * c.ax * dt * dt, py = c.y + c.vy * dt + c.gy * dt * dt + Math.sin(dt * 7 + c.ph) * 3,
          sz = cs * c.z * (1 - .4 * u), spd = c.vx + c.ax * dt, st = 1 + Math.min(2.6, spd / 520);
        if (px - sz * st > W) { c.dead = 1; left--; continue; }
        fx.globalAlpha = Math.max(0, 1 - u * u * u);
        fx.drawImage(spr, px - sz * st / 2, py - sz * .4, sz * st, sz * .8);
      }
      cx.globalCompositeOperation = 'source-over'; fx.globalAlpha = 1;
      if (left > 0) requestAnimationFrame(frame); else { cv.C.remove(); F.remove(); if (onDone) onDone(); }
    })(performance.now());
  }
  /* the giant ball: it pulls back for a split second, then rushes at you and smashes into the screen */
  function bury(b) {
    var d = dims(); busy = true; document.body.classList.add('xm-busy');
    b.el.classList.remove('held'); b.el.style.transition = 'none';
    var cv = (PREP && PREP.W === VW && PREP.H === VH) ? PREP : makeCover(VW, VH); PREP = null;
    var R = Math.hypot(VW, VH) * .62, tx = VW / 2, ty = SY(VH * .45), rot = b.rot || 0;
    b.el.style.zIndex = 61;
    b.el.animate([
      { transform: tf(b.r, b.x, b.y, rot), offset: 0, easing: 'cubic-bezier(.3,.7,.5,1)' },
      { transform: tf(b.r * .86, b.x + (tx - b.x) * .1, b.y + (ty - b.y) * .1, rot - .12), offset: .28, easing: 'cubic-bezier(.62,0,.98,.4)' },
      { transform: tf(R, tx, ty, rot + .8), offset: 1 }
    ], { duration: 620, fill: 'forwards' }).onfinish = function () { impact(b, cv, d); };
  }
  function impact(b, cv, d) {
    document.body.appendChild(cv.C);
    b.el.remove(); live = Math.max(0, live - 1);
    cv.C.animate([
      { transform: 'translate(0,0) scale(1.035)' }, { transform: 'translate(-10px,7px) scale(1.02)', offset: .18 }, { transform: 'translate(8px,-6px)', offset: .38 },
      { transform: 'translate(-5px,3px)', offset: .58 }, { transform: 'translate(2px,-1px)', offset: .8 }, { transform: 'translate(0,0) scale(1)' }
    ], { duration: 460, easing: 'ease-out' });
    clearTower(true);
    setTimeout(function () {
      rebase();
      var sc = scene(dims());
      SCN = { el: sc.el, gy: sc.gy, ending: 0, gr: null };
      setTimeout(function () {
        gust(dims()); sc.extras(); SCN.gr = sc.el.__gr;
        setTimeout(function () { if (SCN && !SCN.ending) sceneMan(dims(), sc.gy); }, 1700);
        SCN.safety = setTimeout(endScene, 18000);
        erode(cv, function () { busy = false; });
      }, 1000);
    }, 60);
  }

  /* ---------- touch / mouse ---------- */
  function idle(fn) { if (window.requestIdleCallback) requestIdleCallback(fn, { timeout: 600 }); else setTimeout(fn, 30); }
  function start(e) {
    if (!tower.balls.length && !SCN) rebase();
    var b = cur = newBall(e.clientX, SY(e.clientY)); b.id = e.pointerId; b.t0 = performance.now();
    document.body.classList.add('xm-hold');
    (function grow(t) {
      if (cur !== b) return;
      var d = dims(), k = Math.min(1, (t - b.t0) / GROW), Rb = d.Rbury;
      b.k = k;
      b.r = k < .6 ? 8 + (Rb - 8) * Math.pow(k / .6, .9) : Rb + (d.Rmax - Rb) * ((k - .6) / .4);
      var nx = b.x + (b.tx - b.x) * .22, ny = b.y + (b.ty - b.y) * .22;
      b.vx = nx - b.x; b.x = nx; b.y = ny; b.rot += b.vx * .012 / Math.max(.35, b.r / 80);
      place(b);
      /* loose snow is pulled in from around the ball: it visibly gathers into the growing snowball */
      if (t - (b.lf || 0) > 70 && b.r > 14) {
        b.lf = t;
        var an = Math.random() * 6.2832, d0 = b.r * (1.25 + Math.random() * .9), sz = 2.5 + Math.random() * Math.min(7, b.r / 14);
        var sx = b.x + Math.cos(an) * d0, sy = b.y + Math.sin(an) * d0 - b.r * .3, ex = b.x + Math.cos(an) * b.r * .85, ey = b.y + Math.sin(an) * b.r * .85;
        var q = bit('xm-bit', sx, sy, sz, sz);
        q.animate([{ transform: T(sx - sz / 2, sy - sz / 2, 1), opacity: 0 }, { opacity: 1, offset: .25 }, { transform: T(ex - sz / 2, ey - sz / 2, .5), opacity: .9 }],
          { duration: 420 + Math.random() * 260, easing: 'ease-in', fill: 'forwards' }).onfinish = (function (q) { return function () { q.remove(); }; })(q);
      }
      /* get the snow for the screen ready in a quiet moment, before a giant ball is let go */
      if (k > .5 && !b.prep && !PREP) { b.prep = 1; idle(function () { if (!PREP) PREP = makeCover(VW, VH); }); }
      requestAnimationFrame(grow);
    })(performance.now());
  }
  /* knock it over: a tap sends it over backwards, a swipe left or right tips it that way and it rolls */
  function hitTower(x, y) { return tower.balls.some(function (t) { return Math.hypot(x - t.x, y - t.y) < t.r * 1.05; }); }
  function push(dir) { if (!tower.balls.length) return; if (tower.dress) rollSide(dir); else rollAway(dir); }
  document.addEventListener('pointerdown', function (e) {
    if (knock || cur || pend || !e.isPrimary || !tower.balls.length || !document.body.classList.contains('tpl-index')) return;
    if (busy && !SCN) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (e.target.closest && e.target.closest(SKIP)) return;
    if (hitTower(e.clientX, SY(e.clientY))) { knock = { id: e.pointerId, x: e.clientX, y: e.clientY, done: 0 }; document.body.classList.add('xm-knock'); }
  }, { passive: true });
  document.addEventListener('pointermove', function (e) {
    if (!knock || e.pointerId !== knock.id || knock.done) return;
    var dx = e.clientX - knock.x;
    if (Math.abs(dx) > 14) { knock.done = 1; push(dx > 0 ? 1 : -1); }
  }, { passive: true });
  function knockEnd(e) {
    if (!knock || e.pointerId !== knock.id) return;
    var k = knock; knock = null; document.body.classList.remove('xm-knock');
    if (!k.done && e.type === 'pointerup' && tower.balls.length) fallBack();
  }
  document.addEventListener('pointerup', knockEnd, { passive: true });
  document.addEventListener('pointercancel', knockEnd, { passive: true });
  document.addEventListener('pointerdown', function (e) {
    if (cur || pend || !e.isPrimary || !ok(e)) return;
    var q = pend = { id: e.pointerId, x: e.clientX, y: e.clientY };
    q.tm = setTimeout(function () { if (pend === q) { pend = null; start({ clientX: q.x, clientY: q.y, pointerId: q.id }); } }, 140);
  }, { passive: true });
  document.addEventListener('pointermove', function (e) {
    if (pend && e.pointerId === pend.id && Math.hypot(e.clientX - pend.x, e.clientY - pend.y) > 10) { clearTimeout(pend.tm); pend = null; }
    if (!cur || e.pointerId !== cur.id) return;
    cur.tx = e.clientX; cur.ty = SY(e.clientY);
  }, { passive: true });
  document.addEventListener('touchmove', function (e) { if ((cur || knock) && e.cancelable) e.preventDefault(); }, { passive: false });
  function end(e) {
    if (pend && e.pointerId === pend.id) { clearTimeout(pend.tm); pend = null; }
    if (!cur || e.pointerId !== cur.id) return;
    var b = cur; cur = null; document.body.classList.remove('xm-hold');
    if (b.r < 12) { b.el.remove(); live--; return; }
    if ((b.k || 0) >= .6) bury(b); else drop(b);
  }
  document.addEventListener('pointerup', end, { passive: true });
  document.addEventListener('pointercancel', end, { passive: true });
  document.addEventListener('contextmenu', function (e) { if (cur || pend || knock) e.preventDefault(); });
  document.addEventListener('dragstart', function (e) { if (cur || pend || knock) e.preventDefault(); });
  /* safety net: a ball that got stranded on the screen (finger lifted outside the page, app switched, ...) is removed */
  function sweep() {
    var keep = tower.balls.map(function (t) { return t.el; }), n = 0;
    if (cur) keep.push(cur.el);
    [].forEach.call(document.querySelectorAll('.xm-ball.held'), function (el) {
      if (keep.indexOf(el) > -1) return;
      if (!cur && !pend && Date.now() - (el.__t || 0) > 400) { el.remove(); return; }
      n++;
    });
    live = n + (cur ? 1 : 0) + (busy && !SCN ? 1 : 0);
  }
  setInterval(sweep, 1200);
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
