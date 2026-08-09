# Audit avant le lot 5

État des lieux du code livré aux lots 0 à 4, avant la documentation et l'ouverture
du projet. L'objectif est de lister ce qui empêche l'application d'être
**parfaitement fonctionnelle**, en séparant ce qui abîme des données de ce qui
gêne l'usage.

Chaque constat indique le fichier, ce qui se passe, et pourquoi cela compte.

> **Audit clos le 9 août 2026.** Trois passes, toutes corrigées : parties 1 à 4
> (défauts et incohérences), 7 (seconde relecture), 10 (clôture). Les décisions de
> conception sont en partie 8, le chantier qu'elles ont ouvert — **rendre le poids
> optionnel** — en partie 9, et ce qui reste sciemment ouvert en partie 11.

---

## 1. Bugs qui abîment ou perdent des données

### 1.1 — Un poids saisi en livres n'est jamais converti (critique)

`src/vues/FormulaireMesure.svelte:158-166`

La fonction `enregistrer()` écrit la valeur brute du champ dans la mesure :

```js
const n = analyserNombre(texte)
if (n !== undefined) valeurs[cle] = n   // aucun appel à masseVersStockage
```

`masseVersStockage()` existe, est testée, et est correctement appelée dans
`ObjectifModale.svelte:55-56`. Elle n'est **pas** appelée par le formulaire de
mesure — le seul endroit où l'on saisit un poids.

Conséquence, vérifiée en exécutant le code de l'application :

| Ce que fait la personne | Ce qui est enregistré | Ce qui est réaffiché |
|---|---|---|
| Elle pèse 150 lb, tape `150` | `150` interprété comme des **kg** | **330,7 lb** |

Son IMC passe de 25,0 à **55,1**. Et comme la modale d'objectif convertit
correctement, la même valeur « 150 » devient `68,04` côté objectif et `150` côté
mesure : la jauge de progression compare deux échelles différentes.

S'ajoutent trois effets de bord du même défaut :

- `ChampNombre` affiche toujours l'étiquette `Poids (kg)` (`champ.unite` du
  préréglage), même quand le profil est en livres ;
- les bornes de confirmation (20–400) sont exprimées en kg mais appliquées à une
  saisie en livres ;
- le repère grisé de la dernière valeur affiche le nombre stocké en kg.

**À faire :** convertir à la saisie et à la relecture dans `FormulaireMesure`,
et faire porter au composant l'unité d'affichage réelle plutôt que celle du
préréglage.

> À noter : `tests/unites-dates.test.ts` prouve que l'aller-retour kg↔lb est
> exact à 10 décimales près. Les 160 tests sont verts et le bug est intact —
> parce qu'aucun test ne traverse la couture entre le domaine et l'interface.
> C'est le vrai enseignement de ce point.

### 1.2 — Restaurer une sauvegarde efface les carnets des autres profils

`src/lib/etat/carnet.svelte.ts:462-494`

`importer()` commence par `base.profils.clear()` et vide toutes les tables, sans
filtrer sur le profil actif. Or `toutSupprimer()` a été écrite avec soin pour ne
toucher qu'un seul profil (`carnet.svelte.ts:504-538`).

Deux actions destructrices, deux portées opposées : restaurer *son* carnet
supprime celui du conjoint qui partage la tablette.

Le texte affiché (`Parametres.svelte:369`) annonce « Remplace le contenu actuel du
carnet », ce qui décrit l'intention mais pas l'effet réel.

**À faire :** restreindre l'import au profil actif, comme la suppression, et
corriger le libellé.

### 1.3 — L'import n'a aucune confirmation

`src/vues/Parametres.svelte:366-370`

Choisir un fichier déclenche l'écrasement immédiat. Aucun retour en arrière.

Juste en dessous, effacer ses données exige de taper `EFFACER` en toutes lettres.
Les deux gestes sont aussi irréversibles l'un que l'autre ; un seul est protégé.

**À faire :** annoncer ce qui va être remplacé (nombre de mesures actuelles →
nombre de mesures du fichier) et demander confirmation.

### 1.4 — Enregistrer la taille efface les étiquettes de la journée

`src/lib/etat/carnet.svelte.ts:270-279`

`enregistrerValeurDuJour()` reprend `notes`, `contextePesee` et `id` de la mesure
du jour, mais **pas** `etiquettes`. Comme `enregistrerMesure()` réécrit l'objet
complet, les étiquettes absentes de l'appel sont perdues.

Chemin réel : saisir une mesure avec l'étiquette « vacances », puis corriger sa
taille dans les paramètres le même jour → l'étiquette disparaît.

### 1.5 — Le contexte de pesée est effacé à chaque modification

