/* MORZ theme – cart drawer, product form, hero slider, filters */
(function () {
  'use strict';
  var M = window.MORZ || { routes: {}, strings: {} };

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  /* ---------- money ---------- */
  function fmt(cents) {
    var f = M.moneyFormat || '${{amount}}';
    function num(n, p, th, dec) {
      p = p == null ? 2 : p; th = th || ',' ; dec = dec || '.';
      var v = (n / 100).toFixed(p).split('.');
      return v[0].replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1' + th) + (v[1] ? dec + v[1] : '');
    }
    return f.replace(/\{\{\s*(\w+)\s*\}\}/, function (_, k) {
      switch (k) {
        case 'amount': return num(cents, 2);
        case 'amount_no_decimals': return num(cents, 0);
        case 'amount_with_comma_separator': return num(cents, 2, '.', ',');
        case 'amount_no_decimals_with_comma_separator': return num(cents, 0, '.', ',');
        case 'amount_with_apostrophe_separator': return num(cents, 2, "'", '.');
        case 'amount_no_decimals_with_space_separator': return num(cents, 0, ' ', '.');
        case 'amount_with_space_separator': return num(cents, 2, ' ', ',');
        default: return num(cents, 2);
      }
    });
  }

  /* ---------- cart ---------- */
  var dlg = $('#CartDrawer');
  function openCart() {
    if (dlg && M.cartDrawer && typeof dlg.showModal === 'function') {
      if (!dlg.open) dlg.showModal();
      return true;
    }
    return false;
  }
  function closeCart() { if (dlg && dlg.open) dlg.close(); }

  function refreshCart() {
    var root = M.routes.root || '/';
    var url = root + (root.indexOf('?') > -1 ? '&' : '?') + 'sections=cart-drawer';
    return fetch(url, { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        var doc = new DOMParser().parseFromString(j['cart-drawer'], 'text/html');
        var nb = doc.querySelector('#cart-drawer-body'), ob = $('#cart-drawer-body');
        if (nb && ob) ob.innerHTML = nb.innerHTML;
        return fetch(M.routes.cart_js, { headers: { Accept: 'application/json' } });
      })
      .then(function (r) { return r.json(); })
      .then(function (c) {
        $$('[data-cart-count]').forEach(function (e) { e.textContent = c.item_count; });
        return c;
      });
  }

  function afterAdd() {
    if (!M.cartDrawer || !dlg) { window.location.href = M.routes.cart; return; }
    refreshCart().then(openCart);
  }

  function addVariant(id, qty, btn) {
    if (btn) btn.disabled = true;
    return fetch(M.routes.cart_add, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ items: [{ id: Number(id), quantity: qty || 1 }] })
    }).then(function (r) {
      return r.json().then(function (j) { return { ok: r.ok, data: j }; });
    }).then(function (res) {
      if (btn) btn.disabled = false;
      if (!res.ok) { alert(res.data.description || M.strings.error); return; }
      afterAdd();
    }).catch(function () { if (btn) btn.disabled = false; alert(M.strings.error); });
  }

  function changeLine(line, qty) {
    return fetch(M.routes.cart_change, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ line: Number(line), quantity: Number(qty) })
    }).then(function () { return refreshCart(); });
  }

  document.addEventListener('click', function (e) {
    var t = e.target;
    var open = t.closest && t.closest('[data-cart-open]');
    if (open && dlg && M.cartDrawer) { e.preventDefault(); refreshCart().then(openCart); return; }
    if (t.closest && t.closest('[data-cart-close]')) { closeCart(); return; }
    if (t === dlg) { closeCart(); return; }

    var add = t.closest && t.closest('[data-add-to-cart]');
    if (add) { e.preventDefault(); addVariant(add.getAttribute('data-variant-id'), 1, add); return; }

    var q = t.closest && t.closest('[data-qty]');
    if (q) { e.preventDefault(); q.disabled = true; changeLine(q.getAttribute('data-line'), q.getAttribute('data-qty')); return; }

    var chip = t.closest && t.closest('[data-size-chip]');
    if (chip && !chip.disabled) {
      var wrap = chip.closest('[data-slide-info]') || chip.parentNode;
      $$('[data-size-chip]', wrap).forEach(function (c) { c.setAttribute('aria-pressed', c === chip ? 'true' : 'false'); });
      var b = $('[data-add-to-cart]', wrap);
      if (b) b.setAttribute('data-variant-id', chip.getAttribute('data-variant-id'));
    }
  });

  /* ---------- auto-submit selects / filters ---------- */
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.matches && t.matches('[data-autosubmit]') && t.form) t.form.submit();
    var f = t.closest && t.closest('[data-autosubmit-form]');
    if (f) f.submit();
  });

  /* ---------- product page: open at the very top (no restored / half-way scroll) ---------- */
  if ($('[data-product]')) {
    try {
      var nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
      if (!nav || nav.type !== 'back_forward') {
        if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
        var top0 = function () { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); };
        top0();
        window.addEventListener('load', top0);
        setTimeout(top0, 250);
      }
    } catch (err) {}
  }

  /* ---------- product page ---------- */
  $$('[data-product]').forEach(function (root) {
    var form = $('form[data-product-form]', root), json = $('[data-variants]', root);
    if (!form || !json) return;
    var variants = []; try { variants = JSON.parse(json.textContent); } catch (err) {}
    var idInput = $('[name=id]', form), btn = $('[data-add-btn]', form);
    var priceEl = $('[data-price]', root), cmpEl = $('[data-compare]', root), errEl = $('[data-form-error]', root);

    function selected() {
      var o = [];
      $$('[data-option-index]', form).forEach(function (g) {
        var c = $('input:checked', g); o[Number(g.getAttribute('data-option-index'))] = c ? c.value : null;
      });
      return o;
    }
    var onVariant = null;
    function setCartLabel(t) {
      btn.setAttribute('aria-label', t); btn.title = t;
      var l = $('[data-cart-label]', btn); if (l) l.textContent = t;
    }
    function update() {
      var o = selected();
      var v = variants.filter(function (x) {
        return x.options.every(function (val, i) { return o.length === 0 || val === o[i]; });
      })[0];
      if (!v) { btn.disabled = true; setCartLabel(M.strings.unavailable); return; }
      idInput.value = v.id;
      if (priceEl) priceEl.textContent = v.price;
      if (cmpEl) {
        if (v.compare) { cmpEl.textContent = v.compare; cmpEl.hidden = false; }
        else cmpEl.hidden = true;
      }
      btn.disabled = !v.available;
      setCartLabel(v.available ? M.strings.add : M.strings.soldOut);
      if (window.history && history.replaceState) history.replaceState(null, '', location.pathname + '?variant=' + v.id);
      /* swipe the gallery to this colour's picture */
      var gal = $('[data-gallery]', root);
      if (gal && v.media) {
        var gi = $('[data-media-id="' + v.media + '"]', gal);
        if (gi && gal.scrollWidth > gal.clientWidth + 8) gal.scrollTo({ left: gi.getBoundingClientRect().left - gal.getBoundingClientRect().left + gal.scrollLeft, behavior: 'smooth' });
      }
      if (onVariant) onVariant(o, v);
    }
    form.addEventListener('change', function (e) { if (e.target.closest('[data-option-index]')) update(); });

    /* Card-payment links from the description (whop.com checkout): moved out of the
       description into the red button. 1st link = normal sizes, 2nd link = XXL / XXXL.
       Quantity 1 -> card button. Quantity 2+ -> only Add to cart (buy through the cart). */
    var cardBtn = $('[data-card-link]', form), coBtn = $('[data-checkout-btn]', form);
    var qtyEl = $('[name=quantity]', form), rowEl = $('.buy-row', form);
    var noteEl = $('[data-card-note]', form), selEl = $('[data-card-sel]', form);
    var cardLinks = [], bundleEls = [];
    $$('.desc a', root).filter(function (a) {
      return /whop\.com|checkout/i.test(a.getAttribute('href') || '') || /buy now with card/i.test(a.textContent);
    }).forEach(function (a) {
      var txt = (a.textContent || '').replace(/\s+/g, ' ').trim();
      if (/bundle|\bpack\b|pieces/i.test(txt)) bundleEls.push(a);
      else cardLinks.push({ href: a.getAttribute('href'), text: txt || 'Buy now with card' });
      a.parentNode.removeChild(a);
    });
    /* bundles (2 / 3 / 4 pieces ...): shown under the card button, above the notice */
    /* Whop bundle prices (single-item price + 2x / 3x / 4x), keyed by product handle (survives product renames) */
    var BUNDLE_PRICES = {
      'solar-100led-crystal-globe-lights-fairy-string-light-for-christmas': { base: 49.99, 2: 98.99, 3: 145.99, 4: 189.99 },
      'christmas-knit-hat': { base: 16.99, 2: 32.99, 3: 49.99, 4: 65.99 },
      'handmade-christmas-mug-set-with-holiday-motifs-for-festive-season': { base: 24.99, 2: 47.99, 3: 69.99, 4: 93.99 },
      'solar-powered-led-candle-lights-for-wedding-party-christmas-decoration': { base: 21.99, 2: 39.99, 3: 59.99, 4: 79.99 },
      'christmas-candle-lights-led-small-lanterns-wind-lights-electronic': { base: 29.99, 2: 58.99, 3: 79.99 },
      'projector-lamp-high-brightness-christmas-snowflake-indoor': { base: 25.99, 2: 49.99, 3: 74.99, 4: 99.99 },
      'artificial-fir-chritmas-tree-snow-flocked-artificial-christmas-tree': { base: 169.99, 2: 329.99, 3: 499.99, 4: 669.99 },
      'what-cat-christmas-tree-hoodie': { base: 34.99, 2: 67.99, 3: 99.99, 4: 129.99 },
      'christmas-eve-apple-candle': { base: 19.99, 2: 38.99, 3: 58.99, 4: 77.99 },
      'i-ll-be-gnome-for-christmas-hoodie': { base: 34.99, 2: 68.99, 3: 99.99, 4: 129.99 },
      '4-pair-unisex-christmas-socks-soft-comfortable-festive-style': { base: 14.99, 2: 28.99, 3: 42.99, 4: 56.99 },
      'christmas-stockings-xmas-tree-fireplace-decorative-socks': { base: 19.99, 2: 38.99, 3: 57.99, 4: 76.99 },
      'christmas-decorations-led-santa-claus-snowman-ornaments': { base: 25.99, 2: 49.99, 3: 74.99, 4: 99.99 },
      'christmas-gloves': { base: 16.99, 2: 32.99, 3: 44.99, 4: 56.99 },
      'ceiling-decorations-for-decorating-the-home-with-christmas-projection-lights': { base: 12.99, 2: 24.99, 3: 35.99, 4: 49.99 },
      'electric-heating-blanket-fleece-lamb-velvet-wearable-heated-blanket-with-sleeves-for-home-and-office-use': { base: 58.99, 2: 108.99, 3: 159.99, 4: 218.99 },
      'wearable-heated-blanket-hooded-lazy-blanket-flannel-couple-home-wear-heating-blanket': { base: 59.99, 2: 109.99, 3: 159.99, 4: 219.99 }
    };
    var bpTable = BUNDLE_PRICES[(form.getAttribute('data-phandle') || '').toLowerCase().trim()];
    var bundleBox = $('[data-bundles]', form);
    if (bundleBox && bundleEls.length) {
      bundleEls.forEach(function (a) {
        a.removeAttribute('style'); a.className = 'bundle';
        $$('*', a).forEach(function (n) { n.removeAttribute('style'); });
        if (/popular/i.test(a.textContent)) a.classList.add('popular');
        /* price line: crossed-out normal total, bundle price, savings */
        var nm = /(\d)\s*pieces/i.exec(a.textContent || ''), cnt = nm ? Number(nm[1]) : 0;
        if (bpTable && cnt && bpTable[cnt] && bpTable.base) {
          var full = bpTable.base * cnt, now = bpTable[cnt], save = full - now;
          var pb = document.createElement('div'); pb.className = 'b-pricebox';
          var f = function (n) { return '$' + n.toFixed(2); };
          pb.innerHTML = '<s>' + f(full) + '</s><b>' + f(now) + '</b>' +
            (save > 0.004 ? '<i class="b-save">Save ' + f(save) + ' \u00b7 -' + Math.round(save / full * 100) + '%</i>' : '');
          var first = a.querySelector('span');
          if (first) first.insertAdjacentElement('afterend', pb); else a.appendChild(pb);
        }
        /* last line (POPULAR CHOICE / BEST VALUE / DEAL) becomes a big tag in the top-right corner */
        var sp = a.querySelectorAll('span'), last = sp[sp.length - 1];
        if (last && sp.length > 2) {
          var lt = last.textContent || '', label = null, cls = '';
          if (/popular/i.test(lt)) { label = 'Popular'; cls = 'tag-popular'; }
          else if (/best\s*value/i.test(lt)) { label = 'Best value'; cls = 'tag-best'; }
          else if (/deal/i.test(lt)) { label = 'Deal'; cls = 'tag-deal'; }
          if (label) {
            var tag = document.createElement('em');
            tag.className = 'b-tag ' + cls; tag.textContent = (label === 'Popular' ? '\u2605 ' : '') + label;
            last.parentNode.removeChild(last); a.appendChild(tag);
          }
        }
        bundleBox.appendChild(a);
      });
      bundleBox.hidden = false;
      var more = $('[data-note-more]', form); if (more) more.textContent = 'Pick a bundle above or use the cart button.';
    }
    function bigSize(o) {
      return o.some(function (val) { return /^x{2,}-?\s?(l|large)$|^[23]\s?xl$/i.test((val || '').trim()); });
    }
    function refreshBuy(o) {
      o = o || selected();
      var one = !qtyEl || Number(qtyEl.value) <= 1;
      if (cardLinks.length && cardBtn) {
        var L = (cardLinks.length > 1 && bigSize(o)) ? cardLinks[cardLinks.length - 1] : cardLinks[0];
        cardBtn.href = L.href; cardBtn.textContent = 'Buy now';
        cardBtn.hidden = !one;
        if (noteEl) { noteEl.hidden = !one; if (selEl) selEl.textContent = o.filter(Boolean).join(' / '); }
      } else if (coBtn) { coBtn.hidden = false; }   // no card link on this product -> plain Buy now (checkout)
      if (rowEl) rowEl.classList.toggle('multi', !one);
    }
    onVariant = refreshBuy;
    if (qtyEl) { qtyEl.addEventListener('input', function () { refreshBuy(); }); qtyEl.addEventListener('change', function () { refreshBuy(); }); }
    if (coBtn) coBtn.addEventListener('click', function () {
      if (errEl) errEl.hidden = true;
      coBtn.disabled = true;
      fetch(M.routes.cart_add, { method: 'POST', headers: { Accept: 'application/json' }, body: new FormData(form) })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, data: j }; }); })
        .then(function (res) {
          if (!res.ok) { coBtn.disabled = false; if (errEl) { errEl.textContent = res.data.description || M.strings.error; errEl.hidden = false; } return; }
          window.location.href = '/checkout';
        })
        .catch(function () { coBtn.disabled = false; if (errEl) { errEl.textContent = M.strings.error; errEl.hidden = false; } });
    });
    refreshBuy();

    form.addEventListener('submit', function (e) {
      if (!M.cartDrawer || !dlg) return;           // normal form post -> cart page
      e.preventDefault();
      if (errEl) errEl.hidden = true;
      btn.disabled = true;
      fetch(M.routes.cart_add, { method: 'POST', headers: { Accept: 'application/json' }, body: new FormData(form) })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, data: j }; }); })
        .then(function (res) {
          btn.disabled = false;
          if (!res.ok) { if (errEl) { errEl.textContent = res.data.description || M.strings.error; errEl.hidden = false; } return; }
          afterAdd();
        })
        .catch(function () { btn.disabled = false; if (errEl) { errEl.textContent = M.strings.error; errEl.hidden = false; } });
    });
  });

  /* ---------- hero slider ---------- */
  $$('[data-hero]').forEach(function (hs) {
    var slides = $$('[data-slide]', hs), infos = $$('[data-slide-info]', hs), dots = $$('[data-dot]', hs);
    var word = $('[data-word]', hs), stage = $('[data-stage]', hs);
    var n = slides.length, si = 0, busy = false;
    if (!n) return;
    function label(s) { return (s || '').replace(' ', '\n'); }
    if (word) word.textContent = label(slides[0].getAttribute('data-word'));

    /* fit the big background word inside the screen */
    function fitWord() {
      if (!word || !word.parentNode) return;
      word.style.fontSize = '';
      var avail = word.parentNode.clientWidth, need = word.scrollWidth;
      if (avail && need > avail) {
        var fs = parseFloat(getComputedStyle(word).fontSize);
        word.style.fontSize = Math.floor(fs * avail / need * .96) + 'px';
      }
    }
    fitWord();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitWord);
    window.addEventListener('resize', fitWord);

    /* colours taken from the product image itself */
    function hsl2hex(h, s, l) {
      s = Math.max(0, Math.min(1, s)); l = Math.max(0, Math.min(1, l));
      var a = s * Math.min(l, 1 - l);
      function f(n) { var k = (n + h / 30) % 12; var c = l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1))); return ('0' + Math.round(c * 255).toString(16)).slice(-2); }
      return '#' + f(0) + f(8) + f(4);
    }
    function rgb2hsl(r, g, b) {
      r /= 255; g /= 255; b /= 255;
      var mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, h = 0, s = 0, d = mx - mn;
      if (d) {
        s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn);
        h = mx === r ? ((g - b) / d + (g < b ? 6 : 0)) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
        h *= 60;
      }
      return [h, s, l];
    }
    function palette(h, s, l, force) {
      var c1, c2, accent, fg, fgi, bg, panel, line;
      if (s > .15 && l > .15 && l < .9) {            /* coloured product */
        var m = Math.max(.42, Math.min(.58, l));
        c1 = hsl2hex(h, Math.min(1, s * 1.05), m + .04); c2 = hsl2hex(h, s, m - .2);
        accent = hsl2hex(h, Math.max(s, .6), .55);
        bg = hsl2hex(h, s * .6, .04); panel = hsl2hex(h, s * .5, .08); line = hsl2hex(h, s * .45, .17);
        var light = m > .5;
        fg = light ? '#111111' : '#ffffff'; fgi = light ? '#ffffff' : '#111111';
      } else if (l >= .9) {                          /* white product */
        c1 = '#f6f6f6'; c2 = '#b5b5b5'; accent = '#f2f2f2';
        bg = '#050505'; panel = '#101010'; line = '#242424'; fg = '#111111'; fgi = '#ffffff';
      } else {                                       /* black / grey product: theme follows its real shade */
        var g = Math.max(.04, Math.min(.7, l));
        c1 = hsl2hex(h, s, Math.min(.78, g + .07)); c2 = hsl2hex(h, s, Math.max(.015, g * .3));
        accent = g > .45 ? '#f2f2f2' : '#d9d9d9';
        bg = '#050505'; panel = '#101010'; line = '#262626';
        var dk = g > .5; fg = dk ? '#111111' : '#ffffff'; fgi = dk ? '#ffffff' : '#111111';
      }
      return { c1: c1, c2: c2, accent: accent, bg: bg, panel: panel, line: line, fg: fg, fgi: fgi };
    }
    function sample(src, cb) {
      var im = new Image(); im.crossOrigin = 'anonymous';
      im.onload = function () {
        try {
          var W = 56, H = Math.max(8, Math.round(56 * im.naturalHeight / im.naturalWidth)) || 56;
          var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
          var cx = cv.getContext('2d'); cx.drawImage(im, 0, 0, W, H);
          var d = cx.getImageData(0, 0, W, H).data, n = 0, R = 0, G = 0, B = 0, cn = 0, cR = 0, cG = 0, cB = 0;
          for (var i = 0; i < d.length; i += 4) {
            if (d[i + 3] < 200) continue;
            if (d[i] > 232 && d[i + 1] > 232 && d[i + 2] > 232) continue;   /* skip white backdrop */
            n++; R += d[i]; G += d[i + 1]; B += d[i + 2];
            var q = rgb2hsl(d[i], d[i + 1], d[i + 2]);
            if (q[1] > .35 && q[2] > .15 && q[2] < .85) { cn++; cR += d[i]; cG += d[i + 1]; cB += d[i + 2]; }
          }
          if (n < 20) return;
          var hsl = (cn > n * .08) ? rgb2hsl(cR / cn, cG / cn, cB / cn) : rgb2hsl(R / n, G / n, B / n);
          cb(palette(hsl[0], hsl[1], hsl[2]));
        } catch (e) { /* image blocked: keep manual colours */ }
      };
      im.src = src;
    }
    if (hs.getAttribute('data-autocolor') === 'true') {
      slides.forEach(function (sl) {
        var im = $('.shoe', sl);
        var brand = sl.getAttribute('data-brand');
        function apply(p) {
          if (!p) return;
          sl.setAttribute('data-c1', p.c1); sl.setAttribute('data-c2', p.c2);
          sl.setAttribute('data-fg', p.fg); sl.setAttribute('data-fgi', p.fgi);
          sl.setAttribute('data-accent', p.accent); sl.setAttribute('data-bg', p.bg);
          sl.setAttribute('data-panel', p.panel); sl.setAttribute('data-line', p.line);
          if (slides[si] === sl) theme(sl);
        }
        if (brand && /^#[0-9a-f]{6}$/i.test(brand)) {      /* tag  color:#rrggbb  on the product wins */
          var q = rgb2hsl(parseInt(brand.substr(1, 2), 16), parseInt(brand.substr(3, 2), 16), parseInt(brand.substr(5, 2), 16));
          apply(palette(q[0], q[1], q[2], true)); return;
        }
        if (!im) return;
        sample(im.currentSrc || im.src, function (p) {
          if (!p) return;
          sl.setAttribute('data-c1', p.c1); sl.setAttribute('data-c2', p.c2);
          sl.setAttribute('data-fg', p.fg); sl.setAttribute('data-fgi', p.fgi);
          sl.setAttribute('data-accent', p.accent); sl.setAttribute('data-bg', p.bg);
          sl.setAttribute('data-panel', p.panel); sl.setAttribute('data-line', p.line);
          if (slides[si] === sl) theme(sl);
        });
      });
    }

    function theme(s) {
      hs.style.setProperty('--c1', s.getAttribute('data-c1'));
      hs.style.setProperty('--c2', s.getAttribute('data-c2'));
      hs.style.setProperty('--fg', '#ffffff');
      hs.style.setProperty('--fgi', '#1a0a0a');
      if (hs.getAttribute('data-theme') === 'true') {
        var r = document.documentElement.style;
        r.setProperty('--blue', s.getAttribute('data-accent'));
        r.setProperty('--bg', s.getAttribute('data-bg'));
        r.setProperty('--panel', s.getAttribute('data-panel'));
        r.setProperty('--line', s.getAttribute('data-line'));
      }
    }
    function go(k, dir) {
      if (busy || k === si) return;
      busy = true;
      var cur = slides[si], nx = slides[k], r = dir < 0 ? ' r' : '';
      theme(nx);
      var ci = $('.shoe', cur);
      if (ci) ci.className = 'shoe out' + r;
      if (word) word.className = 'word wout';
      setTimeout(function () {
        cur.hidden = true; if (infos[si]) infos[si].hidden = true;
        si = k; nx.hidden = false; if (infos[si]) infos[si].hidden = false;
        var ni = $('.shoe', nx);
        if (ni) ni.className = 'shoe pre' + r;
        if (word) { word.textContent = label(nx.getAttribute('data-word')); word.className = 'word wpre'; fitWord(); }
        void (ni || nx).offsetWidth;
        if (ni) ni.className = 'shoe';
        if (word) word.className = 'word';
        dots.forEach(function (d, i) { d.className = i === si ? 'on' : ''; });
        setTimeout(function () { busy = false; }, 600);
      }, 450);
    }
    function step(d) { go((si + d + n) % n, d); }

    var prev = $('[data-prev]', hs), next = $('[data-next]', hs);
    if (prev) prev.addEventListener('click', function () { step(-1); });
    if (next) next.addEventListener('click', function () { step(1); });
    dots.forEach(function (d, i) { d.addEventListener('click', function () { go(i, i > si ? 1 : -1); }); });

    var x0 = null;
    if (stage) {
      stage.addEventListener('pointerdown', function (e) { x0 = e.clientX; });
      stage.addEventListener('pointerup', function (e) {
        /* a swipe that pushed the snowman over (or moved a snowball) is not a swipe to the next product */
        var bc = document.body.classList;
        if (bc.contains('xm-hold') || bc.contains('xm-knock')) { x0 = null; return; }
        if (x0 !== null && Math.abs(e.clientX - x0) > 40) step(e.clientX < x0 ? 1 : -1);
        x0 = null;
      });
    }

    var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var paused = false, ms = Number(hs.getAttribute('data-interval')) || 6000;
    hs.addEventListener('pointerenter', function () { paused = true; });
    hs.addEventListener('pointerleave', function () { paused = false; });
    if (n > 1 && hs.getAttribute('data-autoplay') === 'true' && !reduced) {
      setInterval(function () { if (!paused && !document.hidden) step(1); }, ms);
    }
  });
})();

