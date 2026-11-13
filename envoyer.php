<?php
/**
 * TCA Advisory — réception du formulaire de contact
 *
 * À placer à la racine du site, à côté de index.html.
 * Nécessite un hébergement avec PHP 7.4 ou plus (la plupart des hébergements mutualisés).
 *
 * Ce script :
 *   1. vérifie que la requête vient bien du formulaire (méthode, origine, anti-robot) ;
 *   2. contrôle et nettoie les champs ;
 *   3. limite le nombre d'envois par visiteur (anti-abus) ;
 *   4. enregistre la demande dans donnees/demandes.csv (dossier protégé) ;
 *   5. vous envoie la demande par e-mail ;
 *   6. répond au site en JSON : {"ok": true} ou {"ok": false, "erreur": "..."}.
 */

declare(strict_types=1);

/* ====================== RÉGLAGES (à adapter) ====================== */

const DESTINATAIRE      = 'contact@votre-domaine.ma';   // [À REMPLACER] adresse qui reçoit les demandes
const EXPEDITEUR        = 'site@votre-domaine.ma';      // [À REMPLACER] adresse de VOTRE domaine (évite le dossier spam)
const ORIGINE_AUTORISEE = '';                           // ex. 'https://www.votre-domaine.ma' ; vide = pas de contrôle
const DOSSIER_DONNEES   = __DIR__ . '/donnees';         // protégé par donnees/.htaccess
const ENREGISTRER_CSV   = true;                         // false : e-mail seulement, rien n'est conservé sur le serveur
const MAX_ENVOIS_HEURE  = 5;                            // par adresse IP

const PROJETS_AUTORISES = [
    'Crédit immobilier',
    'Dossier MRE',
    'Rachat / restructuration de crédit',
    'Crédit hypothécaire',
    "Financement d'entreprise",
    'Leasing',
    'Crédit promoteur',
    'Levée de fonds',
];

/* ================================================================== */

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

function repondre(int $code, array $donnees): void
{
    http_response_code($code);
    echo json_encode($donnees, JSON_UNESCAPED_UNICODE);
    exit;
}

/** Lit un champ du formulaire, le nettoie et le tronque. */
function champ(string $nom, int $max = 200, bool $multiligne = false): string
{
    $valeur = trim((string) ($_POST[$nom] ?? ''));
    $valeur = str_replace("\0", '', $valeur);
    $valeur = $multiligne
        ? preg_replace("/\r\n?/", "\n", $valeur)
        : preg_replace('/[\r\n\t]+/', ' ', $valeur);   // pas de retour à la ligne : bloque l'injection d'en-têtes
    return mb_substr((string) $valeur, 0, $max);
}

/** Empêche Excel d'interpréter une cellule comme une formule. */
function cellule_sure(string $valeur): string
{
    return preg_match('/^[=+\-@\t]/', $valeur) ? "'" . $valeur : $valeur;
}

// 1. Méthode et origine
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    repondre(405, ['ok' => false, 'erreur' => 'Méthode non autorisée.']);
}
if (ORIGINE_AUTORISEE !== '') {
    $origine = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origine !== '' && $origine !== ORIGINE_AUTORISEE) {
        repondre(403, ['ok' => false, 'erreur' => 'Origine non autorisée.']);
    }
}

// 2. Piège à robots : ce champ est invisible pour les humains
if (champ('site_web') !== '') {
    repondre(200, ['ok' => true]); // on fait comme si tout allait bien, sans rien enregistrer
}

// 3. Champs
$nom          = champ('nom', 120);
$telephone    = champ('telephone', 40);
$projet       = champ('projet', 60);
$montant      = champ('montant', 60);
$ville        = champ('ville', 120);
$message      = champ('message', 2000, true);
$consentement = champ('consentement', 10);

