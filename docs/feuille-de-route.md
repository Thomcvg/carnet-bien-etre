# Feuille de route

État au 11 août 2026. Ce document dit ce qui existe, ce qui viendra peut-être, et
surtout **ce qui ne viendra jamais** — cette dernière liste est la plus utile.

---

## Livré

| Lot | Contenu | État |
|---|---|---|
| **0 — Fondations** | Dépôt, licence AGPL, charte, modèle de données, migrations, tests, intégration continue, thèmes et accessibilité | ✅ |
| **1 — Le carnet** | Saisie éclair, historique, courbe, IMC lu selon l'âge, objectifs, jauge, tableau de bord, export | ✅ |
| **2 — Le moteur** | Champs configurables, préréglages, champs personnalisés, modes, événements, étiquettes, rattrapage | ✅ |
| **3 — Le recul** | Bilan, graphiques multi-champs, variations mensuelles, résumé du mois, repères d'activité, jalons | ✅ |
| **4 — L'ailleurs** | PWA, APK Android, sauvegarde fichier, export XLSX, impression, fiche médecin, traitements, profils multiples | ✅ |
| **5 — L'ouverture** | Documentation, guide de contribution, code de conduite, feuille de route, métadonnées F-Droid | ✅ sauf traduction |

Ajouts hors lots, issus de l'usage et des audits :

- Le **poids est devenu facultatif** comme n'importe quelle donnée.
- Les **objectifs portent sur n'importe quelle donnée**, en deux familles :
  atteindre un niveau, ou tenir une régularité.
- **Météo**, **synchronisation WebDAV**, **import des pas**, **teintes au choix**,
  **visite guidée**, **plein écran**.

---

## Envisagé

Rien n'est promis. L'ordre reflète l'utilité perçue, pas une date.

- **Traduction.** L'application est en français, en dur. La rendre traduisible
  demande de sortir chaque texte du code — un chantier large et sans effet
  visible, qu'il vaut mieux mener d'un bloc quand le reste est stable.
- **Vérification automatique des contrastes** en intégration continue. Elle est
  faite à la main aujourd'hui, ce qui ne rattrape pas une couleur retouchée
  distraitement.
- **Écran de ressources** (§ 12.5 du cahier des charges) orientant vers des
  ressources fiables sur les troubles du comportement alimentaire. C'est le seul
  engagement du § 12 qui ne soit pas tenu.
- **Import d'un tableur existant.** Repoussé depuis le début : écrire un
  importateur générique pour quelques lignes coûtait plus cher que de les saisir.
- **Aide contextuelle** — une explication accessible d'un geste sur chaque
  indicateur calculé, plutôt que le texte permanent d'aujourd'hui.
- **Photos de suivi**, **analyses biologiques**, **synchronisation temps réel**.
  Envisageables sans contredire la charte, mais rien ne les réclame.

---

## Ce qui ne viendra jamais

Cette liste est **opposable**. Elle vient de la [charte](../CHARTE.md), qui a
valeur d'engagement, et une proposition qui s'y heurte est refusée même bien
écrite et bien testée.

- **Compter des calories, juger un repas.**
- **Comparer une personne à une autre** — aucun classement, aucune moyenne
  d'utilisateurs, aucun réseau social, même en option.
- **Afficher une silhouette**, un corps idéalisé, un « avant/après ».
- **Envoyer des données sans action explicite** de la personne qui les saisit.
- **Notifier sans y avoir été invitée.**
- **Expliquer une donnée par une autre** — aucune corrélation affichée. Avec une
  saisie mensuelle, croiser des champs sur douze points par an produit
  mécaniquement des relations fausses, et « votre poids baisse quand vous dormez
  mieux » serait un mensonge présenté comme une découverte.
- **Prétendre remplacer un professionnel de santé.**
- **Un compte, un serveur, un abonnement.**

---

## Comment ça avance

Le projet n'a pas de rythme de publication. Il évolue quand l'usage révèle un
manque — c'est ainsi que le poids est devenu facultatif, et que les objectifs ont
cessé d'être des objectifs de poids.

Les décisions, y compris les refus, sont consignées dans `docs/`. Le journal du
dépôt raconte des raisons, pas des différences de fichiers.
