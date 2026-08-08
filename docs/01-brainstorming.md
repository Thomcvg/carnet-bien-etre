# Brainstorming — Carnet Bien-être

**Étape 1/3 du projet** · 08/08/2026
Objectif : ouvrir largement le champ des possibles avant de figer le périmètre.
Ce document ne s'engage sur rien : c'est un catalogue à trier.

- ⭐ = recommandé pour la V1 (bon rapport valeur / effort, cohérent avec la philosophie du carnet)
- Les codes (A1, B4…) servent à répondre : « je garde A1, A3, B2, F9… »

**Contexte à garder en tête**
Utilisatrice pilote : Crystèle, 60 ans, vient d'un tableur, saisie mensuelle, veut de la simplicité.
Ambition : que l'app serve aussi un public large (jeunes, sportifs, seniors, hommes, femmes, suivi médical).
Contraintes : gratuite, open source, respectueuse de la vie privée.

**La tension centrale du projet**
Le cahier des charges dit « simplicité avant tout », et vouloir servir tout le monde pousse à l'inverse.
La résolution proposée : **une app minuscule par défaut, extensible par modules activables**. Crystèle ne voit
jamais ce qu'elle n'a pas demandé. Un coach sportif de 25 ans active six modules et retrouve son outil.
Chaque proposition ci-dessous est donc à lire comme « module optionnel », pas comme « écran de plus ».

---

## A. Mesures & indicateurs corporels

Le socle existe déjà (poids + 6 mensurations). Voici ce qui peut l'étendre.

- **A1** ⭐ Mensurations supplémentaires — cou, mollet, avant-bras, épaules, poignet, cheville.
- **A2** ⭐ Champs de mesure entièrement personnalisés — l'utilisateur crée « tour de genou », « tour de tête »… C'est la clé de l'extensibilité sans surcharge.
- **A3** Mensurations gauche / droite séparées — utile en rééducation ou en musculation.
- **A4** ⭐ Historique de la taille (hauteur) — pertinent chez le senior (tassement vertébral) et l'enfant (croissance) ; aujourd'hui la taille est figée dans le profil.
- **A5** ⭐ Ratio tour de taille / taille (WHtR) — meilleur prédicteur de risque cardiométabolique que l'IMC, seuil simple à 0,5. Excellent complément.
- **A6** Ratio taille / hanches (WHR) — indicateur OMS de répartition des graisses.
- **A7** ⭐ Catégories d'IMC affichées avec nuance liée à l'âge — après 65 ans la fourchette « normale » remonte (23–28) ; afficher « maigreur » à une femme de 60 ans à IMC 22 serait faux et anxiogène.
- **A8** ⭐ Fourchette de poids santé calculée depuis la taille — au lieu d'un chiffre unique, une zone. Beaucoup plus bienveillant.
- **A9** % de masse grasse — saisie manuelle depuis une balance à impédancemètre.
- **A10** Masse musculaire / masse hydrique / masse osseuse — mêmes balances.
- **A11** Indice de masse maigre (FFMI) — public sportif.
- **A12** Poids « idéal » selon formules classiques (Lorentz, Devine, Creff, Broca) — à manier avec prudence, ces formules sont datées.
- **A13** Périmètre brachial (MUAC) — dépistage de la dénutrition chez le senior. Peu connu, très utile après 70 ans.
- **A14** Force de préhension (grip strength) — marqueur reconnu de sarcopénie, mesurable avec un dynamomètre à 15 €.
- **A15** Test des 5 levers de chaise / vitesse de marche — tests de fragilité, réalisables sans matériel.
- **A16** ⭐ Tension artérielle (systolique / diastolique / pouls) — très fréquemment suivi à 60 ans, souvent dans le même carnet papier.
- **A17** Fréquence cardiaque de repos — indicateur de forme cardiovasculaire simple.
- **A18** Glycémie à jeun — diabète de type 2 très répandu dans cette tranche d'âge.
- **A19** HbA1c — suivi trimestriel du diabète.
- **A20** Bilan lipidique (cholestérol total, LDL, HDL, triglycérides).
- **A21** Autres analyses biologiques en champs libres — ferritine, vitamine D, TSH, créatinine…
- **A22** Saturation en oxygène (SpO2).
- **A23** Température corporelle.
- **A24** ⭐ Taille de vêtements / pointure — indicateur concret et joyeux, souvent plus parlant que le kilo.
- **A25** ⭐ Unités impériales (lb, pouces) — indispensable pour l'audience internationale d'un projet open source.
- **A26** ⭐ Garde-fou de saisie — détecter « 740 kg » ou « 7,4 kg » et demander une confirmation douce, sans bloquer.
- **A27** ⭐ Moyenne mobile du poids — lisse les fluctuations d'eau et évite de sur-interpréter un −0,3 kg.
- **A28** Contexte de pesée — à jeun / habillé / après le sport, pour expliquer les écarts.
- **A29** Plusieurs pesées le même jour, moyennées — pour ceux qui pèsent souvent.
- **A30** Import depuis balance connectée — Withings, Xiaomi, Garmin (API ou Bluetooth).
- **A31** Import Apple Santé / Google Health Connect — récupérer poids et pas automatiquement.
- **A32** Bande d'incertitude affichée sur la courbe — matérialiser que ±1 kg est du bruit physiologique normal.

