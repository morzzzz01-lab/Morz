/* Christmas jukebox: plays the shop's YouTube playlist (full songs, official embed).
   The play order is re-shuffled every day (seeded by the visitor's local date), so every day starts differently. */
(function () {
  'use strict';
  var fab = document.getElementById('MxFab'), panel = document.getElementById('MxPanel');
  if (!fab || !panel) return;
  /* put the music button in the header menu, right after the last link (Contact) */
  var nav = document.querySelector('header.top nav.main');
  if (nav) { fab.classList.add('mx-fab--nav'); nav.appendChild(fab); }
  var PLAYLIST = 'PLs_BtJUr-PzQQLWIg82WdIOyYs0An9jzi';
  var q = function (s) { return panel.querySelector(s); };
  var elTitle = q('[data-mx-title]'), elArtist = q('[data-mx-artist]'), elPlay = q('[data-mx-icon]'),
      elProg = q('[data-mx-prog]'), elDate = q('[data-mx-date]'), elList = q('[data-mx-list]');
  var ICON_PLAY = '<path d="M7 4v16l13-8z"/>', ICON_PAUSE = '<path d="M6 4h4v16H6zM14 4h4v16h-4z"/>';
  var now = new Date(), player = null, ready = false, started = false, ids = [], wantPlay = false, userPaused = false, wasPlaying = false;
  try { elDate.textContent = now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }); } catch (e) {}

  function rng(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function dailyOrder(list) {
    var r = rng(now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate()), a = list.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  /* Fixed play order: these songs always come first, in this order; every other playlist song follows in playlist order */
  var PRIORITY = ['all i want for christmas', 'last christmas', 'snowman', 'underneath the tree', 'santa tell me', 'mistletoe'];
  var TITLES = {};
  function priorityOrder(list) {
    var out = [], used = {};
    PRIORITY.forEach(function (k) {
      for (var i = 0; i < list.length; i++) {
        var t = (TITLES[list[i]] || '').toLowerCase();
        if (!used[list[i]] && t.indexOf(k) > -1) { used[list[i]] = 1; out.push(list[i]); break; }
      }
    });
    list.forEach(function (id) { if (!used[id]) out.push(id); });
    return out;
  }
  function fetchTitle(id) {
    return new Promise(function (res) {
      var u = 'https://www.youtube.com/watch?v=' + id;
      var set = function (d) { if (d && d.title) TITLES[id] = d.title; res(); };
      fetch('https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent(u)).then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(set)
        .catch(function () { return fetch('https://noembed.com/embed?url=' + encodeURIComponent(u)).then(function (r) { return r.json(); }).then(set); })
        .catch(function () { res(); });
    });
  }
  function clean(t) { return (t || '').replace(/\s*[\(\[](official|lyric|audio|video|visuali|hd|4k)[^\)\]]*[\)\]]/gi, '').trim(); }
  function setIcon(p) { elPlay.innerHTML = p ? ICON_PAUSE : ICON_PLAY; fab.classList.toggle('on', p); }
  function info() {
    if (!player || !player.getVideoData) return;
    var d = player.getVideoData() || {};
    var cur = player.getPlaylistIndex ? player.getPlaylistIndex() : -1;
    var li = elList.children[cur], fixed = li && li.getAttribute('data-name');
    elTitle.textContent = fixed || clean(d.title || '');
    elArtist.textContent = '';
    [].forEach.call(elList.children, function (li, n) { li.classList.toggle('cur', n === cur); });
  }
  /* ---- lyrics: the words of the song that is playing, in time with it (synced lyrics from lrclib.net) ----
     shown as a soft karaoke line at the bottom of the screen: the line being sung fills in, the next one waits below */
  var LY = { id: null, lines: null, idx: -2, on: true, raw: -1, base: 0, at: 0, raf: 0, playing: false };
  try { LY.on = localStorage.getItem('morz_lyrics') !== 'off'; } catch (e) {}
  var lyBtn = q('[data-mx-lyr]'), lyLabel = lyBtn ? lyBtn.getAttribute('title') : 'Lyrics';
  var lyBox = document.createElement('div');
  lyBox.className = 'mx-lyr'; lyBox.setAttribute('aria-hidden', 'true');
  lyBox.innerHTML = '<div class="mx-lyr-in"></div><button type="button" class="mx-lyr-x" tabindex="-1">&times;</button>';
  document.body.appendChild(lyBox);
  var lyIn = lyBox.firstChild, lyCur = null, lyNext = null;
  function lySetBtn() { if (lyBtn) lyBtn.setAttribute('aria-pressed', LY.on ? 'true' : 'false'); }
  lySetBtn();
  function lyToggle(on) {
    LY.on = on; lySetBtn();
    try { localStorage.setItem('morz_lyrics', on ? 'on' : 'off'); } catch (e) {}
    lyShow(); if (on) lyLoop();
  }
  if (lyBtn) lyBtn.addEventListener('click', function () { lyToggle(!LY.on); });
  lyBox.lastChild.setAttribute('aria-label', lyLabel);
  lyBox.lastChild.addEventListener('click', function () { lyToggle(false); });
  function lyShow() {
    var muted = false; try { muted = player && player.isMuted && player.isMuted(); } catch (e) {}
    var vis = !!(LY.on && LY.playing && !muted && LY.lines && LY.lines.length && !document.documentElement.classList.contains('intro-on'));
    if (vis !== lyBox.classList.contains('on')) lyBox.classList.toggle('on', vis);
  }
  function lyParse(txt) {
    var out = [];
    (txt || '').split(/\r?\n/).forEach(function (row) {
      var tags = row.match(/\[\d+:\d+(?:[.:]\d+)?\]/g); if (!tags) return;
      var words = row.replace(/\[[^\]]*\]/g, '').trim();
      tags.forEach(function (tg) { var m = tg.match(/\[(\d+):(\d+)(?:[.:](\d+))?\]/); out.push({ t: +m[1] * 60 + +m[2] + (m[3] ? +('0.' + m[3]) : 0), s: words }); });
    });
    out.sort(function (a, b) { return a.t - b.t; });
    return out;
  }
  function norm(t) { return (t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); }
  function lyQuery(title, author) {
    var t = (title || '').replace(/[\(\[][^\)\]]*[\)\]]/g, ' ').replace(/\s(ft|feat|featuring)\.?\s.*$/i, '').replace(/\|.*$/, '').replace(/["“”]/g, '').replace(/\s+/g, ' ').trim();
    var a = (author || '').replace(/vevo$/i, '').replace(/\s*-\s*topic$/i, '').trim(), artist = '', track = t;
    var parts = t.split(/\s[-–—]\s/);
    if (parts.length > 1) { artist = parts[0].trim(); track = parts.slice(1).join(' ').trim(); } else artist = a;
    return { artist: artist, track: track };
  }
  function lyFetch(id, title, author, dur) {
    var key = 'morz_lyr_' + id;
    try { var c = sessionStorage.getItem(key); if (c) return Promise.resolve(JSON.parse(c)); } catch (e) {}
    var Q = lyQuery(title, author), nt = norm(Q.track), na = norm(Q.artist);
    function pick(list) {
      var best = null, bs = 1e9;
      (list || []).forEach(function (r) {
        if (!r || !r.syncedLyrics || r.instrumental) return;
        var tn = norm(r.trackName), an = norm(r.artistName);
        var tm = nt && (tn === nt || tn.indexOf(nt) > -1 || nt.indexOf(tn) > -1), am = !na || an.indexOf(na) > -1 || na.indexOf(an) > -1;
        var dd = dur > 0 && r.duration ? Math.abs(r.duration - dur) : 6;
        if (dd > 15) return;
        var sc = dd + (tm ? 0 : 25) + (am ? 0 : 6);
        if (sc < bs) { bs = sc; best = r; }
      });
      return best && bs < 40 ? lyParse(best.syncedLyrics) : null;
    }
    function get(u) { return fetch(u).then(function (r) { if (!r.ok) throw 0; return r.json(); }); }
    var base = 'https://lrclib.net/api/search?';
    return get(base + 'q=' + encodeURIComponent((Q.artist + ' ' + Q.track).trim())).then(pick).catch(function () { return null; })
      .then(function (res) { return res || get(base + 'track_name=' + encodeURIComponent(Q.track)).then(pick).catch(function () { return null; }); })
      .then(function (res) { try { sessionStorage.setItem(key, JSON.stringify(res || [])); } catch (e) {} return res || []; });
  }
  function lyLoad() {
    if (!player || !player.getVideoData) return;
    var d = player.getVideoData() || {}, id = d.video_id;
    if (!id || id === LY.id) return;
    LY.id = id; LY.lines = null; LY.idx = -2; lyIn.innerHTML = ''; lyCur = lyNext = null; lyShow();
    var cur = player.getPlaylistIndex ? player.getPlaylistIndex() : -1, li = elList.children[cur];
    var title = (li && li.getAttribute('data-name')) || TITLES[id] || clean(d.title || ''), dur = 0;
    try { dur = player.getDuration() || 0; } catch (e) {}
    lyFetch(id, title, d.author || '', dur).then(function (lines) {
      if (LY.id !== id) return;
      LY.lines = lines && lines.length ? lines : null; LY.idx = -2; lyShow(); lyLoop();
    });
  }
  function lyLine(txt, cls) {
    var p = document.createElement('p'), bx = document.createElement('span'), sp = document.createElement('span'); p.className = 'mx-ly ' + cls;
    sp.textContent = txt || '\u266A \u266A';
    if (!txt) p.classList.add('mx-ly-note');
    bx.appendChild(sp); p.appendChild(bx); lyIn.appendChild(p); return p;
  }
  /* move to line i: the sung line slides up and fades out, the waiting line moves up into place, a new one fades in below */
  function lyGo(i) {
    var L = LY.lines;
    if (lyCur) { var o = lyCur; o.style.setProperty('--p', '100%'); o.className = o.className.replace(/\bis-cur\b/, 'is-gone'); setTimeout(function () { o.remove(); }, 700); }
    if (lyNext && LY.idx === i - 1) { lyCur = lyNext; lyCur.className = lyCur.className.replace(/\bis-next\b/, 'is-cur'); }
    else { if (lyNext) lyNext.remove(); lyCur = i >= 0 ? lyLine(L[i].s, 'is-cur is-new') : null; if (lyCur) { void lyCur.offsetWidth; lyCur.classList.remove('is-new'); } }
    lyNext = L[i + 1] ? lyLine(L[i + 1].s, 'is-next is-new') : null;
    if (lyNext) { void lyNext.offsetWidth; lyNext.classList.remove('is-new'); }
    LY.idx = i;
  }
  function lyTime() {
    var raw = 0; try { raw = player.getCurrentTime() || 0; } catch (e) {}
    var now = performance.now();
    if (raw !== LY.raw) { LY.raw = raw; LY.base = raw; LY.at = now; }
    return LY.base + Math.min(.6, (now - LY.at) / 1000);
  }
  function lyTick() {
    LY.raf = 0;
    if (!LY.on || !LY.playing || !LY.lines) { lyShow(); return; }
    lyShow();
    var L = LY.lines, t = lyTime() + .15, i = -1, lo = 0, hi = L.length - 1;
    while (lo <= hi) { var m = (lo + hi) >> 1; if (L[m].t <= t) { i = m; lo = m + 1; } else hi = m - 1; }
    if (i !== LY.idx) {
      if (Math.abs(i - LY.idx) > 1) { lyIn.innerHTML = ''; lyCur = lyNext = null; LY.idx = -2; }
      lyGo(i);
    }
    if (lyCur && i >= 0) {
      var st = L[i].t, en = L[i + 1] ? L[i + 1].t : st + 4, len = Math.min(en - st, .6 + (L[i].s || '').length * .075);
      var pr = Math.max(0, Math.min(1, (t - st) / Math.max(.3, len)));
      lyCur.style.setProperty('--p', (pr * 100).toFixed(1) + '%');
    }
    LY.raf = requestAnimationFrame(lyTick);
  }
  function lyLoop() { if (!LY.raf && LY.on && LY.playing && LY.lines) LY.raf = requestAnimationFrame(lyTick); }
  function lyPlaying(p) { LY.playing = p; if (p) { lyLoad(); lyLoop(); } lyShow(); }
  document.addEventListener('visibilitychange', function () { if (document.hidden && LY.raf) { cancelAnimationFrame(LY.raf); LY.raf = 0; } else lyLoop(); });

  function onState(e) {
    var S = window.YT.PlayerState;
    if (e.data === S.PLAYING) { setIcon(true); started = true; info(); lyPlaying(true); }
    else if (e.data === S.PAUSED) { setIcon(false); lyPlaying(false); }
    else if (e.data === S.ENDED) { lyPlaying(false); advance(); }
    else if (e.data === S.CUED) { info(); }
  }
  /* YouTube moves on to the next song by itself; only step in when it did not (stuck/blocked), and never skip a song twice */
  var advT = 0;
  function advance() {
    var at = -1; try { at = player.getPlaylistIndex(); } catch (x) {}
    clearTimeout(advT);
    advT = setTimeout(function () {
      try {
        var st = player.getPlayerState(), S = window.YT.PlayerState, now2 = player.getPlaylistIndex();
        if (userPaused || st === S.PLAYING || st === S.BUFFERING) return;
        if (now2 !== at && st !== S.ENDED) return;
        var n = (at + 1) % Math.max(1, ids.length); player.playVideoAt(n);
      } catch (x) {}
    }, 1500);
  }
  function onReady() {
    var went = false, all0 = [];
    try { all0 = player.getPlaylist() || []; } catch (e) {}
    function go() { if (went) return; went = true; onReady2(); }
    setTimeout(go, 3000);
    if (!all0.length) return go();
    Promise.all(all0.map(fetchTitle)).then(go, go);
  }
  function onReady2() {
    ready = true;
    var all = player.getPlaylist() || [];
    if (all.length) {
      ids = priorityOrder(all);
      var saved = null;
      try { saved = JSON.parse(sessionStorage.getItem('morz_music') || 'null'); } catch (e) {}
      var day = now.toDateString(), at = (saved && saved.day === day && saved.id) ? ids.indexOf(saved.id) : -1;
      var start = at > -1 ? { n: at, t: saved.t || 0 } : { n: 0, t: 0 };
      userPaused = !!(at > -1 && saved.paused);
      wasPlaying = at > -1 && !saved.paused;
      player.loadPlaylist({ playlist: ids, index: start.n, startSeconds: start.t || 0 });
      player.setLoop(true);
      elList.innerHTML = '';
      ids.forEach(function (id, n) {
        var li = document.createElement('li');
        li.innerHTML = '<span>' + (n + 1) + '</span><span></span>';
        li.children[1].textContent = '…';
        li.addEventListener('click', function () { player.playVideoAt(n); });
        elList.appendChild(li);
      });
    }
    ids.forEach(function (id, n) {
      var u = 'https://www.youtube.com/watch?v=' + id;
      var set = function (d) { var li = elList.children[n]; if (d && d.title && li && !li.getAttribute('data-name')) { var t = clean(d.title); li.setAttribute('data-name', t); li.children[1].textContent = t; if (n === (player.getPlaylistIndex ? player.getPlaylistIndex() : -1)) elTitle.textContent = t; } };
      fetch('https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent(u)).then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(set)
        .catch(function () { return fetch('https://noembed.com/embed?url=' + encodeURIComponent(u)).then(function (r) { return r.json(); }).then(set); })
        .catch(function () {});
    });
    setInterval(function () {
      if (player && player.getDuration && player.getDuration() > 0) elProg.style.width = (player.getCurrentTime() / player.getDuration() * 100) + '%';
    }, 500);
    /* browsers only allow sound after a tap, so start muted right away and switch the sound on at the first touch/click/key */
    if (userPaused) { player.pauseVideo(); }
    else if (wasPlaying) {
      /* coming from another page of the shop: carry on with sound; if the browser refuses, start muted and unmute at the first tap */
      try { player.unMute(); player.setVolume(80); player.playVideo(); } catch (e) {}
      setTimeout(function () { if (!userPaused && player.getPlayerState() !== window.YT.PlayerState.PLAYING) { player.mute(); player.playVideo(); } }, 1500);
    } else {
      /* try with sound first (works when the browser allows it); otherwise fall back to muted and unmute at the first tap */
      try { player.unMute(); player.setVolume(80); player.playVideo(); } catch (e) {}
      setTimeout(function () { if (!userPaused && player.getPlayerState() !== window.YT.PlayerState.PLAYING) { player.mute(); player.playVideo(); } }, 1200);
    }
    if (!userPaused) setTimeout(function () { try { if (player.isMuted()) { fab.classList.add('mx-muted'); showToast(); } } catch (e) {} }, 2000);
    var unlock = function () {
      hideToast();
      ['pointerdown', 'touchstart', 'click', 'keydown'].forEach(function (t) { document.removeEventListener(t, unlock, true); });
      try { fab.classList.remove('mx-muted'); player.unMute(); player.setVolume(80); if (player.getPlayerState() !== window.YT.PlayerState.PLAYING && !userPaused) player.playVideo(); } catch (e) {}
    };
    ['pointerdown', 'touchstart', 'click', 'keydown'].forEach(function (t) { document.addEventListener(t, unlock, true); });
  }
  var toast = null;
  function showToast() {
    if (toast || document.documentElement.classList.contains('intro-on')) { if (!toast) setTimeout(showToast, 1500); return; }
    toast = document.createElement('div'); toast.className = 'mx-toast'; toast.setAttribute('role', 'status');
    toast.textContent = '\uD83D\uDD0A Tap anywhere for Christmas music';
    document.body.appendChild(toast);
    setTimeout(hideToast, 9000);
  }
  function hideToast() { if (toast) { toast.classList.add('out'); var t = toast; setTimeout(function () { t.remove(); }, 500); toast = null; } }
  function build() {
    player = new window.YT.Player('MxYt', {
      width: '100%', height: '100%',
      playerVars: { listType: 'playlist', list: PLAYLIST, playsinline: 1, rel: 0, modestbranding: 1 },
      events: { onReady: onReady, onStateChange: onState, onError: function () { advance(); } }
    });
  }
  function load() {
    if (player || document.getElementById('MxApi')) return;
    window.onYouTubeIframeAPIReady = build;
    var s = document.createElement('script'); s.id = 'MxApi'; s.src = 'https://www.youtube.com/iframe_api'; document.head.appendChild(s);
  }
  /* remember where we were, so a refresh continues the same song */
  function save() {
    if (!ready || !started || !player.getVideoData) return;
    var id = (player.getVideoData() || {}).video_id;
    if (!id) return;
    try { sessionStorage.setItem('morz_music', JSON.stringify({ day: now.toDateString(), id: id, t: Math.floor(player.getCurrentTime() || 0), paused: userPaused })); } catch (e) {}
  }
  setInterval(save, 2000);
  /* stop the sound when the visitor leaves the site, switches app/tab or locks the phone, and carry on when they return */
  var resumeOnShow = false;
  function leave() {
    save();
    if (ready && player.getPlayerState && player.getPlayerState() === window.YT.PlayerState.PLAYING) { resumeOnShow = !userPaused; player.pauseVideo(); }
    if ('mediaSession' in navigator) { try { navigator.mediaSession.metadata = null; navigator.mediaSession.playbackState = 'none'; } catch (e) {} }
  }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) leave();
    else if (resumeOnShow && ready) { resumeOnShow = false; player.playVideo(); }
  });
  window.addEventListener('pagehide', function () { leave(); try { player.destroy(); } catch (e) {} });
  /* wait until the opening logo animation has finished and the browser is idle, so the music never makes the intro stutter */
  function whenQuiet(fn) {
    var h = document.documentElement;
    function run() { (window.requestIdleCallback || function (f) { setTimeout(f, 300); })(fn, { timeout: 2500 }); }
    function after() {
      if (!h.classList.contains('intro-on')) return run();
      var mo = new MutationObserver(function () { if (!h.classList.contains('intro-on')) { mo.disconnect(); setTimeout(run, 700); } });
      mo.observe(h, { attributes: true, attributeFilter: ['class'] });
      setTimeout(function () { mo.disconnect(); run(); }, 16000);
    }
    if (document.readyState === 'complete') after(); else window.addEventListener('load', after);
  }
  whenQuiet(load);
  fab.addEventListener('click', function () {
    var open = panel.hidden; panel.hidden = !open;
    if (open && nav) { var r = fab.getBoundingClientRect(); panel.style.top = (r.bottom + 10) + 'px'; panel.style.bottom = 'auto'; } fab.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  q('[data-mx-close]').addEventListener('click', function () { panel.hidden = true; fab.setAttribute('aria-expanded', 'false'); });
  q('[data-mx-play]').addEventListener('click', function () {
    if (!ready) { wantPlay = true; load(); return; }
    var S = window.YT.PlayerState; if (player.getPlayerState() === S.PLAYING) { userPaused = true; player.pauseVideo(); save(); } else { userPaused = false; player.unMute(); player.playVideo(); }
  });
  q('[data-mx-next]').addEventListener('click', function () { if (ready) player.nextVideo(); });
  q('[data-mx-prev]').addEventListener('click', function () { if (ready) player.previousVideo(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) { panel.hidden = true; fab.focus(); } });
})();


