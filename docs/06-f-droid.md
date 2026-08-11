# Publication sur F-Droid

F-Droid est un dépôt d'applications Android libres. Contrairement au Play Store,
**il compile lui-même** depuis les sources : ce qu'il distribue correspond
vérifiablement au code publié. C'est cohérent avec ce projet, et c'est la seule
voie de diffusion large qui ne demande ni compte payant ni conditions
incompatibles avec l'AGPL.

---

## 1. Ce qui est déjà en place

| Exigence | État |
|---|---|
| Licence libre reconnue | AGPL-3.0-or-later ✅ |
| Sources publiques | GitHub ✅ |
| Aucune dépendance aux services Google | ✅ — Health Connect est une bibliothèque AndroidX libre, pas Google Play Services |
| Aucun traceur | ✅ — vérifiable : deux appels réseau dans le projet, tous deux facultatifs et dans un fichier dédié |
| Construction reproductible par un tiers | ✅ — `npm ci` puis Gradle, sans étape manuelle |
| Métadonnées et captures | ✅ — `fastlane/metadata/android/fr-FR/` |
| Journal des versions | ✅ — `fastlane/metadata/android/fr-FR/changelogs/` |

Les métadonnées suivent la structure attendue par F-Droid :

```text
fastlane/metadata/android/fr-FR/
  title.txt                  nom affiché
  short_description.txt      une phrase, 80 caractères maximum
  full_description.txt       description complète, 4000 caractères maximum
  changelogs/<versionCode>.txt
  images/icon.png
  images/phoneScreenshots/   captures numérotées, dans l'ordre d'affichage
```

Le nom du dossier `<versionCode>.txt` doit correspondre **exactement** au code de
version du paquet — celui qu'affiche `aapt dump badging`. Voir
`docs/05-signature-et-diffusion.md`.

## 2. Un point à trancher avant de soumettre

**F-Droid signe les paquets avec sa propre clé.** Une application installée depuis
F-Droid et une application installée depuis un `.apk` téléchargé directement sont
donc, pour Android, **deux applications différentes** : elles ne se mettent pas à
jour l'une l'autre, et l'une ne voit pas les données de l'autre.

Conséquence concrète : quelqu'un qui utilise déjà l'APK direct et voudrait passer
par F-Droid devrait **exporter sa sauvegarde, désinstaller, réinstaller,
réimporter**. Ce n'est pas un obstacle, mais ce doit être dit clairement le jour
où les deux voies coexisteront.

Il existe une option — *reproducible builds* — où F-Droid vérifie qu'il obtient
bit pour bit le même paquet que celui publié, et distribue alors la version signée
par le projet. C'est plus exigeant à mettre en place, et cela n'a d'intérêt que si
le nombre d'utilisateurs le justifie.

## 3. Soumettre

La soumission passe par une demande sur le dépôt de données de F-Droid, et engage
le projet publiquement. **Elle appartient à la personne qui tient le dépôt.**

1. Publier une version signée et étiquetée dans le dépôt (`git tag v1.1.0`).
   F-Droid compile depuis une étiquette, pas depuis une branche.
2. Ouvrir une demande sur <https://gitlab.com/fdroid/rfp> en décrivant
   l'application, sa licence et l'adresse des sources.
3. Fournir la recette de compilation. Pour un projet Capacitor, elle doit
   installer les dépendances npm, produire `dist/`, synchroniser Capacitor, puis
   lancer Gradle :

   ```yaml
   sudo:
     - apt-get update
     - apt-get install -y nodejs npm
   init:
     - npm ci
     - npm run build
     - npx cap sync android
   subdir: android/app
   gradle:
     - yes
   ```

4. Répondre aux remarques de relecture. Le délai courant se compte en semaines.

## 4. À chaque nouvelle version

1. Faire évoluer `version` dans `package.json`.
2. Ajouter `fastlane/metadata/android/fr-FR/changelogs/<versionCode>.txt` — le
   code de version se lit avec `aapt dump badging` sur le paquet produit.
3. Étiqueter le dépôt.

F-Droid détecte l'étiquette et compile. Rien d'autre n'est à faire.

## 5. Captures d'écran

Celles de `fastlane/` viennent d'un **carnet de démonstration** : toutes les
valeurs y sont inventées. Ce n'est pas une précaution de style — publier les
mesures réelles d'une personne dans un dépôt public serait précisément ce que ce
projet promet de ne jamais faire.

Elles se régénèrent depuis l'émulateur ; la procédure est dans
`docs/03-build-android.md`.