---

## B. Santé & suivi médical

L'app n'est pas un dispositif médical, mais elle peut être l'interface entre l'utilisateur et son médecin.

- **B1** ⭐ Fiche de synthèse à imprimer pour le médecin — 1 page PDF : courbe, chiffres clés, traitements. Très demandé, très apprécié des praticiens.
- **B2** Journal des rendez-vous médicaux — date, praticien, ce qui a été dit.
- **B3** ⭐ Suivi des analyses biologiques avec valeurs de référence — courbes + zone normale grisée.
- **B4** Suivi des traitements en cours — dates de début / fin, dosage.
- **B5** ⭐ Note « médicaments qui influencent le poids » — corticoïdes, antidépresseurs, bêta-bloquants, insuline… Comprendre qu'une prise de poids peut venir d'un traitement change tout le vécu.
- **B6** Rappels de prise de traitement — facultatifs, sortent du périmètre « carnet ».
- **B7** Carnet de vaccination.
- **B8** Poids de référence avant / après une opération — chirurgie bariatrique, prothèse, hospitalisation.
- **B9** Questionnaires validés — IPAQ (activité), PSQI (sommeil), MNA (nutrition senior). Solides scientifiquement mais lourds à remplir.
- **B10** ⭐ Alerte de perte de poids involontaire — une perte rapide non recherchée après 60 ans est un signal médical réel (dénutrition, pathologie). Suggérer une consultation sans alarmer.
- **B11** ⭐ Avertissement en cas de perte trop rapide — au-delà de ~1 % du poids par semaine, message informatif bienveillant.
- **B12** Liens vers ressources fiables francophones — Ameli, Manger Bouger, HAS, Santé publique France.
- **B13** Export chiffré destiné à un professionnel de santé.
- **B14** ⭐ Mention claire « ceci n'est pas un dispositif médical » — nécessaire juridiquement et éthiquement.

---

## C. Bien-être & ressenti

Le cahier des charges prévoit sommeil / énergie / humeur. Voici comment aller plus loin, toujours en facultatif.