`src/lib/etat/carnet.svelte.ts:237-246` et `src/vues/FormulaireMesure.svelte:189`

En modification, `enregistrerMesure()` écrit `contextePesee: options.contextePesee`.
Le formulaire ne transmet jamais ce champ : toute modification d'une mesure remet
donc son contexte à `undefined`.

Sans conséquence visible aujourd'hui, puisque rien ne le renseigne (voir 2.1) —
mais le jour où on l'ajoute, le bug est déjà en place.

### 1.6 — Une réflexion vide est créée à chaque passage dans le champ

`src/vues/Bilan.svelte:74-76`, `179`

`enregistrerReponse()` est appelée `onblur` sans vérifier que le texte a changé
ni qu'il est non vide. Cliquer dans le champ puis en sortir crée un enregistrement
`ReflexionMensuelle` vide en base, et le réécrit à chaque passage.

---

## 2. Fonctionnalités déclarées mais jamais branchées

Ces éléments existent dans les types ou les signatures, et ne font rien. Ils
donnent au code l'apparence d'une capacité qu'il n'a pas.

### 2.1 — La seconde pesée du jour (A29)

`src/lib/domain/types.ts:79`

`Mesure.moment?: string` — commenté « seulement si plusieurs pesées le même jour
(A29) » — n'est écrit **nulle part**.

Or le bouton « Ajouter une seconde pesée » (`FormulaireMesure.svelte:251`) crée
bien une deuxième mesure à la même date. Résultat : deux lignes strictement
identiques dans l'historique, impossibles à distinguer, et dont l'ordre relatif
dépend de l'ordre d'insertion (les tris se font sur `date` seule).

`contextePesee` (à jeun / habillé / après sport) est dans le même cas : typé,
transporté par l'état, jamais proposé à la saisie ni affiché.

**Deux issues cohérentes :** soit brancher `moment` et `contextePesee` à
l'interface, soit retirer le bouton « seconde pesée » et les deux champs. La
situation actuelle — le bouton sans le mécanisme — est la seule à éviter.

### 2.2 — Les unités de longueur

`src/lib/domain/unites.ts:41-47` et `src/lib/domain/types.ts:169`

`longueurVersAffichage()` et `longueurVersStockage()` ne sont appelées nulle part.
`Profil.uniteLongueur` est écrite à `'cm'` à la création et jamais relue ni
modifiable.

En pratique, quelqu'un qui choisit les livres saisit quand même sa taille et ses
mensurations en centimètres, avec des libellés « Taille en cm » écrits en dur
(`Parametres.svelte:160`, `Bienvenue.svelte:97`, `FicheMedecin.svelte:56`).

**À faire :** soit proposer le choix pouces/cm et brancher les conversions, soit
retirer `uniteLongueur` et les deux fonctions. Proposer les livres sans les
pouces est incohérent pour le public concerné.

### 2.3 — Paramètres et champs sans effet

- `tendance.ts:158-159` — `variationsMensuelles(points, cle = 'poids')` fait
  `void cle` en première ligne. Le paramètre ne sert à rien (la série est déjà
  extraite en amont) mais sa valeur par défaut laisse croire le contraire.
- `saisie.ts:80` — `Doublon.optionSecondePesee` vaut toujours `true` et n'est
  jamais lu.
- `saisie.ts:87-95` — `trouverDoublon(mesures, date, idExclu)` : `idExclu` n'est
  jamais passé. Le formulaire désactive complètement la détection en modification,
  donc déplacer une mesure sur une date déjà occupée ne déclenche aucun avertissement.
- `ObjectifModale.svelte:43-47` — un bloc `if` qui lit `carnet.poidsActuel` pour
  n'affecter que deux chaînes vides. Sans effet.
- `Bienvenue.svelte:59-61` — `void masseVersStockage` et `void versISO` : deux
  imports morts neutralisés au lieu d'être supprimés.

---

## 3. Incohérences sémantiques

### 3.1 — La clé « poids » est écrite en dur à huit endroits

`CLE_POIDS` est exportée par `domain/champs.ts` et utilisée dans certains
fichiers, tandis que d'autres écrivent la chaîne littérale :

`Graphiques.svelte:23`, `Graphiques.svelte:76`, `Historique.svelte:56`,
`Bilan.svelte:60`, `ObjectifModale.svelte:92`, `tendance.ts:158`.

Même chose pour `'tension'` (`FormulaireMesure.svelte:57`, `FicheMedecin.svelte:30`),
`'tour_taille'`, `'activite_duree'` et `'renforcement'`
(`carnet.svelte.ts:567,602-604`, `Bilan.svelte:81-82`).

Ce sont les seules clés que le moteur de champs traite de façon particulière.
Les rendre explicites et constantes rend visible la liste de ces exceptions.