/* announcement close + copy discount code */
(function () {
  'use strict';
  document.addEventListener('click', function (e) {
    var x = e.target.closest && e.target.closest('[data-ann-close]');
    if (x) {
      var bar = x.closest('.ann');
      if (bar) {
        bar.hidden = true;
        try { localStorage.setItem('morz_ann_' + bar.getAttribute('data-ann-key'), '1'); } catch (err) {}
      }
      return;
    }
    var c = e.target.closest && e.target.closest('[data-copy-code]');
    if (!c) return;
    var code = c.getAttribute('data-copy-code');
    var label = c.querySelector('i');
    function done() {
      if (!label) return;
      var old = label.textContent;
      label.textContent = 'Copied';
      setTimeout(function () { label.textContent = old; }, 1600);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).then(done, function () {});
    } else {
      var t = document.createElement('textarea');
      t.value = code; t.style.position = 'fixed'; t.style.opacity = '0';
      document.body.appendChild(t); t.select();
      try { document.execCommand('copy'); done(); } catch (err) {}
      document.body.removeChild(t);
    }
  });
})();

/* intro screen: the MORZ logo is handwritten stroke by stroke, the hat drops in, the lights slide in from the right */
(function () {
  'use strict';
  var root = document.documentElement;
  var el = document.getElementById('XIntro');
  if (!el) { root.classList.remove('intro-on'); return; }
  var done = false, endTimer = null, started = false, raf = 0;
  function finish() {
    if (done) return; done = true;
    clearTimeout(endTimer); cancelAnimationFrame(raf);
    el.classList.add('is-out');
    root.classList.remove('intro-on');
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 1300);
  }
  el.addEventListener('click', finish);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') finish(); });

  var cv = el.querySelector('.xi-pen');
  var PEN = [[101,446,2.8,250],[102,445,2.8,253],[102,444,2.8,255],[103,443,3.2,258],[104,442,3.6,261],[105,441,3.2,264],[105,440,3.2,267],[106,439,3.6,270],[106,438,3.2,272],[107,437,3.6,276],[108,436,3.6,279],[108,435,3.2,282],[109,434,3.6,285],[110,433,3.6,289],[110,432,3.2,291],[111,431,3.6,295],[111,430,3.2,298],[112,429,3.6,301],[113,428,3.2,305],[113,427,3.2,308],[114,426,3.2,312],[114,425,3.2,315],[115,424,3.2,318],[115,423,3.2,321],[116,422,3.2,325],[116,421,3.2,328],[117,420,3.6,332],[117,419,3.2,335],[118,418,3.2,339],[118,417,3.2,342],[119,416,3.2,346],[119,415,3.2,349],[120,414,3.6,354],[120,413,3.2,357],[121,412,3.2,361],[121,411,3.2,364],[122,410,3.6,368],[122,409,3.2,372],[123,408,3.6,376],[123,407,3.2,379],[123,406,2.8,382],[123,405,2.2,385],[123,404,2.0,389],[124,403,2.8,393],[124,402,2.2,396],[123,402,1.4,398],[124,401,1.4,400],[123,401,1.0,401],[125,401,2.2,401],[122,402,1.0,401],[124,400,1.0,403],[121,401,1.0,406],[122,400,1.0,406],[126,400,3.0,406],[123,399,1.0,407],[121,400,1.4,409],[122,399,1.4,409],[121,399,2.2,410],[127,399,2.0,410],[120,399,2.8,413],[127,398,2.2,413],[127,397,2.8,417],[128,396,3.2,421],[129,395,3.6,426],[130,394,3.0,431],[130,393,3.2,434],[130,392,2.8,438],[131,391,3.0,442],[131,390,3.0,446],[131,389,2.8,449],[132,388,3.2,454],[132,387,2.8,457],[133,386,3.2,462],[133,385,3.0,465],[134,384,3.0,470],[134,383,3.2,474],[134,382,3.0,477],[134,381,3.0,481],[134,380,3.2,484],[134,379,3.6,487],[134,378,3.2,491],[135,377,4.0,496],[136,376,4.0,501],[136,375,4.1,504],[137,374,3.6,509],[137,373,3.6,513],[138,372,3.6,518],[138,371,3.6,521],[139,370,3.2,526],[139,369,3.6,529],[139,368,3.2,533],[140,367,3.6,538],[140,366,3.6,541],[140,365,3.2,545],[141,364,3.6,550],[141,363,3.6,553],[142,362,3.2,558],[142,361,3.6,562],[142,360,3.2,565],[143,359,3.2,570],[143,358,3.6,573],[143,357,3.2,577],[144,356,3.6,582],[144,355,3.6,585],[144,354,3.2,589],[145,353,3.6,594],[145,352,3.6,597],[145,351,3.2,600],[146,350,3.6,605],[146,349,3.6,609],[146,348,3.2,612],[147,347,4.0,617],[147,346,3.6,620],[147,345,3.2,624],[147,344,3.0,627],[147,343,3.0,631],[148,342,4.1,635],[148,341,4.2,639],[148,340,3.6,642],[149,339,4.1,647],[150,338,4.0,651],[150,337,4.1,655],[151,336,3.6,659],[151,335,3.6,663],[151,334,3.2,666],[152,333,3.6,671],[152,332,3.6,674],[152,331,3.2,677],[153,330,3.6,682],[153,329,3.6,685],[153,328,3.2,688],[154,327,4.0,693],[154,326,4.0,696],[155,325,3.0,700],[155,324,2.2,703],[155,323,1.4,706],[155,322,1.0,710],[155,321,1.0,713],[155,320,1.4,716],[155,319,2.2,719],[156,318,3.0,723],[157,317,3.6,727],[157,316,3.2,730],[158,315,3.6,734],[158,314,3.2,737],[158,313,3.0,740],[159,312,3.6,744],[159,311,3.6,747],[159,310,3.2,750],[160,309,3.6,754],[160,308,3.6,757],[161,307,3.2,761],[161,306,3.6,764],[161,305,3.2,766],[161,304,3.0,769],[162,303,4.0,773],[162,302,3.6,776],[162,301,3.2,778],[163,300,3.2,782],[163,299,3.6,785],[163,298,3.2,787],[164,297,3.2,791],[164,296,3.6,793],[164,295,3.2,796],[164,294,3.0,798],[165,293,3.6,802],[165,292,3.6,804],[165,291,3.2,806],[165,290,3.0,809],[165,289,3.2,811],[166,288,4.1,814],[166,287,4.5,817],[166,286,5.0,819],[166,285,5.0,821],[166,284,5.0,823],[166,283,4.1,825],[165,283,4.0,826],[167,283,4.5,826],[191,203,2.2,916],[191,204,2.0,918],[191,205,2.2,921],[191,206,2.2,923],[190,207,2.8,927],[190,208,3.0,930],[189,209,3.6,934],[189,210,3.2,937],[188,211,4.0,942],[187,212,3.0,947],[187,213,3.2,950],[187,214,3.6,953],[187,215,3.6,957],[186,216,3.0,962],[186,217,3.2,965],[186,218,3.6,969],[186,219,3.6,972],[185,220,3.2,977],[185,221,3.6,980],[185,222,4.0,984],[184,223,3.6,988],[184,224,4.1,991],[183,225,3.6,995],[183,226,4.1,998],[183,227,4.1,1001],[183,228,4.0,1004],[183,229,3.6,1006],[183,230,3.2,1008],[206,192,4.0,1098],[206,193,3.6,1100],[207,194,4.0,1104],[207,195,4.0,1106],[207,196,4.0,1109],[207,197,4.0,1111],[208,198,4.0,1115],[208,199,4.0,1118],[208,200,4.0,1121],[208,201,4.0,1124],[208,202,4.0,1127],[208,203,4.0,1130],[208,204,4.0,1133],[208,205,4.0,1136],[209,206,4.0,1141],[209,207,4.0,1144],[209,208,4.0,1148],[209,209,4.0,1151],[209,210,4.0,1155],[209,211,3.6,1158],[210,212,4.0,1163],[210,213,4.0,1166],[210,214,4.0,1170],[210,215,4.0,1173],[210,216,3.6,1177],[211,217,4.0,1182],[211,218,4.0,1185],[211,219,4.0,1189],[211,220,4.0,1192],[211,221,4.0,1195],[211,222,3.6,1199],[211,223,3.2,1202],[212,224,4.0,1207],[212,225,4.0,1210],[212,226,3.6,1213],[212,227,3.2,1216],[213,228,4.0,1220],[213,229,3.6,1223],[214,230,3.0,1227],[214,231,3.2,1229],[214,232,3.2,1232],[215,233,3.0,1235],[215,234,3.0,1238],[215,235,2.8,1240],[220,254,3.2,1330],[220,255,3.6,1332],[220,256,4.0,1334],[220,257,3.6,1336],[220,258,3.2,1339],[221,259,4.0,1342],[221,260,3.6,1344],[222,261,4.0,1348],[222,262,4.0,1350],[222,263,3.6,1353],[223,264,4.1,1357],[223,265,3.6,1359],[224,266,4.1,1363],[224,267,3.6,1366],[225,268,4.1,1370],[225,269,3.6,1373],[226,270,4.1,1377],[226,271,3.6,1380],[227,272,4.1,1384],[228,273,3.6,1388],[228,274,3.6,1391],[229,275,4.1,1396],[230,276,4.2,1400],[231,277,4.2,1404],[232,278,4.2,1409],[233,279,4.1,1413],[234,279,3.6,1417],[235,279,3.2,1420],[236,280,4.0,1425],[237,280,4.0,1428],[238,280,4.0,1431],[239,280,4.0,1435],[240,280,4.1,1438],[241,279,3.6,1443],[242,279,4.1,1446],[243,278,3.6,1451],[244,277,3.6,1456],[245,276,3.6,1461],[245,275,3.2,1464],[246,274,3.6,1469],[247,273,3.2,1474],[247,272,3.6,1478],[248,271,3.2,1483],[248,270,3.2,1486],[248,269,3.0,1489],[249,268,3.2,1494],[249,267,3.2,1498],[250,266,3.2,1503],[250,265,3.2,1506],[250,264,3.0,1510],[251,263,3.2,1515],[251,262,3.2,1518],[251,261,3.0,1522],[252,260,3.2,1526],[252,259,3.2,1530],[252,258,3.0,1533],[253,257,3.0,1538],[253,256,3.2,1541],[253,255,3.0,1545],[253,254,3.0,1548],[254,253,3.2,1553],[254,252,3.2,1556],[254,251,3.0,1559],[255,250,3.2,1564],[255,249,3.2,1567],[255,248,3.0,1570],[256,247,3.0,1575],[256,246,3.2,1578],[256,245,3.2,1581],[256,244,3.0,1584],[257,243,3.2,1589],[257,242,3.2,1592],[257,241,3.0,1595],[258,240,3.0,1599],[258,239,3.2,1602],[258,238,3.2,1605],[258,237,3.0,1607],[259,236,3.2,1611],[259,235,3.2,1614],[259,234,3.0,1617],[260,233,3.0,1621],[260,232,3.2,1623],[260,231,3.2,1626],[260,230,3.0,1628],[261,229,3.2,1632],[261,228,3.6,1634],[261,227,3.2,1637],[262,226,3.0,1640],[262,225,3.0,1642],[262,224,2.8,1645],[263,223,2.2,1648],[268,199,2.8,1738],[269,198,3.2,1741],[269,197,3.0,1743],[269,196,3.0,1745],[270,195,3.2,1749],[270,194,3.2,1751],[270,193,3.0,1754],[270,192,3.0,1756],[271,191,3.2,1760],[271,190,3.6,1763],[271,189,3.2,1766],[272,188,3.0,1770],[272,187,3.2,1773],[272,186,3.2,1776],[272,185,3.0,1779],[273,184,3.2,1783],[273,183,3.2,1786],[273,182,3.0,1789],[274,181,3.2,1794],[274,180,3.6,1797],[274,179,3.2,1800],[275,178,3.2,1805],[275,177,3.6,1808],[275,176,3.2,1811],[275,175,3.0,1815],[276,174,3.6,1820],[276,173,3.6,1823],[276,172,3.2,1826],[276,171,3.0,1830],[277,170,4.0,1835],[278,169,4.5,1840],[279,169,4.1,1843],[280,168,5.0,1848],[281,168,5.1,1852],[282,168,5.4,1855],[283,169,5.0,1860],[284,170,4.1,1865],[284,171,4.5,1868],[284,172,4.1,1872],[284,173,4.0,1875],[285,174,4.0,1880],[285,175,4.0,1884],[285,176,4.1,1887],[285,177,4.0,1890],[285,178,4.0,1894],[285,179,4.0,1897],[286,180,4.1,1902],[286,181,4.5,1905],[286,182,4.1,1908],[286,183,4.0,1911],[286,184,4.0,1914],[286,185,4.0,1917],[286,186,4.0,1920],[287,187,4.0,1925],[287,188,4.0,1928],[287,189,4.1,1931],[287,190,4.1,1933],[287,191,4.0,1936],[287,192,4.0,1939],[287,193,4.0,1942],[287,194,4.0,1944],[287,195,4.0,1947],[288,196,4.0,1950],[288,197,4.0,1953],[288,198,4.0,1955],[288,199,4.0,1958],[288,200,4.0,1960],[288,201,4.0,1962],[291,219,4.0,2052],[291,220,4.0,2054],[291,221,4.0,2056],[291,222,4.0,2058],[291,223,4.0,2061],[291,224,4.0,2063],[291,225,4.0,2065],[292,226,4.0,2068],[292,227,4.0,2071],[292,228,4.0,2073],[292,229,4.0,2076],[292,230,4.0,2078],[292,231,4.0,2080],[292,232,4.0,2083],[292,233,3.6,2085],[293,234,4.1,2089],[293,235,4.0,2092],[293,236,4.0,2094],[293,237,4.0,2097],[294,238,4.1,2101],[294,239,4.0,2103],[294,240,4.0,2106],[294,241,4.0,2109],[294,242,4.0,2111],[294,243,4.0,2114],[294,244,4.0,2117],[294,245,4.0,2120],[295,246,4.0,2124],[295,247,4.0,2127],[295,248,4.0,2129],[295,249,4.0,2132],[295,250,4.0,2135],[295,251,4.0,2138],[295,252,4.0,2141],[295,253,3.6,2144],[295,254,3.2,2147],[296,255,4.0,2151],[296,256,4.0,2154],[296,257,4.0,2157],[296,258,4.0,2161],[296,259,4.0,2164],[296,260,3.6,2167],[296,261,3.2,2170],[296,262,3.0,2173],[297,263,4.0,2177],[297,264,4.0,2181],[297,265,4.0,2184],[297,266,4.0,2187],[297,267,4.0,2190],[298,268,4.1,2195],[298,269,3.6,2198],[298,270,2.8,2201],[298,271,2.2,2204],[298,272,1.4,2208],[298,273,1.0,2211],[298,274,1.4,2214],[297,275,2.2,2219],[297,276,2.0,2222],[298,277,3.0,2227],[298,278,3.0,2230],[299,279,3.6,2235],[299,280,3.6,2239],[299,281,3.2,2242],[299,282,3.0,2245],[299,283,3.0,2249],[300,284,4.0,2254],[300,285,3.6,2257],[300,286,3.2,2260],[300,287,3.0,2264],[300,288,3.0,2267],[301,289,4.0,2272],[301,290,4.0,2276],[301,291,3.6,2279],[301,292,3.2,2282],[301,293,3.0,2286],[301,294,3.0,2289],[302,295,4.0,2294],[302,296,4.0,2298],[302,297,3.6,2301],[302,298,3.2,2305],[302,299,3.0,2308],[302,300,3.0,2312],[303,301,4.0,2317],[303,302,4.0,2320],[303,303,3.6,2324],[303,304,3.2,2327],[304,305,4.0,2332],[304,306,4.0,2335],[304,307,4.0,2339],[304,308,4.0,2342],[304,309,3.6,2346],[304,310,3.2,2349],[305,311,4.0,2354],[305,312,4.0,2358],[305,313,3.6,2361],[305,314,3.2,2365],[306,315,4.0,2370],[306,316,4.0,2373],[307,317,4.1,2378],[307,318,4.0,2381],[308,319,3.2,2386],[309,319,2.2,2390],[307,320,4.1,2391],[310,319,1.4,2393],[310,318,1.0,2395],[307,321,4.0,2395],[311,319,1.0,2397],[311,320,2.0,2398],[308,322,4.5,2399],[311,317,1.0,2399],[312,318,1.0,2401],[308,323,4.1,2403],[308,324,4.0,2406],[308,325,4.0,2410],[308,326,4.0,2413],[308,327,4.0,2416],[308,328,4.0,2420],[308,329,4.0,2423],[308,330,4.0,2426],[308,331,4.0,2430],[309,332,4.0,2434],[309,333,4.1,2438],[309,334,4.0,2441],[309,335,4.0,2444],[310,336,4.0,2449],[310,337,4.0,2452],[310,338,4.0,2456],[310,339,4.0,2459],[310,340,3.6,2462],[311,341,4.0,2467],[311,342,4.0,2470],[311,343,3.6,2473],[311,344,3.2,2476],[311,345,3.0,2479],[312,346,4.0,2484],[312,347,4.0,2487],[312,348,4.0,2490],[312,349,3.2,2493],[313,350,2.0,2497],[313,351,1.0,2500],[312,352,1.0,2505],[314,352,1.0,2505],[314,353,1.4,2508],[311,353,1.0,2509],[313,353,1.0,2509],[314,354,2.2,2511],[313,354,1.4,2512],[312,354,1.0,2513],[314,355,2.8,2514],[314,356,2.8,2517],[314,357,2.2,2520],[314,358,1.4,2523],[314,359,1.0,2525],[314,360,1.0,2528],[315,361,2.2,2532],[316,362,2.2,2536],[316,363,3.0,2539],[317,362,2.0,2539],[316,364,2.8,2542],[316,365,2.2,2545],[316,366,2.0,2547],[317,367,2.8,2551],[317,368,2.8,2554],[317,369,2.2,2557],[317,370,2.0,2559],[317,371,2.0,2562],[318,372,2.8,2565],[318,373,2.8,2568],[318,374,2.2,2571],[318,375,2.0,2573],[319,376,3.0,2576],[320,377,3.2,2580],[320,378,3.2,2582],[320,379,3.0,2585],[320,380,3.2,2587],[321,381,4.5,2590],[321,382,5.0,2593],[321,383,5.0,2595],[321,384,5.0,2597],[322,385,4.0,2600],[323,386,3.0,2603],[190,357,4.0,2693],[189,357,4.0,2695],[188,357,4.0,2697],[187,357,4.0,2700],[186,357,4.0,2702],[185,357,4.0,2704],[184,357,3.6,2706],[183,357,3.2,2709],[182,358,3.6,2712],[181,358,3.6,2714],[180,358,3.2,2717],[179,359,3.6,2720],[178,359,3.6,2723],[177,360,3.2,2726],[176,360,3.6,2729],[175,360,3.2,2731],[174,361,3.6,2735],[173,362,3.6,2739],[172,362,3.2,2741],[171,363,3.6,2745],[170,364,3.6,2749],[169,364,3.6,2752],[168,365,3.6,2756],[167,366,3.6,2760],[166,367,3.6,2764],[165,368,3.6,2768],[164,369,3.6,2772],[163,370,3.6,2776],[163,371,3.6,2779],[162,372,4.1,2783],[161,373,4.2,2787],[160,374,4.2,2791],[159,375,4.1,2796],[159,376,4.1,2799],[159,377,3.6,2802],[159,378,3.2,2805],[158,379,4.0,2809],[157,380,5.0,2814],[157,381,5.4,2817],[157,382,5.1,2820],[156,383,5.4,2824],[155,384,4.1,2829],[155,385,4.0,2832],[155,386,4.0,2835],[155,387,4.0,2839],[155,388,4.0,2842],[155,389,4.0,2845],[154,390,3.2,2850],[154,391,3.6,2853],[154,392,4.0,2856],[154,393,4.0,2860],[153,394,3.0,2864],[153,395,3.2,2868],[153,396,3.6,2871],[153,397,4.0,2874],[153,398,4.0,2878],[153,399,4.0,2881],[153,400,4.0,2885],[153,401,4.0,2888],[153,402,4.0,2891],[153,403,4.0,2895],[153,404,4.0,2898],[153,405,4.0,2902],[153,406,4.0,2905],[153,407,4.0,2909],[153,408,4.0,2912],[153,409,3.6,2915],[154,410,4.0,2920],[154,411,4.0,2924],[155,412,3.6,2929],[155,413,3.6,2932],[156,414,4.1,2937],[157,415,4.2,2942],[158,416,4.1,2947],[159,416,3.6,2950],[160,417,4.1,2955],[161,417,3.6,2959],[162,418,4.1,2964],[163,418,4.0,2967],[164,419,4.5,2972],[165,419,4.1,2976],[166,419,4.0,2979],[167,419,4.0,2983],[168,419,4.0,2986],[169,418,3.0,2991],[170,418,3.2,2994],[171,418,3.6,2998],[172,418,4.0,3001],[173,418,4.0,3005],[174,417,3.2,3010],[175,417,3.6,3013],[176,417,4.0,3017],[177,416,3.2,3021],[178,416,3.6,3025],[179,416,3.6,3028],[180,415,3.6,3033],[181,415,3.6,3037],[182,414,3.6,3041],[183,413,3.6,3046],[184,413,3.6,3050],[185,412,3.6,3054],[186,411,3.6,3059],[187,410,3.6,3064],[188,409,3.6,3069],[189,408,3.6,3073],[190,407,3.6,3078],[191,406,3.6,3083],[192,405,3.6,3087],[193,404,3.6,3092],[194,403,3.6,3097],[195,402,3.6,3101],[195,401,3.2,3104],[196,400,3.6,3109],[197,399,3.6,3113],[197,398,3.2,3117],[198,397,3.6,3121],[198,396,3.2,3124],[199,395,3.6,3129],[199,394,3.2,3132],[200,393,3.6,3136],[200,392,3.2,3139],[201,391,3.2,3143],[201,390,3.6,3146],[201,389,3.2,3149],[202,388,3.2,3154],[202,387,3.6,3157],[202,386,3.2,3159],[202,385,3.0,3162],[202,384,3.0,3165],[202,383,3.0,3168],[202,382,3.0,3171],[203,381,4.0,3175],[203,380,4.0,3178],[203,379,4.0,3181],[203,378,4.0,3183],[203,377,4.0,3186],[203,376,4.0,3189],[203,375,4.0,3191],[203,374,4.0,3194],[203,373,4.0,3197],[202,372,3.0,3200],[202,371,3.2,3203],[202,370,3.6,3206],[202,369,4.0,3208],[201,368,3.2,3212],[201,367,3.6,3214],[201,366,4.0,3217],[200,365,3.6,3220],[200,364,4.1,3222],[199,363,4.2,3226],[198,362,4.2,3229],[197,361,4.2,3232],[196,360,4.2,3235],[195,359,4.1,3238],[194,358,3.6,3241],[213,407,2.2,3331],[214,406,3.0,3334],[214,405,3.0,3337],[215,404,3.6,3340],[215,403,3.6,3342],[215,402,3.2,3345],[215,401,3.0,3347],[216,400,4.0,3351],[216,399,4.0,3354],[216,398,4.0,3356],[217,397,4.1,3360],[217,396,4.1,3363],[217,395,4.0,3366],[217,394,4.0,3369],[218,393,5.0,3373],[218,392,4.5,3376],[218,391,4.1,3379],[218,390,4.0,3382],[218,389,4.0,3385],[219,388,5.0,3390],[219,387,5.0,3393],[219,386,4.5,3396],[220,385,5.1,3401],[220,384,5.0,3404],[220,383,5.0,3407],[221,382,5.8,3412],[221,381,5.8,3416],[221,380,5.4,3419],[221,379,5.1,3422],[221,378,5.0,3426],[221,377,5.0,3429],[222,377,5.4,3431],[220,376,4.0,3434],[223,377,5.1,3434],[220,375,4.0,3438],[224,376,4.0,3439],[220,374,4.0,3441],[225,376,4.0,3443],[220,373,4.0,3445],[226,375,3.2,3447],[220,372,4.0,3448],[227,374,2.8,3452],[220,371,4.0,3452],[220,370,3.6,3455],[228,373,3.2,3457],[220,369,3.2,3458],[229,372,3.2,3462],[220,368,3.0,3462],[220,367,3.0,3465],[229,371,3.2,3466],[220,366,3.0,3469],[230,370,3.2,3471],[221,365,4.0,3474],[230,369,3.2,3474],[221,364,4.0,3477],[231,368,3.2,3479],[221,363,4.0,3481],[231,367,2.8,3482],[221,362,4.0,3484],[232,366,3.2,3487],[221,361,3.6,3488],[221,360,3.2,3491],[233,365,3.2,3492],[221,359,3.0,3494],[233,364,2.8,3495],[221,358,3.0,3498],[234,363,3.2,3500],[222,357,4.0,3502],[235,362,2.8,3505],[222,356,4.0,3506],[235,361,2.8,3508],[222,355,4.0,3509],[222,354,4.0,3512],[236,360,3.2,3513],[222,353,4.0,3515],[237,359,2.8,3517],[222,352,4.0,3519],[237,358,2.8,3520],[222,351,3.6,3522],[238,357,3.2,3525],[222,350,3.2,3525],[239,356,3.6,3529],[223,349,3.0,3529],[223,348,3.2,3532],[240,355,3.6,3533],[240,354,3.2,3536],[241,353,3.6,3541],[242,352,3.6,3545],[243,351,3.6,3549],[244,350,3.6,3552],[245,349,3.6,3556],[245,348,3.2,3559],[246,347,3.6,3562],[247,346,3.6,3566],[248,345,3.6,3569],[249,344,3.2,3572],[250,343,2.8,3575],[259,350,3.2,3665],[260,350,3.6,3667],[261,349,4.1,3670],[262,348,3.6,3674],[263,348,4.1,3676],[264,347,3.6,3679],[265,347,4.0,3681],[266,346,3.2,3685],[267,346,3.6,3687],[268,346,3.6,3690],[269,345,3.6,3693],[270,345,4.0,3696],[271,344,3.2,3699],[272,344,3.6,3702],[273,344,3.6,3704],[274,343,3.6,3708],[275,343,4.0,3711],[276,342,3.2,3715],[277,342,3.6,3717],[278,342,3.6,3720],[279,341,3.6,3724],[280,341,4.0,3727],[281,341,4.0,3730],[282,341,4.0,3733],[283,341,4.1,3735],[284,341,4.5,3738],[285,340,5.0,3742],[286,340,5.4,3745],[287,340,5.8,3748],[287,341,5.8,3750],[286,342,5.0,3754],[286,343,4.5,3757],[286,344,4.1,3760],[286,345,4.0,3763],[285,346,3.0,3767],[285,347,3.2,3770],[285,348,3.6,3774],[284,349,3.2,3778],[284,350,3.6,3781],[283,351,3.2,3786],[283,352,3.6,3789],[282,353,3.2,3793],[282,354,3.6,3797],[281,355,3.2,3801],[281,356,3.2,3804],[280,357,3.6,3809],[279,358,3.2,3814],[279,359,3.6,3817],[278,360,3.2,3822],[278,361,3.6,3825],[278,362,3.2,3828],[277,363,3.6,3833],[276,364,3.2,3838],[276,365,3.6,3841],[275,366,3.2,3846],[275,367,3.6,3850],[275,368,3.2,3853],[274,369,3.6,3858],[273,370,3.2,3863],[273,371,3.6,3866],[273,372,3.2,3870],[272,373,3.6,3875],[272,374,3.6,3878],[271,375,3.6,3883],[271,376,3.6,3886],[270,377,3.6,3891],[270,378,3.6,3895],[269,379,3.2,3900],[269,380,3.6,3903],[269,381,3.2,3907],[268,382,3.6,3912],[268,383,3.6,3915],[267,384,3.6,3920],[267,385,3.6,3923],[266,386,3.2,3928],[266,387,3.6,3932],[266,388,3.2,3935],[265,389,3.6,3940],[265,390,4.0,3944],[264,391,3.6,3949],[264,392,4.0,3952],[263,393,3.2,3957],[263,394,3.6,3960],[263,395,4.0,3964],[262,396,3.2,3969],[262,397,3.6,3972],[262,398,4.0,3976],[261,399,3.6,3980],[261,400,4.0,3984],[261,401,4.1,3987],[261,402,4.0,3991],[261,403,4.0,3994],[261,404,4.0,3997],[260,405,4.5,4002],[260,406,5.0,4005],[260,407,5.1,4009],[260,408,5.4,4012],[261,408,5.7,4014],[262,408,5.0,4017],[263,408,4.5,4020],[264,408,4.1,4023],[265,408,4.0,4027],[266,407,3.0,4031],[267,407,3.2,4035],[268,407,3.6,4038],[269,407,4.0,4041],[270,406,3.0,4046],[271,406,3.2,4049],[272,406,3.6,4052],[273,406,3.6,4055],[274,405,3.6,4059],[275,405,4.0,4063],[276,404,3.2,4067],[277,404,3.6,4070],[278,404,4.0,4073],[279,403,3.2,4077],[280,403,3.6,4080],[281,403,3.6,4083],[282,402,3.6,4087],[283,402,4.0,4090],[284,401,3.2,4095],[285,401,3.6,4097],[286,401,4.0,4100],[287,400,3.2,4104],[288,400,3.6,4107],[289,400,3.6,4110],[290,399,3.6,4114],[291,399,3.6,4116],[292,398,3.0,4120],[293,398,3.2,4123],[294,398,3.6,4125],[295,397,3.0,4129],[296,397,3.2,4132],[297,397,3.2,4134],[298,396,3.2,4138],[299,396,3.6,4140],[300,396,3.2,4143],[301,395,3.2,4146],[302,395,3.6,4148],[303,395,3.2,4151],[304,394,3.6,4154],[305,394,4.0,4156],[306,394,4.1,4159],[307,394,4.0,4161],[308,394,4.1,4163],[309,394,4.1,4165]];
  function begin() {
    if (started || done) return; started = true;
    el.classList.add('go');
    endTimer = setTimeout(finish, (parseFloat(el.getAttribute('data-end')) || 9.6) * 1000);
  }
  /* pen: round ink dots follow the written path in time order, so the strokes grow like real handwriting */
  var SNAKE = [[352,361,0],[350,363,8],[350,365,13],[349,367,20],[347,369,28],[346,371,35],[345,373,42],[344,375,49],[342,377,58],[341,378,62],[340,378,65],[344,379,68],[345,379,71],[346,379,74],[347,379,77],[348,380,81],[349,380,84],[333,379,87],[332,380,91],[331,381,95],[330,382,100],[329,383,104],[328,384,108],[327,385,113],[325,373,116],[324,373,119],[323,373,122],[324,387,124],[322,371,128],[321,375,131],[322,388,132],[320,376,135],[322,368,137],[320,387,139],[319,377,140],[320,386,142],[319,390,143],[322,366,143],[317,377,146],[318,390,147],[316,377,149],[321,384,150],[322,392,151],[315,378,153],[320,383,154],[323,393,155],[314,379,158],[314,390,159],[314,389,160],[320,361,161],[325,395,164],[313,388,165],[313,392,167],[313,382,168],[313,387,168],[325,397,171],[319,358,172],[325,398,174],[313,385,174],[319,357,175],[311,395,179],[311,396,182],[310,397,186],[325,403,190],[325,404,193],[325,405,196],[325,406,199],[326,407,204],[327,408,208],[327,409,211],[328,410,216],[328,411,219],[328,412,222],[329,413,227],[330,414,232],[301,408,237],[300,410,245],[300,411,249],[300,412,252],[300,413,255],[300,414,258],[295,411,263],[294,411,266],[293,411,270],[292,411,273],[302,419,278],[303,420,282],[304,421,287],[305,422,292],[306,423,296],[285,413,299],[284,413,302],[283,413,306],[282,413,309],[309,427,314],[279,413,319],[277,414,327],[275,414,334],[273,415,342],[271,416,350],[269,416,357],[267,417,366],[265,417,372],[263,417,379],[261,417,386],[259,417,393],[257,417,400],[255,417,407],[253,417,414],[251,417,421],[249,417,428],[247,418,436],[245,420,446],[243,421,455],[242,420,460],[243,424,463],[243,425,467],[243,426,470],[243,427,474],[239,416,478],[238,415,483],[237,415,487],[236,415,490],[235,415,494],[234,415,497],[233,415,501],[232,415,505],[231,415,508],[230,415,512],[229,415,515],[228,415,519],[226,415,526],[224,415,533],[222,415,540],[220,415,548],[218,416,556],[216,416,564],[214,417,572],[212,417,580],[210,418,589],[208,419,597],[206,421,608],[205,423,617],[203,425,627],[202,427,636],[202,428,639],[200,426,645],[199,425,650],[202,432,654],[202,433,658],[202,434,662],[202,435,665],[202,436,669],[202,437,673],[202,438,676],[202,439,680],[191,424,684],[190,424,688],[189,424,692],[200,442,694],[204,443,698],[199,443,700],[186,424,703],[204,445,706],[197,444,709],[184,424,710],[183,424,714],[195,444,716],[194,444,720],[193,444,724],[192,445,729],[191,445,733],[190,445,736],[189,445,740],[188,445,744],[187,445,748],[186,445,751],[185,445,755],[184,445,759],[183,445,763],[182,446,768],[168,427,775],[166,427,782],[164,427,790],[162,427,798],[160,427,805],[158,427,813],[156,427,820],[154,428,829],[152,429,839],[151,428,844],[151,427,848],[152,433,852],[152,434,855],[152,435,859],[152,436,863],[152,437,867],[148,422,872],[148,421,875],[147,420,881],[146,420,885],[145,419,890],[144,419,894],[143,418,899],[142,418,903],[141,417,909],[140,417,912],[139,416,918],[138,415,923],[137,414,929],[135,412,939],[133,410,950],[131,408,961],[130,406,971],[130,404,978],[129,402,988],[127,400,998],[125,400,1006],[123,398,1017],[122,396,1026],[122,395,1030],[123,394,1036],[118,396,1040],[117,396,1043],[116,396,1047],[126,391,1052],[126,390,1056],[126,389,1060],[126,388,1064],[126,387,1068],[126,386,1071],[126,385,1075],[126,384,1079],[126,383,1083],[127,382,1089],[127,381,1092],[127,380,1096],[103,394,1101],[102,394,1105],[101,394,1109],[100,394,1113],[99,394,1116],[98,394,1120],[97,393,1126],[127,371,1131],[128,369,1141],[128,367,1148],[129,365,1158],[129,363,1165],[128,361,1175],[127,360,1180],[126,360,1184],[130,358,1190],[131,357,1195],[122,360,1200],[121,360,1204],[120,360,1208],[134,354,1212],[135,353,1217],[136,352,1223],[136,351,1227],[137,350,1232],[138,349,1238],[138,348,1241],[139,347,1247],[140,346,1252],[141,345,1258],[142,344,1263],[143,342,1273],[143,340,1280],[143,338,1288],[143,336,1296],[144,334,1305],[144,332,1313],[145,330,1322],[145,328,1330],[146,326,1340],[146,324,1347],[146,322,1355],[146,320,1363],[146,318,1370],[146,317,1374],[147,317,1376],[147,316,1380],[149,320,1383],[148,315,1385],[142,317,1388],[141,317,1391],[140,317,1395],[152,322,1398],[151,312,1402],[138,317,1403],[154,322,1406],[151,310,1409],[136,317,1411],[156,322,1413],[157,322,1417],[152,308,1419],[133,317,1422],[159,322,1425],[152,306,1426],[152,305,1430],[161,322,1432],[130,316,1435],[129,316,1439],[163,322,1440],[153,302,1443],[127,316,1447],[165,322,1448],[153,300,1451],[125,316,1455],[167,322,1456],[168,322,1459],[123,316,1462],[155,297,1466],[156,296,1471],[172,322,1475],[173,321,1480],[174,321,1484],[175,321,1488],[176,321,1492],[177,321,1495],[178,320,1501],[179,320,1505],[180,320,1509],[158,286,1513],[158,285,1516],[158,284,1520],[158,283,1524],[184,320,1527],[185,318,1531],[158,281,1532],[185,317,1535],[184,323,1538],[158,279,1539],[158,278,1543],[158,277,1547],[186,314,1548],[185,326,1551],[158,275,1555],[187,312,1557],[186,328,1561],[158,273,1562],[158,272,1566],[158,271,1570],[189,309,1571],[188,331,1575],[158,269,1577],[190,307,1581],[188,333,1583],[191,306,1586],[189,334,1588],[160,267,1590],[156,266,1594],[193,305,1595],[162,267,1598],[163,267,1602],[195,304,1604],[153,265,1607],[152,265,1611],[197,303,1613],[151,264,1616],[167,265,1620],[199,302,1622],[149,263,1625],[169,264,1629],[201,302,1630],[170,264,1633],[149,260,1637],[203,301,1639],[171,262,1642],[149,258,1644],[205,301,1647],[172,260,1651],[149,256,1652],[149,255,1655],[172,258,1658],[208,299,1661],[150,253,1664],[172,256,1666],[210,299,1668],[151,251,1673],[211,298,1674],[172,253,1677],[151,249,1681],[173,252,1682],[214,297,1686],[172,251,1688],[174,250,1692],[171,250,1693],[174,249,1695],[152,245,1697],[217,296,1699],[153,244,1703],[218,295,1704],[154,243,1708],[168,247,1709],[155,243,1712],[167,246,1714],[156,243,1715],[166,245,1719],[178,244,1720],[158,243,1723],[165,244,1725],[223,294,1725],[180,244,1727],[224,293,1730],[160,243,1730],[163,243,1734],[225,292,1735],[175,241,1736],[183,244,1739],[224,291,1740],[184,244,1742],[223,290,1746],[185,244,1746],[222,290,1749],[186,244,1750],[229,292,1750],[223,288,1753],[173,237,1754],[187,245,1755],[223,287,1757],[231,292,1757],[220,288,1760],[173,235,1761],[188,241,1762],[189,246,1764],[173,234,1765],[189,240,1767],[190,246,1767],[173,233,1768],[220,285,1771],[223,283,1771],[173,232,1772],[220,284,1774],[223,282,1775],[190,238,1776],[220,283,1778],[173,230,1779],[237,292,1779],[220,282,1782],[190,236,1783],[174,229,1785],[220,281,1785],[190,235,1787],[174,228,1788],[190,234,1790],[220,279,1791],[174,227,1792],[241,292,1794],[197,245,1795],[190,232,1798],[220,277,1798],[174,225,1799],[243,292,1801],[174,224,1803],[191,230,1806],[174,223,1806],[201,245,1809],[191,229,1810],[202,245,1813],[191,228,1814],[203,245,1817],[175,220,1819],[204,245,1820],[175,219,1823],[205,245,1824],[191,225,1825],[250,291,1828],[249,294,1828],[176,217,1831],[249,295,1832],[207,244,1833],[191,222,1836],[208,244,1836],[191,221,1839],[209,244,1840],[252,288,1842],[249,298,1843],[178,214,1845],[249,299,1846],[190,219,1848],[249,300,1850],[212,245,1852],[249,301,1854],[253,285,1855],[189,217,1857],[214,245,1859],[181,211,1861],[188,216,1862],[249,304,1864],[187,216,1865],[182,210,1866],[183,210,1869],[256,282,1870],[187,214,1870],[257,282,1873],[186,214,1874],[186,213,1876],[258,281,1878],[252,307,1880],[259,280,1884],[220,249,1887],[254,309,1890],[261,279,1892],[255,310,1895],[223,249,1898],[263,278,1901],[264,278,1904],[225,249,1905],[265,277,1909],[227,249,1912],[266,277,1913],[258,315,1917],[229,249,1919],[230,249,1923],[231,249,1926],[232,249,1930],[233,249,1933],[234,248,1938],[235,248,1942],[236,248,1945],[237,249,1950],[238,249,1954],[239,250,1959],[240,250,1962],[241,250,1966],[281,274,1970],[282,273,1975],[283,273,1979],[285,272,1987],[287,272,1994],[289,272,2001],[291,272,2008],[293,272,2015],[295,272,2022],[297,272,2029],[299,272,2035],[301,272,2042],[303,271,2050],[305,270,2059],[307,269,2067],[308,270,2072],[309,270,2075],[310,271,2080],[304,264,2083],[304,263,2086],[304,262,2090],[313,274,2094],[314,275,2099],[315,275,2102],[304,258,2103],[304,257,2107],[317,276,2110],[312,278,2111],[303,255,2115],[319,276,2117],[320,276,2120],[303,253,2121],[310,281,2124],[322,276,2127],[303,251,2128],[310,283,2131],[324,276,2133],[303,249,2134],[325,277,2138],[310,286,2141],[302,247,2142],[301,246,2147],[301,245,2150],[301,244,2154],[301,243,2157],[300,242,2161],[300,241,2165],[300,240,2168],[300,239,2171],[300,238,2174],[300,237,2178],[300,236,2181],[300,235,2184],[311,300,2188],[311,301,2191],[312,302,2195],[299,231,2198],[299,230,2201],[299,229,2205],[299,228,2208],[299,227,2211],[298,226,2215],[298,225,2219],[298,224,2222],[298,223,2225],[298,222,2228],[316,312,2232],[317,312,2235],[318,312,2239],[319,313,2243],[320,313,2246],[321,314,2250],[297,214,2254],[296,213,2259],[324,316,2262],[325,316,2265],[326,317,2270],[293,210,2272],[295,209,2275],[328,317,2276],[296,208,2279],[290,210,2281],[297,207,2284],[331,317,2285],[288,210,2287],[287,210,2290],[333,317,2291],[334,317,2294],[285,210,2296],[299,203,2298],[299,202,2301],[283,210,2302],[300,201,2306],[300,200,2309],[300,199,2312],[300,198,2315],[301,197,2319],[302,196,2323],[303,196,2326],[304,195,2330],[304,194,2333],[273,211,2334],[306,196,2337],[304,192,2339],[271,213,2342],[308,196,2343],[304,190,2345],[269,214,2349],[310,197,2350],[268,215,2353],[306,187,2356],[267,216,2357],[307,186,2360],[314,197,2362],[308,184,2367],[308,182,2373],[309,180,2380],[310,178,2387],[310,176,2393],[311,174,2400]];
  var WSTART = 5380;
  var TS = .62; /* the whole handwriting is played faster than it was recorded */
  function pen() {
    if (!cv || !cv.getContext) { begin(); return; }
    var ctx = cv.getContext('2d'), S = cv.width / 434, p = 0, w = 0, t0 = 0;
    ctx.fillStyle = '#1a1717';
    /* the string of lights (the same picture, same bulbs) is wrapped around the logo by a small glowing spark that flies
       in and runs along the wire; the string appears softly behind it, never in hard round patches */
    var wc = el.querySelector('.xi-wire'), wx = wc && wc.getContext ? wc.getContext('2d') : null;
    var limg = new Image(), lready = false, dirty = false, mask = null, mx = null, brush = null, trail = [], sparkOn = true;
    if (wx) {
      mask = document.createElement('canvas'); mask.width = wc.width; mask.height = wc.height; mx = mask.getContext('2d');
      brush = document.createElement('canvas'); brush.width = brush.height = 64;
      var bx = brush.getContext('2d'), bg = bx.createRadialGradient(32, 32, 0, 32, 32, 32);
      bg.addColorStop(0, 'rgba(0,0,0,1)'); bg.addColorStop(.55, 'rgba(0,0,0,.95)'); bg.addColorStop(1, 'rgba(0,0,0,0)');
      bx.fillStyle = bg; bx.fillRect(0, 0, 64, 64);
    }
    limg.onload = function () { lready = true; dirty = true; };
    limg.src = wc ? wc.getAttribute('data-src') : '';
    function reveal(c) { if (!mx) return; var rad = 30 * S; mx.drawImage(brush, c[0] - rad, c[1] - rad, rad * 2, rad * 2); dirty = true; }
    /* the spark's path along the wire, in the same time units as the reveal (negative = flying in from the right) */
    var SPK = [[-650, 432, 316], [-330, 398, 336], [0, 352, 362], [60, 330, 392], [200, 300, 412], [430, 245, 418], [600, 205, 421], [800, 165, 424], [960, 135, 408],
      [1080, 127, 385], [1220, 138, 350], [1360, 150, 320], [1500, 185, 306], [1650, 225, 294], [1800, 262, 281], [1950, 295, 271], [2080, 305, 250], [2200, 301, 222], [2320, 299, 198], [2400, 304, 183]];
    function sparkAt(t) {
      if (t <= SPK[0][0]) return null;
      for (var i = 1; i < SPK.length; i++) if (t <= SPK[i][0]) {
        var a = SPK[i - 1], b = SPK[i], u = (t - a[0]) / (b[0] - a[0]);
        return [a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
      }
      return [SPK[SPK.length - 1][1], SPK[SPK.length - 1][2]];
    }
    function glow(x, y, r, a) {
      var g = wx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(255,255,255,' + a + ')'); g.addColorStop(.18, 'rgba(255,246,200,' + (a * .95) + ')');
      g.addColorStop(.45, 'rgba(255,196,96,' + (a * .38) + ')'); g.addColorStop(1, 'rgba(255,180,80,0)');
      wx.fillStyle = g; wx.beginPath(); wx.arc(x, y, r, 0, 6.2832); wx.fill();
    }
    function paint(e) {
      if (!wx) return false;
      var t = e / TS - WSTART, end = SPK[SPK.length - 1][0], fade = t > end ? Math.max(0, 1 - (t - end) / 420) : 1, sp = sparkAt(t);
      var live = sparkOn && sp && fade > 0;
      if (!dirty && !live && !trail.length) return false;
      dirty = false;
      wx.clearRect(0, 0, wc.width, wc.height);
      if (lready) { wx.globalCompositeOperation = 'source-over'; wx.drawImage(mask, 0, 0); wx.globalCompositeOperation = 'source-in'; wx.drawImage(limg, 0, 0, wc.width, wc.height); wx.globalCompositeOperation = 'source-over'; }
      if (live) {
        trail.push([sp[0] * S, sp[1] * S]); if (trail.length > 9) trail.shift();
        for (var i = 0; i < trail.length - 1; i++) glow(trail[i][0], trail[i][1], (4 + i * 1.1) * S, (.12 + i * .05) * fade);
        glow(sp[0] * S, sp[1] * S, 20 * S, .95 * fade);
        glow(sp[0] * S, sp[1] * S, 5.5 * S, fade);
        return true;
      }
      if (sp && fade <= 0) { sparkOn = false; trail = []; dirty = true; }
      return !!(sp && sparkOn);
    }
    function frame(now) {
      if (done) return;
      var e = now - t0;
      ctx.beginPath();
      while (p < PEN.length && PEN[p][3] * TS <= e) {
        var q = PEN[p], r = Math.max(1.4, q[2] * S * .98), cx = (q[0] + .5) * S, cy = (q[1] + .5) * S;
        ctx.moveTo(cx + r, cy); ctx.arc(cx, cy, r, 0, 6.2832);
        p++;
      }
      ctx.fill();
      while (w < SNAKE.length && (SNAKE[w][2] + WSTART) * TS <= e) { reveal([(SNAKE[w][0] + .5) * S, (SNAKE[w][1] + .5) * S]); w++; }
      var busy = paint(e);
      if (p < PEN.length || w < SNAKE.length || busy || dirty) raf = requestAnimationFrame(frame);
    }
    begin();
    t0 = performance.now();
    raf = requestAnimationFrame(frame);
  }
  /* start only once the page has finished loading, so the animation never competes with downloads */
  function go() {
    if (started || done) return;
    /* decode every picture first, so nothing stutters the first time it appears */
    var imgs = [].slice.call(el.querySelectorAll('img'));
    var decoded = Promise.all(imgs.map(function (i) { return i.decode ? i.decode().catch(function () {}) : null; }));
    var cap = new Promise(function (r) { setTimeout(r, 350); });
    Promise.race([decoded, cap]).then(function () { if (!started && !done) pen(); });
  }
  if (document.readyState !== 'loading') go(); else document.addEventListener('DOMContentLoaded', go);
  /* the music player's YouTube script can delay the page 'load' event on slow networks; never let that stop the logo from being written */
  setTimeout(function () { if (!started && !done) pen(); }, 900);
  setTimeout(finish, 20000);
})();

