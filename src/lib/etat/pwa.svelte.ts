/**
 * Installation et mise à jour de la PWA (M1, § 15.1).
 *
 * Deux mécanismes distincts, tous deux facultatifs et discrets :
 *  - `beforeinstallprompt` (Chrome/Edge/Android) permet de proposer un vrai
 *    bouton « Installer ». Safari et Firefox n'émettent jamais cet événement ;
 *    l'installation s'y fait par le menu du navigateur, et l'absence du bouton
 *    n'est pas une erreur.
 *  - `registerSW` (vite-plugin-pwa / Workbox) signale quand une nouvelle
 *    version est en cache et prête à remplacer l'ancienne.
 */

type DeclencheurInstallation = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

class EtatPwa {
  peutInstaller = $state(false)
  miseAJourDisponible = $state(false)
  horsLigne = $state(false)

  #evenementInstallation: DeclencheurInstallation | null = null
  #appliquerMiseAJour: ((rechargerPage?: boolean) => Promise<void>) | null = null

  initialiser(): void {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      this.#evenementInstallation = e as DeclencheurInstallation
      this.peutInstaller = true
    })

    window.addEventListener('appinstalled', () => {
      this.peutInstaller = false
      this.#evenementInstallation = null
    })

    // Le module virtuel n'existe qu'après un build PWA ; en développement
    // simple (`npm run dev` sans devOptions.enabled), il reste silencieux.
    import('virtual:pwa-register')
      .then(({ registerSW }) => {
        this.#appliquerMiseAJour = registerSW({
          onNeedRefresh: () => { this.miseAJourDisponible = true },
          onOfflineReady: () => {},
        })
      })
      .catch(() => { /* pas de service worker en développement : sans conséquence */ })
  }

  async installer(): Promise<void> {
    const e = this.#evenementInstallation
    if (!e) return
    await e.prompt()
    await e.userChoice
    this.peutInstaller = false
    this.#evenementInstallation = null
  }

  async appliquerMiseAJourMaintenant(): Promise<void> {
    if (this.#appliquerMiseAJour) await this.#appliquerMiseAJour(true)
    else location.reload()
  }
}

export const pwa = new EtatPwa()