### 3.2 — Les durées ne sont pas graphables

`src/vues/Graphiques.svelte:31-33`

Le sélecteur ne retient que `c.type === 'nombre'`, ce qui exclut les champs
`duree` — durée de sommeil et durée d'activité.

Partout ailleurs ces deux types sont traités ensemble : `Historique.svelte:52-53`
les groupe dans le même `case`, `FormulaireMesure.svelte:65` les inclut tous deux
dans les repères de saisie, `ChampNombre` les affiche de la même façon.

Quelqu'un qui suit son sommeil ne peut donc pas en voir la courbe.

### 3.3 — L'évolution du poids n'a pas de signe sur la fiche médecin

`src/vues/FicheMedecin.svelte:64`

Utilise `formaterNombre()` alors que tout le reste de l'application utilise
`formaterEvolution()`, qui ajoute un `+` explicite pour une hausse.

Sur la fiche remise au médecin, « Évolution depuis le début : 3,5 kg » ne dit pas
s'il s'agit d'une prise ou d'une perte. C'est le document où cette ambiguïté est
la moins acceptable.

### 3.4 — Deux façons de calculer les dates

`domain/dates.ts` fournit `versISO()` et `depuisISO()`, écrites explicitement pour
travailler en heure **locale** et éviter les décalages de fuseau. Deux endroits
ne les utilisent pas :

- `Graphiques.svelte:45` — `limite.toISOString().slice(0, 10)` (UTC) pour calculer
  le seuil de la période affichée ;
- `bilan.ts:78-79` — `new Date(p.date)` (UTC) dans `valeurLaPlusProche`.

Selon le fuseau et l'heure, la limite « 3 derniers mois » peut se décaler d'un
jour et faire disparaître une mesure du graphique.

### 3.5 — La logique « traitement en cours » est réécrite dans la vue

`src/vues/Parametres.svelte:328` fait `{#if !t.fin || t.fin >= versISO(new Date())}`
alors que `domain/traitements.ts:8-11` définit exactement cette règle — et y
ajoute une condition que la vue oublie : `date < t.debut` (un traitement à venir
est affiché « en cours »).

### 3.6 — Deux affirmations devenues fausses dans les commentaires

- `db.ts:9-10` : « Le numéro de version Dexie et `VERSION_SCHEMA` évoluent
  ensemble ». Ils valent aujourd'hui 5 et 4.
- Les exports CSV et XLSX écrivent toujours les valeurs canoniques (kg, cm) avec
  l'unité du préréglage en en-tête, quelle que soit l'unité affichée. C'est un
  choix défendable, mais il n'est écrit nulle part.

---

## 4. Interface et accessibilité

### 4.1 — Deux boîtes de dialogue contournent le composant `Modale`

`Parametres.svelte:485-507` (retirer un champ) et `Historique.svelte:192-209`
(supprimer une mesure) sont des `<div role="dialog">` faits main.

`composants/Modale.svelte` s'appuie sur `<dialog>` natif et documente en tête
précisément ce que ces deux-là perdent : **le piège de focus, la fermeture par
Échap, et la restitution du focus** — « trois choses qu'une réimplémentation rate
souvent ».

Ce sont les deux confirmations de suppression de l'application : les écrans où la
navigation au clavier compte le plus.

### 4.2 — Le champ « Taille » ne peut pas être vidé

`src/vues/Parametres.svelte:49-54`

L'effet réécrit la valeur dès que le champ est vide. Une personne qui veut effacer
sa taille voit le nombre revenir immédiatement.

### 4.3 — Le focus ne revient pas à la réouverture du formulaire

`src/composants/ChampNombre.svelte:33-35`

L'effet ne dépend que de `autofocus` et de l'élément. Le composant restant monté
en permanence (les modales ne sont pas détruites à la fermeture), le focus n'est
posé qu'à la toute première ouverture. Les suivantes ouvrent le formulaire sans
curseur dans le champ Poids.

### 4.4 — Points d'accessibilité plus fins

- `Modale.svelte:33` — `aria-label={titre}` double le `<h2>` visible sans le lier ;
  `aria-labelledby` pointant vers le titre rend le nom accessible identique au
  nom affiché.
- `Parametres.svelte:131-132` — le profil actif est un bouton `disabled`, donc non
  focalisable : l'étiquette « actif » n'est jamais lue par un lecteur d'écran.
- `App.svelte:54-59` — en mode essentiel, « Bilan » sort de la navigation mais
  reste une route valide. Quelqu'un qui s'y trouve en changeant de mode reste sur
  une page dont aucun onglet n'est marqué actif.
