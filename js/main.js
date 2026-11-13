/* ==========================================================================
   TCA Advisory — scripts du site
   - menu mobile
   - liens WhatsApp pré-remplis
   - simulateur de crédit
   - formulaire de contact (la demande s'ouvre dans WhatsApp, pré-remplie)
   - apparition des blocs au défilement
   ========================================================================== */
(function () {
  'use strict';

  /* ---------- Réglages ---------- */
  var WHATSAPP = '212668173299';        // numéro au format international, sans + ni espaces
  var SEUIL_ENDETTEMENT = 0.40;         // 40 % des revenus nets, hypothèse du simulateur

  var MESSAGES = {
    general: 'Bonjour TCA Advisory, je souhaite être accompagné(e) pour un financement.',
    mre: 'Bonjour TCA Advisory, je suis MRE et je souhaite financer un bien au Maroc.',
    immobilier: 'Bonjour TCA Advisory, je souhaite être accompagné(e) pour un crédit immobilier.',
    rachat: 'Bonjour TCA Advisory, je souhaite étudier un rachat de crédit.',
    entreprise: 'Bonjour TCA Advisory, je souhaite être accompagné(e) pour le financement de mon entreprise.',
    digital: 'Bonjour TCA Digital, je souhaite échanger sur la présence digitale de mon entreprise.',
    cadrage: 'Bonjour TCA Digital, je souhaite planifier une réunion de cadrage.'
  };

  function lienWhatsApp(message) {
    return 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(message);
  }

  var nombre = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
  function fmt(v) { return nombre.format(Math.round(v)); }

  /* ---------- Liens WhatsApp pré-remplis ---------- */
  document.querySelectorAll('[data-wa]').forEach(function (a) {
    var cle = a.getAttribute('data-wa');
    if (MESSAGES[cle]) { a.href = lienWhatsApp(MESSAGES[cle]); }
  });

  /* ---------- Menu mobile ---------- */
  var toggle = document.querySelector('.nav-toggle');
  var menu = document.getElementById('menu');
  if (toggle && menu) {
    var fermer = function () {
      menu.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Ouvrir le menu');
    };
    toggle.addEventListener('click', function () {
      var ouvert = menu.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(ouvert));
      toggle.setAttribute('aria-label', ouvert ? 'Fermer le menu' : 'Ouvrir le menu');
    });
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) { fermer(); }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.classList.contains('is-open')) { fermer(); toggle.focus(); }
    });
  }

  /* ---------- Simulateur ----------
     Montant et durée : saisie libre, sans plafond. Durée en mois.
     Taux d'intérêt : curseur jusqu'à 9 %. Assurance : taux annuel appliqué au capital emprunté
     (montant fixe chaque mois = capital × taux ÷ 12). Taux saisi = taux tout compris (pas de TVA ajoutée). */
  var champs = {
    montant: document.getElementById('sim-montant'),
    duree: document.getElementById('sim-duree'),
    taux: document.getElementById('sim-taux'),
    assurance: document.getElementById('sim-assurance'),
    revenus: document.getElementById('sim-revenus')
  };

  function pourcent(v) { return v.toFixed(2).replace('.', ',') + ' %'; }
  function entier(input) {                       // « 1 000 000 », « 1.000.000 » ou « 1000000 » → 1000000
    var chiffres = String(input.value).replace(/[^\d]/g, '');
    return chiffres ? parseInt(chiffres, 10) : 0;
  }
  function formaterChamp(input) {                // remet les espaces de milliers en quittant le champ
    var v = entier(input);
    input.value = v ? fmt(v) : '';
  }
  function remplissage(input) {
    var min = parseFloat(input.min), max = parseFloat(input.max), val = parseFloat(input.value);
    input.style.setProperty('--remplissage', ((val - min) / (max - min) * 100) + '%');
  }
  function dureeEnClair(mois) {
    var a = Math.floor(mois / 12), m = mois % 12;
    if (!a) { return 'Soit ' + m + ' mois'; }
    return 'Soit ' + a + (a > 1 ? ' ans' : ' an') + (m ? ' et ' + m + ' mois' : '');
  }
  function afficher(id, texte) { document.getElementById(id).textContent = texte; }

  function calculer() {
    var P = entier(champs.montant);
    var n = entier(champs.duree);
    var taux = parseFloat(champs.taux.value);
    var tauxAssurance = parseFloat(champs.assurance.value);
    var revenus = entier(champs.revenus);

    afficher('out-taux', pourcent(taux));
    afficher('out-assurance', pourcent(tauxAssurance));
    [champs.taux, champs.assurance].forEach(remplissage);

    var aideDuree = document.getElementById('aide-duree');
    aideDuree.textContent = n ? dureeEnClair(n) : 'Indiquez la durée en mois (ex. 240 pour 20 ans).';
    aideDuree.classList.toggle('is-error', !n);
    champs.duree.setAttribute('aria-invalid', String(!n));
    champs.montant.setAttribute('aria-invalid', String(!P));
    document.getElementById('aide-montant').classList.toggle('is-error', !P);

    if (!P || !n) {
      ['res-mensualite', 'res-credit', 'res-assurance', 'res-interets', 'res-cout-assurance', 'res-cout-total', 'res-ratio', 'res-capacite']
        .forEach(function (id) { afficher(id, '—'); });
      afficher('res-note', 'Renseignez le montant et la durée pour lancer le calcul.');
      document.getElementById('res-note').classList.remove('is-high');
      document.getElementById('res-jauge').style.width = '0%';
      return;
    }

    var r = taux / 100 / 12;
    var facteur = r > 0 ? r / (1 - Math.pow(1 + r, -n)) : 1 / n;   // mensualité pour 1 MAD emprunté
    var mensualiteCredit = P * facteur;
    var assuranceMois = P * tauxAssurance / 100 / 12;
    var mensualite = mensualiteCredit + assuranceMois;
    var interets = mensualiteCredit * n - P;
    var coutAssurance = assuranceMois * n;
    var capacite = revenus > 0 ? (revenus * SEUIL_ENDETTEMENT) / (facteur + tauxAssurance / 100 / 12) : 0;
    var ratio = revenus > 0 ? mensualite / revenus * 100 : 0;
    var eleve = ratio > SEUIL_ENDETTEMENT * 100;

    afficher('res-mensualite', fmt(mensualite));
    afficher('res-credit', fmt(mensualiteCredit) + ' MAD');
    afficher('res-assurance', fmt(assuranceMois) + ' MAD');
    afficher('res-interets', fmt(interets) + ' MAD');
    afficher('res-cout-assurance', fmt(coutAssurance) + ' MAD');
    afficher('res-cout-total', fmt(interets + coutAssurance) + ' MAD');
    afficher('res-ratio', revenus > 0 ? ratio.toFixed(1).replace('.', ',') + ' %' : '—');
    afficher('res-capacite', revenus > 0 ? fmt(capacite) + ' MAD' : '—');

    var jauge = document.getElementById('res-jauge');
    jauge.style.width = Math.min(ratio, 100).toFixed(1) + '%';
    jauge.classList.toggle('is-high', eleve);
    var note = document.getElementById('res-note');
    note.classList.toggle('is-high', eleve);
    note.textContent = !revenus
      ? 'Indiquez vos revenus pour calculer le taux d\'endettement.'
      : eleve
        ? 'Au-dessus du seuil de 40 % retenu ici : parlons-en, une restructuration peut aider.'
        : 'Sous le seuil de 40 % retenu dans cette simulation.';

    document.getElementById('sim-whatsapp').href = lienWhatsApp(
      'Bonjour TCA Advisory, je souhaite une étude pour un crédit de ' + fmt(P) + ' MAD sur ' + n + ' mois' +
      ' (taux ' + pourcent(taux) + ', assurance ' + pourcent(tauxAssurance) +
      (revenus ? ', revenus nets : ' + fmt(revenus) + ' MAD/mois' : '') + ').'
    );
  }

  if (champs.montant) {
    Object.keys(champs).forEach(function (k) { champs[k].addEventListener('input', calculer); });
    [champs.montant, champs.revenus, champs.duree].forEach(function (input) {
      input.addEventListener('blur', function () { formaterChamp(input); });
    });
    calculer();
  }

  /* ---------- Formulaire de contact : envoi par WhatsApp ---------- */
  var form = document.getElementById('contact-form');
  var succes = document.getElementById('form-success');
  var erreur = document.getElementById('form-error');

  /* Construit le message WhatsApp à partir des champs remplis */
  function lienDemandeWhatsApp() {
    var lignes = [
      'Bonjour TCA Advisory,',
      'Nom : ' + form.nom.value.trim(),
      'Téléphone : ' + form.telephone.value.trim(),
      'Projet : ' + form.projet.value
    ];
    var montant = form.montant.value.trim();
    var ville = form.ville.value.trim();
    var message = form.message.value.trim();
    if (montant) { lignes.push('Montant estimé : ' + montant + ' MAD'); }
    if (ville) { lignes.push('Ville / pays : ' + ville); }
    if (message) { lignes.push('Message : ' + message); }
    return lienWhatsApp(lignes.join('\n'));
  }

  if (form && succes) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var nom = form.nom, tel = form.telephone, consentement = form.consentement;
      var manquants = [];

      [nom, tel].forEach(function (champ) {
        var vide = !champ.value.trim();
        champ.classList.toggle('is-invalid', vide);
        champ.setAttribute('aria-invalid', String(vide));
        if (vide) { manquants.push(champ); }
      });
      if (!consentement.checked) { manquants.push(consentement); }

      if (manquants.length) {
        erreur.textContent = !consentement.checked && manquants.length === 1
          ? 'Merci de cocher la case de consentement.'
          : 'Merci d\'indiquer votre nom, votre téléphone et de cocher la case de consentement.';
        erreur.hidden = false;
        manquants[0].focus();
        return;
      }
      erreur.hidden = true;

      var lien = lienDemandeWhatsApp();
      window.open(lien, '_blank', 'noopener');
      document.getElementById('form-success-link').href = lien;   // secours si WhatsApp ne s'ouvre pas
      form.hidden = true;
      succes.hidden = false;
      succes.setAttribute('tabindex', '-1');
      succes.focus();
    });

    document.getElementById('form-reset').addEventListener('click', function () {
      form.reset();
      erreur.hidden = true;
      succes.hidden = true;
      form.hidden = false;
      form.nom.focus();
    });
  }

  /* ---------- Apparition au défilement ---------- */
  var animer = !window.matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window;
  if (animer) {
    var observateur = new IntersectionObserver(function (entrees) {
      entrees.forEach(function (entree) {
        if (entree.isIntersecting) {
          entree.target.classList.remove('is-pending');
          observateur.unobserve(entree.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    document.querySelectorAll('[data-reveal]').forEach(function (el) {
      if (el.getBoundingClientRect().top > window.innerHeight) {
        el.classList.add('is-pending');
        observateur.observe(el);
      }
    });
  }

  /* ---------- Année du pied de page ---------- */
  var annee = document.getElementById('annee');
  if (annee) { annee.textContent = new Date().getFullYear(); }
})();
