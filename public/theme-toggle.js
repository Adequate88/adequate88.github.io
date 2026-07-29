/* theme-toggle.js — lightweight light/dark switch with persistence. */
(function () {
  var root = document.documentElement;

  function sync(theme) {
    var btn = document.querySelector('.theme-toggle');
    if (btn) {
      btn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
      btn.setAttribute('title', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    }
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#120e0c' : '#f0ece1');
  }

  function init() {
    var btn = document.querySelector('.theme-toggle');
    var current = root.getAttribute('data-theme') || 'light';
    sync(current);

    if (btn && !btn._wired) {
      btn._wired = true;
      btn.addEventListener('click', function () {
        var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        root.setAttribute('data-theme', next);
        try { localStorage.setItem('theme', next); } catch (e) {}
        sync(next);
      });
    }
  }

  init();
  document.addEventListener('astro:page-load', init);

  try {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
      if (localStorage.getItem('theme')) return;
      var t = e.matches ? 'dark' : 'light';
      root.setAttribute('data-theme', t);
      sync(t);
    });
  } catch (e) {}
})();