- `Parametres.svelte:540` — `columns: 2` sur la liste des champs à cocher : l'ordre
  de lecture en colonnes est inhabituel pour une liste de contrôles.

### 4.5 — Deux détails visuels

- `Graphiques.svelte:270` — la piste des barres de variation utilise `--papier`
  sur une carte en `--carte` : en thème clair, `#f7f6f2` sur `#ffffff` est presque
  invisible.
- `app.css:83` — en thème contraste, `--sauge-voile` vaut `#ffffff`, soit
  exactement `--carte`. Le fond de l'onglet actif disparaît donc dans le thème
  destiné aux personnes qui en ont le plus besoin. Le trait supérieur et la graisse
  subsistent, mais le repère de couleur annoncé au § 13 tombe.

### 4.6 — Sauvegarde automatique : deux petits gaspillages

`src/App.svelte:105-112`

- `carnet.exporter()` — qui recopie tout le carnet — s'exécute à chaque
  modification de l'état **même quand la sauvegarde automatique est désactivée**
  (l'appel précède le `return`, pour enregistrer les dépendances réactives).
  Un `$derived` ou une lecture ciblée suffirait.
- Le minuteur n'est pas annulé au démontage.

---

## 5. Ce qui tient et qu'il ne faut pas casser

Vérifié pendant l'audit, à conserver tel quel :

- **Contraste AA atteint dans les quatre thèmes** (clair, sombre, contraste,
  automatique) sur toutes les paires texte/fond réellement employées — mesuré en
  exécutant le calcul WCAG sur les couleurs calculées.
- **Les courbes ont une vraie alternative textuelle** : `role="img"`, libellé
  décrivant la période, et tableau de données complet en `.pour-lecteur`.
  C'est rare et bien fait.
- **La règle du creux est tenue** : une donnée absente n'est jamais lue comme un
  zéro, du modèle (`lireNombre`) jusqu'à l'export CSV.
- **La suppression est scopée au profil**, avec repli propre sur le premier
  lancement.
- **Le vocabulaire de l'IMC reste positionnel** (« sous / dans / au-dessus de la
  fourchette »), et la fourchette est relevée après 65 ans.

---

## 6. Ce qui a été corrigé

Toutes les parties 1 à 4. Quelques choix méritent d'être notés.

**1.1 — livres.** La conversion vit dans `champAffiche()` (`domain/champs.ts`), qui
rend un champ *tel qu'il doit s'afficher* — unité et bornes de confirmation
converties. Le formulaire convertit aux deux extrémités et nulle part ailleurs.
Vérifié de bout en bout dans un profil de test : 150 saisi en livres → **68,04 kg**
stockés → **150,0 lb** réaffichés, étiquette « Poids (lb) », repère converti lui aussi.

**1.2 — import.** Devenu symétrique de `toutSupprimer()` : ne touche qu'au profil
actif. Les identifiants de lignes sont régénérés à l'import, sans quoi deux profils
restaurant la même sauvegarde partageraient leurs clés primaires — et le second
import déplacerait les mesures du premier.

**2.1 — seconde pesée.** `moment` est branché : le bouton pose l'heure courante,
un champ permet de l'ajuster, l'historique l'affiche, et un comparateur commun
(`comparerMesures`) ordonne désormais date **puis** heure — sans quoi « la dernière
valeur » d'une journée à deux pesées restait arbitraire. `contextePesee` n'est
toujours pas proposé à la saisie, mais il n'est plus effacé à chaque modification.

**2.2 — longueurs.** Retirées : `uniteLongueur`, `longueurVersAffichage`,
`longueurVersStockage`, `cmVersPouces`, `poucesVersCm`. Le carnet ne propose que
le centimètre, et le code le dit maintenant.

**2.3 — `idExclu` branché plutôt que supprimé.** La détection de doublon vaut
désormais aussi en modification : déplacer une mesure sur une date occupée propose
de la distinguer par l'heure.

**4.1 — dialogues.** Les deux confirmations passent par `<Modale>`. Au passage,
la gestion du focus a changé de main : `showModal()` posant lui-même le focus sur
le bouton « Fermer », un composant enfant ne pouvait pas gagner cette course. Le
champ se contente de se désigner (`data-focus-initial`) et la modale place le
focus après ouverture. Vérifié sur trois ouvertures successives.

**Un défaut découvert en corrigeant** — et le plus important des deux passes :