/* magnetic products: the product leans toward the pointer / finger as it gets close.
   Smooth: one rAF loop, frame-rate independent easing, GPU-friendly individual transform
   properties (translate / rotate / scale) written once per frame. */
(function () {
  'use strict';
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  var items = [], running = false, last = 0;

  function magnet(zone, anchor, targets, o) {
    var it = { zone: zone, anchor: anchor, targets: targets, o: o, px: 0, py: 0, active: false,
      tx: 0, ty: 0, tr: 0, ts: 1, cx: 0, cy: 0, cr: 0, cs: 1, settled: true };
    targets.forEach(function (t) { t.style.willChange = 'translate, rotate, scale'; });
    items.push(it);

    function aim(e) {
      it.px = e.clientX; it.py = e.clientY; it.active = true; it.settled = false; kick();
    }
    zone.addEventListener('pointermove', aim, { passive: true });
    zone.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse') aim(e); }, { passive: true });
    function rest() { it.active = false; it.settled = false; kick(); }
    zone.addEventListener('pointerleave', rest);
    zone.addEventListener('pointercancel', rest);
    zone.addEventListener('pointerup', function (e) { if (e.pointerType !== 'mouse') rest(); });
  }

  function update(it) {
    var o = it.o;
    /* while a snowball is being made the finger belongs to the snowball: the product stays still */
    if (it.active && document.body.classList.contains('xm-hold')) it.active = false;
    if (it.active) {
      var r = it.r || it.anchor.getBoundingClientRect();
      var dx = it.px - (r.left + r.width / 2), dy = it.py - (r.top + r.height / 2);
      var dist = Math.hypot(dx, dy) || 1;
      var R = Math.max(r.width, r.height) * o.radius;
      var pull = clamp(1 - dist / R, 0, 1); pull = pull * pull * (3 - 2 * pull);
      var reach = Math.min(dist * o.k, o.max) * (o.base + (1 - o.base) * pull);
      it.tx = dx / dist * reach; it.ty = dy / dist * reach;
      it.tr = clamp(dx / (r.width / 2), -1, 1) * o.rot * (o.base + (1 - o.base) * pull);
      it.ts = 1 + o.grow * pull;
    } else { it.tx = 0; it.ty = 0; it.tr = 0; it.ts = 1; }
  }

  function frame(now) {
    var dt = Math.min(64, now - last || 16); last = now;
    var more = false;
    /* read every rectangle first, then write: one layout per frame instead of one per product */
    items.forEach(function (it) { it.r = (!it.settled && it.active) ? it.anchor.getBoundingClientRect() : null; });
    items.forEach(function (it) {
      if (it.settled) return;
      update(it);
      /* time-based easing: same feel at 60, 90 or 120 fps; slower return than approach */
      var tau = it.active ? it.o.tau : it.o.tau * 1.6;
      var k = 1 - Math.exp(-dt / tau);
      it.cx += (it.tx - it.cx) * k; it.cy += (it.ty - it.cy) * k;
      it.cr += (it.tr - it.cr) * k; it.cs += (it.ts - it.cs) * k;
      var tr = it.cx.toFixed(2) + 'px ' + it.cy.toFixed(2) + 'px';
      it.targets.forEach(function (t) {
        t.style.translate = tr;
        if (it.o.rot) t.style.rotate = it.cr.toFixed(2) + 'deg';
        if (it.o.grow) t.style.scale = it.cs.toFixed(4);
      });
      if (!it.active && Math.abs(it.cx) < .03 && Math.abs(it.cy) < .03 && Math.abs(it.cr) < .01 && Math.abs(it.cs - 1) < .0005) {
        it.cx = it.cy = it.cr = 0; it.cs = 1;
        it.targets.forEach(function (t) { t.style.translate = ''; t.style.rotate = ''; t.style.scale = ''; });
        it.settled = true;
      } else more = true;
    });
    if (more) requestAnimationFrame(frame); else running = false;
  }
  function kick() { if (!running) { running = true; last = performance.now(); requestAnimationFrame(frame); } }

  var small = window.matchMedia && matchMedia('(max-width: 55.99rem)').matches;
  Array.prototype.forEach.call(document.querySelectorAll('[data-hero]'), function (hs) {
    var par = hs.querySelector('[data-magnet]'), stage = hs.querySelector('[data-stage]');
    if (par && stage) magnet(hs, stage, [par], { radius: 1.1, k: .3, max: small ? 34 : 70, base: .3, rot: small ? 4 : 7, grow: .06, tau: 120 });
  });
  Array.prototype.forEach.call(document.querySelectorAll('.p'), function (p) {
    var ph = p.querySelector('.ph');
    var t = ph ? Array.prototype.slice.call(ph.querySelectorAll('.pimg, svg')) : [];
    if (t.length) magnet(p, ph, t, { radius: 1.2, k: .14, max: 16, base: .35, rot: 0, grow: 0, tau: 110 });
  });
})();