- **C1** ⭐ Durée de sommeil en heures, en plus de la qualité 1–5.
- **C2** ⭐ Niveau de stress (1–5).
- **C3** ⭐ Douleurs — localisation + intensité. Dos, genoux, hanches : central après 60 ans et souvent lié au poids.
- **C4** Motivation ressentie (1–5) — utile pour comprendre les creux a posteriori.
- **C5** Confiance en soi / image corporelle (1–5) — à manier avec précaution, peut devenir une source d'anxiété.
- **C6** ⭐ Essoufflement à l'effort — indicateur de progrès très concret : « je monte l'escalier sans souffler ».
- **C7** Confort digestif / ballonnements.
- **C8** Transit.
- **C9** Hydratation — verres ou litres d'eau.
- **C10** Fringales / grignotage ressentis.
- **C11** Sensations de faim et de satiété.
- **C12** ⭐ Symptômes de ménopause — bouffées de chaleur, sueurs nocturnes, troubles du sommeil. Directement pertinent pour Crystèle, et la ménopause modifie réellement la répartition des graisses et le métabolisme.
- **C13** Suivi du cycle menstruel — pour les utilisatrices concernées ; explique 1 à 2 kg de rétention d'eau. Module totalement désactivable.
- **C14** ⭐ Événements de vie en contexte — retraite, deuil, déménagement, vacances, arrêt du sport. Le « pourquoi » derrière une inflexion de courbe.
- **C15** Consommation d'alcool — factuelle, sans jugement.
- **C16** Tabac — y compris suivi d'un arrêt (souvent accompagné d'une prise de poids qu'il faut normaliser).
- **C17** Caféine.
- **C18** ⭐ Trackers 100 % personnalisés — l'utilisateur crée son échelle (« raideur matinale 1–5 », « moral »…). Une seule fonctionnalité qui remplace vingt demandes futures.
- **C19** Étiquettes libres sur une mesure — « vacances », « stress boulot », « grippe ».
- **C20** Météo du jour récupérée automatiquement — corrèle avec l'humeur et l'activité extérieure.
- **C21** Journal libre long — au-delà du champ « notes » actuel.
- **C22** ⭐ Une question de réflexion par mois — « qu'est-ce qui a bien fonctionné ce mois-ci ? ». Deux lignes qui transforment un tableur en carnet.

---

## D. Nutrition

Le cahier des charges exclut explicitement les calories du périmètre obligatoire. Ces propositions restent
volontairement légères — l'esprit « pas de comptage ».

- **D1** ⭐ Habitudes alimentaires à cocher — fruits et légumes, petit-déjeuner, eau, pas de grignotage. Zéro effort, vraie valeur.
- **D2** ⭐ Ressenti global du repas — équilibré / moyen / écart, sans chiffre. Bien plus soutenable qu'un journal calorique.
- **D3** Méthode des portions à la main — apprendre à évaluer sans peser.
- **D4** Schéma de l'assiette équilibrée — ½ légumes, ¼ protéines, ¼ féculents. Contenu pédagogique embarqué.
- **D5** ⭐ Suivi de l'apport en protéines — enjeu majeur après 60 ans pour préserver la masse musculaire. Peut rester qualitatif (« protéines à chaque repas ? »).
- **D6** Calories facultatives, base Open Food Facts — base ouverte française, gratuite. Contredit l'esprit du projet mais très demandé.
- **D7** Scan de code-barres — Open Food Facts + Nutri-Score.
- **D8** Nutri-Score moyen des produits consommés — vision « qualité » plutôt que « quantité ». Original.
- **D9** Base d'aliments hors ligne Ciqual (ANSES) — données publiques françaises de référence.
- **D10** Suivi du jeûne intermittent — fenêtre alimentaire.
- **D11** Idées de repas équilibrés — contenu statique, pas de moteur de recettes.
- **D12** Repères sur les carences fréquentes après 60 ans — vitamine D, B12, calcium. Informatif.
- **D13** Suivi du sel et du sucre ajouté.

---

## E. Activité physique

- **E1** ⭐ Bibliothèque d'activités avec durée et intensité — au lieu d'un champ texte libre. Rend les données exploitables.
- **E2** ⭐ Jauge des 150 min/semaine recommandées par l'OMS — repère clair, non culpabilisant.
- **E3** ⭐ Reconnaître l'activité du quotidien — jardinage, ménage, courses, escaliers. Après 60 ans c'est souvent l'essentiel de la dépense, et l'ignorer donne le sentiment de « ne rien faire ».
- **E4** ⭐ Renforcement musculaire 2×/semaine — l'autre recommandation OMS, largement méconnue, cruciale contre la sarcopénie.
- **E5** Estimation de la dépense énergétique (MET) — facultative.
- **E6** Distance parcourue — marche, vélo, natation.
- **E7** Import automatique du nombre de pas — Health Connect, Apple Santé, Google Fit.
- **E8** Séances guidées douces — marche, étirements, yoga sur chaise. Contenu embarqué, pas de vidéo.
- **E9** Exercices d'équilibre et prévention des chutes — enjeu senior majeur.
- **E10** Journal de musculation — exercices, séries, charges. Pour le public jeune / sportif.
- **E11** Minuteur / chronomètre d'exercice.
- **E12** Tests de souplesse simples.
- **E13** Défis marche cumulés — « la longueur de la Loire en pas ». Ludique, à garder désactivable.