> **Les mises à jour de préréglages n'atteignaient jamais les carnets existants.**
> `charger()` n'ajoutait que les champs *absents* du catalogue stocké. Renommer un
> champ, corriger une borne ou — comme ici — légender une échelle ne parvenait
> qu'aux carnets créés après la mise à jour. Le § 34 exige l'inverse.
> `charger()` reprend maintenant du catalogue la *définition* d'un préréglage
> (libellé, bornes, unité, légende) en préservant les choix de la personne (activé,
> rangé), et ne réécrit que si quelque chose a réellement bougé. Vérifié sur le
> carnet réel de Crystèle : son champ `satiete` a bien reçu son nouveau libellé et
> ses deux pôles sans qu'elle ait à recréer quoi que ce soit.

**Vérification :** 0 erreur `svelte-check`, 164 tests (dont 5 nouveaux sur la
largeur de fourchette), build propre, et parcours réel en navigateur — profil de
test créé puis supprimé, carnet de Crystèle vérifié intact après coup
(4 mesures, 43 champs, 1 objectif).

---

## 7. Seconde passe — constats non corrigés

### 7.1 — Le mode sans chiffre n'existe que sur l'accueil (important)

`src/vues/Accueil.svelte:27` est le **seul** endroit qui lit `modeSansChiffre`.

Son propre libellé dans les paramètres annonce pourtant : « Masque les valeurs de
poids et n'affiche que les tendances. » Or l'historique liste tous les poids en
clair, le bilan affiche départ / actuel / minimum / évolution, les graphiques
portent une échelle chiffrée, la fiche médecin donne le poids, et les exports CSV
et Excel sortent les valeurs brutes.

Ce n'est pas un oubli cosmétique. Ce réglage existe pour les personnes que le
chiffre met en difficulté — c'est un engagement de la charte. Quelqu'un qui
l'active et ouvre l'historique retrouve exactement ce qu'il cherchait à éviter,
dans l'écran suivant.

**À trancher :** que montre l'historique en mode sans chiffre ? Les dates et une
flèche d'évolution ? Les mensurations mais pas le poids ? La question mérite
d'être posée avant d'être codée — c'est le seul point de cette passe qui appelle
une décision de conception plutôt qu'une correction.

### 7.2 — « Complet » n'active aucun module

`src/lib/etat/carnet.svelte.ts` · `src/vues/Parametres.svelte:247`

L'option se présente comme « Complet — tous les modules activés ». Passer en
complet ne fait qu'ajouter l'onglet Bilan à la barre de navigation : aucun champ
n'est activé, aucun module n'apparaît.

Soit le libellé dit ce que fait le réglage (« Complet — affiche le bilan »), soit
le réglage fait ce que dit le libellé. En l'état, il promet à quelqu'un qui le
choisit une richesse qu'il ne délivre pas.

### 7.3 — Une saisie de taille crée une « mesure » sans poids

`src/lib/etat/carnet.svelte.ts` — `enregistrerValeurDuJour`

Renseigner sa taille depuis les paramètres crée une `Mesure` datée qui ne porte
que la taille. Elle apparaît alors comme une ligne de l'historique, elle est
comptée dans « N mesures enregistrées », et elle alimente les jalons de régularité
(« 12 mesures », « 50 mesures »).

Observé dans le carnet réel : sur quatre mesures, celle du 8 août ne porte aucun
poids. La régularité affichée est donc légèrement flattée par une saisie
administrative.

**Piste :** ne compter comme mesure que ce qui porte au moins une valeur
observée — ou rattacher la taille au profil plutôt qu'à une mesure, quitte à en
conserver l'historique séparément.

### 7.4 — Un champ personnalisé de type échelle n'a pas de pôles

`src/vues/ChampPersonnaliseModale.svelte:40`

Les quinze échelles préréglées ont maintenant leur légende. L'échelle
personnalisée — qui est le **type proposé par défaut**, présenté comme « le plus
courant » — est désormais la seule à ne pas en avoir.

La modale devrait demander les deux extrémités au moment de la création. C'est le
prolongement direct de la correction précédente, et deux champs de texte suffisent.

### 7.5 — La question du mois affichée n'est pas forcément celle qui a été répondue

`src/vues/Bilan.svelte` · `src/lib/domain/resume.ts`

Le libellé affiché est recalculé par `questionDuMois(mois)`, alors que la réponse
enregistrée porte sa propre `question`. Tant que la liste des quatre questions ne
bouge pas, les deux coïncident. Le jour où elle change — ajout, reformulation,
traduction au lot 5 — les réponses anciennes s'afficheront sous une question
qu'elles n'ont jamais eue.

Afficher `reflexion.question` quand une réponse existe suffit à fermer le sujet.

### 7.6 — Détails

- `domain/activite.ts` — `RepereActivite.atteint` est calculé et n'est lu nulle
  part. À supprimer plutôt qu'à brancher : le § 8.3 refuse explicitement le
  vocabulaire de quota, et « atteint » en est un.
