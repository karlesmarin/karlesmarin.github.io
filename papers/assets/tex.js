// encaje: asset de excovery.publicaciones (MathJax solo en la vista): cada <span class="tex" data-tex> lleva ya su texto
// plano legible (el que leen Scholar y los buscadores); aquí se dibuja el TeX de data-tex. Sin JS, o si el CDN falla,
// queda el texto plano. En el índice solo se dibujan las fichas desplegadas, al desplegarlas.
(function () {
  'use strict';
  var todas = document.querySelectorAll('.tex[data-tex]');
  if (!todas.length) return;
  var URL = 'https://cdnjs.cloudflare.com/ajax/libs/mathjax/3.2.2/es5/tex-chtml.js';
  var listo = null;

  function cargar() {
    if (listo) return listo;
    listo = new Promise(function (ok, mal) {
      window.MathJax = {
        tex: { inlineMath: [['\\(', '\\)']], displayMath: [['\\[', '\\]']] },
        options: { enableMenu: false },
        chtml: { scale: 1.0 },
        startup: { typeset: false, ready: function () { MathJax.startup.defaultReady(); ok(); } }
      };
      var s = document.createElement('script');
      s.src = URL; s.async = true; s.onerror = mal;
      document.head.appendChild(s);
    });
    return listo;
  }

  function visibles(raiz) {
    return Array.prototype.filter.call(raiz.querySelectorAll('.tex[data-tex]:not([data-hecho])'), function (el) {
      var d = el.closest('details');
      return !d || d.open;
    });
  }

  function dibujar(raiz) {
    var els = visibles(raiz || document);
    if (!els.length) return;
    cargar().then(function () {
      els.forEach(function (el) {
        if (el.dataset.hecho) return;
        el.dataset.hecho = '1';
        el.setAttribute('title', el.textContent);   // el texto plano, al pasar el ratón
        var d = el.classList.contains('tex-d');
        el.textContent = (d ? '\\[' : '\\(') + el.dataset.tex + (d ? '\\]' : '\\)');
      });
      return MathJax.typesetPromise(els);
    }).catch(function () { /* sin MathJax: queda el texto plano */ });
  }

  dibujar(document);
  document.addEventListener('toggle', function (ev) {
    if (ev.target.open) dibujar(ev.target);
  }, true);
})();