/* Soft page switching: the music never stops when moving between Home, Contact, info pages, collections and blog.
   The Home page is kept alive (just hidden) while another page is shown, so coming back is instant and all its effects keep working.
   Product pages (and Home when the visit started on another page) still use a normal load; the music then resumes. */
(function () {
  'use strict';
  var main = document.getElementById('MainContent');
  if (!main || !window.fetch || !window.DOMParser || !window.history || !history.pushState) return;
  var SOFT = /^(\/[a-z]{2}(-[a-zA-Z]{2,4})?)?\/(pages|blogs|collections)(\/|$)/;
  var HOME = /^(\/[a-z]{2}(-[a-zA-Z]{2,4})?)?\/?$/;
  var homeEl = document.body.classList.contains('tpl-index') ? main : null;
  var homeTitle = document.title, homeClass = document.body.className, soft = null;
  function isHome(u) { return HOME.test(u.pathname); }
  function eligible(u) {
    if (u.origin !== location.origin) return false;
    if (isHome(u)) return !!homeEl;
    return SOFT.test(u.pathname) && u.pathname.indexOf('/products/') < 0;
  }
  function hard(u) { location.href = u.href; }
  function after(u, push) {
    [].forEach.call(document.querySelectorAll('header.top nav.main a, #MenuDrawer a'), function (a) {
      var same = false; try { same = new URL(a.href).pathname.replace(/\/$/, '') === u.pathname.replace(/\/$/, ''); } catch (e) {}
      if (same) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    var dlg = document.getElementById('MenuDrawer'); if (dlg && dlg.open) dlg.close();
    if (push) history.pushState({ morz: 1 }, '', u.href);
    window.scrollTo(0, 0);
    window.dispatchEvent(new Event('resize'));
    document.dispatchEvent(new CustomEvent('morz:navigate'));
  }
  function showHome(u, push) {
    if (soft) { soft.remove(); soft = null; }
    homeEl.style.display = '';
    document.title = homeTitle; document.body.className = homeClass;
    after(u, push);
  }
  function swap(u, doc, push) {
    var nm = doc.getElementById('MainContent');
    if (!nm || doc.querySelector('[data-hero],[data-product],form[action*="/cart"]')) return hard(u);
    var target = main;
    if (homeEl) {
      homeEl.style.display = 'none';
      if (!soft) { soft = document.createElement('main'); soft.id = 'MainContentSoft'; soft.tabIndex = -1; homeEl.insertAdjacentElement('afterend', soft); }
      target = soft;
    }
    target.innerHTML = nm.innerHTML;
    document.title = doc.title; document.body.className = doc.body.className;
    var cf = document.querySelector('footer'), nf = doc.querySelector('footer');
    if (cf && nf) cf.replaceWith(document.importNode(nf, true));
    after(u, push);
  }
  function go(u, push) {
    if (isHome(u)) return showHome(u, push);
    fetch(u.href, { credentials: 'same-origin' }).then(function (r) { if (!r.ok) throw 0; return r.text(); })
      .then(function (html) { swap(u, new DOMParser().parseFromString(html, 'text/html'), push); })
      .catch(function () { hard(u); });
  }
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return;
    var u; try { u = new URL(a.href, location.href); } catch (err) { return; }
    if (!eligible(u)) return;
    var here = homeEl && !soft ? isHome(new URL(location.href)) : false;
    if (u.pathname === location.pathname && u.search === location.search && (soft ? !isHome(u) : true)) { if (!(isHome(u) && soft)) return; }
    e.preventDefault(); go(u, true);
  }, true);
  window.addEventListener('popstate', function () {
    var u = new URL(location.href);
    if (eligible(u)) go(u, false); else location.reload();
  });
})();
