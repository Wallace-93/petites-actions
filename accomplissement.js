/* =====================================================================
   La carte d'accomplissement

   Elle apparaît quand la dernière leçon d'une formation est validée.
   Ce n'est ni un diplôme ni un badge : c'est une borne plantée au bout
   d'une étape, dans le même vocabulaire graphique que l'itinéraire et
   le carnet de route. Elle se garde, s'imprime, se montre.
   ===================================================================== */

const FORMATIONS_CARTE = {
  monnaie:     { nom: 'Comprendre la monnaie',    num: '01', suite: 'psychologie.html', suiteNom: "Psychologie de l'argent" },
  psychologie: { nom: "Psychologie de l'argent",  num: '02', suite: 'budget.html',      suiteNom: 'Maîtriser son budget' },
  budget:      { nom: 'Maîtriser son budget',     num: '03', suite: 'epargne.html',     suiteNom: 'Épargne & sécurité' },
  epargne:     { nom: 'Épargne & sécurité',       num: '04', suite: 'bourse.html',      suiteNom: 'Premiers pas en bourse' },
  bourse:      { nom: 'Premiers pas en bourse',   num: '05', suite: 'fiscalite.html',   suiteNom: 'Optimisation fiscale' },
  fiscalite:   { nom: 'Optimisation fiscale',     num: '06', suite: 'immobilier.html',  suiteNom: 'Investir dans la pierre' },
  immobilier:  { nom: 'Investir dans la pierre',  num: '07', suite: 'crypto.html',      suiteNom: 'Bitcoin & cryptomonnaies' },
  crypto:      { nom: 'Bitcoin & cryptomonnaies', num: '08', suite: 'carnet.html',      suiteNom: 'Ton carnet de route' }
};

const CSS_CARTE = `
.carte-fond{position:fixed;inset:0;background:rgba(18,33,43,.72);z-index:200;
  display:grid;place-items:center;padding:24px;overflow-y:auto;
  animation:apparait .28s cubic-bezier(.4,0,.2,1);}
@keyframes apparait{from{opacity:0}to{opacity:1}}
.carte-boite{max-width:520px;width:100%;}

.jalon-carte{background:var(--bg,#FCFBF8);border:1px solid var(--bg-line,#DCDDD3);border-radius:16px;
  padding:38px 34px 30px;position:relative;overflow:hidden;
  box-shadow:0 24px 60px -20px rgba(18,33,43,.5);}
.jalon-carte::before{content:"";position:absolute;top:0;left:0;right:0;height:4px;
  background:linear-gradient(90deg,var(--green,#1E4B3C),var(--amber,#B8862F));}

.jalon-sur{font-family:var(--mono,monospace);font-size:10.5px;letter-spacing:.15em;text-transform:uppercase;
  color:var(--amber,#B8862F);display:flex;align-items:center;gap:9px;margin-bottom:18px;}
.jalon-sur::before{content:"";width:22px;height:1px;background:var(--amber,#B8862F);}

.jalon-embleme{width:74px;height:74px;margin-bottom:20px;}
.jalon-num{position:absolute;top:30px;right:32px;font-family:var(--display,Georgia,serif);
  font-size:56px;font-weight:500;color:var(--bg-mid,#EFF0EA);line-height:1;}
.jalon-nom{font-family:var(--display,Georgia,serif);font-size:27px;font-weight:600;
  color:var(--ink,#12212B);line-height:1.16;letter-spacing:-.02em;margin-bottom:8px;}
.jalon-qui{font-size:15px;color:var(--ink-soft,#43555F);margin-bottom:24px;}
.jalon-qui strong{color:var(--ink,#12212B);}

.jalon-chiffres{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;
  background:var(--bg-line,#DCDDD3);border:1px solid var(--bg-line,#DCDDD3);
  border-radius:11px;overflow:hidden;margin-bottom:22px;}
.jalon-case{background:var(--bg,#FCFBF8);padding:15px 12px 16px;text-align:center;}
.jalon-n{font-family:var(--display,Georgia,serif);font-size:25px;font-weight:600;
  color:var(--ink,#12212B);line-height:1;}
.jalon-n.or{color:var(--amber,#B8862F);}
.jalon-l{font-family:var(--mono,monospace);font-size:9.5px;letter-spacing:.08em;text-transform:uppercase;
  color:var(--ink-faint,#7A8A93);margin-top:7px;}

.jalon-mot{font-size:14.5px;line-height:1.62;color:var(--ink-soft,#43555F);
  padding:16px 18px;background:var(--green-pale,#E7EFEA);border-radius:11px;margin-bottom:22px;}
.jalon-mot strong{color:var(--green,#1E4B3C);}

.jalon-pied{display:flex;justify-content:space-between;align-items:center;
  padding-top:16px;border-top:1px solid var(--bg-line,#DCDDD3);
  font-family:var(--mono,monospace);font-size:10.5px;color:var(--ink-faint,#7A8A93);}
.jalon-refrain{font-family:var(--display,Georgia,serif);font-size:15px;font-weight:600;
  color:var(--amber,#B8862F);letter-spacing:-.01em;}

.jalon-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px;}
.jalon-btn{flex:1;min-width:130px;text-align:center;text-decoration:none;border:0;cursor:pointer;
  font-family:var(--sans,system-ui);font-size:14.5px;font-weight:600;padding:13px 18px;border-radius:9px;}
.jalon-btn.plein{background:var(--green,#1E4B3C);color:#fff;}
.jalon-btn.vide{background:rgba(252,251,248,.12);color:#fff;border:1px solid rgba(252,251,248,.3);}

@media(max-width:560px){
  .jalon-carte{padding:30px 22px 24px;}
  .jalon-num{font-size:42px;top:24px;right:22px;}
  .jalon-nom{font-size:23px;}
  .jalon-chiffres{grid-template-columns:1fr;}
}
@media print{
  .carte-fond{position:static;background:#fff;padding:0;}
  .jalon-actions{display:none;}
  .jalon-carte{box-shadow:none;border:1px solid #DCDDD3;}
}
@media(prefers-reduced-motion:reduce){.carte-fond{animation:none;}}
`;

