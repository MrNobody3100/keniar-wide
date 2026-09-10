# EURL Keniar Wide — Site vitrine & catalogue

Site client en HTML / CSS / JS pur (pas de build, pas de framework, pas de
TypeScript). Prêt à être déployé sur **Vercel** directement depuis GitHub.

## Structure

```
keniar-wide/
├── index.html                 Accueil
├── catalogue-produits.html    Catalogue produits (filtres, recherche, tri)
├── devis-sur-mesure.html      Configurateur de devis (formulaire multi-étapes)
├── realisations.html          Portfolio de projets réalisés
├── contact.html                Formulaire de contact
├── css/
│   ├── tokens.css             Couleurs / typographie / rayons (design system)
│   └── main.css               Styles additionnels (au-dessus de Tailwind CDN)
├── js/
│   ├── store.js                Data layer (localStorage) — shared "database" for site + admin
│   ├── site.js                 Nav mobile, lien actif, notification toast
│   ├── catalogue.js            Rendu + filtres du catalogue produits
│   ├── devis.js                 Logique du formulaire multi-étapes
│   ├── realisations.js         Rendu + filtres des réalisations
│   └── contact.js              Formulaire de contact
├── admin/                       Espace admin — voir section dédiée plus bas
├── assets/images/
│   ├── logo/                  Logo officiel (fourni)
│   ├── products/              Photos produits (à ajouter plus tard)
│   ├── realisations/          Photos de projets (à ajouter plus tard)
│   └── backgrounds/           Images de fond (à ajouter plus tard)
├── partials/                  Sources des blocs <head>/header/footer/main
│                               (assemblés dans les .html — voir ci-dessous)
└── vercel.json                Config Vercel (clean URLs)
```

## Pourquoi tout est vide (produits, réalisations, images)

Volontairement : aucun produit, aucune réalisation, aucune photo n'a été
inventé. Le site démarre avec des catégories par défaut mais zéro produit,
zéro projet et zéro image (voir `js/store.js` pour le détail). Chaque
page affiche un état vide propre ("Aucun produit pour le moment", etc.)
plutôt que du faux contenu. Tout se remplit depuis `/admin`.

Les emplacements d'images (hero, section "À propos", fonds) utilisent une
classe `.media-placeholder` (motif hachuré) en attendant les vraies photos.

## Le dossier `partials/`

Comme il n'y a pas de build ni de serveur d'includes, chaque page HTML est
autonome (header + footer dupliqués). Le dossier `partials/` contient les
blocs sources (`head.html`, `header.html`, `footer.html`, `main-*.html`)
utilisés pour générer les pages, afin d'éviter les divergences si tu dois
tout régénérer après une modification du header/footer. Ce n'est pas
chargé au runtime — c'est juste la source de vérité pour la maintenance.

## Design system

Les couleurs, polices et rayons viennent du design Stitch fourni
(`DESIGN.md`) : Plus Jakarta Sans (titres), Inter (texte), JetBrains Mono
(labels techniques), palette bleu sécurité (`#1a5ac0`) / ambre (`#7e5700`).
Tailwind est chargé via CDN (voir `partials/head.html`) avec ce thème
étendu ; `css/main.css` couvre le reste (placeholders, scrollbar, etc.).
Les icônes utilisent **Phosphor Icons** via CDN (`unpkg.com/@phosphor-icons/web`).

## Lancer en local

Pas de build nécessaire. Un simple serveur statique suffit :

```bash
npx serve .
# ou
python3 -m http.server 8080
```

## Déploiement Vercel (via GitHub)

1. Pousser ce dossier sur un repo GitHub.
2. Sur Vercel : "New Project" → importer le repo.
3. Framework Preset : **Other** (site statique, aucune commande de build).
4. Déployer.

## Prochaines étapes

- Ajouter les vraies images (logo déjà en place dans `assets/images/logo/`).
- Brancher les formulaires (`devis.js`, `contact.js`) et l'espace admin sur
  un vrai backend/API quand il existe (voir section suivante).

## Devis en PDF (PDFKit)

Chaque demande de devis peut être téléchargée en PDF stylé (logo Keniar,
infos client, tableau des articles si présents, sinon un récapitulatif
de la demande). Généré côté serveur avec **PDFKit**, pas dans le
navigateur — plus fiable, même mise en page partout.

