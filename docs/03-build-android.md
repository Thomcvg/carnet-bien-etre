# Construire l'APK Android

Le projet natif Android (dossier `android/`) est généré par [Capacitor](https://capacitorjs.com)
à partir du build web (`dist/`) — voir `capacitor.config.ts`. Aucune `server.url` n'y est
configurée : l'APK embarque l'application telle quelle et la sert localement, exactement
comme la PWA (§ 15.1 du cahier des charges).

## Prérequis

- Un JDK **21**. Le JDK système peut être plus ancien (le JDK 17 est courant) — le module
  Android de Capacitor 8 exige spécifiquement le 21. Si [Android Studio](https://developer.android.com/studio)
  est installé, son JBR (`Android Studio/jbr`) est un JDK 21 tout trouvé, inutile d'en
  installer un supplémentaire.
- Le SDK Android (`platforms`, `build-tools`), avec les licences déjà acceptées.

## Première configuration

```bash
npm run build
npx cap add android
```

`android/gradle.properties` doit ensuite pointer vers un JDK 21 :

```properties
org.gradle.java.home=C:/Program Files/Android/Android Studio/jbr
```

(chemin à adapter selon l'emplacement réel du JDK 21 disponible). **Barres obliques, pas
antislashs** — un fichier `.properties` Java interprète l'antislash comme un caractère
d'échappement, ce qui corromprait le chemin sur Windows.

Si le dossier du projet contient un caractère accentué (comme *crystèle*), l'outillage
Android le refuse par défaut sur Windows par précaution pour les chaînes d'outils natives
(NDK/JNI). Ce projet n'a aucun code natif — seulement le WebView Capacitor — donc ce risque
ne s'applique pas ici :

```properties
android.overridePathCheck=true
```

Ces deux lignes sont déjà dans `android/gradle.properties`, versionné.

## Régénérer les icônes et l'écran de démarrage

Après toute modification de `scripts/icone-source.svg` :

```bash
node scripts/generer-icones.mjs        # icônes PWA (public/icones/)
node scripts/generer-assets-android.mjs # sources pour l'icône et le splash Android
npx @capacitor/assets generate --android
```

`@capacitor/assets` n'est pas une dépendance persistée : sa chaîne de dépendances porte
plusieurs failles (`tar`, `xcode`, `uuid`) sans rapport avec l'usage qui en est fait ici
(générer des PNG depuis un SVG local, jamais depuis une source réseau) — les imposer à
chaque `npm install` d'un contributeur n'aurait aucun sens. `npx` l'exécute à la demande,
sans le laisser dans `package.json`.

## Construire l'APK

```bash
npm run build
npx cap sync android
cd android
./gradlew assembleDebug
```

L'APK debug se trouve dans `android/app/build/outputs/apk/debug/app-debug.apk`.

C'est un **APK de débogage**, installable et testable, mais non signé pour une diffusion
publique — voir § 15.1 du cahier des charges pour la suite prévue (F-Droid, APK direct).
Signer un APK de version nécessite de générer et de conserver précieusement un keystore ;
cette étape n'est pas automatisée ici pour éviter qu'une clé de signature ne soit créée
sans que quelqu'un en soit explicitement responsable.

## Permissions de l'APK

Deux permissions apparaissent dans le manifeste, aucune n'implique de requête réseau réelle :

- `android.permission.INTERNET` — exigée par le composant WebView d'Android dès qu'une
  application l'utilise, même pour ne servir que des fichiers locaux (c'est le mécanisme
  par lequel Capacitor sert `dist/` à l'application). Cohérent avec M7 : zéro requête
  réseau émise par le carnet lui-même.
- `…DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION` — permission interne, auto-délivrée par
  AndroidX, sans exposition ni donnée utilisateur.

## Sauvegarde des APK produits

Chaque APK notable est copié dans
`Nextcloud\Dossiers partagés\Eden\App Crystèle\APK\`, nommé avec la date de construction,
pour en garder une trace en dehors du dépôt (les APK eux-mêmes ne sont pas versionnés —
voir `.gitignore`).