- `ChampPersonnaliseModale` ne propose que cinq des sept types du moteur :
  `duree` et `tension` sont créables par le catalogue mais pas par l'utilisateur.
- `domain/jalons.ts` — un carnet créé un 29 février ne fêtera son anniversaire
  qu'une année sur quatre.
- Les exports CSV et Excel écrivent toujours les kilogrammes, même quand
  l'application affiche des livres. C'est cohérent avec le stockage et sans doute
  le bon choix, mais l'en-tête devrait le dire au lieu de le laisser deviner.

---

## 8. Décisions prises sur la seconde passe

### 8.1 — Le mode sans chiffre s'applique partout, sauf sur la fiche médecin

Le réglage annonce « masque les valeurs de poids » : il masque donc **les valeurs
de poids**, et rien d'autre. Une note de sommeil ou un tour de taille restent
lisibles — ils ne portent pas la charge qui justifie ce mode.

Concrètement, le poids ne s'affiche plus jamais comme un nombre :

| Écran | Ce qui s'affiche à la place |
|---|---|
| Accueil | « en baisse depuis le début » (déjà le cas) |
| Historique | « en baisse » / « en hausse » / « stable », face à la mesure précédente |
| Bilan | une phrase de position, plus aucun tableau de valeurs |
| Graphiques | la courbe garde sa forme, l'axe perd ses graduations, les écarts mensuels deviennent des sens |

Deux exceptions assumées :

- **La fiche pour le médecin garde les chiffres.** Elle est faite pour être
  imprimée et remise à un professionnel, à qui les valeurs sont nécessaires. Un
  encadré à l'écran (invisible à l'impression) le signale à la personne.
- **Les exports gardent les chiffres.** Un export amputé ne serait plus une
  sauvegarde, et la portabilité des données prime (§ 11.2).

La courbe conserve aussi sa **table alternative** pour les lecteurs d'écran, mais
sa colonne de valeurs devient une colonne d'évolutions : sans cela, le mode se
contournait en tabulant.

### 8.2 — Les échelles 1 à 5 deviennent traçables

Découvert en vérifiant un carnet sans poids : l'écran Graphiques ne retenait que
les champs `nombre`. Un carnet qui ne suit que le stress n'avait donc **aucune
courbe** — ce qui vide l'application de son intérêt pour cette personne. Les
échelles s'y ajoutent, au même titre que les durées.

Dans la foulée, le champ affiché par défaut n'est plus le premier de la liste mais
**le premier qui porte des données** : l'écran s'ouvrait sinon sur une courbe vide
alors qu'un autre champ, juste en dessous, avait tout son historique.

---

## 9. Le poids devient une donnée comme une autre

Demandé en cours d'audit, et de loin le changement le plus structurant.

**Ce qui existait :** `DefinitionChamp.systeme` marquait le poids comme « ni
désactivable, ni supprimable ». Sa case était grisée dans les paramètres, et le
formulaire refusait d'enregistrer une mesure sans lui.

**Le problème :** cela contredisait deux promesses à la fois. Le § 3 décrit un
moteur où tous les champs sont de même nature ; la charte refuse de faire du poids
la mesure d'une personne. Faire du poids le seul champ obligatoire était
exactement cela, inscrit dans le typage.

**Ce qui a changé :**

- `systeme` est **supprimé** du modèle. Aucun champ n'est privilégié.
- L'invariant qui le remplace est plus juste : un carnet garde **au moins un champ
  actif**, quel qu'il soit (`estDernierChampActif`). Si la seule donnée suivie est
  « Stress », c'est elle qu'on refusera de décocher.
- Une mesure valide demande une date et **au moins une valeur**, plus un poids.
- La date de dernière mesure ne se déduit plus de la dernière pesée mais de la
  dernière saisie, quel qu'en soit le contenu — ce qui était déjà faux pour un
  carnet dont une saisie n'avait porté que des mensurations.
- Sans poids suivi, l'accueil présente le dernier relevé et ses valeurs ; la
  progression, la courbe de poids, les repères d'IMC et le bilan du poids se
  taisent au lieu d'afficher des sections vides.
- Le formulaire ouvre la première section utile, faute de champ en tête.

**La charte a été modifiée en conséquence** : sa règle 1 disait « rien
d'obligatoire au-delà de la date **et du poids** ».

---

## 10. Troisième passe — clôture

### 10.1 — La couture domaine ↔ interface est enfin testée

C'était la leçon des deux premières passes, et la seule qui n'avait pas été tirée.

Le bug des livres tenait entièrement dans la **traduction** entre ce qu'on tape et
ce qu'on stocke. Les conversions étaient justes et testées ; le formulaire ne les
appelait pas. Aucun test ne pouvait le voir, parce que cette traduction vivait
dans un `.svelte`.

