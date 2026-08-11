# Contribuer

Merci d'y penser. Ce projet accepte les contributions, à une condition qui n'est
pas négociable et qu'il vaut mieux lire avant d'écrire du code.

## La condition

**La [charte](CHARTE.md) est opposable aux contributions.** Une fonctionnalité
contraire à ces principes est refusée même si elle est bien écrite, bien testée,
et demandée par des utilisateurs. Ce n'est pas une formule : plusieurs
propositions ont déjà été écartées sur cette base, et les raisons sont
consignées dans `docs/`.

Avant de proposer quelque chose, posez-vous les trois questions du bas de la
charte. Si la troisième — *est-ce que cela ajoute une pression, une comparaison
ou un jugement, même involontaire ?* — reçoit un oui, la réponse est non, quel
que soit l'intérêt par ailleurs.

## Démarrer

```bash
npm install
npm run dev
```

L'application s'ouvre sur `http://localhost:5173`. Il n'y a rien à configurer :
pas de compte, pas de base à créer, pas de variable d'environnement. Les données
vivent dans IndexedDB, dans votre navigateur.

Avant de proposer une modification :

```bash
npm run check    # types TypeScript et Svelte
npm run test     # suite de tests
npm run build    # compilation de production
```

L'intégration continue lance exactement ces trois commandes.

## Comment le code est organisé

```
src/lib/domain/    calculs purs, sans navigateur — c'est là que vit la logique
src/lib/etat/      état de l'application (runes Svelte 5)
src/lib/db/        stockage IndexedDB via Dexie
src/lib/io/        entrées-sorties : fichiers, réseau, greffons natifs
src/composants/    briques d'interface réutilisables
src/vues/          écrans
tests/             tests de la couche domaine
docs/              cahier des charges, audits, procédures
```

**Une règle structure tout le reste : toute transformation de donnée vit dans
`domain/`.** Un composant assemble et affiche ; il ne traduit pas. Ce n'est pas
un principe abstrait — la conversion des livres en kilogrammes avait été écrite
dans un fichier `.svelte`, aucun test ne pouvait l'atteindre, et elle enregistrait
des livres comme des kilogrammes. Le correctif a consisté à déplacer la logique,
pas à la réparer sur place.

Corollaire pratique : si vous ne savez pas comment tester quelque chose, c'est
probablement qu'il est au mauvais endroit.

## Conventions

- **Le code est en français** — noms de variables, de fonctions, commentaires.
  C'est inhabituel, et c'est délibéré : le projet vise un contributeur occasionnel
  francophone plutôt qu'un public international.
- **Les commentaires expliquent *pourquoi*, pas *quoi*.** Un commentaire qui
  paraphrase la ligne suivante sera retiré ; un commentaire qui dit quel piège on
  évite sera gardé.
- **Aucune dépendance nouvelle sans discussion.** Le projet vise dix ans de
  longévité avec une surface minimale. Trois dépendances de production
  aujourd'hui, c'est un chiffre qu'on défend.
- **Chaque lot est livré accessible** (§ 13) : contraste AA, navigation clavier
  complète, aucune information portée par la seule couleur. Ce n'est pas une
  phase finale.

## Vocabulaire

Les textes visibles sont soumis aux règles rédactionnelles de la charte. En
résumé : jamais « échec », « raté », « objectif manqué » ; une hausse de poids ne
s'affiche jamais en rouge ; les périodes sans saisie sont des *périodes sans
saisie*, jamais des oublis.

Cette relecture fait partie de la revue de code, au même titre que le reste.

## Proposer une modification

1. Ouvrez un ticket d'abord si le changement touche au comportement. Cela évite
   d'écrire du code qui sera refusé pour une raison de principe.
2. Une modification, une intention. Un correctif et une refonte dans la même
   proposition sont impossibles à relire.
3. Décrivez ce qui vous a fait choisir cette solution. Le journal de ce dépôt
   raconte des décisions, pas des diffs.

## Signaler un problème

Ouvrez un ticket avec ce qui s'est passé, ce que vous attendiez, et la version
affichée dans **Paramètres → À propos**. Ce numéro dit exactement quelle version
tourne, ce qu'une capture d'écran ne dit pas.

Si le problème concerne vos données, **exportez une sauvegarde avant toute
manipulation** (Paramètres → Vos données). N'envoyez jamais ce fichier dans un
ticket public : il contient tout votre carnet.

## Licence

En contribuant, vous acceptez que votre travail soit distribué sous
[AGPL-3.0-or-later](LICENSE), comme le reste du projet.
