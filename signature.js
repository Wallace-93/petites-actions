/* =====================================================================
   NiouDem — script de signature
   Apparition au défilement et cases à cocher du programme.
   Aucune dépendance, aucun appel réseau.
   ===================================================================== */
(function () {
  'use strict';

  var COCHE = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
    '<path d="M5 12L10 17L19 7" stroke="white" stroke-width="3.2" ' +
    'stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function demarrer() {
    /* --- Case à cocher devant chaque module du programme --- */
    var modules = document.querySelectorAll('.module .module-header');
    for (var i = 0; i < modules.length; i++) {
      if (modules[i].querySelector('.module-case')) continue;
      var span = document.createElement('span');
      span.className = 'module-case';
      span.setAttribute('aria-hidden', 'true');
      span.innerHTML = COCHE;
      modules[i].insertBefore(span, modules[i].firstChild);
    }

    /* --- Apparition au défilement ---
       Les sections sont marquées ici plutôt que dans le HTML, pour que
       les pages restent lisibles sans JavaScript : sans ce script,
       aucune classe n'est posée et tout s'affiche normalement. */
    var cibles = document.querySelectorAll(
      '.section > .s-title, .section > .s-sub, .section > .s-tag, ' +
      '.oc, .module, .compare-card, .sim-box, .tarif-renvoi, .p-card'
    );
    if (!cibles.length) return;

    var bouge = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (bouge || !('IntersectionObserver' in window)) return;

    for (var j = 0; j < cibles.length; j++) {
      cibles[j].classList.add('nd-revele');
    }

    var obs = new IntersectionObserver(function (entrees) {
      entrees.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('vu');
        obs.unobserve(e.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    for (var k = 0; k < cibles.length; k++) {
      obs.observe(cibles[k]);
    }

    /* Filet de sécurité : si quelque chose empêche l'observateur de se
       déclencher, tout redevient visible au bout de deux secondes. */
    setTimeout(function () {
      var restants = document.querySelectorAll('.nd-revele:not(.vu)');
      for (var m = 0; m < restants.length; m++) {
        var r = restants[m].getBoundingClientRect();
        if (r.top < window.innerHeight) restants[m].classList.add('vu');
      }
    }, 2000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', demarrer);
  } else {
    demarrer();
  }
})();