Elle a été extraite dans `domain/saisie.ts` — `construireValeurs()` et
`reprendreValeurs()` — et le formulaire les appelle. **13 tests** couvrent
désormais ce passage, dont l'aller-retour en livres qui échouait :

```
construireValeurs({ textes: { poids: '150' } }, 'lb')  →  68,0389 kg
reprendreValeurs(mesure(68,0389), 'lb')                →  « 150,0 »
```

Y sont aussi couverts : la virgule décimale, l'assemblage de la tension à partir
de ses trois sous-champs, l'absence de clé parasite `tension_sys` dans la mesure,
la reconduction des champs désactivés lors d'une modification, et la saisie sans
poids.

**La règle qui en découle :** toute transformation de donnée vit dans `domain/`.
Un composant assemble et affiche ; il ne traduit pas.

### 10.2 à 10.4 — Corrigés

- **Graduations d'une courbe resserrée** : le nombre de décimales suit désormais
  l'étendue affichée. « 4, 4, 4, 4, 5 » devenait illisible sur une échelle de 1 à 5.
- **Bilan des autres données suivies** : un carnet d'échelles n'y trouvait qu'un
  décompte. Chaque donnée numérique suivie y a maintenant son départ et son
  présent. Les échelles gardent leur « / 5 » et n'affichent **pas** d'évolution
  chiffrée : soustraire deux ressentis n'a pas de sens.
- **`contextePesee`** est proposé à la saisie (à jeun, habillé·e, après une
  activité) et relu dans l'historique.

### 10.5 — Constats de la dernière relecture, corrigés

- **Les rappels de prise (B6) n'étaient jamais affichés.** La case était cochée,
  l'heure enregistrée, et rien n'arrivait — le pire cas de fonctionnalité morte,
  puisque la personne y consent activement. Le repli PWA promis par le § 15.1 est
  maintenant en place : les prises du jour s'affichent à l'ouverture.
- **Supprimer un événement ou un traitement ne demandait aucune confirmation**,
  alors que la règle 5 de la charte l'exige et qu'aucune annulation n'existe après
  coup, contrairement aux mesures.
- **L'aide des événements annonçait qu'ils apparaîtraient « sur les graphiques
  dans une prochaine version »** — ils y sont depuis le lot 3.
- **`pwa.horsLigne`** : état déclaré, jamais alimenté, jamais lu. Retiré. Le
  carnet fonctionne identiquement sans réseau : il n'a rien à en dire.
