import type { CapacitorConfig } from '@capacitor/cli'

/**
 * Empaquetage Android (M2, § 15.1).
 *
 * Aucune `server.url` : l'APK embarque le build web (`dist/`) tel quel et le
 * sert localement, exactement comme la PWA — cohérent avec § 11.1, aucune
 * dépendance réseau pour faire fonctionner l'application.
 */
const config: CapacitorConfig = {
  appId: 'org.carnetbienetre.app',
  appName: 'Carnet Bien-être',
  webDir: 'dist',
}

export default config
