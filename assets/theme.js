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
        /* XXL / XXXL have their own card link (they cost a little more): the button switches to it and says so */
        var big = cardLinks.length > 1 && bigSize(o), L = big ? cardLinks[cardLinks.length - 1] : cardLinks[0];
        var was = cardBtn.getAttribute('href');
        cardBtn.href = L.href;
        cardBtn.classList.toggle('is-big', big);
        cardBtn.innerHTML = big ? '<span class="bn-t">Buy now</span><small class="bn-s">XXL / XXXL size</small>' : '<span class="bn-t">Buy now</span>';
        if (cardBtn.__ready && was !== L.href) { cardBtn.classList.remove('bn-swap'); void cardBtn.offsetWidth; cardBtn.classList.add('bn-swap'); }
        cardBtn.__ready = true;
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
  /* the intro plays once per visit: on every other page it is hidden, and nothing of it may run (no late snow storm) */
  if (!root.classList.contains('intro-on')) { if (el.parentNode) el.parentNode.removeChild(el); return; }
  var done = false, endTimer = null, started = false, raf = 0;
  /* the end of the intro: a snow storm builds up, blows the logo away and keeps blowing for a few seconds;
     the shop appears behind it while it dies down */
  var STORM = 3200;
  function blowSnow() {
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return 0;
    var W = window.innerWidth, H = window.innerHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
    var c = document.createElement('canvas'); c.className = 'xi-gust'; c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
    var x = c.getContext && c.getContext('2d'); if (!x) return 0;
    x.scale(dpr, dpr); document.body.appendChild(c);
    var spr = document.createElement('canvas'); spr.width = spr.height = 64;
    var sx = spr.getContext('2d'), sg = sx.createRadialGradient(32, 32, 0, 32, 32, 32);
    sg.addColorStop(0, 'rgba(255,255,255,1)'); sg.addColorStop(.45, 'rgba(244,248,253,.92)'); sg.addColorStop(.78, 'rgba(176,196,224,.38)'); sg.addColorStop(1, 'rgba(176,196,224,0)');
    sx.fillStyle = sg; sx.fillRect(0, 0, 64, 64);
    /* how hard it snows over time: builds up quickly, blows hard, then thins out */
    function power(t) { return t < 350 ? t / 350 : t < 1900 ? 1 : Math.max(0, 1 - (t - 1900) / (STORM - 2300)); }
    var P = [], S2 = [], i, rate = Math.min(1.25, W * H / 600000) * 1.1, acc = 0, last = 0;
    function spawn(t, k) {
      var big = Math.random() < .12;
      P.push({ s: t, y: Math.random() * H * 1.1 - H * .05, v: (big ? 760 : 1050) + Math.random() * 950, sz: big ? 22 + Math.random() * 54 : 2.4 + Math.random() * 7.5,
        a: big ? .32 + Math.random() * .3 : .8 + Math.random() * .2, w: Math.random() * 6.28, dy: (Math.random() - .25) * 110, big: big, x0: k ? -Math.random() * W * .4 - 60 : -80 });
    }
    for (i = 0; i < 26; i++) S2.push({ s: Math.random() * (STORM - 900), y: Math.random() * H, v: 1700 + Math.random() * 900, L: 120 + Math.random() * 180, w: Math.random() * 6.28 });
    var t0 = performance.now();
    (function frame(now) {
      var t = now - t0, k;
      /* new flakes keep blowing in for as long as the storm lasts */
      acc += (t - last) * rate * power(t); last = t;
      while (acc >= 1) { spawn(t - Math.random() * 16, P.length < 40); acc -= 1; }
      x.clearRect(0, 0, W, H);
      /* the air itself turns white in the thick of it */
      var veil = .26 * Math.min(1, power(t) * 1.4) * (t < 1900 ? 1 : power(t));
      if (veil > .005) { x.fillStyle = 'rgba(244,248,253,' + veil.toFixed(3) + ')'; x.fillRect(0, 0, W, H); }
      for (k = 0; k < S2.length; k++) {
        var q = S2[k], dq = (t - q.s) / 1000; if (dq < 0) continue;
        var qx = -q.L + q.v * dq, qy = q.y + Math.sin(dq * 4 + q.w) * 14; if (qx > W + q.L) continue;
        var lg = x.createLinearGradient(qx - q.L, 0, qx, 0); lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(.7, 'rgba(255,255,255,.75)'); lg.addColorStop(1, 'rgba(255,255,255,0)');
        x.strokeStyle = 'rgba(120,145,180,.18)'; x.lineWidth = 2.6; x.beginPath(); x.moveTo(qx - q.L, qy + 1.5); x.quadraticCurveTo(qx - q.L / 2, qy - 6, qx, qy + 1.5); x.stroke();
        x.strokeStyle = lg; x.lineWidth = 1.6; x.beginPath(); x.moveTo(qx - q.L, qy); x.quadraticCurveTo(qx - q.L / 2, qy - 7.5, qx, qy); x.stroke();
      }
      var alive = [];
      for (k = 0; k < P.length; k++) {
        var p = P[k], d = (t - p.s) / 1000; if (d < 0) { alive.push(p); continue; }
        var px = p.x0 + p.v * d + 40 * Math.sin(d * 5 + p.w), py = p.y + p.dy * d + Math.sin(d * 7 + p.w) * 9;
        if (px > W + 100) continue;
        alive.push(p);
        var st = 1 + Math.min(1.8, p.v / 900), fade = Math.min(1, d * 6);
        x.globalAlpha = p.a * fade;
        if (!p.big) { x.fillStyle = 'rgba(105,130,168,.32)'; x.fillRect(px - p.sz * st * .3 + 1, py - p.sz * .15 + 1.4, p.sz * st * .6, p.sz * .38); }
        x.drawImage(spr, px - p.sz * st / 2, py - p.sz / 2, p.sz * st, p.sz);
      }
      P = alive; x.globalAlpha = 1;
      if (t < STORM || P.length) requestAnimationFrame(frame); else c.remove();
    })(t0);
    return 1;
  }
  var completeNow = null;
  function finish() {
    if (done) return; done = true;
    clearTimeout(endTimer); cancelAnimationFrame(raf);
    /* whatever ends the intro, the whole logo (signature and lights) is on screen before the wind takes it */
    if (completeNow) { try { completeNow(); } catch (e) {} }
    el.classList.add('is-done');
    var gust = blowSnow();
    if (gust) {
      /* the logo is blown away first, the storm keeps blowing, then the shop shows through as it dies down */
      setTimeout(function () { el.classList.add('is-blown'); }, 380);
      setTimeout(function () { el.classList.add('is-out'); root.classList.remove('intro-on'); }, 1700);
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 3200);
    } else {
      el.classList.add('is-out'); root.classList.remove('intro-on');
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 1300);
    }
  }
  /* only the Skip button (or Esc) skips: a tap anywhere else (to start the music, to scroll) must not cut the signature short */
  el.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('[data-intro-skip]')) finish(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') finish(); });

  var cv = el.querySelector('.xi-pen');
  var PEN = [[101,446,2.8,250],[102,445,2.8,252],[102,444,2.8,253],[103,443,3.2,255],[104,442,3.6,257],[105,441,3.2,258],[105,440,3.2,260],[106,439,3.6,262],[106,438,3.2,263],[107,437,3.6,266],[108,436,3.6,267],[108,435,3.2,269],[109,434,3.6,271],[110,433,3.6,273],[110,432,3.2,275],[111,431,3.6,277],[111,430,3.2,279],[112,429,3.6,281],[113,428,3.2,283],[113,427,3.2,285],[114,426,3.2,287],[114,425,3.2,289],[115,424,3.2,291],[115,423,3.2,293],[116,422,3.2,295],[116,421,3.2,297],[117,420,3.6,299],[117,419,3.2,301],[118,418,3.2,303],[118,417,3.2,305],[119,416,3.2,308],[119,415,3.2,309],[120,414,3.6,312],[120,413,3.2,314],[121,412,3.2,317],[121,411,3.2,318],[122,410,3.6,321],[122,409,3.2,323],[123,408,3.6,326],[123,407,3.2,327],[123,406,2.8,329],[123,405,2.5,331],[123,404,2.5,333],[124,403,2.8,336],[124,402,2.5,338],[123,402,2.5,339],[124,401,2.5,340],[123,401,2.5,341],[125,401,2.5,341],[122,402,2.5,341],[124,400,2.5,342],[121,401,2.5,344],[122,400,2.5,344],[126,400,3.0,344],[123,399,2.5,344],[121,400,2.5,345],[122,399,2.5,345],[121,399,2.5,346],[127,399,2.5,346],[120,399,2.8,348],[127,398,2.5,348],[127,397,2.8,350],[128,396,3.2,353],[129,395,3.6,356],[130,394,3.0,359],[130,393,3.2,360],[130,392,2.8,363],[131,391,3.0,365],[131,390,3.0,368],[131,389,2.8,369],[132,388,3.2,372],[132,387,2.8,374],[133,386,3.2,377],[133,385,3.0,379],[134,384,3.0,382],[134,383,3.2,384],[134,382,3.0,386],[134,381,3.0,389],[134,380,3.2,390],[134,379,3.6,392],[134,378,3.2,395],[135,377,4.0,398],[136,376,4.0,401],[136,375,4.1,402],[137,374,3.6,405],[137,373,3.6,408],[138,372,3.6,411],[138,371,3.6,413],[139,370,3.2,416],[139,369,3.6,417],[139,368,3.2,420],[140,367,3.6,423],[140,366,3.6,425],[140,365,3.2,427],[141,364,3.6,430],[141,363,3.6,432],[142,362,3.2,435],[142,361,3.6,437],[142,360,3.2,439],[143,359,3.2,442],[143,358,3.6,444],[143,357,3.2,446],[144,356,3.6,449],[144,355,3.6,451],[144,354,3.2,453],[145,353,3.6,456],[145,352,3.6,458],[145,351,3.2,460],[146,350,3.6,463],[146,349,3.6,465],[146,348,3.2,467],[147,347,4.0,470],[147,346,3.6,472],[147,345,3.2,474],[147,344,3.0,476],[147,343,3.0,479],[148,342,4.1,481],[148,341,4.2,483],[148,340,3.6,485],[149,339,4.1,488],[150,338,4.0,491],[150,337,4.1,493],[151,336,3.6,495],[151,335,3.6,498],[151,334,3.2,500],[152,333,3.6,503],[152,332,3.6,504],[152,331,3.2,506],[153,330,3.6,509],[153,329,3.6,511],[153,328,3.2,513],[154,327,4.0,516],[154,326,4.0,518],[155,325,3.0,520],[155,324,2.5,522],[155,323,2.5,524],[155,322,2.5,526],[155,321,2.5,528],[155,320,2.5,530],[155,319,2.5,531],[156,318,3.0,534],[157,317,3.6,536],[157,316,3.2,538],[158,315,3.6,540],[158,314,3.2,542],[158,313,3.0,544],[159,312,3.6,546],[159,311,3.6,548],[159,310,3.2,550],[160,309,3.6,552],[160,308,3.6,554],[161,307,3.2,557],[161,306,3.6,558],[161,305,3.2,560],[161,304,3.0,561],[162,303,4.0,564],[162,302,3.6,566],[162,301,3.2,567],[163,300,3.2,569],[163,299,3.6,571],[163,298,3.2,572],[164,297,3.2,575],[164,296,3.6,576],[164,295,3.2,578],[164,294,3.0,579],[165,293,3.6,581],[165,292,3.6,582],[165,291,3.2,584],[165,290,3.0,585],[165,289,3.2,587],[166,288,4.1,588],[166,287,4.5,590],[166,286,5.0,591],[166,285,5.0,593],[166,284,5.0,594],[166,283,4.1,595],[165,283,4.0,596],[167,283,4.5,596],[167.9,280.1,4.43,601],[168.8,277.1,4.36,605],[169.7,274.2,4.28,610],[170.6,271.2,4.21,615],[171.4,268.3,4.14,620],[172.3,265.3,4.07,625],[173.2,262.4,3.99,630],[174.1,259.4,3.92,635],[175.0,256.5,3.85,640],[175.9,253.6,3.78,645],[176.8,250.6,3.71,650],[177.7,247.7,3.63,654],[178.6,244.7,3.56,659],[179.4,241.8,3.49,664],[180.3,238.8,3.42,669],[181.2,235.9,3.34,674],[182.1,232.9,3.27,679],[183,230,3.2,684],[183,229,3.6,685],[183,228,4.0,686],[183,227,4.1,688],[183,226,4.1,690],[183,225,3.6,692],[184,224,4.1,694],[184,223,3.6,696],[185,222,4.0,698],[185,221,3.6,701],[185,220,3.2,702],[186,219,3.6,705],[186,218,3.6,707],[186,217,3.2,710],[186,216,3.0,711],[187,215,3.6,714],[187,214,3.6,717],[187,213,3.2,719],[187,212,3.0,720],[188,211,4.0,723],[189,210,3.2,726],[189,209,3.6,728],[190,208,3.0,731],[190,207,2.8,732],[191,206,2.5,735],[191,205,2.5,736],[191,204,2.5,738],[191,203,2.5,739],[193.5,201.2,2.75,744],[196.0,199.3,3.0,749],[198.5,197.5,3.25,754],[201.0,195.7,3.5,759],[203.5,193.8,3.75,764],[206,192,4.0,769],[206,193,3.6,770],[207,194,4.0,772],[207,195,4.0,773],[207,196,4.0,775],[207,197,4.0,776],[208,198,4.0,779],[208,199,4.0,781],[208,200,4.0,782],[208,201,4.0,784],[208,202,4.0,786],[208,203,4.0,788],[208,204,4.0,790],[208,205,4.0,791],[209,206,4.0,794],[209,207,4.0,796],[209,208,4.0,799],[209,209,4.0,800],[209,210,4.0,803],[209,211,3.6,805],[210,212,4.0,808],[210,213,4.0,809],[210,214,4.0,812],[210,215,4.0,814],[210,216,3.6,816],[211,217,4.0,819],[211,218,4.0,821],[211,219,4.0,823],[211,220,4.0,825],[211,221,4.0,827],[211,222,3.6,829],[211,223,3.2,831],[212,224,4.0,834],[212,225,4.0,836],[212,226,3.6,838],[212,227,3.2,839],[213,228,4.0,842],[213,229,3.6,844],[214,230,3.0,846],[214,231,3.2,847],[214,232,3.2,849],[215,233,3.0,851],[215,234,3.0,853],[215,235,2.8,854],[215.8,238.2,2.87,859],[216.7,241.3,2.93,864],[217.5,244.5,3.0,869],[218.3,247.7,3.07,875],[219.2,250.8,3.13,880],[220,254,3.2,885],[220,255,3.6,886],[220,256,4.0,888],[220,257,3.6,889],[220,258,3.2,891],[221,259,4.0,892],[221,260,3.6,894],[222,261,4.0,896],[222,262,4.0,897],[222,263,3.6,899],[223,264,4.1,901],[223,265,3.6,903],[224,266,4.1,905],[224,267,3.6,907],[225,268,4.1,909],[225,269,3.6,911],[226,270,4.1,913],[226,271,3.6,915],[227,272,4.1,918],[228,273,3.6,920],[228,274,3.6,922],[229,275,4.1,925],[230,276,4.2,927],[231,277,4.2,930],[232,278,4.2,933],[233,279,4.1,935],[234,279,3.6,937],[235,279,3.2,939],[236,280,4.0,942],[237,280,4.0,944],[238,280,4.0,946],[239,280,4.0,948],[240,280,4.1,950],[241,279,3.6,953],[242,279,4.1,955],[243,278,3.6,958],[244,277,3.6,961],[245,276,3.6,964],[245,275,3.2,966],[246,274,3.6,969],[247,273,3.2,972],[247,272,3.6,974],[248,271,3.2,977],[248,270,3.2,979],[248,269,3.0,981],[249,268,3.2,984],[249,267,3.2,986],[250,266,3.2,989],[250,265,3.2,991],[250,264,3.0,993],[251,263,3.2,996],[251,262,3.2,998],[251,261,3.0,1000],[252,260,3.2,1003],[252,259,3.2,1005],[252,258,3.0,1007],[253,257,3.0,1010],[253,256,3.2,1012],[253,255,3.0,1014],[253,254,3.0,1016],[254,253,3.2,1019],[254,252,3.2,1021],[254,251,3.0,1023],[255,250,3.2,1026],[255,249,3.2,1027],[255,248,3.0,1029],[256,247,3.0,1032],[256,246,3.2,1034],[256,245,3.2,1036],[256,244,3.0,1038],[257,243,3.2,1041],[257,242,3.2,1042],[257,241,3.0,1044],[258,240,3.0,1047],[258,239,3.2,1048],[258,238,3.2,1050],[258,237,3.0,1051],[259,236,3.2,1054],[259,235,3.2,1056],[259,234,3.0,1057],[260,233,3.0,1060],[260,232,3.2,1061],[260,231,3.2,1063],[260,230,3.0,1064],[261,229,3.2,1066],[261,228,3.6,1068],[261,227,3.2,1069],[262,226,3.0,1071],[262,225,3.0,1072],[262,224,2.8,1074],[263,223,2.5,1076],[263.6,220.0,2.54,1081],[264.2,217.0,2.58,1086],[264.9,214.0,2.61,1091],[265.5,211.0,2.65,1096],[266.1,208.0,2.69,1100],[266.8,205.0,2.72,1105],[267.4,202.0,2.76,1110],[268,199,2.8,1115],[269,198,3.2,1117],[269,197,3.0,1118],[269,196,3.0,1119],[270,195,3.2,1122],[270,194,3.2,1123],[270,193,3.0,1125],[270,192,3.0,1126],[271,191,3.2,1128],[271,190,3.6,1130],[271,189,3.2,1132],[272,188,3.0,1134],[272,187,3.2,1136],[272,186,3.2,1138],[272,185,3.0,1140],[273,184,3.2,1142],[273,183,3.2,1144],[273,182,3.0,1146],[274,181,3.2,1149],[274,180,3.6,1150],[274,179,3.2,1152],[275,178,3.2,1155],[275,177,3.6,1157],[275,176,3.2,1159],[275,175,3.0,1161],[276,174,3.6,1164],[276,173,3.6,1166],[276,172,3.2,1168],[276,171,3.0,1170],[277,170,4.0,1173],[278,169,4.5,1176],[279,169,4.1,1178],[280,168,5.0,1181],[281,168,5.1,1183],[282,168,5.4,1185],[283,169,5.0,1188],[284,170,4.1,1191],[284,171,4.5,1193],[284,172,4.1,1195],[284,173,4.0,1197],[285,174,4.0,1200],[285,175,4.0,1203],[285,176,4.1,1204],[285,177,4.0,1206],[285,178,4.0,1209],[285,179,4.0,1210],[286,180,4.1,1213],[286,181,4.5,1215],[286,182,4.1,1217],[286,183,4.0,1219],[286,184,4.0,1221],[286,185,4.0,1222],[286,186,4.0,1224],[287,187,4.0,1227],[287,188,4.0,1229],[287,189,4.1,1231],[287,190,4.1,1232],[287,191,4.0,1234],[287,192,4.0,1236],[287,193,4.0,1237],[287,194,4.0,1239],[287,195,4.0,1240],[288,196,4.0,1242],[288,197,4.0,1244],[288,198,4.0,1245],[288,199,4.0,1247],[288,200,4.0,1248],[288,201,4.0,1249],[288.5,204.0,4.0,1254],[289.0,207.0,4.0,1259],[289.5,210.0,4.0,1264],[290.0,213.0,4.0,1269],[290.5,216.0,4.0,1274],[291,219,4.0,1279],[291,220,4.0,1280],[291,221,4.0,1281],[291,222,4.0,1282],[291,223,4.0,1284],[291,224,4.0,1285],[291,225,4.0,1286],[292,226,4.0,1288],[292,227,4.0,1290],[292,228,4.0,1291],[292,229,4.0,1293],[292,230,4.0,1294],[292,231,4.0,1295],[292,232,4.0,1297],[292,233,3.6,1298],[293,234,4.1,1301],[293,235,4.0,1303],[293,236,4.0,1304],[293,237,4.0,1306],[294,238,4.1,1308],[294,239,4.0,1309],[294,240,4.0,1311],[294,241,4.0,1313],[294,242,4.0,1314],[294,243,4.0,1316],[294,244,4.0,1318],[294,245,4.0,1319],[295,246,4.0,1322],[295,247,4.0,1324],[295,248,4.0,1325],[295,249,4.0,1327],[295,250,4.0,1328],[295,251,4.0,1330],[295,252,4.0,1332],[295,253,3.6,1334],[295,254,3.2,1336],[296,255,4.0,1338],[296,256,4.0,1340],[296,257,4.0,1342],[296,258,4.0,1344],[296,259,4.0,1346],[296,260,3.6,1348],[296,261,3.2,1349],[296,262,3.0,1351],[297,263,4.0,1354],[297,264,4.0,1356],[297,265,4.0,1358],[297,266,4.0,1360],[297,267,4.0,1361],[298,268,4.1,1364],[298,269,3.6,1366],[298,270,2.8,1368],[298,271,2.5,1370],[298,272,2.5,1372],[298,273,2.5,1374],[298,274,2.5,1376],[297,275,2.5,1379],[297,276,2.5,1381],[298,277,3.0,1384],[298,278,3.0,1385],[299,279,3.6,1388],[299,280,3.6,1391],[299,281,3.2,1393],[299,282,3.0,1394],[299,283,3.0,1397],[300,284,4.0,1400],[300,285,3.6,1402],[300,286,3.2,1403],[300,287,3.0,1406],[300,288,3.0,1408],[301,289,4.0,1411],[301,290,4.0,1413],[301,291,3.6,1415],[301,292,3.2,1417],[301,293,3.0,1419],[301,294,3.0,1421],[302,295,4.0,1424],[302,296,4.0,1426],[302,297,3.6,1428],[302,298,3.2,1430],[302,299,3.0,1432],[302,300,3.0,1435],[303,301,4.0,1438],[303,302,4.0,1439],[303,303,3.6,1442],[303,304,3.2,1444],[304,305,4.0,1447],[304,306,4.0,1448],[304,307,4.0,1451],[304,308,4.0,1453],[304,309,3.6,1455],[304,310,3.2,1457],[305,311,4.0,1460],[305,312,4.0,1462],[305,313,3.6,1464],[305,314,3.2,1466],[306,315,4.0,1469],[306,316,4.0,1471],[307,317,4.1,1474],[307,318,4.0,1476],[308,319,3.2,1479],[309,319,2.5,1481],[307,320,4.1,1482],[310,319,2.5,1483],[310,318,2.5,1484],[307,321,4.0,1484],[311,319,2.5,1486],[311,320,2.5,1486],[308,322,4.5,1487],[311,317,2.5,1487],[312,318,2.5,1488],[308,323,4.1,1489],[308,324,4.0,1491],[308,325,4.0,1493],[308,326,4.0,1495],[308,327,4.0,1497],[308,328,4.0,1499],[308,329,4.0,1501],[308,330,4.0,1503],[308,331,4.0,1505],[309,332,4.0,1508],[309,333,4.1,1510],[309,334,4.0,1512],[309,335,4.0,1514],[310,336,4.0,1517],[310,337,4.0,1519],[310,338,4.0,1521],[310,339,4.0,1523],[310,340,3.6,1525],[311,341,4.0,1528],[311,342,4.0,1529],[311,343,3.6,1531],[311,344,3.2,1533],[311,345,3.0,1535],[312,346,4.0,1538],[312,347,4.0,1540],[312,348,4.0,1541],[312,349,3.2,1543],[313,350,2.5,1546],[313,351,2.5,1547],[312,352,2.5,1550],[314,352,2.5,1550],[314,353,2.5,1552],[311,353,2.5,1553],[313,353,2.5,1553],[314,354,2.5,1554],[313,354,2.5,1555],[312,354,2.5,1555],[314,355,2.8,1556],[314,356,2.8,1558],[314,357,2.5,1559],[314,358,2.5,1561],[314,359,2.5,1562],[314,360,2.5,1564],[315,361,2.5,1567],[316,362,2.5,1569],[316,363,3.0,1571],[317,362,2.5,1571],[316,364,2.8,1573],[316,365,2.5,1574],[316,366,2.5,1576],[317,367,2.8,1578],[317,368,2.8,1580],[317,369,2.5,1582],[317,370,2.5,1583],[317,371,2.5,1585],[318,372,2.8,1586],[318,373,2.8,1588],[318,374,2.5,1590],[318,375,2.5,1591],[319,376,3.0,1593],[320,377,3.2,1595],[320,378,3.2,1597],[320,379,3.0,1598],[320,380,3.2,1600],[321,381,4.5,1601],[321,382,5.0,1603],[321,383,5.0,1604],[321,384,5.0,1606],[322,385,4.0,1607],[323,386,3.0,1609],[190,357,4.0,1779],[189,357,4.0,1781],[188,357,4.0,1784],[187,357,4.0,1787],[186,357,4.0,1789],[185,357,4.0,1792],[184,357,3.6,1794],[183,357,3.2,1798],[182,358,3.6,1801],[181,358,3.6,1803],[180,358,3.2,1807],[179,359,3.6,1810],[178,359,3.6,1814],[177,360,3.2,1817],[176,360,3.6,1821],[175,360,3.2,1823],[174,361,3.6,1827],[173,362,3.6,1832],[172,362,3.2,1834],[171,363,3.6,1839],[170,364,3.6,1844],[169,364,3.6,1847],[168,365,3.6,1852],[167,366,3.6,1856],[166,367,3.6,1861],[165,368,3.6,1865],[164,369,3.6,1870],[163,370,3.6,1875],[163,371,3.6,1878],[162,372,4.1,1883],[161,373,4.2,1887],[160,374,4.2,1892],[159,375,4.1,1898],[159,376,4.1,1901],[159,377,3.6,1904],[159,378,3.2,1908],[158,379,4.0,1913],[157,380,5.0,1918],[157,381,5.4,1922],[157,382,5.1,1925],[156,383,5.4,1930],[155,384,4.1,1936],[155,385,4.0,1939],[155,386,4.0,1942],[155,387,4.0,1947],[155,388,4.0,1950],[155,389,4.0,1954],[154,390,3.2,1960],[154,391,3.6,1963],[154,392,4.0,1967],[154,393,4.0,1971],[153,394,3.0,1976],[153,395,3.2,1980],[153,396,3.6,1984],[153,397,4.0,1987],[153,398,4.0,1992],[153,399,4.0,1995],[153,400,4.0,2000],[153,401,4.0,2003],[153,402,4.0,2007],[153,403,4.0,2011],[153,404,4.0,2015],[153,405,4.0,2019],[153,406,4.0,2023],[153,407,4.0,2028],[153,408,4.0,2031],[153,409,3.6,2034],[154,410,4.0,2040],[154,411,4.0,2045],[155,412,3.6,2051],[155,413,3.6,2054],[156,414,4.1,2060],[157,415,4.2,2065],[158,416,4.1,2071],[159,416,3.6,2075],[160,417,4.1,2080],[161,417,3.6,2085],[162,418,4.1,2091],[163,418,4.0,2094],[164,419,4.5,2100],[165,419,4.1,2105],[166,419,4.0,2108],[167,419,4.0,2113],[168,419,4.0,2116],[169,418,3.0,2122],[170,418,3.2,2125],[171,418,3.6,2130],[172,418,4.0,2133],[173,418,4.0,2138],[174,417,3.2,2144],[175,417,3.6,2147],[176,417,4.0,2152],[177,416,3.2,2156],[178,416,3.6,2161],[179,416,3.6,2164],[180,415,3.6,2170],[181,415,3.6,2175],[182,414,3.6,2179],[183,413,3.6,2185],[184,413,3.6,2190],[185,412,3.6,2194],[186,411,3.6,2200],[187,410,3.6,2206],[188,409,3.6,2212],[189,408,3.6,2216],[190,407,3.6,2222],[191,406,3.6,2228],[192,405,3.6,2232],[193,404,3.6,2238],[194,403,3.6,2244],[195,402,3.6,2248],[195,401,3.2,2252],[196,400,3.6,2258],[197,399,3.6,2262],[197,398,3.2,2267],[198,397,3.6,2271],[198,396,3.2,2275],[199,395,3.6,2281],[199,394,3.2,2284],[200,393,3.6,2289],[200,392,3.2,2292],[201,391,3.2,2297],[201,390,3.6,2300],[201,389,3.2,2304],[202,388,3.2,2309],[202,387,3.6,2313],[202,386,3.2,2315],[202,385,3.0,2318],[202,384,3.0,2322],[202,383,3.0,2325],[202,382,3.0,2329],[203,381,4.0,2333],[203,380,4.0,2337],[203,379,4.0,2340],[203,378,4.0,2343],[203,377,4.0,2346],[203,376,4.0,2350],[203,375,4.0,2352],[203,374,4.0,2355],[203,373,4.0,2359],[202,372,3.0,2362],[202,371,3.2,2366],[202,370,3.6,2369],[202,369,4.0,2371],[201,368,3.2,2376],[201,367,3.6,2378],[201,366,4.0,2382],[200,365,3.6,2385],[200,364,4.1,2387],[199,363,4.2,2392],[198,362,4.2,2396],[197,361,4.2,2399],[196,360,4.2,2402],[195,359,4.1,2406],[194,358,3.6,2409],[213,407,2.5,2539],[214,406,3.0,2542],[214,405,3.0,2544],[215,404,3.6,2547],[215,403,3.6,2548],[215,402,3.2,2551],[215,401,3.0,2552],[216,400,4.0,2555],[216,399,4.0,2558],[216,398,4.0,2559],[217,397,4.1,2563],[217,396,4.1,2565],[217,395,4.0,2567],[217,394,4.0,2570],[218,393,5.0,2573],[218,392,4.5,2575],[218,391,4.1,2578],[218,390,4.0,2580],[218,389,4.0,2583],[219,388,5.0,2587],[219,387,5.0,2589],[219,386,4.5,2591],[220,385,5.1,2595],[220,384,5.0,2598],[220,383,5.0,2600],[221,382,5.8,2604],[221,381,5.8,2607],[221,380,5.4,2610],[221,379,5.1,2612],[221,378,5.0,2615],[221,377,5.0,2618],[222,377,5.4,2619],[220,376,4.0,2622],[223,377,5.1,2622],[220,375,4.0,2625],[224,376,4.0,2626],[220,374,4.0,2627],[225,376,4.0,2629],[220,373,4.0,2631],[226,375,3.2,2632],[220,372,4.0,2633],[227,374,2.8,2636],[220,371,4.0,2636],[220,370,3.6,2639],[228,373,3.2,2640],[220,369,3.2,2641],[229,372,3.2,2644],[220,368,3.0,2644],[220,367,3.0,2647],[229,371,3.2,2647],[220,366,3.0,2650],[230,370,3.2,2651],[221,365,4.0,2654],[230,369,3.2,2654],[221,364,4.0,2656],[231,368,3.2,2658],[221,363,4.0,2659],[231,367,2.8,2660],[221,362,4.0,2662],[232,366,3.2,2664],[221,361,3.6,2665],[221,360,3.2,2667],[233,365,3.2,2668],[221,359,3.0,2670],[233,364,2.8,2671],[221,358,3.0,2673],[234,363,3.2,2675],[222,357,4.0,2676],[235,362,2.8,2679],[222,356,4.0,2679],[235,361,2.8,2681],[222,355,4.0,2682],[222,354,4.0,2684],[236,360,3.2,2685],[222,353,4.0,2687],[237,359,2.8,2688],[222,352,4.0,2690],[237,358,2.8,2691],[222,351,3.6,2692],[238,357,3.2,2695],[222,350,3.2,2695],[239,356,3.6,2698],[223,349,3.0,2698],[223,348,3.2,2700],[240,355,3.6,2701],[240,354,3.2,2703],[241,353,3.6,2707],[242,352,3.6,2711],[243,351,3.6,2714],[244,350,3.6,2716],[245,349,3.6,2719],[245,348,3.2,2722],[246,347,3.6,2724],[247,346,3.6,2727],[248,345,3.6,2730],[249,344,3.2,2732],[250,343,2.8,2735],[259,350,3.2,2855],[260,350,3.6,2857],[261,349,4.1,2860],[262,348,3.6,2864],[263,348,4.1,2867],[264,347,3.6,2870],[265,347,4.0,2872],[266,346,3.2,2877],[267,346,3.6,2879],[268,346,3.6,2882],[269,345,3.6,2885],[270,345,4.0,2889],[271,344,3.2,2892],[272,344,3.6,2895],[273,344,3.6,2897],[274,343,3.6,2902],[275,343,4.0,2905],[276,342,3.2,2910],[277,342,3.6,2912],[278,342,3.6,2915],[279,341,3.6,2919],[280,341,4.0,2923],[281,341,4.0,2926],[282,341,4.0,2929],[283,341,4.1,2932],[284,341,4.5,2935],[285,340,5.0,2939],[286,340,5.4,2943],[287,340,5.8,2946],[287,341,5.8,2948],[286,342,5.0,2952],[286,343,4.5,2956],[286,344,4.1,2959],[286,345,4.0,2962],[285,346,3.0,2967],[285,347,3.2,2970],[285,348,3.6,2974],[284,349,3.2,2979],[284,350,3.6,2982],[283,351,3.2,2988],[283,352,3.6,2991],[282,353,3.2,2995],[282,354,3.6,3000],[281,355,3.2,3004],[281,356,3.2,3007],[280,357,3.6,3013],[279,358,3.2,3018],[279,359,3.6,3022],[278,360,3.2,3027],[278,361,3.6,3031],[278,362,3.2,3034],[277,363,3.6,3039],[276,364,3.2,3045],[276,365,3.6,3048],[275,366,3.2,3054],[275,367,3.6,3058],[275,368,3.2,3061],[274,369,3.6,3067],[273,370,3.2,3072],[273,371,3.6,3076],[273,372,3.2,3080],[272,373,3.6,3086],[272,374,3.6,3089],[271,375,3.6,3094],[271,376,3.6,3098],[270,377,3.6,3103],[270,378,3.6,3108],[269,379,3.2,3113],[269,380,3.6,3116],[269,381,3.2,3121],[268,382,3.6,3126],[268,383,3.6,3130],[267,384,3.6,3135],[267,385,3.6,3138],[266,386,3.2,3144],[266,387,3.6,3148],[266,388,3.2,3152],[265,389,3.6,3157],[265,390,4.0,3161],[264,391,3.6,3167],[264,392,4.0,3170],[263,393,3.2,3176],[263,394,3.6,3179],[263,395,4.0,3183],[262,396,3.2,3189],[262,397,3.6,3192],[262,398,4.0,3197],[261,399,3.6,3201],[261,400,4.0,3206],[261,401,4.1,3209],[261,402,4.0,3214],[261,403,4.0,3217],[261,404,4.0,3221],[260,405,4.5,3226],[260,406,5.0,3230],[260,407,5.1,3235],[260,408,5.4,3238],[261,408,5.7,3241],[262,408,5.0,3244],[263,408,4.5,3248],[264,408,4.1,3251],[265,408,4.0,3256],[266,407,3.0,3261],[267,407,3.2,3266],[268,407,3.6,3270],[269,407,4.0,3274],[270,406,3.0,3281],[271,406,3.2,3284],[272,406,3.6,3288],[273,406,3.6,3292],[274,405,3.6,3298],[275,405,4.0,3303],[276,404,3.2,3309],[277,404,3.6,3313],[278,404,4.0,3317],[279,403,3.2,3323],[280,403,3.6,3327],[281,403,3.6,3331],[282,402,3.6,3337],[283,402,4.0,3341],[284,401,3.2,3349],[285,401,3.6,3352],[286,401,4.0,3356],[287,400,3.2,3362],[288,400,3.6,3367],[289,400,3.6,3371],[290,399,3.6,3378],[291,399,3.6,3381],[292,398,3.0,3387],[293,398,3.2,3392],[294,398,3.6,3395],[295,397,3.0,3401],[296,397,3.2,3406],[297,397,3.2,3409],[298,396,3.2,3415],[299,396,3.6,3419],[300,396,3.2,3424],[301,395,3.2,3428],[302,395,3.6,3432],[303,395,3.2,3437],[304,394,3.6,3442],[305,394,4.0,3445],[306,394,4.1,3450],[307,394,4.0,3453],[308,394,4.1,3456],[309,394,4.1,3460]];
  function begin() {
    if (started || done) return; started = true;
    el.classList.add('go');
    endTimer = setTimeout(finish, (parseFloat(el.getAttribute('data-end')) || 9.6) * 1000);
  }
  /* pen: round ink dots follow the written path in time order, so the strokes grow like real handwriting */
  var SNAKE = [[352,361,0],[350,363,8],[350,365,13],[349,367,20],[347,369,28],[346,371,35],[345,373,42],[344,375,49],[342,377,58],[341,378,62],[340,378,65],[344,379,68],[345,379,71],[346,379,74],[347,379,77],[348,380,81],[349,380,84],[333,379,87],[332,380,91],[331,381,95],[330,382,100],[329,383,104],[328,384,108],[327,385,113],[325,373,116],[324,373,119],[323,373,122],[324,387,124],[322,371,128],[321,375,131],[322,388,132],[320,376,135],[322,368,137],[320,387,139],[319,377,140],[320,386,142],[319,390,143],[322,366,143],[317,377,146],[318,390,147],[316,377,149],[321,384,150],[322,392,151],[315,378,153],[320,383,154],[323,393,155],[314,379,158],[314,390,159],[314,389,160],[320,361,161],[325,395,164],[313,388,165],[313,392,167],[313,382,168],[313,387,168],[325,397,171],[319,358,172],[325,398,174],[313,385,174],[319,357,175],[311,395,179],[311,396,182],[310,397,186],[325,403,190],[325,404,193],[325,405,196],[325,406,199],[326,407,204],[327,408,208],[327,409,211],[328,410,216],[328,411,219],[328,412,222],[329,413,227],[330,414,232],[301,408,237],[300,410,245],[300,411,249],[300,412,252],[300,413,255],[300,414,258],[295,411,263],[294,411,266],[293,411,270],[292,411,273],[302,419,278],[303,420,282],[304,421,287],[305,422,292],[306,423,296],[285,413,299],[284,413,302],[283,413,306],[282,413,309],[309,427,314],[279,413,319],[277,414,327],[275,414,334],[273,415,342],[271,416,350],[269,416,357],[267,417,366],[265,417,372],[263,417,379],[261,417,386],[259,417,393],[257,417,400],[255,417,407],[253,417,414],[251,417,421],[249,417,428],[247,418,436],[245,420,446],[243,421,455],[242,420,460],[243,424,463],[243,425,467],[243,426,470],[243,427,474],[239,416,478],[238,415,483],[237,415,487],[236,415,490],[235,415,494],[234,415,497],[233,415,501],[232,415,505],[231,415,508],[230,415,512],[229,415,515],[228,415,519],[226,415,526],[224,415,533],[222,415,540],[220,415,548],[218,416,556],[216,416,564],[214,417,572],[212,417,580],[210,418,589],[208,419,597],[206,421,608],[205,423,617],[203,425,627],[202,427,636],[202,428,639],[200,426,645],[199,425,650],[202,432,654],[202,433,658],[202,434,662],[202,435,665],[202,436,669],[202,437,673],[202,438,676],[202,439,680],[191,424,684],[190,424,688],[189,424,692],[200,442,694],[204,443,698],[199,443,700],[186,424,703],[204,445,706],[197,444,709],[184,424,710],[183,424,714],[195,444,716],[194,444,720],[193,444,724],[192,445,729],[191,445,733],[190,445,736],[189,445,740],[188,445,744],[187,445,748],[186,445,751],[185,445,755],[184,445,759],[183,445,763],[182,446,768],[168,427,775],[166,427,782],[164,427,790],[162,427,798],[160,427,805],[158,427,813],[156,427,820],[154,428,829],[152,429,839],[151,428,844],[151,427,848],[152,433,852],[152,434,855],[152,435,859],[152,436,863],[152,437,867],[148,422,872],[148,421,875],[147,420,881],[146,420,885],[145,419,890],[144,419,894],[143,418,899],[142,418,903],[141,417,909],[140,417,912],[139,416,918],[138,415,923],[137,414,929],[135,412,939],[133,410,950],[131,408,961],[130,406,971],[130,404,978],[129,402,988],[127,400,998],[125,400,1006],[123,398,1017],[122,396,1026],[122,395,1030],[123,394,1036],[118,396,1040],[117,396,1043],[116,396,1047],[126,391,1052],[126,390,1056],[126,389,1060],[126,388,1064],[126,387,1068],[126,386,1071],[126,385,1075],[126,384,1079],[126,383,1083],[127,382,1089],[127,381,1092],[127,380,1096],[103,394,1101],[102,394,1105],[101,394,1109],[100,394,1113],[99,394,1116],[98,394,1120],[97,393,1126],[127,371,1131],[128,369,1141],[128,367,1148],[129,365,1158],[129,363,1165],[128,361,1175],[127,360,1180],[126,360,1184],[130,358,1190],[131,357,1195],[122,360,1200],[121,360,1204],[120,360,1208],[134,354,1212],[135,353,1217],[136,352,1223],[136,351,1227],[137,350,1232],[138,349,1238],[138,348,1241],[139,347,1247],[140,346,1252],[141,345,1258],[142,344,1263],[143,342,1273],[143,340,1280],[143,338,1288],[143,336,1296],[144,334,1305],[144,332,1313],[145,330,1322],[145,328,1330],[146,326,1340],[146,324,1347],[146,322,1355],[146,320,1363],[146,318,1370],[146,317,1374],[147,317,1376],[147,316,1380],[149,320,1383],[148,315,1385],[142,317,1388],[141,317,1391],[140,317,1395],[152,322,1398],[151,312,1402],[138,317,1403],[154,322,1406],[151,310,1409],[136,317,1411],[156,322,1413],[157,322,1417],[152,308,1419],[133,317,1422],[159,322,1425],[152,306,1426],[152,305,1430],[161,322,1432],[130,316,1435],[129,316,1439],[163,322,1440],[153,302,1443],[127,316,1447],[165,322,1448],[153,300,1451],[125,316,1455],[167,322,1456],[168,322,1459],[123,316,1462],[155,297,1466],[156,296,1471],[172,322,1475],[173,321,1480],[174,321,1484],[175,321,1488],[176,321,1492],[177,321,1495],[178,320,1501],[179,320,1505],[180,320,1509],[158,286,1513],[158,285,1516],[158,284,1520],[158,283,1524],[184,320,1527],[185,318,1531],[158,281,1532],[185,317,1535],[184,323,1538],[158,279,1539],[158,278,1543],[158,277,1547],[186,314,1548],[185,326,1551],[158,275,1555],[187,312,1557],[186,328,1561],[158,273,1562],[158,272,1566],[158,271,1570],[189,309,1571],[188,331,1575],[158,269,1577],[190,307,1581],[188,333,1583],[191,306,1586],[189,334,1588],[160,267,1590],[156,266,1594],[193,305,1595],[162,267,1598],[163,267,1602],[195,304,1604],[153,265,1607],[152,265,1611],[197,303,1613],[151,264,1616],[167,265,1620],[199,302,1622],[149,263,1625],[169,264,1629],[201,302,1630],[170,264,1633],[149,260,1637],[203,301,1639],[171,262,1642],[149,258,1644],[205,301,1647],[172,260,1651],[149,256,1652],[149,255,1655],[172,258,1658],[208,299,1661],[150,253,1664],[172,256,1666],[210,299,1668],[151,251,1673],[211,298,1674],[172,253,1677],[151,249,1681],[173,252,1682],[214,297,1686],[172,251,1688],[174,250,1692],[171,250,1693],[174,249,1695],[152,245,1697],[217,296,1699],[153,244,1703],[218,295,1704],[154,243,1708],[168,247,1709],[155,243,1712],[167,246,1714],[156,243,1715],[166,245,1719],[178,244,1720],[158,243,1723],[165,244,1725],[223,294,1725],[180,244,1727],[224,293,1730],[160,243,1730],[163,243,1734],[225,292,1735],[175,241,1736],[183,244,1739],[224,291,1740],[184,244,1742],[223,290,1746],[185,244,1746],[222,290,1749],[186,244,1750],[229,292,1750],[223,288,1753],[173,237,1754],[187,245,1755],[223,287,1757],[231,292,1757],[220,288,1760],[173,235,1761],[188,241,1762],[189,246,1764],[173,234,1765],[189,240,1767],[190,246,1767],[173,233,1768],[220,285,1771],[223,283,1771],[173,232,1772],[220,284,1774],[223,282,1775],[190,238,1776],[220,283,1778],[173,230,1779],[237,292,1779],[220,282,1782],[190,236,1783],[174,229,1785],[220,281,1785],[190,235,1787],[174,228,1788],[190,234,1790],[220,279,1791],[174,227,1792],[241,292,1794],[197,245,1795],[190,232,1798],[220,277,1798],[174,225,1799],[243,292,1801],[174,224,1803],[191,230,1806],[174,223,1806],[201,245,1809],[191,229,1810],[202,245,1813],[191,228,1814],[203,245,1817],[175,220,1819],[204,245,1820],[175,219,1823],[205,245,1824],[191,225,1825],[250,291,1828],[249,294,1828],[176,217,1831],[249,295,1832],[207,244,1833],[191,222,1836],[208,244,1836],[191,221,1839],[209,244,1840],[252,288,1842],[249,298,1843],[178,214,1845],[249,299,1846],[190,219,1848],[249,300,1850],[212,245,1852],[249,301,1854],[253,285,1855],[189,217,1857],[214,245,1859],[181,211,1861],[188,216,1862],[249,304,1864],[187,216,1865],[182,210,1866],[183,210,1869],[256,282,1870],[187,214,1870],[257,282,1873],[186,214,1874],[186,213,1876],[258,281,1878],[252,307,1880],[259,280,1884],[220,249,1887],[254,309,1890],[261,279,1892],[255,310,1895],[223,249,1898],[263,278,1901],[264,278,1904],[225,249,1905],[265,277,1909],[227,249,1912],[266,277,1913],[258,315,1917],[229,249,1919],[230,249,1923],[231,249,1926],[232,249,1930],[233,249,1933],[234,248,1938],[235,248,1942],[236,248,1945],[237,249,1950],[238,249,1954],[239,250,1959],[240,250,1962],[241,250,1966],[281,274,1970],[282,273,1975],[283,273,1979],[285,272,1987],[287,272,1994],[289,272,2001],[291,272,2008],[293,272,2015],[295,272,2022],[297,272,2029],[299,272,2035],[301,272,2042],[303,271,2050],[305,270,2059],[307,269,2067],[308,270,2072],[309,270,2075],[310,271,2080],[304,264,2083],[304,263,2086],[304,262,2090],[313,274,2094],[314,275,2099],[315,275,2102],[304,258,2103],[304,257,2107],[317,276,2110],[312,278,2111],[303,255,2115],[319,276,2117],[320,276,2120],[303,253,2121],[310,281,2124],[322,276,2127],[303,251,2128],[310,283,2131],[324,276,2133],[303,249,2134],[325,277,2138],[310,286,2141],[302,247,2142],[301,246,2147],[301,245,2150],[301,244,2154],[301,243,2157],[300,242,2161],[300,241,2165],[300,240,2168],[300,239,2171],[300,238,2174],[300,237,2178],[300,236,2181],[300,235,2184],[311,300,2188],[311,301,2191],[312,302,2195],[299,231,2198],[299,230,2201],[299,229,2205],[299,228,2208],[299,227,2211],[298,226,2215],[298,225,2219],[298,224,2222],[298,223,2225],[298,222,2228],[316,312,2232],[317,312,2235],[318,312,2239],[319,313,2243],[320,313,2246],[321,314,2250],[297,214,2254],[296,213,2259],[324,316,2262],[325,316,2265],[326,317,2270],[293,210,2272],[295,209,2275],[328,317,2276],[296,208,2279],[290,210,2281],[297,207,2284],[331,317,2285],[288,210,2287],[287,210,2290],[333,317,2291],[334,317,2294],[285,210,2296],[299,203,2298],[299,202,2301],[283,210,2302],[300,201,2306],[300,200,2309],[300,199,2312],[300,198,2315],[301,197,2319],[302,196,2323],[303,196,2326],[304,195,2330],[304,194,2333],[273,211,2334],[306,196,2337],[304,192,2339],[271,213,2342],[308,196,2343],[304,190,2345],[269,214,2349],[310,197,2350],[268,215,2353],[306,187,2356],[267,216,2357],[307,186,2360],[314,197,2362],[308,184,2367],[308,182,2373],[309,180,2380],[310,178,2387],[310,176,2393],[311,174,2400]];
  var WSTART = 5380;
  var TS = .62; /* the string of lights is played faster than it was recorded */
  /* the signature is written like a person signing: each letter is one unbroken line (the M is one stroke up, down,
     up, down), the M quickly, the o a little slower, the r a little quicker and the z slowing down to the end, with a
     short lift of the pen between letters; everything after it (hat, lights, bulbs, end) starts SHIFT ms later */
  var PTS = 1, SHIFT = 880;
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
    /* only the part of the string that changed is redrawn each frame (never the whole big picture), so it never stutters */
    var box = null;
    function grow(x0, y0, x1, y1) {
      x0 = Math.max(0, Math.floor(x0)); y0 = Math.max(0, Math.floor(y0)); x1 = Math.min(wc.width, Math.ceil(x1)); y1 = Math.min(wc.height, Math.ceil(y1));
      if (!box) box = [x0, y0, x1, y1]; else { box[0] = Math.min(box[0], x0); box[1] = Math.min(box[1], y0); box[2] = Math.max(box[2], x1); box[3] = Math.max(box[3], y1); }
    }
    limg.onload = function () { lready = true; if (wc) { grow(0, 0, wc.width, wc.height); comp(); } };
    limg.src = wc ? wc.getAttribute('data-src') : '';
    function reveal(c) { if (!mx) return; var rad = 30 * S; mx.drawImage(brush, c[0] - rad, c[1] - rad, rad * 2, rad * 2); grow(c[0] - rad, c[1] - rad, c[0] + rad, c[1] + rad); }
    function comp() {
      if (!wx || !box || !lready) return;
      var x0 = box[0], y0 = box[1], bw = box[2] - x0, bh = box[3] - y0, k = limg.naturalWidth / wc.width, kh = limg.naturalHeight / wc.height;
      box = null;
      if (bw <= 0 || bh <= 0) return;
      wx.save(); wx.beginPath(); wx.rect(x0, y0, bw, bh); wx.clip();
      wx.clearRect(x0, y0, bw, bh);
      wx.globalCompositeOperation = 'source-over'; wx.drawImage(mask, x0, y0, bw, bh, x0, y0, bw, bh);
      var sx = x0 * k, sy = y0 * kh, sw = Math.min(bw * k, limg.naturalWidth - sx), sh = Math.min(bh * kh, limg.naturalHeight - sy);
      wx.globalCompositeOperation = 'source-in'; if (sw > 0 && sh > 0) wx.drawImage(limg, sx, sy, sw, sh, x0, y0, sw / k, sh / kh);
      wx.restore();
    }
    /* the spark and its tail are small glowing dots moved by the graphics card (not painted into the big canvas) */
    var logoEl = el.querySelector('.xi-logo'), U = (logoEl ? logoEl.clientWidth : 434) / 434, spk = null, spkDots = [], penDone = false;
    if (logoEl) {
      spk = document.createElement('div'); spk.className = 'xi-spk'; spk.setAttribute('aria-hidden', 'true');
      for (var sd = 0; sd <= 12; sd++) { var dd = document.createElement('i'); if (sd === 12) dd.className = 'h'; spk.appendChild(dd); spkDots.push(dd); }
      var under = logoEl.querySelector('.xi-lights');
      logoEl.insertBefore(spk, under);
      window.addEventListener('resize', function () { U = logoEl.clientWidth / 434; });
    }
    function dot(d, x, y, r, a) { d.style.transform = 'translate3d(' + (x * U - r * U).toFixed(1) + 'px,' + (y * U - r * U).toFixed(1) + 'px,0) scale(' + (r * U / 50).toFixed(3) + ')'; d.style.opacity = a.toFixed(3); }
    /* the spark's path along the wire, in the same time units as the reveal (negative = flying in from the right) */
    var SPK = [[-650, 432, 316], [-330, 398, 336], [0, 352, 362], [60, 330, 392], [200, 300, 412], [430, 245, 418], [600, 205, 421], [800, 165, 424], [960, 135, 408],
      [1080, 127, 385], [1220, 138, 350], [1360, 150, 320], [1500, 185, 306], [1650, 225, 294], [1800, 262, 281], [1950, 295, 271], [2080, 305, 250], [2200, 301, 222], [2320, 299, 198], [2400, 304, 183]];
    /* the spark glides like a snake: a smooth curve (Catmull-Rom) through the guide points, travelled at a speed that
       is smoothed over time, so it eases in from the right, never jerks at a corner and comes softly to rest */
    var sparkAt = (function () {
      var n = SPK.length, SEG = 16, samp = [], knot = [], len = 0, px = null, py = 0, i, j, k;
      function G(m) { return SPK[Math.max(0, Math.min(n - 1, m))]; }
      function cr(a, b, c, d, u, o) { var u2 = u * u, u3 = u2 * u; return .5 * (2 * b[o] + (c[o] - a[o]) * u + (2 * a[o] - 5 * b[o] + 4 * c[o] - d[o]) * u2 + (3 * b[o] - a[o] - 3 * c[o] + d[o]) * u3); }
      for (i = 0; i < n; i++) {
        for (j = 0; j < (i < n - 1 ? SEG : 1); j++) {
          var u = j / SEG, x = i < n - 1 ? cr(G(i - 1), G(i), G(i + 1), G(i + 2), u, 1) : G(i)[1], y = i < n - 1 ? cr(G(i - 1), G(i), G(i + 1), G(i + 2), u, 2) : G(i)[2];
          if (px !== null) len += Math.sqrt((x - px) * (x - px) + (y - py) * (y - py));
          if (j === 0) knot.push(len);
          samp.push([x, y, len]); px = x; py = y;
        }
      }
      var T0 = SPK[0][0], T1 = SPK[n - 1][0], STEP = 10, M = Math.round((T1 - T0) / STEP) + 1, sm = [], seg = 0;
      for (k = 0; k < M; k++) {
        var t = T0 + k * STEP;
        while (seg < n - 2 && t > SPK[seg + 1][0]) seg++;
        var f = Math.max(0, Math.min(1, (t - SPK[seg][0]) / (SPK[seg + 1][0] - SPK[seg][0])));
        sm.push(knot[seg] + (knot[seg + 1] - knot[seg]) * f);
      }
      for (var pass = 0; pass < 3; pass++) {
        var R = 9, out = [];
        for (k = 0; k < M; k++) { var acc = 0; for (j = -R; j <= R; j++) acc += sm[Math.max(0, Math.min(M - 1, k + j))]; out.push(acc / (2 * R + 1)); }
        sm = out;
      }
      var s0 = sm[0], s1 = sm[M - 1];
      for (k = 0; k < M; k++) sm[k] = (sm[k] - s0) / (s1 - s0) * len;
      return function (t) {
        if (t <= T0) return null;
        var L = len;
        if (t < T1) { var fk = (t - T0) / STEP, k0 = Math.floor(fk); L = sm[k0] + (sm[Math.min(M - 1, k0 + 1)] - sm[k0]) * (fk - k0); }
        var lo = 0, hi = samp.length - 1;
        while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (samp[mid][2] < L) lo = mid; else hi = mid; }
        var A = samp[lo], B = samp[hi], g = B[2] > A[2] ? (L - A[2]) / (B[2] - A[2]) : 0;
        return [A[0] + (B[0] - A[0]) * g, A[1] + (B[1] - A[1]) * g];
      };
    })();
    function paint(e) {
      if (!spk) return false;
      var t = (e - SHIFT) / TS - WSTART, end = SPK[SPK.length - 1][0], fade = t > end ? Math.max(0, 1 - (t - end) / 420) : 1, sp = sparkAt(t);
      if (!sp) return true;                       /* not flown in yet: keep the loop going */
      if (!sparkOn) return false;
      if (fade <= 0) { sparkOn = false; spk.style.opacity = '0'; return false; }
      /* a soft comet tail taken from where the spark was a moment ago (time based, so it is the same at any frame rate) */
      for (var tk = 12; tk >= 1; tk--) { var tq = sparkAt(t - tk * 12), d = spkDots[12 - tk]; if (!tq) { d.style.opacity = '0'; continue; } var tf = 1 - tk / 13; dot(d, tq[0], tq[1], 3.2 + tf * 9, (.04 + tf * .24) * fade); }
      dot(spkDots[12], sp[0], sp[1], 20, fade);
      return true;
    }
    function frame(now) {
      if (done) return;
      try { step(now - t0); } catch (err) { box = null; }
      if (!done) {
        if (p < PEN.length || w < SNAKE.length || stepBusy || box) raf = requestAnimationFrame(frame);
        else if (spk) { spk.remove(); spk = null; }
      }
    }
    var stepBusy = false, heads = [];
    function step(e) {
      ctx.beginPath();
      while (p < PEN.length && PEN[p][3] * PTS <= e) {
        var q = PEN[p], r = Math.max(2.5, q[2]) * S * .98, cx = (q[0] + .5) * S, cy = (q[1] + .5) * S;
        /* inside one stroke (no pen lift) the gap is filled from the nearest end of the same line, so the ink is one smooth
           line, never beads; a letter whose two parts grow at the same time (the r: stem and arm) keeps them as two clean
           lines instead of being webbed together */
        var q0 = p > 0 ? PEN[p - 1] : null;
        if (!q0 || q[3] - q0[3] >= 40) heads = [];
        var hj = -1, hd = 1e9;
        for (var hk = 0; hk < heads.length; hk++) { var hx = heads[hk][0] - q[0], hy = heads[hk][1] - q[1], hdd = hx * hx + hy * hy; if (hdd < hd) { hd = hdd; hj = hk; } }
        if (hj > -1 && hd <= 100) {
          var h0 = heads[hj], ax = (h0[0] + .5) * S, ay = (h0[1] + .5) * S, ar = Math.max(2.5, h0[2]) * S * .98, gd = Math.sqrt((cx - ax) * (cx - ax) + (cy - ay) * (cy - ay));
          var gn = Math.floor(gd / (Math.min(r, ar) * .45));
          for (var gk = 1; gk < gn; gk++) { var gu = gk / gn, gx = ax + (cx - ax) * gu, gy = ay + (cy - ay) * gu, gr = ar + (r - ar) * gu; ctx.moveTo(gx + gr, gy); ctx.arc(gx, gy, gr, 0, 6.2832); }
          heads[hj] = q;
        } else { heads.push(q); if (heads.length > 3) heads.shift(); }
        ctx.moveTo(cx + r, cy); ctx.arc(cx, cy, r, 0, 6.2832);
        p++;
      }
      ctx.fill();
      if (!penDone && p >= PEN.length) { penDone = true; try { document.dispatchEvent(new CustomEvent('morz:pen-done')); } catch (x) {} }
      while (w < SNAKE.length && (SNAKE[w][2] + WSTART) * TS + SHIFT <= e) { reveal([(SNAKE[w][0] + .5) * S, (SNAKE[w][1] + .5) * S]); w++; }
      comp();
      stepBusy = paint(e);
    }
    completeNow = function () {
      step(1e9);
      while (w < SNAKE.length) { reveal([(SNAKE[w][0] + .5) * S, (SNAKE[w][1] + .5) * S]); w++; }
      comp();
      if (spk) { spk.remove(); spk = null; }
    };
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

