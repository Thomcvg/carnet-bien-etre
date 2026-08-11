# Carnet Bien-être

Un carnet personnel pour suivre son poids, ses mensurations et son bien-être, à son
rythme. Pensé au départ pour une saisie mensuelle simple, conçu pour rester utile à
toute personne qui veut prendre du recul sur son évolution plutôt que la contrôler.

**Carnet Bien-être n'est pas une application de contrôle du poids.** Voir [CHARTE.md](CHARTE.md).

## Principes

- **Gratuit et open source**, sous licence [AGPL-3.0-or-later](LICENSE).
- **Tout reste sur votre appareil.** Aucun compte, aucun traceur, aucune mesure
  d'audience. Deux fonctionnalités seulement peuvent sortir de l'appareil, toutes
  deux facultatives, désactivées par défaut et déclenchées par un geste :
  la **météo** (§ 11.8) et la **synchronisation vers votre propre Nextcloud**
  (§ 11.7). Voir la [charte](CHARTE.md), règle 7.
- **Rien n'est obligatoire** au-delà d'une date. Toute donnée est facultative et
  désactivée par défaut — **le poids compris** : un carnet qui ne suit que le
  sommeil ou le niveau de stress est un usage à part entière.
- **Une saisie mensuelle en environ deux minutes** reste le cas d'usage central.

## À quoi ça ressemble

| Accueil | Saisie | Graphiques |
|---|---|---|
| ![Accueil](docs/captures/accueil.png) | ![Saisie](docs/captures/saisie.png) | ![Graphiques](docs/captures/graphiques.png) |

*Captures d'un carnet de démonstration : toutes les valeurs sont inventées.*

## État du projet

**Utilisable au quotidien.** Les six lots du
[cahier des charges](docs/02-cahier-des-charges.md) sont livrés, à l'exception de
la traduction — l'application est en français uniquement. Voir la
[feuille de route](docs/feuille-de-route.md).

| Lot | Contenu | État |
|-----|---------|------|
| 0 — Fondations | Modèle de données, migrations, tests, thème et accessibilité | ✅ |
| 1 — Le carnet | Saisie, historique, courbe, IMC, objectifs, export/import | ✅ |
| 2 — Le moteur | Champs configurables, préréglages bien-être/santé/activité, champs personnalisés, événements | ✅ |
| 3 — Le recul | Bilan complet, comparaison de mensurations, annotations d'événements, jalons, repères d'activité | ✅ |
| 4 — L'ailleurs | PWA installable, APK Android, export Excel, sauvegarde automatique, fiche médecin, traitements, rappels, profils multiples | ✅ |
| 5 — L'ouverture | Documentation, guide de contribution, feuille de route, métadonnées F-Droid | ✅ |
| — | Traduction (internationalisation) | à venir |

## Installer

- **Android** — télécharger le fichier `.apk` et l'ouvrir. Android demandera
  l'autorisation d'installer depuis cette source, une fois. Android 8.0 minimum.
- **iPhone, ordinateur** — ouvrir la version web et l'ajouter à l'écran d'accueil
  depuis le navigateur. Elle fonctionne ensuite hors ligne, comme une application.

Pas de Play Store : coût annuel, et conditions incompatibles avec l'AGPL.

## Pour qui découvre le projet

- [**Guide d'utilisation**](docs/guide-utilisateur.md) — illustré, sans jargon.
  C'est par là qu'il faut commencer si vous voulez simplement vous en servir.
- [`CHARTE.md`](CHARTE.md) — les principes non négociables du projet.
- [`docs/feuille-de-route.md`](docs/feuille-de-route.md) — ce qui existe, ce qui
  viendra peut-être, et ce qui ne viendra jamais.
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — comment contribuer.
- [`docs/02-cahier-des-charges.md`](docs/02-cahier-des-charges.md) — le document de
  référence : philosophie, architecture, règles métier, lots de livraison.
- [`docs/01-brainstorming.md`](docs/01-brainstorming.md) — le catalogue de propositions
  exploré avant de figer le périmètre.
- [`docs/03-build-android.md`](docs/03-build-android.md) — construire l'APK Android.
- [`docs/05-signature-et-diffusion.md`](docs/05-signature-et-diffusion.md) — signer
  et diffuser une version.

## Développement

```bash
npm install
npm run dev       # serveur de développement
npm run test      # suite de tests
npm run check     # vérification de types
npm run build     # build de production
```

### Pile technique

- [Svelte 5](https://svelte.dev) + [Vite](https://vitejs.dev) + TypeScript
- [Dexie](https://dexie.org) (IndexedDB) pour le stockage local
- Graphiques SVG écrits pour le projet — aucune dépendance de visualisation
- [vite-plugin-pwa](https://vite-pwa-org.netlify.app) pour la PWA installable (M1)
- [Capacitor](https://capacitorjs.com) pour l'empaquetage Android (M2) — voir
  [`docs/03-build-android.md`](docs/03-build-android.md)
- [SheetJS](https://sheetjs.com) (`xlsx`, depuis le CDN officiel plutôt que le registre
  npm — voir le commentaire dans `src/lib/io/xlsx.ts`) pour l'export Excel
- [Vitest](https://vitest.dev) pour les tests

### Organisation du code

```text
src/
  lib/
    domain/     Calculs purs — IMC, progression, tendances, migrations…
                Aucune dépendance au navigateur : entièrement testable.
    db/         Base locale (Dexie / IndexedDB)
    io/         Export / import (CSV, JSON)
    etat/       État de l'application (Svelte 5 runes)
  composants/   Composants réutilisables (courbe, jauge, modale…)
  vues/         Écrans de l'application
tests/          Tests de la couche domaine
docs/           Cahier des charges et documents de conception
```

La couche `domain/` ne dépend d'aucune API navigateur : c'est ce qui permet de tester
les calculs (IMC, progression, migrations de schéma…) sans environnement DOM.

### Le moteur de champs (§ 3)

Le poids, un tour de taille, une tension artérielle, un niveau de stress et un champ
inventé par l'utilisateur sont le même objet (`DefinitionChamp`) avec des paramètres
différents. `src/lib/domain/champs.ts` porte le catalogue préréglé (§ 20, tout désactivé
par défaut) et les fonctions de création d'un champ personnalisé (C18). Le rendu d'un
champ dans le formulaire de saisie choisit son composant selon `champ.type` — voir les
composants `Champ*.svelte`.

## Contribuer

Voir [CONTRIBUTING.md](CONTRIBUTING.md) et [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

Une chose à savoir avant d'écrire du code : **la [charte](CHARTE.md) est opposable
aux contributions**. Une fonctionnalité qui introduit une pression, une comparaison
ou un jugement — même involontaire — est refusée quel que soit son intérêt par
ailleurs, et même si elle est bien écrite et bien testée.

## Licence

[AGPL-3.0-or-later](LICENSE). Toute version modifiée de ce logiciel, y compris
simplement hébergée en ligne, doit rester ouverte.
