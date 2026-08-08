import { defineConfig } from 'vitest/config'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [
    svelte(),
    VitePWA({
      // § 15.1 : PWA installable, y compris hors ligne, sans dépendance à un store.
      registerType: 'autoUpdate',
      includeAssets: ['icones/favicon-32.png'],
      manifest: {
        id: '/',
        name: 'Carnet Bien-être',
        short_name: 'Bien-être',
        description: "Carnet personnel de suivi du poids, des mensurations et du bien-être. Vos données restent sur votre appareil.",
        lang: 'fr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        // Couleurs du § 14 : le fond apaisant du carnet, et la teinte sauge de la marque.
        background_color: '#f7f6f2',
        theme_color: '#4a6450',
        orientation: 'portrait-primary',
        categories: ['health', 'lifestyle'],
        icons: [
          { src: '/icones/icone-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icones/icone-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icones/icone-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icones/icone-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Toute l'app est un bundle statique : la mettre en cache au premier
        // chargement suffit à un fonctionnement hors ligne complet (§ 15.1).
        globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}'],
        // Les données du carnet vivent dans IndexedDB, jamais sur le réseau :
        // il n'y a donc aucune route applicative à intercepter en runtime.
        navigateFallback: 'index.html',
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