$erreurs = [];
if ($nom === '') {
    $erreurs[] = 'nom';
}
if (!preg_match('/^[0-9+\s().\-]{6,25}$/', $telephone)) {
    $erreurs[] = 'telephone';
}
if (!in_array($projet, PROJETS_AUTORISES, true)) {
    $projet = 'Non précisé';
}
if ($consentement !== 'oui') {
    $erreurs[] = 'consentement';
}
if ($erreurs) {
    repondre(422, ['ok' => false, 'erreur' => 'Champs manquants ou invalides.', 'champs' => $erreurs]);
}

// 4. Limite d'envois par IP (l'adresse IP est hachée, jamais stockée en clair)
if (!is_dir(DOSSIER_DONNEES) && !mkdir(DOSSIER_DONNEES, 0750, true)) {
    repondre(500, ['ok' => false, 'erreur' => 'Configuration du serveur incomplète.']);
}
$ip_hachee = hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? 'inconnue') . __FILE__);
$fichier_limites = DOSSIER_DONNEES . '/limites.json';
$f = fopen($fichier_limites, 'c+');
if ($f && flock($f, LOCK_EX)) {
    $limites = json_decode((string) stream_get_contents($f), true) ?: [];
    $maintenant = time();
    foreach ($limites as $cle => $horodatages) {           // on oublie ce qui a plus d'une heure
        $limites[$cle] = array_values(array_filter($horodatages, fn ($t) => $t > $maintenant - 3600));
        if (!$limites[$cle]) {
            unset($limites[$cle]);
        }
    }
    if (count($limites[$ip_hachee] ?? []) >= MAX_ENVOIS_HEURE) {
        flock($f, LOCK_UN);
        fclose($f);
        repondre(429, ['ok' => false, 'erreur' => 'Trop de demandes. Merci de réessayer plus tard ou de nous appeler.']);
    }
    $limites[$ip_hachee][] = $maintenant;
    ftruncate($f, 0);
    rewind($f);
    fwrite($f, json_encode($limites));
    flock($f, LOCK_UN);
    fclose($f);
}

$date = date('Y-m-d H:i:s');

// 5. Enregistrement CSV (s'ouvre dans Excel ; séparateur point-virgule)
$enregistre = false;
if (ENREGISTRER_CSV) {
    $fichier_csv = DOSSIER_DONNEES . '/demandes.csv';
    $nouveau = !file_exists($fichier_csv);
    $csv = fopen($fichier_csv, 'a');
    if ($csv && flock($csv, LOCK_EX)) {
        if ($nouveau) {
            fwrite($csv, "\xEF\xBB\xBF"); // BOM : accents corrects dans Excel
            fputcsv($csv, ['Date', 'Nom', 'Téléphone', 'Projet', 'Montant (MAD)', 'Ville / pays', 'Message'], ';');
        }
        $enregistre = fputcsv($csv, array_map('cellule_sure', [
            $date, $nom, $telephone, $projet, $montant, $ville, $message,
        ]), ';') !== false;
        flock($csv, LOCK_UN);
        fclose($csv);
    }
}

// 6. E-mail
$sujet = 'Nouvelle demande — ' . $projet . ' — ' . $nom;
$corps = implode("\n", [
    'Nouvelle demande reçue depuis le site TCA Advisory',
    '',
    'Date        : ' . $date,
    'Nom         : ' . $nom,
    'Téléphone   : ' . $telephone,
    'Projet      : ' . $projet,
    'Montant     : ' . ($montant !== '' ? $montant . ' MAD' : '—'),
    'Ville/pays  : ' . ($ville !== '' ? $ville : '—'),
    '',
    'Message :',
    $message !== '' ? $message : '—',
    '',
    'Consentement loi 09-08 : oui',
]);
$entetes = implode("\r\n", [
    'From: TCA Advisory <' . EXPEDITEUR . '>',
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
]);
$envoye = @mail(
    DESTINATAIRE,
    '=?UTF-8?B?' . base64_encode($sujet) . '?=',
    $corps,
    $entetes
);

// 7. Réponse au site
if ($envoye || $enregistre) {
    repondre(200, ['ok' => true]);
}
repondre(500, ['ok' => false, 'erreur' => "L'envoi n'a pas abouti."]);
