# Cahier des charges — Carnet Bien-être

**Version :** 2.0 · **Date :** 08/08/2026
**Remplace :** cahier des charges v1.0 (Crystèle) — les écarts sont listés au § 19
**Licence du projet :** AGPL-3.0-or-later · **Dépôt :** `carnet-bien-etre`

---

## 1. Philosophie

Reprise intégrale du § 35 de la v1.0, qui reste la règle supérieure du produit :

> **Carnet Bien-être n'est pas une application de contrôle du poids.**
> C'est un outil personnel permettant de prendre du recul sur son évolution.
> Le poids n'est qu'un indicateur parmi d'autres.
> **Saisir ce que l'on veut, quand on le veut, et laisser le carnet faire le reste.**

Trois conséquences qui priment sur toute autre exigence de ce document :

1. **Une donnée absente n'est jamais une erreur.** Aucun champ facultatif ne bloque un enregistrement, aucune valeur manquante n'est remplacée par zéro, aucun écran ne réclame ce qui n'a pas été saisi.
2. **Aucune formulation culpabilisante.** Les variations sont des *évolutions*, jamais des réussites ou des échecs. Voir la charte au § 12.
3. **Ce qui n'est pas activé n'existe pas.** Un module désactivé ne laisse aucune trace dans l'interface : ni onglet grisé, ni champ vide, ni invitation à l'activer.

---

## 2. Publics et modes d'usage

### 2.1. Utilisatrice pilote

Crystèle, 60 ans, vient d'un tableur, saisit une fois par mois. Elle est la mesure de référence : **toute décision d'interface qui la ralentit est une mauvaise décision**, quel que soit le bénéfice pour un autre public.

### 2.2. Publics visés au-delà

Personnes en maintien ou en reprise de poids, seniors suivant plusieurs constantes, pratiquants sportifs, personnes en suivi médical, tous âges et tous genres.

### 2.3. Résolution de la tension

L'application est **minimale par défaut et extensible par modules**. Au premier lancement, une question unique oriente la configuration (J5) :

```text
Qu'est-ce qui vous amène ?
  · Suivre mon poids
  · Me stabiliser
  · Reprendre du poids
  · Suivre plusieurs constantes de santé
  · Accompagner une pratique sportive
  · Je verrai plus tard
```

Chaque réponse active un jeu de champs préréglés (§ 20). Aucune ne verrouille quoi que ce soit : tout reste modifiable dans les paramètres.

Deux profils d'affichage se superposent à ce choix :

| Mode | Contenu | Navigation |
|------|---------|------------|
| **Essentiel** (J3) — défaut | Poids, courbe, historique | Accueil · Historique · Graphiques · Paramètres |
| **Complet** (J4) | Tous les modules activés | Accueil · Mesures · Graphiques · Bilan · Objectifs · Historique · Paramètres |

Le passage d'un mode à l'autre ne modifie ni les données ni les champs activés : il ne change que ce qui est affiché.

---

## 3. Architecture fonctionnelle : le moteur de champs

C'est la décision structurante du projet. Plutôt que de coder chaque donnée suivie, l'application manipule des **définitions de champ** homogènes. Le poids, un tour de taille, la tension artérielle, un niveau de stress et un tracker inventé par l'utilisateur sont le même objet avec des paramètres différents.

### 3.1. Définition d'un champ

| Attribut | Rôle |
|----------|------|
| `cle` | Identifiant stable, jamais traduit (`poids`, `tour_taille`, `stress`) |
| `libelle` | Nom affiché, traduisible |
| `categorie` | `corps` · `sante` · `bienetre` · `activite` |
| `type` | `nombre` · `echelle5` · `booleen` · `texte` · `choix` · `duree` · `tension` |
| `unite` | `kg` · `lb` · `cm` · `in` · `h` · `mmHg` · `pas` · aucune |
| `min` / `max` / `pas` | Bornes de saisie et garde-fous (A26) |
| `options` | Valeurs possibles pour le type `choix` |
| `actif` | Visible ou non dans la saisie |
| `ordre` | Position dans le formulaire |
| `systeme` | Non supprimable (le poids uniquement) |
| `personnalise` | Créé par l'utilisateur (C18) |

### 3.2. Ce que le moteur absorbe

Les propositions suivantes ne sont pas des développements séparés mais des **préréglages livrés désactivés** : A1, A4, A16, A24, C1 à C17, C19, C21, E1 à E6. Le catalogue complet figure au § 20.

### 3.3. Champs personnalisés (C18)

L'utilisateur crée ses propres champs avec les mêmes attributs. Un champ personnalisé est un citoyen de première classe : il apparaît dans la saisie, l'historique, les graphiques, le bilan et les exports, exactement comme un champ livré.

### 3.4. Indicateurs calculés

Conformément au § 20 de la v1.0, **les valeurs calculées ne sont jamais saisissables ni stockées**. Elles sont recalculées à la volée depuis les données sources : IMC, catégorie d'IMC, fourchette de poids santé, ratio taille/stature, moyenne mobile, bande d'incertitude, progression, évolutions en cm, variations mensuelles.

