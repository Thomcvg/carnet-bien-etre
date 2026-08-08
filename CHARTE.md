# Charte du projet — Carnet Bien-être

Ce document a valeur d'engagement (§ 12 du cahier des charges). Il est opposable aux
contributions : une fonctionnalité contraire à ces principes est refusée même si elle
est bien écrite, bien testée, et demandée par des utilisateurs.

> **Carnet Bien-être n'est pas une application de contrôle du poids.**
> C'est un outil personnel permettant de prendre du recul sur son évolution.

## Règles rédactionnelles

À vérifier en revue de code pour tout texte visible par l'utilisateur.

- **Jamais** : « échec », « raté », « mauvais », « vous auriez dû », « objectif manqué »,
  « erreur », « invalide », « incorrect ».
- Une hausse de poids ne s'affiche jamais en rouge, ni accompagnée d'un signe de jugement.
- Les variations sont des *évolutions*. Les périodes sans saisie sont des *périodes sans
  saisie* — jamais des « oublis » ou des « manquements ».
- Pas de vocabulaire de performance ou de combat : pas de « victoire », pas de « défi
  relevé », pas de « combattre les kilos ».
- Les messages s'adressent à une personne, pas à un dossier.
- Un contrôle de saisie hors bornes demande une confirmation ; il ne dit jamais que la
  valeur est « fausse » ou « invalide ».

## Ce que l'application ne fera jamais

- Compter des calories ou juger un repas.
- Comparer un utilisateur à un autre, sous quelque forme que ce soit — aucun classement,
  aucune moyenne d'utilisateurs, aucun réseau social intégré, même optionnel.
- Afficher une silhouette, un corps idéalisé, ou un « avant/après » triomphal.
- Envoyer des données vers un serveur sans action explicite de la personne qui les saisit.
- Notifier sans y avoir été invitée.
- Expliquer une donnée par une autre, ou suggérer une cause à un chiffre (aucune
  corrélation entre données suivies : voir § 8 et § 19 du cahier des charges).
- Prétendre remplacer un professionnel de santé.

## Ce à quoi toute contribution doit tenir

1. **Rien d'obligatoire au-delà de la date et du poids.** Toute nouvelle donnée est
   facultative et désactivée par défaut (§ 3 et § 20).
2. **Une donnée absente n'est jamais zéro**, jamais interpolée, jamais traitée comme
   une erreur (règle 5).
3. **Aucun calcul ne s'affiche sans ses données sources** (règle 14).
4. **Rien ne bloque un enregistrement.** Le contrôle le plus sévère est une demande de
   confirmation, jamais un refus (§ 5.2, A26).
5. **Toute suppression est confirmée et annulable** (règles 9 et 17).
6. **L'accessibilité n'est pas une phase finale.** Chaque lot est livré accessible
   (§ 13) : contraste AA vérifié, navigation clavier complète, aucune information
   portée par la seule couleur.
7. **Aucune connexion réseau sans action explicite**, à la seule exception encadrée de
   la météo (§ 11.8, règle 18).

## Pour proposer une fonctionnalité

Posez-vous la question dans cet ordre :

1. Est-elle facultative et désactivable ?
2. Respecte-t-elle le vocabulaire de cette charte ?
3. Ajoute-t-elle une pression, une comparaison, ou un jugement — même involontaire ?

Si la réponse à la troisième question est oui, elle n'a pas sa place ici, quel que soit
son intérêt par ailleurs.

---

*Cette charte découle du cahier des charges (`docs/02-cahier-des-charges.md`), § 12 et § 22,
lui-même issu d'un cahier des charges initial rédigé par Crystèle, à qui ce projet doit
son point de départ et sa philosophie.*
