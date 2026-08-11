# Signature et diffusion

Ce document décrit comment produire un paquet Android installable et le diffuser.
Il s'adresse à qui tient le dépôt, pas aux personnes qui utilisent l'application.

---

## 1. Pourquoi une clé, et pourquoi elle est sérieuse

Android n'installe une mise à jour que si elle est signée par **la même clé** que
la version déjà en place. Cette clé est donc l'identité de l'application, pour
toute sa durée de vie.

Deux conséquences, dans les deux sens :

- **Clé perdue** → plus aucune mise à jour possible. La seule issue serait de
  demander à chaque personne de désinstaller l'application, ce qui **efface son
  carnet**. Pour une application dont toute la promesse est que les données
  restent sur l'appareil, c'est le pire accident imaginable.
- **Clé divulguée** → n'importe qui peut fabriquer une fausse mise à jour que les
  téléphones accepteront comme authentique.

D'où trois règles, sans exception :

1. La clé n'entre **jamais** dans le dépôt. Le `.gitignore` refuse `*.jks`,
   `*.keystore` et `signature.properties`.
2. Elle est sauvegardée ailleurs que sur la seule machine qui compile
   — un gestionnaire de mots de passe, ou un support hors ligne.
3. Son mot de passe n'est connu que de la personne qui l'a créée.

## 2. Créer la clé — une seule fois

`keytool` fait partie du JDK et n'est généralement pas dans le `PATH`. Sous
Windows, il se trouve avec Android Studio ou avec un JDK installé séparément :

```text
C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe
C:\Program Files\Java\jdk-17\bin\keytool.exe
```

Depuis la racine du dépôt. La commande demande un mot de passe, puis quelques
informations d'identité ; seul le premier champ compte réellement.

```bash
"/c/Program Files/Java/jdk-17/bin/keytool.exe" -genkeypair -v -keystore android/carnet-bien-etre.jks -alias carnet -keyalg RSA -keysize 4096 -validity 10000
```

`-validity 10000` fait environ 27 ans. Une clé qui expire avant l'application
oblige à tout recommencer ; il n'y a aucune raison d'être avare ici.

Créer ensuite `android/signature.properties`, à côté du fichier `.jks`.
**Le chemin de `storeFile` se lit depuis le dossier `android/`**, pas depuis la
racine du dépôt — c'est là que vit ce fichier :

```properties
storeFile=carnet-bien-etre.jks
storePassword=celui-que-vous-avez-choisi
keyAlias=carnet
keyPassword=le-meme-sauf-si-vous-en-avez-choisi-un-autre
```

Une clé introuvable arrête la compilation sur un message qui donne le chemin
attendu et le chemin déclaré, plutôt que sur une erreur d'outillage.

**Sous PowerShell**, écrire ce fichier sans y laisser passer le mot de passe dans
l'historique des commandes :

```powershell
$s = Read-Host "Mot de passe du keystore" -AsSecureString
$mdp = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s))
[System.IO.File]::WriteAllLines(
  (Join-Path $PWD 'android\signature.properties'),
  @("storeFile=carnet-bien-etre.jks", "storePassword=$mdp", "keyAlias=carnet", "keyPassword=$mdp"),
  (New-Object System.Text.UTF8Encoding $false))
Remove-Variable mdp, s
```

`UTF8Encoding $false` n'est pas un détail : `Set-Content -Encoding utf8` place
une marque d'ordre des octets en tête de fichier, et `storeFile` devient alors
une clé que Java ne reconnaît plus. La compilation sait désormais ignorer cette
marque, mais autant ne pas l'écrire.

Ce fichier n'est pas versionné. En son absence, la compilation de production
fonctionne toujours mais produit un paquet **non signé**, et l'annonce dans sa
sortie plutôt que d'échouer sur un message d'outillage.

## 3. Produire le paquet signé

```bash
npm run android:release
```

Sous Windows, l'invite de commandes n'accepte pas `./gradlew` : lancer alors
`npm run android:sync` puis, depuis `android/`, `.\gradlew.bat assembleRelease`.

Le résultat se trouve dans
`android/app/build/outputs/apk/release/app-release.apk`.

Vérifier la signature avant de diffuser :

```bash
apksigner verify --print-certs android/app/build/outputs/apk/release/app-release.apk
```

L'empreinte SHA-256 affichée doit rester **identique à chaque version**. Si elle
change, la mise à jour sera refusée par les téléphones : mieux vaut s'en rendre
compte là qu'après diffusion.

Empreinte de la clé du projet, établie à la version 1.1.0 :

```text
b9bc696a758567d32579de9a5343549adc37444c63e38e8da409b1937adbc3f8
```

Elle est notée ici pour pouvoir être comparée, pas pour être secrète : une
empreinte de certificat est publique par nature. C'est la clé privée qui ne doit
jamais sortir.

### Passer du paquet de test au paquet signé

Ils ne portent pas la même signature — le premier est signé par la clé de
débogage de la machine, le second par la clé du projet. Android les considère
donc comme **deux applications différentes** et refuse d'installer l'un sur
l'autre (`INSTALL_FAILED_UPDATE_INCOMPATIBLE`).

Le passage se fait donc en quatre gestes, dans cet ordre :

1. **Exporter une sauvegarde** depuis Paramètres → Vos données (fichier JSON).
2. Désinstaller l'application de test.
3. Installer le paquet signé.
4. Restaurer la sauvegarde depuis Paramètres → Restaurer une sauvegarde.

Sauter la première étape efface le carnet. C'est le seul moment de la vie de
l'application où cela peut arriver : une fois sur la clé de production, toutes
les mises à jour suivantes conservent les données.

## 4. Numéro de version

`package.json` est la source unique. Le nom de version en vient tel quel, et le
code de version y ajoute le nombre de commits du dépôt — un nombre qui ne peut
que croître, ce qu'Android exige pour accepter une mise à jour.

Avant une diffusion, faire évoluer `version` dans `package.json` selon ce qui a
changé : un correctif, un ajout, une refonte. Le détail est dans
`android/app/build.gradle`, qui calcule le code de version.

## 5. Diffusion

L'application n'est pas sur le Play Store : coût annuel, et conditions
incompatibles avec l'AGPL (§ 15.1 du cahier des charges).

- **Téléchargement direct** — le fichier `.apk` se transmet tel quel. Android
  demandera l'autorisation d'installer depuis cette source, une fois.
- **F-Droid** — voir `docs/06-f-droid.md`.
- **PWA** — le contenu de `dist/` s'héberge sur n'importe quel serveur statique.
  C'est la voie pour iOS, qui n'aura pas d'application native.

## 6. Ce qui n'est pas automatisé, et pourquoi

La compilation de production n'est pas branchée sur l'intégration continue. Il
faudrait pour cela confier la clé à un service tiers, ce qui contredirait le
point 1. Une diffusion reste donc un geste manuel, ce qui est cohérent avec un
projet qui sort une version tous les quelques mois.