---

## 4. Modèle de données

```text
Profil
  id, nomCarnet, dateNaissance?, sexe?
  unites { masse: kg|lb, longueur: cm|in }, formatDate, langue
  mode: essentiel|complet, usage, theme, taillePolice, modeSansChiffre
  versionSchema

DefinitionChamp
  id, cle, libelle, categorie, type, unite?, min?, max?, pas?, options?
  actif, ordre, systeme, personnalise

Mesure
  id, date, moment?, contextePesee?
  valeurs: { [cleChamp]: valeur }        ← creux : seules les clés saisies existent
  notes?, etiquettes[]?, meteo?
  creeLe, modifieLe

Evenement                                 ← G3, C14
  id, dateDebut, dateFin?, libelle, type, couleur?

Traitement                                ← B4
  id, nom, dosage?, debut, fin?, rappelActif, heuresRappel[]

Objectif
  id, type: cible|fourchette|maintien|regularite
  champCle, valeurMin?, valeurMax?, dateCible?, actif, creeLe
  regularite?: { occurrences, periode: semaine|mois }   ← type `regularite` uniquement

Jalon
  id, cle, libelle, atteintLe

Reglages
  rappels, sauvegarde, synchronisation, affichage
```

**Profils multiples (O1)** — Plusieurs profils peuvent coexister sur un même appareil, par exemple au sein d'un couple ou d'une famille. Chacun possède ses propres champs, mesures, objectifs et réglages. Toutes les données sont rattachées à un profil. **Aucune donnée n'est partagée et aucune vue comparative entre profils n'existe**, conformément au § 12.3. Le changement de profil se fait depuis les paramètres.

**Règles de stockage**

- La date est une vraie date ISO. Le format d'affichage en est totalement indépendant (§ 6.2 v1.0).
- `valeurs` est un objet creux : une clé absente signifie « non renseigné », jamais zéro.
- Aucune donnée dérivée n'est persistée.
- Toute évolution du schéma passe par une migration versionnée et testée (§ 11.4).

---

## 5. Navigation et écrans

Sept entrées maximum, conformément au § 17 de la v1.0. En mode essentiel, quatre.

### 5.1. Accueil — tableau de bord

Affiche immédiatement, sans défilement sur un écran de téléphone :

- poids actuel et date de la dernière mesure ;
- poids de départ, objectif, évolution depuis le début, distance restante ;
- jauge de progression (§ 7.4) ;
- IMC et sa lecture, si la taille est connue ;
- courbe de poids avec tendance lissée et zone objectif ;
- bouton **+ Nouvelle mesure**, toujours accessible au pouce.

En mode essentiel, l'accueil absorbe le bilan et les objectifs. L'écran reste épuré : **aucune citation d'accueil** (§ 16.4 v1.0).

Si la dernière mesure remonte à plus de cinq semaines, une ligne discrète le signale — sans reproche, et sans jamais parler de « retard » ou d'« oubli ».

### 5.2. Nouvelle mesure

Parcours en une seule page défilante, replié par défaut :

```text
Date                             [préremplie à aujourd'hui]
Poids                            [clavier numérique, virgule]
─────────────────────────────────
+ Mensurations                   [replié]
+ Bien-être                      [replié]
+ Activité                       [replié]
+ Note                           [replié]
─────────────────────────────────
                    [ Enregistrer ]
```

- **Saisie éclair (K1)** : une mesure valide ne demande qu'une date et un poids. Le bouton Enregistrer est actif dès la saisie du poids.
- **Préremplissage (K2)** : les mensurations reprennent la dernière valeur connue, affichée en gris tant qu'elle n'est pas confirmée ou modifiée. Une valeur non touchée n'est **pas** enregistrée — elle sert de repère de saisie, pas de donnée.
- **Clavier (K3)** : type numérique décimal, virgule et point acceptés indifféremment.
- **Garde-fou (A26)** : une valeur hors bornes ou s'écartant de plus de 20 % de la dernière mesure demande une confirmation douce (« 740 kg — c'est bien ce que vous vouliez saisir ? ») sans jamais bloquer.
- **Doublon (K7)** : si une mesure existe déjà à cette date, proposer de la compléter, de la remplacer, ou d'ajouter une seconde pesée du même jour (A29).
- **Contexte de pesée (A28)** : champ facultatif à choix (à jeun, habillée, après le sport, autre).
- **Mode rattrapage (K4)** : saisir plusieurs mois passés à la suite, la date s'incrémentant automatiquement d'un mois.

### 5.3. Historique

Liste chronologique inversée, une ligne par mesure, avec les valeurs renseignées uniquement. Chaque ligne s'ouvre en modification. Suppression avec confirmation (§ 19 v1.0) **et annulation possible** (K8).

### 5.4. Graphiques