---

## F. Objectifs & motivation

- **F1** ⭐ Objectif en fourchette plutôt qu'un chiffre unique — « entre 61 et 64 kg ». Change radicalement le rapport à l'objectif : on n'échoue plus à 63,2 kg.
- **F2** ⭐ Mode maintien / stabilisation — pour l'après-objectif, qui est la phase la plus longue et la moins outillée par les apps existantes.
- **F3** ⭐ Mode prise de poids — convalescence, dénutrition, sport. Sans ça, l'app exclut d'emblée une partie du public.
- **F4** ⭐ Objectifs comportementaux, sans poids — « marcher 3× par semaine », « dormir 7 h ». Ce sur quoi on a réellement prise.
- **F5** Date cible optionnelle avec calcul du rythme nécessaire.
- **F6** ⭐ Alerte bienveillante si l'objectif est irréaliste — un rythme > 1 %/semaine mérite une remarque, pas un blocage.
- **F7** ⭐ Projection au rythme actuel — « à ce rythme, objectif atteint vers avril 2027 ». Motivant et honnête.
- **F8** Assistant de définition d'objectif — quelques questions guidées au premier lancement.
- **F9** ⭐ Jalons automatiques — chaque kilo, chaque passage de dizaine, chaque changement de catégorie.
- **F10** Équivalences concrètes des kilos perdus — « −5 kg, le poids d'un chat ». Rend l'abstrait tangible.
- **F11** ⭐ Jalons de régularité, pas de résultat — « 6 mois de carnet », « 12 mesures ». Récompense l'assiduité, la seule chose vraiment sous contrôle.
- **F12** Badges / trophées discrets.
- **F13** Série de suivi mensuelle (streak) — attention : la rupture d'une série peut être démotivante. À concevoir sans punition.
- **F14** ⭐ Détection de plateau avec explication physiologique — un plateau est normal, le dire évite l'abandon. Moment décisif dans un parcours.
- **F15** ⭐ Rappel du « pourquoi » initial — la motivation écrite au démarrage, réaffichée dans les moments creux. Simple et puissant.
- **F16** Récompenses auto-définies — « à −5 kg, je m'offre… ».
- **F17** Messages d'encouragement, personnalisables et désactivables.
- **F18** Historique des objectifs — voir comment son objectif a évolué dans le temps.
- **F19** Objectifs de mensurations — déjà prévu en P2 du cahier des charges.
- **F20** Objectifs de période — « tenir pendant les fêtes », « d'ici l'été ».

---

## G. Visualisation & analyse

- **G1** ⭐ Zone objectif matérialisée sur la courbe — une bande colorée cible plutôt qu'une ligne.
- **G2** ⭐ Sélecteur de période — 3 mois / 6 mois / 1 an / tout / personnalisé.
- **G3** ⭐ Annotations d'événements sur la courbe — les notes deviennent des repères visuels. « Ah, c'est là que j'ai arrêté la piscine. » Probablement la fonctionnalité d'analyse la plus utile de toute la liste.
- **G4** ⭐ Tendance lissée superposée aux valeurs réelles — déjà évoquée au § 5.3 du cahier des charges.
- **G5** ⭐ Variations mensuelles en barres — voir les deltas mois par mois, plus lisible qu'une courbe pour « où en suis-je ».
- **G6** ⭐ Résumé du mois en un écran — les 5 chiffres qui comptent.
- **G7** Calendrier de régularité type heatmap — visualiser l'assiduité d'un coup d'œil.
- **G8** Superposition des années — comparer 2026, 2027, 2028 sur 12 mois.
- **G9** Graphique radar des mensurations — état actuel vs point de départ.
- **G10** ⭐ Corrélations entre données — poids et sommeil, poids et activité, humeur et saison. Là où l'app devient plus intelligente qu'un tableur.
- **G11** Statistiques descriptives — moyenne, min, max, amplitude par période.
- **G12** Comparaison de deux périodes — « printemps 2026 vs printemps 2027 ». Prévu en P2.
- **G13** Saisonnalité détectée — « en moyenne +1,2 kg en décembre ». Déculpabilisant et prédictif.
- **G14** Courbe de vitesse d'évolution (kg/mois).
- **G15** ⭐ Vue « depuis le début » — chiffres de départ vs aujourd'hui, en grand.
- **G16** ⭐ Export d'un graphique en image — pour l'envoyer à son médecin ou le garder.
- **G17** Zoom et déplacement sur les graphiques.
- **G18** Frise chronologique des événements marquants.
- **G19** Tableau croisé mois × année — familier pour qui vient d'Excel.
- **G20** Projection de tendance avec intervalle de confiance.
- **G21** ⭐ Signal « variation dans le bruit » — indiquer qu'un écart de 0,3 kg n'est pas interprétable.
- **G22** Silhouette schématique évoluant selon les mensurations — visuellement fort, mais risque réel sur l'image corporelle. À écarter ou traiter avec beaucoup de soin.
- **G23** Bilan annuel — « votre année 2026 en revue ».
- **G24** Mode plein écran pour un graphique — lisibilité sur petit écran et pour les seniors.