/* menu drawer: open/close, filter menu links, live product search */
(function () {
  'use strict';
  var dlg = document.getElementById('MenuDrawer');
  if (!dlg) return;
  var M = window.MORZ || { routes: {}, strings: {} };
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  var input = $('[data-menu-search]', dlg);
  var list = $('[data-menu-list]', dlg);
  var res = $('[data-menu-results]', dlg);
  var empty = $('[data-menu-empty]', dlg);
  var items = $$('[data-menu-item]', list);
  var groups = $$('[data-menu-group]', list);
  var details = $$('details', list);
  var timer = null, ctrl = null, gotProducts = false, anyMenu = true;

  function open() {
    if (dlg.open) return;
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
    setTimeout(function () { if (input) input.focus(); }, 80);
  }
  function close() {
    if (typeof dlg.close !== 'function') { dlg.removeAttribute('open'); return; }
    if (!dlg.open || dlg.classList.contains('is-closing')) return;
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) { dlg.close(); return; }
    dlg.classList.add('is-closing');
    setTimeout(function () { dlg.classList.remove('is-closing'); dlg.close(); }, 380);
  }
  dlg.addEventListener('cancel', function (e) { e.preventDefault(); close(); });

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (t.closest && t.closest('[data-menu-open]')) { e.preventDefault(); open(); return; }
    if (t.closest && t.closest('[data-menu-close]')) { close(); return; }
    if (t === dlg) { close(); return; }
    if (dlg.open && t.closest && t.closest('#MenuDrawer a')) close();
  });

  function filterMenu(q) {
    var any = false, i;
    items.forEach(function (li) { li.hidden = false; });
    if (!q) {
      details.forEach(function (d) { d.open = false; });
      groups.forEach(function (g) { g.hidden = false; });
      return true;
    }
    for (i = items.length - 1; i >= 0; i--) {
      var li = items[i];
      var match = (li.getAttribute('data-label') || '').indexOf(q) > -1;
      var kids = $$('[data-menu-item]', li);
      if (kids.length) {
        var vis = kids.some(function (k) { return !k.hidden; });
        if (match) { kids.forEach(function (k) { k.hidden = false; }); vis = true; }
        li.hidden = !vis;
        var d = $('details', li);
        if (d) d.open = vis;
      } else {
        li.hidden = !match;
      }
      if (!li.hidden) any = true;
    }
    groups.forEach(function (g) { g.hidden = !$('[data-menu-item]:not([hidden])', g); });
    return any;
  }

  function money(v) {
    var n = parseFloat(v);
    if (isNaN(n)) return '';
    var f = M.moneyFormat || '${{amount}}';
    var s = n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    var s0 = Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return f.replace(/\{\{\s*(\w+)\s*\}\}/, function (_, k) { return /no_decimals/.test(k) ? s0 : s; });
  }

  function showEmpty() { empty.hidden = !(!anyMenu && !gotProducts); }

  function renderProducts(products, q) {
    res.textContent = '';
    gotProducts = products.length > 0;
    if (!gotProducts) { res.hidden = true; showEmpty(); return; }
    var h = document.createElement('h3');
    h.textContent = (M.strings && M.strings.menuProducts) || 'Products';
    res.appendChild(h);
    products.forEach(function (p) {
      var a = document.createElement('a');
      a.className = 'mr';
      a.href = p.url;
      if (p.image) {
        var img = document.createElement('img');
        img.src = p.image; img.alt = ''; img.loading = 'lazy'; img.width = 52; img.height = 52;
        a.appendChild(img);
      }
      var box = document.createElement('span');
      var b = document.createElement('b'); b.textContent = p.title;
      var i = document.createElement('i'); i.textContent = money(p.price);
      box.appendChild(b); box.appendChild(i); a.appendChild(box);
      res.appendChild(a);
    });
    var all = document.createElement('a');
    all.className = 'mr-all';
    all.href = (M.routes.search || '/search') + '?type=product&q=' + encodeURIComponent(q);
    all.textContent = (M.strings && M.strings.menuSeeAll) || 'See all results';
    res.appendChild(all);
    res.hidden = false;
    showEmpty();
  }

  function searchProducts(q) {
    if (ctrl && ctrl.abort) ctrl.abort();
    if (!window.fetch || q.length < 2) { renderProducts([], q); return; }
    ctrl = window.AbortController ? new AbortController() : null;
    var url = (M.routes.suggest || '/search/suggest') + '.json?q=' + encodeURIComponent(q) +
      '&resources[type]=product&resources[limit]=6&resources[options][unavailable_products]=last';
    fetch(url, ctrl ? { signal: ctrl.signal } : undefined)
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        var prods = j && j.resources && j.resources.results && j.resources.results.products;
        if (input.value.trim().toLowerCase() === q) renderProducts(prods || [], q);
      })
      .catch(function () {});
  }

  if (input) {
    input.addEventListener('input', function () {
      var q = input.value.trim().toLowerCase();
      anyMenu = filterMenu(q);
      if (!q) { res.hidden = true; res.textContent = ''; gotProducts = false; empty.hidden = true; clearTimeout(timer); return; }
      showEmpty();
      clearTimeout(timer);
      timer = setTimeout(function () { searchProducts(q); }, 220);
    });
  }
  dlg.addEventListener('close', function () {
    if (!input) return;
    input.value = '';
    filterMenu('');
    res.hidden = true; res.textContent = ''; empty.hidden = true; gotProducts = false; anyMenu = true;
  });
})();