- Courbe par champ numérique, avec sélecteur de période (G2) : 3 mois, 6 mois, 1 an, tout, personnalisé.
- Tendance lissée superposée aux valeurs réelles, sans jamais les masquer (G4, § 5.3 v1.0).
- Zone objectif matérialisée en bande (G1).
- Bande d'incertitude physiologique (A32).
- Annotations d'événements sur l'axe temporel (G3).
- Variations mensuelles en barres (G5).
- Comparaison multi-champs avec sélection explicite des courbes (§ 11.6 v1.0).
- Mode plein écran (G24).
- Les valeurs absentes sont ignorées : la courbe n'interpole pas et ne descend pas à zéro.

### 5.5. Bilan

Pour le poids : initial, actuel, minimum atteint, évolution totale, objectif, distance restante.
Pour chaque autre champ numérique : première valeur, dernière valeur, évolution.
Si une extrémité manque, **ne rien calculer et ne rien afficher** — pas de tiret, pas de zéro.

Résumé du mois en un écran (G6) et repères d'activité (§ 8.3).

### 5.6. Objectifs

Création, modification et suivi des objectifs (§ 9). Changer un objectif ne modifie jamais l'historique (règle 8 v1.0).

### 5.7. Paramètres

Profil, unités et format de date (A25, K17), nom du carnet (K16), champs suivis et modules, thème et taille de police, rappels, sauvegarde et synchronisation, export et import, suppression des données, aide et mentions.

---

## 6. Aide et découverte

- **Aide contextuelle (J10)** : chaque indicateur calculé porte une explication accessible d'un geste, sans quitter l'écran (« c'est quoi l'IMC ? », « pourquoi une fourchette ? »).
- **Visite guidée (J11)** : trois écrans au premier lancement, passables à tout moment, jamais reproposés.

---

## 7. Calculs et indicateurs

### 7.1. IMC

`IMC = poids / taille²`, affiché à une décimale, calculé uniquement si une taille est connue. La taille étant un champ suivi (A4), le calcul utilise **la taille valide la plus proche de la date de la mesure**.

### 7.2. Lecture de l'IMC nuancée par l'âge (A7)

L'IMC n'est jamais affiché seul : il est accompagné d'une lecture adaptée à l'âge, si la date de naissance est connue.

- **Moins de 65 ans** : catégories OMS (< 18,5 · 18,5–25 · 25–30 · ≥ 30).
- **65 ans et plus** : la fourchette de référence est relevée. La Haute Autorité de santé retient un IMC inférieur à 22 comme critère de dénutrition chez la personne de 70 ans et plus — afficher « maigreur » à 22 serait faux et anxiogène. L'application présente une fourchette de référence élargie et signale le seuil de vigilance basse.
- **Âge inconnu** : catégories OMS, avec mention que la lecture varie avec l'âge.

Le vocabulaire évite les termes de jugement : on affiche une position dans une fourchette, pas une étiquette sur une personne.

### 7.3. Autres indicateurs

- **Fourchette de poids santé (A8)** : plage de poids correspondant à la fourchette d'IMC de référence pour la taille et l'âge. Présentée comme une zone, jamais comme un chiffre unique.
- **Ratio taille/stature (A5)** : `tour_taille / taille`, seuil de référence 0,5. Calculé seulement si les deux valeurs existent.
- **Moyenne mobile (A27)** : moyenne glissante sur les trois dernières mesures, affichée en complément des valeurs réelles.
- **Bande d'incertitude (A32)** : zone de ± 1 kg autour de la tendance, matérialisant la fluctuation physiologique normale.
- **Signal de bruit (G21)** : une variation inférieure à la bande d'incertitude est présentée comme stable, jamais comme une hausse ou une baisse.

### 7.4. Progression

```text
progression = (poids_initial − poids_actuel) / (poids_initial − poids_objectif) × 100
```

Bornée à l'affichage entre 0 % et 100 %. Pour un objectif en fourchette (F1), la cible de calcul est la borne la plus proche du poids actuel. Pour un objectif de prise de poids (F3), la formule s'inverse. Pour un objectif de maintien (F2), la jauge est remplacée par un indicateur de position dans la fourchette.

---

## 8. Analyse

### 8.1. Résumé du mois (G6)

Une vue unique : évolution du mois, position par rapport à l'objectif, champs renseignés, événements de la période.

**Question du mois (C22).** Le résumé se termine par une question ouverte et une zone de texte libre — « qu'est-ce qui a bien fonctionné ce mois-ci ? », « qu'est-ce qui a été difficile ? ». La question tourne dans une petite liste, la réponse est facultative et rattachée au mois. C'est ce qui distingue un carnet d'un tableur : deux lignes écrites valent souvent mieux que douze champs cochés.

### 8.2. Variations mensuelles (G5)

Histogramme des deltas mois par mois, plus lisible qu'une courbe pour situer une période.

### 8.3. Repères d'activité

Affichés uniquement si au moins un champ d'activité est actif. Ce sont des repères, jamais des quotas.