---

## H. Photos & suivi visuel

Module entier, à activer ou ignorer. Les photos sont souvent le suivi le plus motivant, et le plus sensible.

- **H1** Photos de progression — face, profil, dos.
- **H2** Comparateur avant / après avec curseur.
- **H3** Repère de cadrage fantôme — reprendre exactement la même pose et le même angle. C'est ce qui fait la différence entre une comparaison utile et deux photos incomparables.
- **H4** Galerie par mois.
- **H5** Floutage automatique du visage, optionnel.
- **H6** Accès aux photos protégé par un code distinct.
- **H7** Timelapse de l'évolution.
- **H8** Photos de vêtements plutôt que du corps — le jean qui referme. Beaucoup moins anxiogène, souvent plus parlant.
- **H9** ⭐ Module désactivable intégralement — pour que l'app n'évoque jamais les photos si on n'en veut pas.

---

## I. Éthique & sécurité psychologique

Une app de poids peut faire du mal. Ces points ne sont pas des fonctionnalités « bonus » : ils définissent
ce que le projet accepte d'être, et c'est aussi ce qui le distinguera des dizaines d'apps existantes.

- **I1** ⭐ Charte rédactionnelle anti-culpabilisation — écrite dans le dépôt, opposable aux contributions. Aucun « vous avez échoué », aucun « mauvais », aucun rouge sur une prise de poids.
- **I2** ⭐ Refus des objectifs dangereux — un IMC cible sous 18,5 déclenche un avertissement et une confirmation explicite.
- **I3** ⭐ Aucune comparaison sociale, aucun classement — jamais, même en option.
- **I4** ⭐ Ressources troubles du comportement alimentaire — accessibles depuis l'app (ligne Anorexie Boulimie Info Écoute, FFAB).
- **I5** Mode « sans chiffre » — masquer le poids, n'afficher que les tendances et le ressenti. Pour qui le chiffre déclenche de l'anxiété.
- **I6** Détection de pesée compulsive — proposer d'espacer, sans interdire.
- **I7** Recommandation d'une fréquence de pesée raisonnable — le carnet est déjà mensuel par conception, c'est un atout.
- **I8** ⭐ Accompagnement de l'après-objectif — que se passe-t-il à 62 kg ? La plupart des apps abandonnent l'utilisateur exactement à ce moment.
- **I9** Vocabulaire au choix — « perte de poids » / « évolution » / « suivi ». Certains ne veulent pas du mot « perdre ».
- **I10** ⭐ Toute la gamification désactivable — badges, jalons, séries, encouragements.
- **I11** ⭐ Neutralité vis-à-vis du corps — pas de « avant/après » triomphal, pas de silhouette idéalisée, pas de vocabulaire de performance.

---

## J. Accessibilité & adaptation aux publics

