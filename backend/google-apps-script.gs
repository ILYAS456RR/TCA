/**
 * TCA Advisory — recevoir les demandes du site dans une Google Sheet
 *
 * Mise en place (5 minutes, gratuit) :
 *  1. Créez une Google Sheet, par exemple « Demandes site TCA ».
 *  2. Menu Extensions > Apps Script. Remplacez le contenu par ce fichier.
 *  3. Mettez votre adresse dans EMAIL_NOTIFICATION, puis Enregistrer.
 *  4. Déployer > Nouveau déploiement > type « Application Web » :
 *       - Exécuter en tant que : Moi
 *       - Qui a accès : Tout le monde
 *     Autorisez l'accès demandé par Google.
 *  5. Copiez l'URL obtenue (https://script.google.com/macros/s/.../exec)
 *     dans js/main.js : ENVOI = 'sheets' et ENDPOINT = cette URL.
 *
 * Chaque demande ajoute une ligne dans l'onglet « Demandes » et vous envoie un e-mail.
 * Après une modification de ce script : Déployer > Gérer les déploiements > Modifier > Nouvelle version.
 */

const EMAIL_NOTIFICATION = 'votre-adresse@gmail.com';   // [À REMPLACER]
const NOM_ONGLET = 'Demandes';

const PROJETS_AUTORISES = [
  'Crédit immobilier', 'Dossier MRE', 'Rachat / restructuration de crédit', 'Crédit hypothécaire',
  "Financement d'entreprise", 'Leasing', 'Crédit promoteur', 'Levée de fonds'
];

function doPost(e) {
  const p = (e && e.parameter) || {};

  // Piège à robots : champ invisible pour les humains
  if (p.site_web) return reponse_({ ok: true });

  const nom = nettoyer_(p.nom, 120);
  const telephone = nettoyer_(p.telephone, 40);
  if (!nom || !/^[0-9+\s().\-]{6,25}$/.test(telephone) || p.consentement !== 'oui') {
    return reponse_({ ok: false, erreur: 'Champs manquants ou invalides.' });
  }
  const projet = PROJETS_AUTORISES.indexOf(p.projet) >= 0 ? p.projet : 'Non précisé';
  const montant = nettoyer_(p.montant, 60);
  const ville = nettoyer_(p.ville, 120);
  const message = nettoyer_(p.message, 2000, true);

  // Écriture dans la feuille (verrou : deux envois simultanés ne s'écrasent pas)
  const verrou = LockService.getScriptLock();
  verrou.waitLock(10000);
  try {
    const classeur = SpreadsheetApp.getActiveSpreadsheet();
    const feuille = classeur.getSheetByName(NOM_ONGLET) || classeur.insertSheet(NOM_ONGLET);
    if (feuille.getLastRow() === 0) {
      feuille.appendRow(['Date', 'Nom', 'Téléphone', 'Projet', 'Montant (MAD)', 'Ville / pays', 'Message', 'Statut']);
      feuille.setFrozenRows(1);
    }
    feuille.appendRow([new Date(), nom, telephone, projet, montant, ville, message, 'À rappeler'].map(celluleSure_));
  } finally {
    verrou.releaseLock();
  }

  // Notification par e-mail
  MailApp.sendEmail({
    to: EMAIL_NOTIFICATION,
    subject: 'Nouvelle demande — ' + projet + ' — ' + nom,
    body: [
      'Nouvelle demande reçue depuis le site TCA Advisory', '',
      'Nom         : ' + nom,
      'Téléphone   : ' + telephone,
      'Projet      : ' + projet,
      'Montant     : ' + (montant ? montant + ' MAD' : '—'),
      'Ville/pays  : ' + (ville || '—'), '',
      'Message :', message || '—', '',
      'Toutes les demandes : ' + SpreadsheetApp.getActiveSpreadsheet().getUrl()
    ].join('\n')
  });

  return reponse_({ ok: true });
}

/* ---------- Outils ---------- */

function nettoyer_(valeur, max, multiligne) {
  let v = String(valeur || '').trim();
  v = multiligne ? v.replace(/\r\n?/g, '\n') : v.replace(/[\r\n\t]+/g, ' ');
  return v.slice(0, max);
}

// Empêche une cellule d'être lue comme une formule
function celluleSure_(v) {
  return typeof v === 'string' && /^[=+\-@]/.test(v) ? "'" + v : v;
}

function reponse_(objet) {
  return ContentService.createTextOutput(JSON.stringify(objet)).setMimeType(ContentService.MimeType.JSON);
}