- **Activité hebdomadaire (E2)** : jauge des 150 minutes d'activité modérée recommandées par l'OMS, cumulées sur sept jours glissants. Formulée comme un repère atteint ou en cours, jamais comme un manque. En dessous, on affiche ce qui a été fait, pas ce qui manque.
- **Renforcement musculaire (E4)** : second repère de l'OMS, deux séances par semaine — largement méconnu, et déterminant après 60 ans pour préserver la masse musculaire. Compté depuis le champ `renforcement`.
- **Activité du quotidien (E3)** : le jardinage, le ménage, les courses et les escaliers comptent dans ces repères au même titre qu'une séance de sport. Ne pas les reconnaître donnerait à tort le sentiment de ne rien faire.
- **Dépense estimée (E5)** : estimation en équivalents métaboliques à partir du type, de la durée et de l'intensité. Facultative, désactivée par défaut, et présentée comme un ordre de grandeur — jamais comme un budget à équilibrer avec l'alimentation, ce qui relèverait du comptage de calories exclu au § 22.
- **Distance cumulée (E13)** : cumul des distances parcourues, exprimé en jalons géographiques concrets (« la longueur de la Loire »). Purement ludique, désactivé par défaut, et soumis au § 12.3 — aucun classement, aucune comparaison entre personnes.

---

## 9. Objectifs, jalons, accompagnement

### 9.1. Types d'objectif

- **Fourchette (F1)** — mode recommandé et proposé par défaut : « entre 61 et 64 kg ». On n'échoue plus à 63,2 kg.
- **Maintien (F2)** : rester dans une fourchette, sans direction.
- **Prise de poids (F3)** : toute la logique d'affichage s'inverse, y compris les jalons et le vocabulaire.
- **Régularité (F4)** : « marcher trois fois par semaine », « dormir sept heures cinq nuits sur sept ». Une condition sur un champ suivi (au moins / au plus / entre, ou « oui » pour un booléen), un nombre de fois, une période glissante de 7 ou 30 jours. **Le décompte porte sur les jours documentés, jamais sur la longueur de la période** : un jour sans saisie n'est pas un jour manqué (règle 2 de la charte). Ni série à préserver, ni décompte de ce qui manque.

Un objectif porte sur **n'importe quelle donnée suivie**, pas seulement le poids : `champCle` le désigne. On peut en définir **un par donnée** — plusieurs sont actifs à la fois, mais jamais deux sur le même champ, ce qui n'aurait pas de sens. Un objectif dont le champ est désactivé se tait sans être supprimé.

Deux garde-fous restent propres au poids parce qu'ils relèvent de sa physiologie : l'avertissement d'IMC (§ 12.2) et le seuil de rythme hebdomadaire (§ 9.2).

L'objectif est modifiable à tout moment et n'affecte jamais l'historique.

### 9.2. Objectif irréaliste (F6)

Si l'objectif et sa date cible impliquent un rythme supérieur à environ 1 % du poids par semaine, une remarque bienveillante le signale et propose une date plus confortable. **Elle n'empêche jamais de valider.** Un objectif dont la cible franchit un seuil de maigreur relève du § 12.2.

### 9.3. Jalons de régularité (F11)

Les jalons ne récompensent pas un résultat mais l'assiduité, seule chose réellement sous contrôle : première mesure, trois mois de carnet, douze mesures, un an de carnet, anniversaire du carnet. Messages discrets, positifs, jamais comparatifs.

### 9.4. Après l'objectif (I8)

Atteindre la cible ne clôt pas le parcours. L'application propose alors, sans l'imposer, de basculer en mode maintien avec une fourchette centrée sur le poids atteint. C'est le moment où la plupart des applications abandonnent l'utilisateur ; celle-ci ne doit pas.

### 9.5. Perte trop rapide (B11)

Une perte supérieure à environ 1 % du poids par semaine sur plusieurs mesures consécutives déclenche un message informatif et bienveillant, invitant à en parler à un professionnel. Informatif, jamais alarmiste, jamais bloquant, désactivable.

---

## 10. Santé

### 10.1. Constantes

La tension artérielle (A16) est un champ de type `tension` à trois composantes (systolique, diastolique, pouls), avec sa propre courbe.

### 10.2. Traitements (B4) et rappels (B6)

Un traitement porte un nom, un dosage facultatif, une date de début et une date de fin facultative. Les rappels de prise (B6) s'appuient sur cette liste — sans traitement enregistré, aucun rappel n'est possible. Module entièrement facultatif, désactivé par défaut.

### 10.3. Fiche pour le médecin (B1)

Une page imprimable : identité et taille, courbe de poids sur la période choisie, chiffres clés, constantes suivies, traitements en cours, événements notables. Générée par l'impression du navigateur (§ 11.3), donc sans dépendance supplémentaire.

### 10.4. Cadre juridique (B14) — obligatoire

L'application affiche, à l'installation puis de façon permanente dans les paramètres :

> **Carnet Bien-être n'est pas un dispositif médical.** Il n'établit aucun diagnostic et ne remplace aucun avis professionnel. Les repères affichés sont indicatifs. En cas de doute sur votre santé, parlez-en à un médecin.

Cette mention est **non désactivable**. Elle est nécessaire dès lors que l'application enregistre des constantes, émet des repères de santé et produit un document destiné à un praticien (règlement UE 2017/745).