- **J1** ⭐ Taille de police réglable — 100 / 125 / 150 / 200 %. Le besoin numéro un après 60 ans.
- **J2** ⭐ Mode sombre et mode contraste élevé.
- **J3** ⭐ Mode « essentiel » — l'app se réduit au poids et à la courbe. Le mode par défaut pour Crystèle.
- **J4** ⭐ Mode « complet » — tous les modules, pour les utilisateurs avancés.
- **J5** ⭐ Choix d'usage au premier lancement — perte de poids / maintien / prise / suivi médical / sport. Une question qui configure toute l'app et résout la tension simplicité / richesse.
- **J6** ⭐ Compatibilité lecteur d'écran (ARIA complet).
- **J7** ⭐ Navigation clavier intégrale — aussi utile aux utilisateurs de bureau qu'aux personnes handicapées.
- **J8** ⭐ Grandes zones tactiles — 48 px minimum, pas de cible minuscule.
- **J9** ⭐ Aucun geste complexe obligatoire — pas de swipe indispensable, pas d'appui long caché.
- **J10** ⭐ Aide contextuelle — « c'est quoi l'IMC ? » accessible d'un tap, sans quitter l'écran.
- **J11** Visite guidée au premier lancement, désactivable.
- **J12** Saisie vocale du poids — « soixante-treize virgule six ».
- **J13** ⭐ Internationalisation prête dès le départ — français d'abord, mais aucune chaîne codée en dur. Un projet open source non traduisible reste confidentiel.
- **J14** Palettes adaptées au daltonisme + formes différenciées, jamais la couleur seule.
- **J15** Respect de `prefers-reduced-motion`.
- **J16** Utilisation à une main sur mobile.
- **J17** ⭐ Impression papier propre — le carnet imprimé reste très apprécié, et c'est une forme de sauvegarde.
- **J18** Grille vierge imprimable — noter à la main puis saisir plus tard.

---

## K. Saisie & ergonomie

C'est ici que se gagnent les « 2 minutes » promises par le cahier des charges.

- **K1** ⭐ Saisie éclair — un écran, un champ, valider. Le chemin par défaut.
- **K2** ⭐ Pré-remplissage avec les valeurs précédentes pour les mensurations — on ne retape que ce qui a changé.
- **K3** ⭐ Clavier numérique adapté avec virgule — évidence souvent ratée, source d'agacement quotidien.
- **K4** ⭐ Mode rattrapage — saisir plusieurs mois passés à la suite. Indispensable pour reprendre un carnet abandonné.
- **K5** ⭐ Vue tableau éditable, type tableur — familier pour qui vient d'Excel, et redoutablement efficace pour corriger.
- **K6** Coller directement depuis Excel dans l'app.
- **K7** ⭐ Détection de doublon de date — proposer de modifier la mesure existante plutôt que d'en créer une seconde.
- **K8** ⭐ Annulation (undo) après suppression ou modification — plus rassurant qu'une boîte de confirmation.
- **K9** Corbeille — mesures supprimées récupérables 30 jours.
- **K10** Recherche dans l'historique et les notes.
- **K11** Filtres sur l'historique — année, avec mensurations, avec notes.
- **K12** ⭐ Notifications locales configurables — jour du mois et heure au choix, désactivées par défaut. Déjà au § 27.
- **K13** Rappel adaptatif — « vous notez souvent vers le 1er ».
- **K14** Widget d'écran d'accueil — poids actuel + saisie rapide.
- **K15** Raccourci vocal système — Siri, Assistant Google.
- **K16** ⭐ Nom du carnet personnalisable — « Le carnet de Crystèle ». Détail minuscule, appropriation immédiate.
- **K17** Choix du format de date et des unités.
- **K18** ⭐ Anniversaire du carnet — « 1 an de suivi aujourd'hui ». Le genre de jalon qui n'a rien à voir avec le poids.

---

## L. Données, export, sauvegarde

- **L1** ⭐ Tout en local, aucun compte, aucun serveur — position par défaut. Le meilleur argument de confidentialité est l'absence d'infrastructure.
- **L2** ⭐ Export CSV et XLSX — déjà au cahier des charges.
- **L3** ⭐ Export PDF du bilan — déjà au cahier des charges.
- **L4** ⭐ Export JSON complet et réversible — la vraie sauvegarde. Garantit qu'on n'est jamais prisonnier de l'app.
- **L5** ⭐ Import du fichier Excel existant de Crystèle — cas d'usage nommé au § 23.
- **L6** ⭐ Import CSV / XLSX générique avec correspondance de colonnes et aperçu avant validation.
- **L7** ⭐ Sauvegarde automatique vers un fichier local — le carnet reste un fichier qu'on possède.
- **L8** Synchronisation Nextcloud / WebDAV — pertinent ici, le projet vit déjà dans un Nextcloud. Sync multi-appareils sans serveur à maintenir.
- **L9** Synchronisation par fichier dans Drive / Dropbox / iCloud.
- **L10** Synchronisation chiffrée de bout en bout via un serveur auto-hébergeable — le plus complet, le plus coûteux à maintenir.
- **L11** Chiffrement local du carnet par code ou mot de passe.
- **L12** Déverrouillage biométrique — empreinte, reconnaissance faciale.
- **L13** ⭐ Suppression totale des données en un geste — droit à l'oubli concret, déjà au § 26.
- **L14** Import depuis MyFitnessPal, Yazio, Withings, Apple Santé.
- **L15** Sauvegarde de secours par QR code — le carnet tient dans une feuille de papier.
- **L16** ⭐ Migrations de schéma versionnées — pour que le carnet de 2026 s'ouvre encore en 2036. Peu visible, structurant.