- `api/devis-pdf.js` — fonction Vercel : `GET /api/devis-pdf?id=<uuid>`,
  va chercher la demande dans Supabase (via la clé `service_role`, jamais
  exposée au client) et renvoie le PDF en téléchargement direct.
- Le client obtient son PDF automatiquement juste après avoir soumis le
  formulaire "Devis sur Mesure" (nouvel onglet).
- L'admin a un bouton PDF sur chaque ligne du tableau des demandes, et
  dans le détail d'une demande (`admin/devis.html`).
- Si la demande contient des articles (`items`, voir migration ci-dessous),
  le PDF affiche un tableau chiffré avec total. Sinon, il affiche un
  récapitulatif de la demande sans prix (à chiffrer manuellement).

**Migration SQL à exécuter** (en plus de `schema.sql`, une seule fois) :
`supabase/migration_02_devis_items.sql` — ajoute la colonne `items` à
`devis_requests`.


Un dashboard complet pour gérer le site, dans le même style (Tailwind CDN
+ tokens + Phosphor Icons).

```
admin/
├── login.html          Connexion (identifiant/mot de passe définis via variables d'environnement — voir plus bas)
├── index.html          Tableau de bord (stats, dernières demandes, alertes stock)
├── devis.html          Demandes de devis reçues (filtre par statut, détail, changement de statut)
├── messages.html       Messages du formulaire de contact
├── produits.html       Gestion du catalogue + inventaire (ajout/édition/suppression, upload photo, stock)
├── categories.html     Gestion des catégories (ajout, icône Phosphor, suppression protégée si utilisée)
├── realisations.html   Gestion du portfolio de projets réalisés
├── css/admin.css        Styles additionnels propres à l'admin (badges, sidebar, modales)
└── js/                  Logique de chaque page (CRUD, filtres, upload d'images en base64)
```

### Comment ça marche (important)

Le site (public + admin) est maintenant branché sur une vraie base de
données **Supabase** (Postgres). `js/store.js` fait les appels réseau via
`js/supabase-client.js` (URL + clé publique "anon"). Le schéma des tables
est dans `supabase/schema.sql`.

- Les produits ajoutés dans `produits.html` apparaissent dans
  `catalogue-produits.html` pour **tout le monde**, sur n'importe quel
  appareil — ce n'est plus limité à un seul navigateur comme avec
  l'ancienne version en `localStorage`.
- Idem pour les catégories, réalisations, demandes de devis et messages.

**Limites à connaître avant la mise en production :**
1. Les policies RLS "Admin" dans `supabase/schema.sql` sont volontairement
   ouvertes (`using (true)`) tant que l'admin n'a pas de vraie session
   Supabase Auth branchée dessus — voir la note en bas de ce fichier SQL.
   (L'authentification de connexion elle-même est déjà sécurisée
   côté serveur — voir la section "Sécurité de l'admin" plus bas.)
2. Les photos uploadées depuis l'admin sont stockées en base64 directement
   dans la colonne `image_url` (fonctionne, mais pas idéal pour de grosses
   images à grande échelle — Vercel Blob est prévu pour la suite).

## Sécurité de l'admin (identifiant / mot de passe)

Les identifiants admin ne sont **jamais écrits dans le code** (JS/HTML).
Ils vivent uniquement dans les variables d'environnement Vercel, et la
vérification se fait côté serveur via 3 petites fonctions Vercel dans
`/api` :

- `api/login.js` — compare `username`/`password` à
  `process.env.ADMIN_USERNAME` / `process.env.ADMIN_PASSWORD`, et pose
  un cookie de session signé (HMAC) si c'est bon.
- `api/session.js` — dit au navigateur si le cookie de session est
  valide (`admin/js/admin-layout.js` l'appelle sur chaque page admin).
- `api/logout.js` — supprime le cookie.

**Variables d'environnement à définir sur Vercel** (Project → Settings →
Environment Variables) :

| Variable | Exemple | Description |
|---|---|---|
| `ADMIN_USERNAME` | `admin` | Identifiant de connexion admin |
| `ADMIN_PASSWORD` | *(choisis un vrai mot de passe fort)* | Mot de passe admin |
| `ADMIN_SESSION_SECRET` | *(chaîne aléatoire longue)* | Secret utilisé pour signer le cookie de session |

⚠️ Après avoir ajouté/modifié ces variables, il faut **redéployer** le
projet sur Vercel pour qu'elles soient prises en compte.