/* L'emblème : le carnet ouvert, décliné pour chaque formation. */
function emblemeCarte(){
  return '<svg class="jalon-embleme" viewBox="0 0 64 64" fill="none" aria-hidden="true">' +
    '<rect x="6" y="12" width="52" height="42" rx="5" fill="#E7EFEA" stroke="#1E4B3C" stroke-width="2"/>' +
    '<line x1="32" y1="12" x2="32" y2="54" stroke="#1E4B3C" stroke-width="2"/>' +
    '<line x1="13" y1="24" x2="26" y2="24" stroke="#B8862F" stroke-width="2" stroke-linecap="round"/>' +
    '<line x1="13" y1="32" x2="26" y2="32" stroke="#B8862F" stroke-width="2" stroke-linecap="round" opacity=".6"/>' +
    '<line x1="38" y1="24" x2="51" y2="24" stroke="#B8862F" stroke-width="2" stroke-linecap="round" opacity=".6"/>' +
    '<circle cx="44" cy="40" r="10" fill="#B8862F"/>' +
    '<path d="M39 40L43 44L49 36" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>' +
    '</svg>';
}

function moisAnnee(){
  const d = new Date();
  const s = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function echapperCarte(t){
  const d = document.createElement('div');
  d.textContent = t == null ? '' : String(t);
  return d.innerHTML;
}

/* Ouvre la carte. semaines et prenom sont facultatifs. */
function ouvrirCarte(cle, nbLecons, prenom, semaines){
  const f = FORMATIONS_CARTE[cle];
  if(!f) return;

  if(!document.getElementById('styleCarte')){
    const st = document.createElement('style');
    st.id = 'styleCarte';
    st.textContent = CSS_CARTE;
    document.head.appendChild(st);
  }

  const fond = document.createElement('div');
  fond.className = 'carte-fond';
  fond.id = 'carteFond';
  fond.setAttribute('role', 'dialog');
  fond.setAttribute('aria-label', 'Formation terminée');

  fond.innerHTML =
    '<div class="carte-boite">' +
      '<div class="jalon-carte">' +
        '<div class="jalon-num">' + f.num + '</div>' +
        '<div class="jalon-sur">Étape franchie</div>' +
        emblemeCarte() +
        '<div class="jalon-nom">' + echapperCarte(f.nom) + '</div>' +
        '<div class="jalon-qui">' +
          (prenom ? 'Parcourue par <strong>' + echapperCarte(prenom) + '</strong>, ' : 'Parcourue ') +
          'jusqu\'à la dernière leçon.</div>' +

        '<div class="jalon-chiffres">' +
          '<div class="jalon-case"><div class="jalon-n">' + nbLecons + '</div>' +
            '<div class="jalon-l">Leçons</div></div>' +
          '<div class="jalon-case"><div class="jalon-n or">' + nbLecons + '</div>' +
            '<div class="jalon-l">Actions faites</div></div>' +
          '<div class="jalon-case"><div class="jalon-n">' + (semaines || 1) + '</div>' +
            '<div class="jalon-l">Semaine' + ((semaines || 1) > 1 ? 's' : '') + '</div></div>' +
        '</div>' +

        '<div class="jalon-mot">Chaque leçon s\'est terminée par une action, et tu les as toutes faites. ' +
          '<strong>Ce n\'est pas un savoir que tu as acquis, c\'est une série de gestes.</strong> ' +
          'C\'est la seule chose qui se voit encore dans un an.</div>' +

        '<div class="jalon-pied">' +
          '<span>' + moisAnnee() + '</span>' +
          '<span class="jalon-refrain">NiouDem.</span>' +
        '</div>' +
      '</div>' +

      '<div class="jalon-actions">' +
        '<a href="' + f.suite + '" class="jalon-btn plein">' + echapperCarte(f.suiteNom) + ' →</a>' +
        '<button class="jalon-btn vide" onclick="window.print()">Enregistrer</button>' +
        '<button class="jalon-btn vide" onclick="fermerCarte()">Plus tard</button>' +
      '</div>' +
    '</div>';

  document.body.appendChild(fond);
  document.body.style.overflow = 'hidden';

  fond.addEventListener('click', function(e){ if(e.target === fond) fermerCarte(); });
  document.addEventListener('keydown', echapCarte);
}

function echapCarte(e){ if(e.key === 'Escape') fermerCarte(); }

function fermerCarte(){
  const f = document.getElementById('carteFond');
  if(f) f.remove();
  document.body.style.overflow = '';
  document.removeEventListener('keydown', echapCarte);
}