---

## M. Plateformes & technique

- **M1** ⭐ Application web installable (PWA) — un seul développement pour PC, tablette et mobile, fonctionne hors ligne, pas de store à franchir. La voie recommandée pour un projet gratuit.
- **M2** Application Android / iOS empaquetée (Capacitor) — même code, présence dans les stores.
- **M3** Application de bureau (Tauri) — légère, pour ceux qui préfèrent un vrai logiciel.
- **M4** ⭐ Publication sur F-Droid — le store libre d'Android, public naturellement aligné avec le projet.
- **M5** Publication sur Play Store et App Store — audience large, mais comptes payants et validation.
- **M6** ⭐ Démo en ligne sans installation — essayer avant d'adopter.
- **M7** ⭐ Zéro tracker, zéro publicité, zéro télémétrie — engagement vérifiable dans le code.
- **M8** ⭐ Application légère et instantanée — objectif sous 1 Mo, chargement immédiat même sur vieux téléphone.
- **M9** Thèmes de couleurs au choix.
- **M10** ⭐ Tests automatisés sur les calculs — IMC, progression, évolutions. Ce sont des chiffres qu'on ne peut pas se permettre de rater.
- **M11** ⭐ Intégration continue — build et tests à chaque contribution.
- **M12** Assistant local d'analyse, hors ligne uniquement.
- **M13** Analyse par IA distante, strictement sur choix explicite — envoyer des données de santé à un tiers doit rester un acte volontaire, jamais un défaut.

---

## N. Résumés & intelligence

- **N1** ⭐ Résumé mensuel en langage naturel — « poids stable, énergie en hausse, 4 sorties marche ». Fabriqué par des règles simples, sans IA.
- **N2** ⭐ Détection de tendance formulée en mots — « baisse régulière depuis 3 mois ».
- **N3** Suggestions issues de ses propres corrélations — « vos meilleurs mois sont ceux où vous dormez plus de 7 h ».
- **N4** Questions en langage naturel sur ses données — « quel était mon poids le plus bas en 2027 ? ».
- **N5** Rapport annuel généré automatiquement.
- **N6** Ce qui a changé depuis la dernière ouverture.
- **N7** Anticipation saisonnière — « décembre approche, période où vous prenez habituellement un peu ».

---

## O. Partage & multi-profils

- **O1** ⭐ Plusieurs profils sur un même appareil — un couple, une famille. Simple à faire, élargit beaucoup l'usage.
- **O2** Partage ponctuel d'un bilan — fichier ou lien expirant.
- **O3** Mode binôme — un proche de confiance voit les progrès.
- **O4** Commentaires d'un accompagnant — coach, diététicien.
- **O5** Export destiné à un coach ou diététicien.
- **O6** ⭐ Aucun réseau social intégré — choix assumé, à écrire noir sur blanc.
- **O7** Groupe de motivation entre utilisateurs — demande un serveur, une modération, et ouvre la porte à la comparaison. À écarter selon moi.
- **O8** ⭐ Mode démonstration avec données fictives — découvrir l'app sans rien saisir, et faire des captures d'écran pour la documentation.
- **O9** Comparaison entre profils du foyer — techniquement facile, humainement risqué.

---

## P. Open source & communauté

