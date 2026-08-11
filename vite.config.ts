import { defineConfig } from 'vitest/config'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'

const paquet = createRequire(import.meta.url)('./package.json') as { version: string }

/**
 * Empreinte du dépôt au moment de la compilation.
 *
 * Pendant une phase d'essai, deux personnes qui décrivent le même problème ne
 * parlent pas forcément de la même application : sans repère affiché, rien ne
 * permet de savoir laquelle est installée. `package.json` donne la version
 * lisible, le dépôt donne le détail qui la désambiguïse.
 *
 * Le dépôt peut être absent — une archive téléchargée n'a pas de `.git`. Ce
 * n'est pas une erreur de compilation : on s'en passe.
 */
function empreinteDepot(): string {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim()
  } catch {
    return ''
  }
}

/**
 * Chemin sous lequel l'application est servie.
 *
 * La racine dans l'APK — Capacitor sert les fichiers depuis `/` — et sur un
 * hébergement dédié. Un sous-dossier sur GitHub Pages, où le site vit sous le
 * nom du dépôt. Le manifeste et le service worker doivent suivre exactement,
 * sans quoi l'application s'installe mais ne retrouve plus ses fichiers.
 */
const base = process.env['BASE_CARNET'] ?? '/'

export default defineConfig({
  base,
  define: {
    __VERSION_APP__: JSON.stringify(paquet.version),
    __EMPREINTE_APP__: JSON.stringify(empreinteDepot()),
  },
  plugins: [
    svelte(),
    VitePWA({
      // § 15.1 : PWA installable, y compris hors ligne, sans dépendance à un store.
      //
      // `prompt` et non `autoUpdate`. En mode automatique, la bibliothèque
      // appelle `window.location.reload()` dès qu'une nouvelle version
      // s'active — donc potentiellement pendant qu'on saisit une mesure, ce qui
      // effacerait la saisie en cours. Et le bandeau « une nouvelle version est
      // prête », déjà écrit dans `App.svelte`, ne pouvait jamais s'afficher :
      // `onNeedRefresh` n'existe pas dans ce mode.
      //
      // En mode `prompt`, la nouvelle version attend sagement, le bandeau
      // apparaît, et c'est la personne qui choisit le moment (règle 4).
      registerType: 'prompt',
      includeAssets: ['icones/favicon-32.png'],
      manifest: {
        id: base,
        name: 'Carnet Bien-être',
        short_name: 'Bien-être',
        description: "Carnet personnel de suivi du poids, des mensurations et du bien-être. Vos données restent sur votre appareil et n'en partent que si vous le demandez.",
        lang: 'fr',
        start_url: base,
        scope: base,
        display: 'standalone',
        // Couleurs du § 14 : le fond apaisant du carnet, et la teinte sauge de la marque.
        background_color: '#f7f6f2',
        theme_color: '#4a6450',
        orientation: 'portrait-primary',
        categories: ['health', 'lifestyle'],
        icons: [
          { src: base + 'icones/icone-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: base + 'icones/icone-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: base + 'icones/icone-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: base + 'icones/icone-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Toute l'app est un bundle statique : la mettre en cache au premier
        // chargement suffit à un fonctionnement hors ligne complet (§ 15.1).
        globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}'],
        // Les données du carnet vivent dans IndexedDB, jamais sur le réseau :
        // il n'y a donc aucune route applicative à intercepter en runtime.
        // Sous un sous-dossier, `index.html` seul désignerait la racine du
        // domaine : la navigation hors ligne retomberait à côté.
        navigateFallback: base + 'index.html',
      },
      devOptions: {
        // Utile pour vérifier l'enregistrement du service worker en développement,
        // sans attendre un build de production.
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      $lib: fileURLToPath(new URL('./src/lib', import.meta.url)),
    },
  },
  test: {
    // La couche domaine est faite de fonctions pures : pas besoin de DOM.
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})
