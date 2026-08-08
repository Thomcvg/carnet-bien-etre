# Carnet Bien-être

Un carnet personnel pour suivre son poids, ses mensurations et son bien-être, à son
rythme. Pensé au départ pour une saisie mensuelle simple, conçu pour rester utile à
toute personne qui veut prendre du recul sur son évolution plutôt que la contrôler.

**Carnet Bien-être n'est pas une application de contrôle du poids.** Voir [CHARTE.md](CHARTE.md).

## Principes

- **Gratuit et open source**, sous licence [AGPL-3.0-or-later](LICENSE).
- **Tout reste sur votre appareil.** Aucun compte, aucun serveur, aucun traceur.
  La seule exception possible est la météo (facultative, désactivée par défaut,
  voir § 11.8 du cahier des charges).
- **Rien n'est obligatoire** au-delà d'une date et d'un poids. Toute donnée
  complémentaire est facultative et désactivée par défaut.
- **Une saisie mensuelle en environ deux minutes** reste le cas d'usage central.

## État du projet

En développement. Le [cahier des charges](docs/02-cahier-des-charges.md) découpe le
travail en six lots ; les lots 0 (fondations) et 1 (le carnet) sont en cours.

| Lot | Contenu | État |
|-----|---------|------|
| 0 — Fondations | Modèle de données, migrations, tests, thème et accessibilité | ✅ |
| 1 — Le carnet | Saisie, historique, courbe, IMC, objectifs, export/import | ✅ |
| 2 — Le moteur | Champs configurables, préréglages bien-être/santé/activité, champs personnalisés, événements | ✅ |
| 3 — Le recul | Bilan complet, comparaison de mensurations, annotations d'événements, jalons, repères d'activité | ✅ |
| 4 — L'ailleurs | PWA installable, APK Android, export Excel, sauvegarde automatique, fiche médecin, traitements, rappels, profils multiples | ✅ |
| 5 — L'ouverture | Documentation, traductions, F-Droid | à venir |

## Pour qui découvre le projet

- [`docs/01-brainstorming.md`](docs/01-brainstorming.md) — le catalogue de propositions
  exploré avant de figer le périmètre.
- [`docs/02-cahier-des-charges.md`](docs/02-cahier-des-charges.md) — le document de
  référence : philosophie, architecture, règles métier, lots de livraison.
- [`docs/03-build-android.md`](docs/03-build-android.md) — construire l'APK Android.
- [`CHARTE.md`](CHARTE.md) — les principes non négociables du projet.

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

Le guide de contribution arrive au lot 5. En attendant, toute proposition est
évaluée à l'aune de [CHARTE.md](CHARTE.md) : une fonctionnalité qui introduit une
pression, une comparaison ou un jugement n'a pas sa place dans ce projet, quel que
soit son intérêt par ailleurs.

## Licence

[AGPL-3.0-or-later](LICENSE). Toute version modifiée de ce logiciel, y compris
simplement hébergée en ligne, doit rester ouverte.