---

## 11. Données, sauvegarde, portabilité

### 11.1. Stockage local (L1)

Tout est stocké localement, sans compte et sans serveur. L'application fonctionne intégralement hors ligne. Aucune donnée ne quitte l'appareil sans une action explicite de l'utilisateur.

### 11.2. Export (L2, L3, L4)

| Format | Usage | Réversible |
|--------|-------|-----------|
| **JSON** | Sauvegarde complète, réimportable à l'identique | Oui |
| **CSV** | Données brutes, tableur | Partiel |
| **XLSX** | Données brutes mises en forme | Partiel |
| **PDF** | Bilan à conserver ou à imprimer | Non |

Le JSON est la vraie sauvegarde : il contient les mesures, les définitions de champ, les objectifs, les événements et les réglages. **L'utilisateur n'est jamais prisonnier de l'application.**

### 11.3. Impression (J17, L3)

Une feuille de style d'impression dédiée produit un carnet lisible sur papier. Le PDF est obtenu par l'impression du navigateur, sans bibliothèque supplémentaire.

### 11.4. Migrations de schéma (L16)

Chaque version du schéma porte un numéro. Toute évolution fournit une migration montante testée. **Ouvrir en 2036 un carnet créé en 2026 doit fonctionner sans intervention.** C'est la condition technique des § 13 et § 34 de la v1.0.

### 11.5. Suppression (L13)

Suppression totale et définitive des données en une action, avec confirmation explicite.

### 11.6. Sauvegarde vers un fichier (L7)

Sauvegarde automatique vers un fichier choisi par l'utilisateur, via l'API d'accès au système de fichiers.

**Limite à documenter :** cette API n'existe que sur Chrome et Edge sur ordinateur. Sur Firefox, Safari et mobile, le repli est un export manuel, avec un rappel discret si la dernière sauvegarde date de plus de trois mois.

### 11.7. Synchronisation (L8, L9)

- **Sur ordinateur** — approche recommandée : la sauvegarde automatique (§ 11.6) pointe vers un dossier déjà synchronisé par le client Nextcloud, Drive ou Dropbox. Aucun code réseau, aucun conflit d'authentification, et l'utilisateur garde la main.
- **Dans l'APK Android** : WebDAV natif possible vers Nextcloud.
- **Dans la PWA** : le WebDAV direct est bloqué par la politique d'origine croisée des navigateurs, que Nextcloud ne contourne pas par défaut. Cette limite est documentée plutôt que contournée.
- **Conflits** : en cas de divergence entre deux appareils, l'application ne fusionne pas silencieusement. Elle présente les deux versions avec leurs dates et laisse choisir.

### 11.8. Météo (C20) — la seule requête réseau de l'application

La météo automatique est **la seule fonctionnalité qui sorte de l'appareil**, et elle entre en tension directe avec le § 11.1 et la règle 18. Elle est donc encadrée strictement :

- **Désactivée par défaut**, et activable uniquement par un choix explicite qui énonce ce qui sera transmis.
- **Service utilisé : Open-Meteo** — données ouvertes, sans clé d'interface, sans compte, sans traceur, et dont les conditions n'autorisent aucun profilage. C'est le seul service compatible avec l'engagement du § 15.3.
- **Coordonnées arrondies** à deux décimales avant l'envoi, soit environ un kilomètre. La météo d'une commune suffit ; la position exacte d'une personne ne regarde personne.
- **Aucun historique de requête** conservé, aucun identifiant transmis.
- **Repli permanent** : la météo reste saisissable à la main, et l'absence de réseau n'empêche jamais d'enregistrer une mesure.

Si ce compromis ne convient pas, la fonctionnalité est retirée sans conséquence sur le reste : c'est un champ de contexte, rien de plus.

---

## 12. Éthique et sécurité psychologique

Cette section a valeur d'engagement du projet. Elle est opposable aux contributions.

### 12.1. Charte rédactionnelle (I1)

À écrire dans le dépôt sous `CHARTE.md` et à vérifier en revue de code.

- Jamais « échec », « raté », « mauvais », « vous auriez dû », « objectif manqué ».
- Une hausse de poids n'est jamais affichée en rouge ni accompagnée d'un signe négatif de jugement.
- Les variations sont des évolutions. Les périodes sans saisie sont des périodes sans saisie.
- Pas de superlatifs de performance, pas de vocabulaire de combat, pas de « avant/après » triomphal.
- Les messages s'adressent à une personne, pas à un dossier.

### 12.2. Objectifs dangereux (I2)