- **Les exports CSV et Excel divergeaient** (les étiquettes n'étaient que dans
  l'Excel) et ignoraient l'heure d'une seconde pesée, rendant deux lignes d'un
  même jour indiscernables. Ils partagent désormais colonnes et tri.

---

## 11. Ce qui reste ouvert

Rien de bloquant. Trois points connus, assumés :

1. **Les migrations de schéma ne sont câblées que sur l'import JSON**, pas sur le
   chargement de la base locale — Dexie gère sa propre montée de version, et les
   deux coïncident tant qu'une migration se contente d'ajouter une collection
   vide. Le commentaire en tête de `domain/migrations.ts` le dit sans le farder.
   À unifier le jour où une migration devra transformer des valeurs stockées.
2. **Aucun test ne couvre les composants Svelte eux-mêmes.** La couture est
   testée, le rendu ne l'est pas. C'est un choix de proportion, pas un oubli :
   cela demanderait un environnement DOM et des dépendances supplémentaires.
3. **La météo (§ 11.8)** reste la seule porte réseau prévue par le cahier des
   charges, et n'est pas implémentée. Aucune requête réseau n'existe à ce jour.

---

## 12. L'objectif cesse d'être un objectif de poids

Point de départ : *« le seul objectif est un poids. Certaines personnes pourraient
vouloir se fixer des objectifs autres — un nombre d'heures de sommeil par semaine,
une diminution de l'essoufflement à l'effort. »*

Le constat était juste, et le code lui donnait déjà à moitié raison :
`Objectif.champCle` existait depuis le premier jour, avec le commentaire
*« `poids` dans l'immense majorité des cas, mais pas toujours (F4) »*, et
`TypeObjectif` portait une quatrième valeur `comportemental` que rien n'écrivait.
Le § 9.1 du cahier des charges décrivait F4 en toutes lettres. L'idée n'était donc
pas neuve : elle était **inachevée**, restée à l'état de champ dans le modèle.

### 12.1 — Trois familles, dont deux implémentées

La vraie question n'était pas *quel champ* mais **quelle forme d'objectif**.

- **Niveau** (`cible`, `fourchette`, `maintien`) — la valeur elle-même dérive vers
  une plage. La formule du § 7.4 ne bouge pas d'une ligne ; elle est simplement
  appliquée à la série du champ visé au lieu de celle du poids.
- **Régularité** (`regularite`) — une condition remplie un certain nombre de fois
  par période. C'est le F4, et c'est un moteur entièrement distinct.
- **Conditionnel** — « l'essoufflement *lors d'un effort intense* ». **Écarté, et
  documenté comme tel.** Il faudrait filtrer un champ par la valeur d'un autre,
  ce qui suppose que les deux soient saisis dans la même mesure — rien ne le
  garantit — et ouvrirait la porte à ce que la charte refuse explicitement :
  *« expliquer une donnée par une autre »*. Le moteur de champs répond déjà mieux
  à la question : créer un champ personnalisé « Essoufflement après effort
  intense » et ne le remplir que les jours concernés pose la condition **au moment
  de la saisie, par la personne qui sait**, au lieu de la deviner après coup. Cela
  redevient un objectif de niveau ordinaire, pour zéro complexité de moteur.

### 12.2 — Le dénominateur, seul vrai point difficile

« Marcher trois fois par semaine ». L'implémentation naïve compte les jours
conformes sur sept et affiche « 2/7 ».

Elle affirme du même coup que cinq journées n'ont rien vu, alors qu'elles n'ont
peut-être pas été saisies. C'est très exactement ce qu'interdit la règle 2 de la
charte — *une donnée absente n'est jamais zéro, jamais interpolée, jamais traitée
comme une erreur* — et cela transformerait le carnet en machine à culpabiliser,
ce que la troisième question du guide de contribution exclut.

Le décompte porte donc sur les **jours documentés** : « 3 fois sur les 5 jours
notés ». Sans jour noté, rien ne s'affiche (règle 14). Il n'y a ni série à ne pas
rompre, ni décompte de ce qui manque, ni couleur d'alerte : un repère se situe,
il ne se réussit pas (§ 8.3).

### 12.3 — Conséquences structurantes

- **Plusieurs objectifs actifs**, au plus un par champ. Sans cela, se fixer un
  objectif de sommeil aurait fait perdre celui de poids : une régression déguisée
  en fonctionnalité.
- **Un objectif dont le champ est désactivé se tait sans être supprimé.**
  Réactiver le champ le fait réapparaître tel quel.
- **Les deux garde-fous du poids restent au poids.** Le seuil de 1 % par semaine
  (F6) décrit ce que le corps encaisse en perdant de la masse ; appliqué à des
  heures de sommeil il ne voudrait rien dire. Idem pour l'avertissement d'IMC.
- **La valeur courante d'une échelle est lissée.** Un mauvais jour de stress
  faisait reculer la jauge de 40 % sans que rien n'ait changé.
- **`comportemental` renommé `regularite`** (migration 4 → 5). Le mot décrivait le
  cas d'usage, pas le calcul. Aucune version publiée ne l'a jamais écrit : le
  renommage coûtait zéro aujourd'hui, une migration dans six mois.

### 12.4 — Trouvés en vérifiant, sans rapport avec les objectifs

Trois défauts que seul l'essai en navigateur pouvait révéler.

- **Restaurer une sauvegarde ne faisait plus rien.** Depuis que l'écran des
  paramètres retient le fichier lu dans un `$state` le temps de la confirmation,
  le carnet devenait un proxy Svelte de part en part — et `structuredClone`, donc
  IndexedDB, refuse les proxys. La transaction avortait **en silence** : aucune
  donnée écrite, aucun message. `importer()` prend désormais un instantané en
  entrée. Même défaut latent dans l'annulation d'une suppression, pour une mesure
  portant une tension ou une liste de choix : corrigé de même.
- **La confirmation de restauration n'était jamais affichée**, même quand l'import
  réussissait : `charger()` bascule `chargement`, qui remplace toute l'interface
  et démonte donc l'écran qui s'apprêtait à parler. `charger({ silencieux: true })`
  après un import.
- **Le mode sans chiffre laissait passer « Reste 3,2 kg »** sous la jauge. La part
  parcourue n'est pas un poids et peut rester ; la distance restante en est un.

### 12.5 — Vérifié en conditions réelles

Sur un carnet jetable portant quatre objectifs simultanés (poids en fourchette,
sommeil et renforcement en régularité, stress au plus 2) : affichage des deux
familles côte à côte, bascule d'un champ à l'autre dans la modale, création,
modification et retrait d'un objectif, désactivation d'un champ porteur, mode sans
chiffre, aller-retour export → import complet avec tension et choix multiples
préservés. Le carnet réel n'a été touché à aucun moment, ce qui a été contrôlé
ligne à ligne après chaque manipulation.