/* smooth page transitions (fallback for browsers without cross-document view transitions) */
(function () {
  'use strict';
  var root = document.documentElement;
  if (!root.classList.contains('fx')) return;
  window.addEventListener('pageshow', function () { root.classList.remove('leaving'); });
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    var u;
    try { u = new URL(a.href, location.href); } catch (err) { return; }
    if (u.origin !== location.origin) return;
    if (u.pathname === location.pathname && u.search === location.search) return;
    e.preventDefault();
    root.classList.add('leaving');
    setTimeout(function () { location.href = u.href; }, 280);
  });
})();


/* keep the hero text clear of the (floating) header: measure its real height */
(function () {
  'use strict';
  var g = document.querySelector('.shopify-section-group-header-group');
  if (!g) return;
  function set() { document.documentElement.style.setProperty('--hdr', g.offsetHeight + 'px'); }
  set();
  if (window.ResizeObserver) new ResizeObserver(set).observe(g); else window.addEventListener('resize', set);
  window.addEventListener('load', set);
})();

/* header: search toggle (mobile) + language picker (Shopify languages, or Google Translate fallback) */
(function () {
  'use strict';
  var hdr = document.querySelector('header.top');
  var sb = document.querySelector('[data-search-toggle]');
  if (hdr && sb) sb.addEventListener('click', function () {
    var open = hdr.classList.toggle('s-open'); sb.setAttribute('aria-expanded', open ? 'true' : 'false');
    var i = hdr.querySelector('.search-form .search'); if (open && i) i.focus();
  });
  var gt = document.querySelector('[data-gt-select]');
  function cookie(v) {
    var host = location.hostname, base = 'googtrans=' + v + ';path=/';
    document.cookie = base; document.cookie = base + ';domain=' + host;
  }
  function loadGT() {
    if (window.__gt) return; window.__gt = true;
    window.gtInit = function () { new google.translate.TranslateElement({ pageLanguage: 'en', autoDisplay: false }, 'gt-el'); };
    var sc = document.createElement('script'); sc.src = 'https://translate.google.com/translate_a/element.js?cb=gtInit'; document.head.appendChild(sc);
  }
  if (gt) {
    var m = document.cookie.match(/googtrans=\/en\/([\w-]+)/);
    if (m) { gt.value = m[1]; loadGT(); }
    gt.addEventListener('change', function () {
      if (gt.value === 'en') { cookie('/en/en'); document.cookie = 'googtrans=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/'; }
      else cookie('/en/' + gt.value);
      location.reload();
    });
  }
})();

