/* hero entrance animation (GSAP). Skips for reduced motion, waits for the intro screen. */
(function () {
  'use strict';
  var hs = document.querySelector('[data-hero]');
  if (!hs || !window.gsap) return;
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var root = document.documentElement;
  var q = function (s) { return hs.querySelectorAll(s); };

  function run() {
    var tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.from(q('[data-word]'), { yPercent: 40, autoAlpha: 0, duration: 1.1, clearProps: 'all' })
      .from(q('.ht h1, .ht p'), { y: 30, autoAlpha: 0, duration: .8, stagger: .12, clearProps: 'all' }, '-=.7')
      .from(q('[data-stage]'), { scale: .88, autoAlpha: 0, duration: 1, clearProps: 'all' }, '-=.8')
      .from(q('.info > [data-slide-info]:not([hidden]) > *, .nav2'), { y: 24, autoAlpha: 0, duration: .6, stagger: .08, clearProps: 'all' }, '-=.6');
  }

  if (!root.classList.contains('intro-on')) return run();
  var mo = new MutationObserver(function () {
    if (!root.classList.contains('intro-on')) { mo.disconnect(); run(); }
  });
  mo.observe(root, { attributes: true, attributeFilter: ['class'] });
})();
