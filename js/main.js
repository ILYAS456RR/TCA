/* ==========================================================================
   TCA Advisory — scripts du site
   - menu mobile
   - liens WhatsApp pré-remplis
   - simulateur de crédit
   - formulaire de contact (la demande s'ouvre dans WhatsApp, pré-remplie)
   - apparition des blocs au défilement
   - avis clients défilants
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

  /* ---------- Langue de la page : fr (par défaut), en ou ar ---------- */
  var LANGUE = (document.documentElement.lang || 'fr').slice(0, 2);
  function arAns(a) { return a === 1 ? 'سنة واحدة' : a === 2 ? 'سنتان' : (a >= 3 && a <= 10) ? a + ' سنوات' : a + ' سنة'; }
  function arMois(m) { return m === 1 ? 'شهر واحد' : m === 2 ? 'شهران' : (m >= 3 && m <= 10) ? m + ' أشهر' : m + ' شهرًا'; }
  var TEXTES = {
    fr: {
      locale: 'fr-FR', decimale: ',', espacePct: ' %', devise: ' MAD', parMois: ' MAD/mois',
      duree: function (a, m) { return !a ? 'Soit ' + m + ' mois' : 'Soit ' + a + (a > 1 ? ' ans' : ' an') + (m ? ' et ' + m + ' mois' : ''); },
      dureeVide: 'Indiquez la durée en mois (ex. 240 pour 20 ans).',
      noteMontant: 'Renseignez le montant et la durée pour lancer le calcul.',
      noteRevenus: 'Indiquez vos revenus pour calculer le taux d\'endettement.',
      noteEleve: 'Au-dessus du seuil de 40 % retenu ici : parlons-en, une restructuration peut aider.',
      noteOk: 'Sous le seuil de 40 % retenu dans cette simulation.',
      simMessage: function (P, n, taux, ass, rev) {
        return 'Bonjour TCA Advisory, je souhaite une étude pour un crédit de ' + P + ' MAD sur ' + n + ' mois' +
          ' (taux ' + taux + ', assurance ' + ass + (rev ? ', revenus nets : ' + rev + ' MAD/mois' : '') + ').';
      },
      form: ['Bonjour TCA Advisory,', 'Nom : ', 'Téléphone : ', 'Projet : ', 'Montant estimé : ', 'Ville / pays : ', 'Message : '],
      errConsent: 'Merci de cocher la case de consentement.',
      errChamps: 'Merci d\'indiquer votre nom, votre téléphone et de cocher la case de consentement.'
    },
    en: {
      locale: 'en-US', decimale: '.', espacePct: '%', devise: ' MAD', parMois: ' MAD/month',
      duree: function (a, m) { return !a ? 'That is ' + m + ' months' : 'That is ' + a + (a > 1 ? ' years' : ' year') + (m ? ' and ' + m + ' months' : ''); },
      dureeVide: 'Enter the term in months (e.g. 240 for 20 years).',
      noteMontant: 'Enter the amount and the term to start the calculation.',
      noteRevenus: 'Enter your income to calculate your debt-to-income ratio.',
      noteEleve: 'Above the 40% threshold used here: let\'s talk, restructuring may help.',
      noteOk: 'Below the 40% threshold used in this simulation.',
      simMessage: function (P, n, taux, ass, rev) {
        return 'Hello TCA Advisory, I would like a study for a loan of ' + P + ' MAD over ' + n + ' months' +
          ' (rate ' + taux + ', insurance ' + ass + (rev ? ', net income: ' + rev + ' MAD/month' : '') + ').';
      },
      form: ['Hello TCA Advisory,', 'Name: ', 'Phone: ', 'Project: ', 'Estimated amount: ', 'City / country: ', 'Message: '],
      errConsent: 'Please tick the consent box.',
      errChamps: 'Please enter your name and phone number, and tick the consent box.',
      messages: {
        general: 'Hello TCA Advisory, I would like support with a financing project.',
        mre: 'Hello TCA Advisory, I live abroad and would like to finance a property in Morocco.',
        immobilier: 'Hello TCA Advisory, I would like support with a mortgage.'
      }
    },
    ar: {
      locale: 'fr-FR', decimale: ',', espacePct: ' %', devise: ' درهم', parMois: ' درهم شهريًا',
      duree: function (a, m) { return !a ? 'أي ' + arMois(m) : 'أي ' + arAns(a) + (m ? ' و' + arMois(m) : ''); },
      dureeVide: 'أدخلوا المدة بالأشهر (مثلًا 240 لمدة 20 سنة).',
      noteMontant: 'أدخلوا المبلغ والمدة لبدء الحساب.',
      noteRevenus: 'أدخلوا دخلكم لحساب نسبة المديونية.',
      noteEleve: 'أعلى من عتبة 40 % المعتمدة هنا: لنتحدث، فإعادة الهيكلة قد تساعد.',
      noteOk: 'أقل من عتبة 40 % المعتمدة في هذه المحاكاة.',
      simMessage: function (P, n, taux, ass, rev) {
        return 'مرحبًا TCA Advisory، أرغب في دراسة لقرض بمبلغ ' + P + ' درهم لمدة ' + n + ' شهرًا' +
          ' (نسبة الفائدة ' + taux + '، التأمين ' + ass + (rev ? '، الدخل الصافي: ' + rev + ' درهم شهريًا' : '') + ').';
      },
      form: ['مرحبًا TCA Advisory،', 'الاسم: ', 'الهاتف: ', 'المشروع: ', 'المبلغ التقريبي: ', 'المدينة / البلد: ', 'الرسالة: '],
      errConsent: 'المرجو وضع علامة على خانة الموافقة.',
      errChamps: 'المرجو إدخال اسمكم ورقم هاتفكم ووضع علامة على خانة الموافقة.',
      messages: {
        general: 'مرحبًا TCA Advisory، أرغب في مواكبة لمشروع تمويل.',
        mre: 'مرحبًا TCA Advisory، أقيم خارج المغرب وأرغب في تمويل عقار بالمغرب.',
        immobilier: 'مرحبًا TCA Advisory، أرغب في مواكبة للحصول على قرض عقاري.'
      }
    }
  };
  var T = TEXTES[LANGUE] || TEXTES.fr;
  if (T.messages) { Object.keys(T.messages).forEach(function (k) { MESSAGES[k] = T.messages[k]; }); }

  function lienWhatsApp(message) {
    return 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(message);
  }

  var nombre = new Intl.NumberFormat(T.locale, { maximumFractionDigits: 0 });
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

  function pourcent(v) { return v.toFixed(2).replace('.', T.decimale) + T.espacePct; }
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
    return T.duree(Math.floor(mois / 12), mois % 12);
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
    aideDuree.textContent = n ? dureeEnClair(n) : T.dureeVide;
    aideDuree.classList.toggle('is-error', !n);
    champs.duree.setAttribute('aria-invalid', String(!n));
    champs.montant.setAttribute('aria-invalid', String(!P));
    document.getElementById('aide-montant').classList.toggle('is-error', !P);

    if (!P || !n) {
      ['res-mensualite', 'res-credit', 'res-assurance', 'res-interets', 'res-cout-assurance', 'res-cout-total', 'res-ratio', 'res-capacite']
        .forEach(function (id) { afficher(id, '—'); });
      afficher('res-note', T.noteMontant);
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
    afficher('res-credit', fmt(mensualiteCredit) + T.devise);
    afficher('res-assurance', fmt(assuranceMois) + T.devise);
    afficher('res-interets', fmt(interets) + T.devise);
    afficher('res-cout-assurance', fmt(coutAssurance) + T.devise);
    afficher('res-cout-total', fmt(interets + coutAssurance) + T.devise);
    afficher('res-ratio', revenus > 0 ? ratio.toFixed(1).replace('.', T.decimale) + T.espacePct : '—');
    afficher('res-capacite', revenus > 0 ? fmt(capacite) + T.devise : '—');

    var jauge = document.getElementById('res-jauge');
    jauge.style.width = Math.min(ratio, 100).toFixed(1) + '%';
    jauge.classList.toggle('is-high', eleve);
    var note = document.getElementById('res-note');
    note.classList.toggle('is-high', eleve);
    note.textContent = !revenus
      ? T.noteRevenus
      : eleve ? T.noteEleve : T.noteOk;

    document.getElementById('sim-whatsapp').href = lienWhatsApp(
      T.simMessage(fmt(P), n, pourcent(taux), pourcent(tauxAssurance), revenus ? fmt(revenus) : '')
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
      T.form[0],
      T.form[1] + form.nom.value.trim(),
      T.form[2] + form.telephone.value.trim(),
      T.form[3] + form.projet.value
    ];
    var montant = form.montant.value.trim();
    var ville = form.ville.value.trim();
    var message = form.message.value.trim();
    if (montant) { lignes.push(T.form[4] + montant + T.devise); }
    if (ville) { lignes.push(T.form[5] + ville); }
    if (message) { lignes.push(T.form[6] + message); }
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
          ? T.errConsent
          : T.errChamps;
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

  /* ---------- Avis clients : défilement automatique ----------
     Un avis toutes les 7 secondes ; pause au survol, au clavier ou avec le bouton ;
     pas de défilement automatique si l'utilisateur a demandé de réduire les animations. */
  document.querySelectorAll('[data-avis]').forEach(function (bloc) {
    var piste = bloc.querySelector('.avis__piste');
    var slides = piste ? Array.prototype.slice.call(piste.children) : [];
    if (slides.length < 2) { return; }
    var DELAI = 7000;
    var reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var points = Array.prototype.slice.call(bloc.querySelectorAll('.avis__point'));
    var actuel = bloc.querySelector('.avis__actuel');
    var boutonPause = bloc.querySelector('[data-avis-pause]');
    var index = 0;
    var minuteur = null;
    var enPause = reduit;          // pause demandée par l'utilisateur
    var suspendu = false;          // survol ou focus clavier
    var visible = false;

    bloc.style.setProperty('--avis-delai', DELAI + 'ms');

    function deuxChiffres(n) { return (n < 10 ? '0' : '') + n; }

    function majInterface() {
      slides.forEach(function (s, i) { s.setAttribute('aria-hidden', i === index ? 'false' : 'true'); });
      points.forEach(function (p, i) { p.setAttribute('aria-current', i === index ? 'true' : 'false'); });
      if (actuel) { actuel.textContent = deuxChiffres(index + 1); }
    }

    function aller(i, doux) {
      index = (i + slides.length) % slides.length;
      piste.scrollTo({ left: slides[index].offsetLeft, behavior: (doux === false || reduit) ? 'auto' : 'smooth' });
      majInterface();
      relancer();
    }

    function arreter() {
      clearTimeout(minuteur);
      minuteur = null;
      bloc.classList.remove('is-running');
    }

    function relancer() {
      arreter();
      if (enPause || suspendu || !visible) { return; }
      void bloc.offsetWidth;                       // redémarre la barre de progression
      bloc.classList.add('is-running');
      minuteur = setTimeout(function () { aller(index + 1); }, DELAI);
    }

    function majPause() {
      bloc.classList.toggle('is-paused', enPause);
      if (boutonPause) {
        boutonPause.setAttribute('aria-pressed', String(enPause));
        boutonPause.setAttribute('aria-label', enPause ? 'Reprendre le défilement des avis' : 'Mettre en pause le défilement des avis');
      }
      piste.setAttribute('aria-live', enPause ? 'polite' : 'off');
    }

    var prec = bloc.querySelector('[data-avis-prec]');
    var suiv = bloc.querySelector('[data-avis-suiv]');
    if (prec) { prec.addEventListener('click', function () { aller(index - 1); }); }
    if (suiv) { suiv.addEventListener('click', function () { aller(index + 1); }); }
    points.forEach(function (p, i) { p.addEventListener('click', function () { aller(i); }); });
    if (boutonPause) {
      boutonPause.addEventListener('click', function () {
        enPause = !enPause;
        majPause();
        relancer();
      });
    }

    // Pause pendant le survol ou quand un élément du carrousel a le focus
    bloc.addEventListener('mouseenter', function () { suspendu = true; arreter(); });
    bloc.addEventListener('mouseleave', function () { suspendu = false; relancer(); });
    bloc.addEventListener('focusin', function () { suspendu = true; arreter(); });
    bloc.addEventListener('focusout', function (e) {
      if (!bloc.contains(e.relatedTarget)) { suspendu = false; relancer(); }
    });

    // Balayage au doigt : l'avis affiché suit la position de la piste
    var attente = null;
    piste.addEventListener('scroll', function () {
      clearTimeout(attente);
      attente = setTimeout(function () {
        var i = Math.round(piste.scrollLeft / piste.clientWidth);
        if (i !== index && i >= 0 && i < slides.length) {
          index = i;
          majInterface();
          relancer();
        }
      }, 120);
    }, { passive: true });

    // Défile seulement quand la bande est à l'écran
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entrees) {
        visible = entrees[0].isIntersecting;
        if (visible) { relancer(); } else { arreter(); }
      }, { threshold: 0.25 }).observe(bloc);
    } else {
      visible = true;
    }

    window.addEventListener('resize', function () {
      piste.scrollTo({ left: slides[index].offsetLeft, behavior: 'auto' });
    });

    majPause();
    majInterface();
    relancer();
  });

  /* ---------- Réalisations TCA Digital : filtres par catégorie ---------- */
  document.querySelectorAll('[data-filtres]').forEach(function (barre) {
    var cible = document.querySelector(barre.getAttribute('data-filtres'));
    if (!cible) { return; }
    var boutons = Array.prototype.slice.call(barre.querySelectorAll('[data-filtre]'));
    var statut = document.getElementById(barre.getAttribute('data-statut'));
    boutons.forEach(function (bouton) {
      bouton.addEventListener('click', function () {
        var filtre = bouton.getAttribute('data-filtre');
        var visibles = 0;
        boutons.forEach(function (b) { b.setAttribute('aria-pressed', String(b === bouton)); });
        cible.querySelectorAll('[data-cat]').forEach(function (carte) {
          var montrer = filtre === 'tous' || carte.getAttribute('data-cat') === filtre;
          carte.hidden = !montrer;
          if (montrer) { visibles++; carte.classList.remove('is-pending'); }
        });
        if (statut) { statut.textContent = visibles + (visibles > 1 ? ' réalisations affichées' : ' réalisation affichée'); }
      });
    });
  });

  /* ---------- Année du pied de page ---------- */
  var annee = document.getElementById('annee');
  if (annee) { annee.textContent = new Date().getFullYear(); }
})();