Un objectif dont la cible correspond à un IMC inférieur à 18,5 (ou au seuil relevé applicable à l'âge) déclenche un avertissement explicite et une confirmation séparée. L'application propose alors les ressources du § 12.5. Elle n'interdit pas, mais elle ne valide pas en silence.

### 12.3. Aucune comparaison sociale (I3, O6)

Ni classement, ni moyenne d'utilisateurs, ni partage social, ni réseau intégré — **jamais, même en option**. Ce choix est inscrit dans la charte du projet et opposable à toute demande de fonctionnalité.

### 12.4. Neutralité corporelle (I11) et mode sans chiffre (I5)

Aucune silhouette idéalisée, aucune représentation du corps, aucun vocabulaire de performance. Le **mode sans chiffre** masque les valeurs de poids et n'affiche que les tendances et le ressenti, pour les personnes que le chiffre met en difficulté.

### 12.5. Ressources

Un écran d'aide accessible depuis les paramètres et depuis l'avertissement du § 12.2, orientant vers des ressources francophones fiables en matière de troubles du comportement alimentaire et de nutrition.

---

## 13. Accessibilité

Exigence transversale : **chaque lot est livré accessible**, l'accessibilité n'est pas une phase finale.

- **Taille de police réglable (J1)** : 100 %, 125 %, 150 %, 200 %. La mise en page reste utilisable à 200 % sans défilement horizontal.
- **Thème sombre et contraste élevé (J2)**, thèmes de couleurs au choix (M9).
- **Contraste** : minimum AA (4,5:1 pour le texte courant) vérifié automatiquement en intégration continue.
- **Lecteur d'écran (J6)** : structure sémantique complète, chaque graphique doublé d'une table de données lisible.
- **Clavier (J7)** : navigation intégrale, ordre de tabulation cohérent, focus toujours visible.
- **Zones tactiles (J8)** : 48 px minimum.
- **Gestes (J9)** : aucun geste complexe obligatoire. Tout ce qui est accessible par balayage l'est aussi par un bouton.
- **Couleur** : jamais seul vecteur d'information — toujours doublée d'une forme, d'un libellé ou d'une position.
- **Mouvement** : respect de la préférence système de réduction des animations.

---

## 14. Design

Reprise du § 16 de la v1.0 : doux, sobre, moderne, apaisant, lisible. Palette vert sauge, gris clair, beige clair, blanc, touche de bleu doux. Écran d'accueil épuré, **aucune citation**.

Contrainte ajoutée : les couleurs de la palette doivent atteindre les seuils de contraste du § 13 sur fond clair **et** sur fond sombre. Un vert sauge clair sur fond clair échoue — les teintes portant du texte fin sont assombries en conséquence.

---

## 15. Plateformes et technique

### 15.1. Cibles

| Cible | Diffusion | Fonctions exclusives |
|-------|-----------|---------------------|
| **PWA installable** (M1) | Site du projet, installable sur ordinateur, tablette, mobile, iOS inclus | — |
| **APK Android** (M2) | Téléchargement direct hors Play Store | Import des pas (E7), notifications programmées (K12), WebDAV (L8) |
| **F-Droid** (M4) | Dépôt libre Android | Idem APK |

**iOS** est servi par la PWA (ajout à l'écran d'accueil depuis Safari). Pas d'App Store : coût annuel, et conditions incompatibles avec l'AGPL.

**Trois fonctions ne sont pas disponibles en PWA** et doivent être présentées comme telles, sans écran vide ni bouton inopérant :

- **E7, import des pas** — les interfaces santé du système sont inaccessibles au web. Repli : saisie manuelle.
- **K12, notifications programmées** — aucune PWA ne sait déclencher une notification locale à date fixe. Repli : rappel affiché à l'ouverture de l'application, ce qui suffit pour un carnet mensuel.
- **L8, WebDAV** — voir § 11.7.

### 15.2. Stack recommandée

Choix guidés par trois critères : légèreté, longévité sur dix ans, faible surface de dépendances.

| Besoin | Choix | Motif |
|--------|-------|-------|
| Interface | Svelte 5 + Vite + TypeScript | Rendu léger, code lisible pour un contributeur occasionnel |
| Stockage | IndexedDB via Dexie | Fiable, mature, petit, migrations intégrées |
| Graphiques | SVG écrit pour le projet | Besoins limités et très spécifiques (zone objectif, annotations, bande d'incertitude, table alternative). Évite une dépendance lourde à maintenir dix ans |
| XLSX | SheetJS (Apache-2.0) | Compatible AGPL |
| CSV / JSON | Code du projet | Aucune dépendance nécessaire |
| PDF | Impression du navigateur | Aucune dépendance, et sert aussi J17 |
| Empaquetage Android | Capacitor | Sans service Google, condition d'entrée sur F-Droid |
| Traductions | Fichiers JSON + utilitaire du projet | Contribution facile, pas d'outillage lourd |

À valider avant d'écrire la première ligne : le choix du framework est le seul point réellement ouvert.

### 15.3. Qualité (M10, M11)

- **Tests automatisés** sur toute la couche de calcul : IMC et ses catégories par âge, fourchette de poids, ratio taille/stature, progression pour les quatre types d'objectif, moyenne mobile, évolutions, repères d'activité, migrations de schéma.
- **Intégration continue** à chaque contribution : construction, tests, vérification des contrastes.
- **Zéro tracker, zéro publicité, zéro télémétrie (M7)**, vérifiable dans le code.

---

## 16. Règles métier

Les dix règles de la v1.0 restent en vigueur. S'y ajoutent :

**Règle 11** — Un champ désactivé conserve ses données historiques ; le désactiver ne supprime rien.
**Règle 12** — Supprimer un champ personnalisé demande une confirmation qui nomme explicitement le nombre de mesures concernées.
**Règle 13** — Une valeur préremplie non confirmée n'est pas enregistrée.
**Règle 14** — Un indicateur calculé n'est affiché que si toutes ses données sources existent.
**Règle 15** — L'application ne présente aucune relation de cause à effet entre deux données suivies. Elle affiche des évolutions, jamais des explications.
**Règle 16** — Changer le mode d'affichage ou l'unité ne modifie jamais les données stockées.
**Règle 17** — Toute suppression est annulable pendant la session en cours.
**Règle 18** — L'application ne se connecte à aucun réseau sans action explicite de l'utilisateur. La seule exception possible est la météo (§ 11.8), désactivée par défaut et soumise à un consentement séparé.
**Règle 19** — Les profils d'un même appareil sont étanches : aucune donnée partagée, aucune comparaison, aucun total commun.

---

## 17. Lots de livraison

### Lot 0 — Fondations

Dépôt, licence AGPL-3.0, charte rédactionnelle, modèle de données, moteur de migrations, socle de tests, intégration continue, système de thème et d'accessibilité.

### Lot 1 — Le carnet

Ce qui rend l'application utilisable par Crystèle immédiatement.

Profil et taille · saisie éclair du poids · mensurations de base · historique · modification et suppression avec annulation · courbe de poids avec tendance · IMC et sa lecture par âge · fourchette de poids santé · objectif simple et en fourchette · jauge de progression · tableau de bord · stockage local · export JSON et CSV · garde-fous de saisie · mention de non-dispositif-médical.

**À l'issue du lot 1, l'application remplace le tableur.**

### Lot 2 — Le moteur

Champs configurables · préréglages bien-être, santé et activité · champs personnalisés · choix d'usage au premier lancement · modes essentiel et complet · événements et étiquettes · notes · mode rattrapage · préremplissage.

### Lot 3 — Le recul

Bilan complet · graphiques multi-champs · zone objectif · annotations · variations mensuelles · résumé du mois · repères d'activité · ratio taille/stature · moyenne mobile et bande d'incertitude · jalons de régularité · modes maintien et prise de poids · accompagnement de l'après-objectif · alertes de rythme.

### Lot 4 — L'ailleurs

PWA installable · APK Android · sauvegarde fichier et synchronisation · notifications · export XLSX et PDF · impression · fiche pour le médecin · traitements et rappels · profils multiples.

### Lot 5 — L'ouverture

Documentation utilisateur illustrée en français · README et captures · guide de contribution et code de conduite · feuille de route publique · internationalisation · publication F-Droid.

---

## 18. Critères d'acceptation

Les quatorze critères de la v1.0 restent la base. S'y ajoutent :

15. Configurer l'application au premier lancement en moins d'une minute.
16. Enregistrer une mesure avec le seul poids en moins de trente secondes.
17. Activer un champ de bien-être et le voir apparaître dans la saisie, l'historique, les graphiques et les exports.
18. Créer un champ personnalisé et l'utiliser comme un champ livré.
19. Utiliser l'application entière au clavier seul.
20. Utiliser l'application à 200 % de taille de police sans défilement horizontal.
21. Basculer en mode maintien après avoir atteint son objectif.
22. Exporter puis réimporter un carnet en JSON sans aucune perte.
23. Ouvrir un carnet créé sous une version antérieure du schéma.
24. Constater qu'aucun module non activé n'apparaît nulle part dans l'interface.

---

## 19. Écarts assumés avec la v1.0

| § v1.0 | Écart | Motif |
|--------|-------|-------|
| § 23 et § 30 — import du carnet Excel | **Retiré.** Les deux mesures de départ (07/26 : 74,7 kg · 08/26 : 74,0 kg) sont saisies à la main | Plus rapide que d'écrire un importateur pour deux lignes. L'import générique d'un tableur est reporté après le lot 5 |
| § 10.2 — paliers intermédiaires | **Remplacés** par l'objectif en fourchette et les jalons de régularité | Les paliers de poids récompensent un résultat ; les jalons récompensent l'assiduité, seule chose sous contrôle |
| § 28 — hors périmètre | **Confirmé et élargi** : ni calories, ni menus, ni photos, ni résumés générés | Familles D, H et N écartées en sélection |
| § 5.1 — IMC | **Enrichi** d'une lecture nuancée par l'âge | Afficher une catégorie OMS brute à une personne de 60 ans peut être faux et anxiogène |

**Retraits décidés après la sélection** — deux propositions initialement retenues ont été abandonnées :

- **B9, questionnaires validés.** Le PSQI appartient à l'université de Pittsburgh et le MNA à Nestlé ; leur redistribution sous licence libre demande une autorisation que le projet n'a pas. Plutôt que de se limiter au seul IPAQ, la fonctionnalité est retirée.
- **G10, corrélations entre données.** Avec une saisie mensuelle, croiser des champs sur douze points par an produit mécaniquement des relations fausses. Une application qui affirmerait « votre poids baisse quand vous dormez mieux » sur cette base tromperait son utilisateur. Voir la règle 15.

---

## 20. Annexe — Catalogue des champs préréglés

Tous livrés **désactivés**, sauf mention contraire. Le choix d'usage au premier lancement en active un sous-ensemble.

### Corps

| Clé | Libellé | Type | Unité | Défaut |
|-----|---------|------|-------|--------|
| `poids` | Poids | nombre | kg / lb | **Actif, système** |
| `taille` | Taille | nombre | cm / in | **Actif** |
| `tour_poitrine` | Tour de poitrine | nombre | cm / in | Actif |
| `tour_taille` | Tour de taille | nombre | cm / in | Actif |
| `tour_ventre` | Tour de ventre | nombre | cm / in | Actif |
| `tour_hanches` | Tour de hanches | nombre | cm / in | Actif |
| `tour_cuisse` | Tour de cuisse | nombre | cm / in | Actif |
| `tour_bras` | Tour de bras | nombre | cm / in | Actif |
| `tour_cou` | Tour de cou | nombre | cm / in | — |
| `tour_mollet` | Tour de mollet | nombre | cm / in | — |
| `tour_avant_bras` | Tour d'avant-bras | nombre | cm / in | — |
| `tour_epaules` | Tour d'épaules | nombre | cm / in | — |
| `tour_poignet` | Tour de poignet | nombre | cm / in | — |
| `tour_cheville` | Tour de cheville | nombre | cm / in | — |
| `taille_vetement` | Taille de vêtement | texte | — | — |
| `pointure` | Pointure | nombre | — | — |

### Santé

| Clé | Libellé | Type | Unité | Défaut |
|-----|---------|------|-------|--------|
| `tension` | Tension artérielle | tension | mmHg | — |

### Bien-être

| Clé | Libellé | Type | Unité | Défaut |
|-----|---------|------|-------|--------|
| `sommeil_qualite` | Qualité du sommeil | echelle5 | — | — |
| `sommeil_duree` | Durée de sommeil | duree | h | — |
| `energie` | Énergie | echelle5 | — | — |
| `humeur` | Humeur | echelle5 | — | — |
| `stress` | Stress | echelle5 | — | — |
| `douleurs` | Douleurs | echelle5 + zone | — | — |
| `motivation` | Motivation | echelle5 | — | — |
| `confiance` | Confiance en soi | echelle5 | — | — |
| `essoufflement` | Essoufflement à l'effort | echelle5 | — | — |
| `digestion` | Confort digestif | echelle5 | — | — |
| `transit` | Transit | echelle5 | — | — |
| `hydratation` | Hydratation | nombre | verres / L | — |
| `fringales` | Fringales | echelle5 | — | — |
| `satiete` | Faim et satiété | echelle5 | — | — |
| `menopause` | Symptômes de ménopause | echelle5 + type | — | — |
| `cycle` | Cycle menstruel | choix | — | — |
| `alcool` | Alcool | nombre | verres | — |
| `tabac` | Tabac | nombre | — | — |
| `cafeine` | Caféine | nombre | — | — |

### Activité

| Clé | Libellé | Type | Unité | Défaut |
|-----|---------|------|-------|--------|
| `activite_type` | Type d'activité | choix | — | — |
| `activite_duree` | Durée d'activité | duree | min | — |
| `activite_intensite` | Intensité | echelle5 | — | — |
| `activite_quotidien` | Activité du quotidien | choix multiple | — | — |
| `renforcement` | Renforcement musculaire | booleen | — | — |
| `distance` | Distance parcourue | nombre | km | — |
| `pas` | Nombre de pas | nombre | pas | — |

**Champs de contexte** (hors moteur, propres à chaque mesure) : contexte de pesée, notes, étiquettes, météo.

---

## 21. Gouvernance open source

- **Licence** : AGPL-3.0-or-later. Toute version modifiée, y compris simplement hébergée en ligne, doit rester ouverte.
- **Dépôt public** avec README soigné et captures d'écran (P2).
- **Guide de contribution et code de conduite** (P3). Les contributions sont évaluées à l'aune de la charte du § 12 : une fonctionnalité contraire à la philosophie est refusée même si elle est bien écrite.
- **Documentation utilisateur illustrée, en français d'abord** (P4).
- **Feuille de route publique** (P6).
- **Charte du projet** (P10) mise en avant dans le dépôt.

---

## 22. Ce que l'application ne fera jamais

Liste courte, inscrite dans la charte, opposable aux demandes futures.

- Compter des calories ou juger un repas.
- Comparer un utilisateur à un autre, sous quelque forme que ce soit.
- Afficher une silhouette, un corps idéalisé ou un avant/après.
- Envoyer des données vers un serveur sans action explicite.
- Notifier sans y avoir été invitée.
- Expliquer une donnée par une autre, ou suggérer une cause à un chiffre.
- Prétendre remplacer un professionnel de santé.