- **P1** ⭐ Licence libre explicite — AGPL-3.0 pour empêcher une reprise fermée, ou MIT pour une diffusion maximale. Décision à trancher.
- **P2** ⭐ Dépôt public avec README soigné et captures d'écran.
- **P3** ⭐ Guide de contribution et code de conduite.
- **P4** ⭐ Documentation utilisateur illustrée, en français — la moitié du public visé ne lit pas l'anglais.
- **P5** Traduction communautaire (Weblate ou fichiers simples).
- **P6** ⭐ Feuille de route publique.
- **P7** Modèles d'issues et de pull requests.
- **P8** ⭐ Journal des versions (CHANGELOG) lisible par un non-technicien.
- **P9** Site vitrine du projet — GitHub Pages, gratuit.
- **P10** ⭐ Charte du projet — la philosophie du § 35 du cahier des charges, mise en avant pour orienter les contributions futures.

---

## Q. Arbitrages techniques à trancher

Ce ne sont pas des fonctionnalités mais des décisions de fond. Chacune conditionne la suite.

- **Q1 — Technologie.** PWA (une base, tous les appareils, hors ligne, aucun store) est mon avis pour un projet gratuit maintenu par une petite équipe. Alternative : natif, meilleure intégration mais deux à trois fois le travail.
- **Q2 — Stockage.** 100 % local (IndexedDB) sans compte : zéro coût, confidentialité maximale, mais pas de synchronisation automatique entre appareils. Alternative : backend (Supabase par exemple) — sync facile, mais compte obligatoire, coût, et données de santé hébergées.
- **Q3 — Synchronisation.** Si sync souhaitée sans backend : fichier dans Nextcloud / Drive. Simple, sous contrôle de l'utilisateur, mais gestion de conflits rudimentaire.
- **Q4 — Licence.** AGPL-3.0 protège contre l'appropriation commerciale fermée ; MIT maximise la réutilisation. Choix politique autant que technique.
- **Q5 — Modularité.** Modules activables dans les paramètres, avec deux profils préréglés (« essentiel » et « complet ») : c'est ce qui permet de tout avoir sans écraser Crystèle.
- **Q6 — Nom.** « Carnet Bien-être » est juste et clair en français, mais peu distinctif et difficile à porter à l'international. À conserver ou à retravailler.
- **Q7 — Périmètre V1.** Livrer vite un carnet irréprochable sur le noyau, puis étendre — plutôt que sortir tard une app large et fragile.

---

## R. Ma recommandation de périmètre

À titre indicatif, si je devais trancher seul.

**V1 — le carnet irréprochable (le cahier des charges + le strict nécessaire)**
Tout le P0 existant, plus : A5, A7, A8, A26, A27 · F1, F2, F9, F14 · G1, G2, G3, G4, G6 ·
I1, I2, I3, I11 · J1, J2, J3, J5, J6, J7, J8, J10 · K1, K2, K3, K4, K7, K8, K16 ·
L1, L2, L4, L5, L7, L13, L16 · M1, M7, M8, M10 · P1, P2, P4, P10.

**V2 — l'ouverture aux autres publics**
A1, A2, A4, A16, A24, A25 · B1, B5, B10 · C1, C2, C3, C12, C14, C18, C22 ·
D1, D2, D5 · E1, E2, E3, E4 · F3, F4, F7, F11, F15 · G5, G10, G15, G16 ·
J13, J17 · K5, K12, K18 · L3, L6 · N1, N2 · O1, O8.

**V3 — le confort**
Synchronisation (L8), photos (module H), import santé (A31, E7), analyses biologiques (A18–A21, B3),
statistiques avancées, applications empaquetées (M2, M3, M4).

**Ce que je propose d'écarter dès maintenant**
G22 (silhouette évolutive) et O7/O9 (comparaison entre personnes) : contraires à la philosophie du § 35.
D6/D7 (comptage de calories) : explicitement hors périmètre, et ouvrirait une autre application.

---

## Comment répondre

Trois façons, au choix :

1. **Liste de codes** — « je garde A1, A5, A7, C12, F1… » (ou « tout A sauf A12 »).
2. **Validation d'un bloc** — « je prends ta reco V1 et V2, on verra V3 plus tard ».
3. **Par intention** — « je veux que ce soit très simple pour Crystèle mais complet pour les sportifs » : je traduis en modules.

Précise aussi si tu as un avis sur les arbitrages Q1 à Q7 — sinon je propose et tu valides.
