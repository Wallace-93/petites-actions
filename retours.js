/* =====================================================================
   Petites Actions — widget de retours
   Autonome : charge lui-même le client Supabase si la page ne l'a pas,
   n'utilise aucune variable CSS de la page hôte, et fonctionne aussi
   bien pour un visiteur connecté que pour un anonyme.
   Inclusion : <script src="retours.js" defer></script> avant </body>
   ===================================================================== */
(function () {
  'use strict';

  var URL_SB = 'https://pchkshpbzsybvtwxqvrf.supabase.co';
  var CLE_SB = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjaGtzaHBienN5YnZ0d3hxdnJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5NDgwMTAsImV4cCI6MjEwMTUyNDAxMH0.3EqyBUDmHHJ79mdDD6dmpVwsuEA0h2hF-75Up9R2Snc';
  var CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
  var DELAI_ANTI_SPAM = 30000; /* 30 s entre deux envois */

  var CATEGORIES = [
    { cle: 'bug',     libelle: 'Un bug' },
    { cle: 'contenu', libelle: 'Le contenu' },
    { cle: 'idee',    libelle: 'Une idée' },
    { cle: 'autre',   libelle: 'Autre' }
  ];

  var STYLES = [
    '.pa-r-btn{position:fixed;right:18px;bottom:18px;z-index:9998;display:flex;align-items:center;gap:8px;',
    '  background:#1E4B3C;color:#fff;border:0;border-radius:100px;padding:11px 18px;cursor:pointer;',
    "  font-family:'Karla',system-ui,sans-serif;font-size:14px;font-weight:600;line-height:1;",
    '  box-shadow:0 6px 22px -8px rgba(18,33,43,.5);transition:transform .18s,background .18s;}',
    '.pa-r-btn:hover{background:#173C30;transform:translateY(-1px);}',
    '.pa-r-btn svg{width:15px;height:15px;}',
    '.pa-r-panel{position:fixed;right:18px;bottom:74px;z-index:9999;width:326px;max-width:calc(100vw - 36px);',
    '  background:#FCFBF8;border:1px solid #DCDDD3;border-radius:14px;padding:20px;display:none;',
    "  font-family:'Karla',system-ui,sans-serif;color:#43555F;",
    '  box-shadow:0 1px 2px rgba(18,33,43,.05),0 18px 46px -20px rgba(18,33,43,.4);}',
    '.pa-r-panel.ouvert{display:block;animation:paRApparait .22s ease-out;}',
    '@keyframes paRApparait{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:none;}}',
    '.pa-r-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:4px;}',
    ".pa-r-titre{font-family:'Newsreader',Georgia,serif;font-size:18px;font-weight:600;color:#12212B;line-height:1.25;}",
    '.pa-r-fermer{background:0;border:0;cursor:pointer;color:#7A8A93;font-size:20px;line-height:1;padding:2px 4px;}',
    '.pa-r-sous{font-size:13px;line-height:1.55;color:#7A8A93;margin-bottom:14px;}',
    '.pa-r-cats{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;}',
    '.pa-r-cat{background:#FCFBF8;border:1px solid #DCDDD3;border-radius:100px;padding:6px 12px;cursor:pointer;',
    "  font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:11px;letter-spacing:.05em;color:#43555F;transition:all .15s;}",
    '.pa-r-cat:hover{border-color:#7A8A93;}',
    '.pa-r-cat.actif{background:#1E4B3C;border-color:#1E4B3C;color:#fff;}',
    ".pa-r-txt{width:100%;min-height:104px;resize:vertical;border:1px solid #DCDDD3;border-radius:9px;padding:11px 12px;",
    "  font-family:'Karla',system-ui,sans-serif;font-size:14px;line-height:1.55;color:#12212B;background:#fff;}",
    '.pa-r-txt:focus{outline:2px solid #1E4B3C;outline-offset:1px;border-color:transparent;}',
    '.pa-r-pied{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:12px;}',
    ".pa-r-compte{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:11px;color:#7A8A93;}",
    '.pa-r-envoi{background:#1E4B3C;color:#fff;border:0;border-radius:8px;padding:10px 18px;cursor:pointer;',
    "  font-family:'Karla',system-ui,sans-serif;font-size:14px;font-weight:600;transition:background .18s;}",
    '.pa-r-envoi:hover:not(:disabled){background:#173C30;}',
    '.pa-r-envoi:disabled{opacity:.45;cursor:not-allowed;}',
    '.pa-r-msg{font-size:13px;line-height:1.55;margin-top:11px;}',
    '.pa-r-msg.err{color:#A24332;}',
    '.pa-r-merci{text-align:center;padding:12px 4px 6px;}',
    ".pa-r-merci-t{font-family:'Newsreader',Georgia,serif;font-size:18px;font-weight:600;color:#12212B;margin-bottom:7px;}",
    '.pa-r-merci-p{font-size:13.5px;line-height:1.6;color:#43555F;}',
    '@media(max-width:520px){.pa-r-btn{right:12px;bottom:12px;padding:10px 15px;font-size:13px;}',
    '  .pa-r-panel{right:12px;left:12px;bottom:64px;width:auto;}}',
    '@media(prefers-reduced-motion:reduce){.pa-r-panel.ouvert{animation:none;}.pa-r-btn{transition:none;}}'
  ].join('\n');

  var client = null;
  var categorie = null;
  var panneau, zoneTexte, boutonEnvoi, zoneMsg, compteur;

  /* ---------- chargement du client Supabase ---------- */
  function chargerSupabase(quandPret) {
    if (window.supabase && window.supabase.createClient) return quandPret();
    var s = document.createElement('script');
    s.src = CDN;
    s.onload = quandPret;
    s.onerror = function () { console.warn('Widget de retours : client Supabase indisponible.'); };
    document.head.appendChild(s);
  }

  /* ---------- construction de l'interface ---------- */
  function construire() {
    var style = document.createElement('style');
    style.textContent = STYLES;
    document.head.appendChild(style);

    var bouton = document.createElement('button');
    bouton.className = 'pa-r-btn';
    bouton.type = 'button';
    bouton.setAttribute('aria-haspopup', 'dialog');
    bouton.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M21 12a8 8 0 0 1-8 8H7l-4 3v-4.5A8 8 0 1 1 21 12z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>' +
      '<span>Un retour&nbsp;?</span>';

    panneau = document.createElement('div');
    panneau.className = 'pa-r-panel';
    panneau.setAttribute('role', 'dialog');
    panneau.setAttribute('aria-label', 'Envoyer un retour');
    panneau.innerHTML =
      '<div class="pa-r-head">' +
        '<div class="pa-r-titre">Qu\'est-ce qui cloche&nbsp;?</div>' +
        '<button class="pa-r-fermer" type="button" aria-label="Fermer">&times;</button>' +
      '</div>' +
      '<div class="pa-r-sous">Une phrase suffit. Même « je n\'ai pas compris cette page » est utile.</div>' +
      '<div class="pa-r-cats"></div>' +
      '<textarea class="pa-r-txt" maxlength="4000" placeholder="Ce que tu as vu, ou ce que tu aurais aimé voir…"></textarea>' +
      '<div class="pa-r-pied">' +
        '<span class="pa-r-compte"></span>' +
        '<button class="pa-r-envoi" type="button" disabled>Envoyer</button>' +
      '</div>' +
      '<div class="pa-r-msg"></div>';

    document.body.appendChild(bouton);
    document.body.appendChild(panneau);

    var listeCats = panneau.querySelector('.pa-r-cats');
    CATEGORIES.forEach(function (c) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'pa-r-cat';
      b.textContent = c.libelle;
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', function () {
        categorie = (categorie === c.cle) ? null : c.cle;
        listeCats.querySelectorAll('.pa-r-cat').forEach(function (x) {
          x.classList.remove('actif'); x.setAttribute('aria-pressed', 'false');
        });
        if (categorie) { b.classList.add('actif'); b.setAttribute('aria-pressed', 'true'); }
      });
      listeCats.appendChild(b);
    });

    zoneTexte = panneau.querySelector('.pa-r-txt');
    boutonEnvoi = panneau.querySelector('.pa-r-envoi');
    zoneMsg = panneau.querySelector('.pa-r-msg');
    compteur = panneau.querySelector('.pa-r-compte');

    zoneTexte.addEventListener('input', function () {
      var n = zoneTexte.value.trim().length;
      boutonEnvoi.disabled = n < 3;
      compteur.textContent = n > 3500 ? (4000 - n) + ' caractères restants' : '';
    });

    bouton.addEventListener('click', function () {
      var ouvert = panneau.classList.toggle('ouvert');
      bouton.setAttribute('aria-expanded', ouvert ? 'true' : 'false');
      if (ouvert) zoneTexte.focus();
    });
    panneau.querySelector('.pa-r-fermer').addEventListener('click', fermer);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && panneau.classList.contains('ouvert')) { fermer(); bouton.focus(); }
    });
    boutonEnvoi.addEventListener('click', envoyer);
  }

  function fermer() {
    panneau.classList.remove('ouvert');
  }

  /* ---------- envoi ---------- */
  function envoyer() {
    var message = zoneTexte.value.trim();
    if (message.length < 3) return;

    var dernier = parseInt(localStorage.getItem('pa_dernier_retour') || '0', 10);
    if (Date.now() - dernier < DELAI_ANTI_SPAM) {
      zoneMsg.className = 'pa-r-msg err';
      zoneMsg.textContent = 'Merci, un retour vient d\'être envoyé. Attends une trentaine de secondes avant le suivant.';
      return;
    }

    boutonEnvoi.disabled = true;
    boutonEnvoi.textContent = 'Envoi…';
    zoneMsg.textContent = '';

    client.auth.getSession().then(function (res) {
      var session = res && res.data ? res.data.session : null;
      return client.from('retours').insert({
        user_id: session ? session.user.id : null,
        page: location.pathname.split('/').pop() || 'index.html',
        categorie: categorie,
        message: message
      });
    }).then(function (res) {
      if (res && res.error) throw res.error;
      localStorage.setItem('pa_dernier_retour', String(Date.now()));
      panneau.innerHTML =
        '<div class="pa-r-merci">' +
          '<div class="pa-r-merci-t">Reçu, merci.</div>' +
          '<div class="pa-r-merci-p">C\'est exactement ce dont on a besoin pour améliorer le site. Tu peux en envoyer d\'autres à tout moment.</div>' +
        '</div>';
      setTimeout(function () { location.reload(); }, 2600);
    }).catch(function (err) {
      console.error('Retour non enregistré :', err);
      boutonEnvoi.disabled = false;
      boutonEnvoi.textContent = 'Envoyer';
      zoneMsg.className = 'pa-r-msg err';
      zoneMsg.textContent = 'L\'envoi a échoué. Réessaie dans un instant, ou écris-nous directement.';
    });
  }

  /* ---------- démarrage ---------- */
  function demarrer() {
    chargerSupabase(function () {
      try {
        client = window.supabase.createClient(URL_SB, CLE_SB);
        construire();
      } catch (e) {
        console.warn('Widget de retours non initialisé :', e);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', demarrer);
  } else {
    demarrer();
  }
})();
