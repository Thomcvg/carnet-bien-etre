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

/** Une heure : assez pour qu'une correction arrive dans la journée, assez peu
 *  pour que ce soit une requête toutes les heures et non toutes les minutes. */
const INTERVALLE_VERIFICATION_MS = 60 * 60 * 1000

type DeclencheurInstallation = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

class EtatPwa {
  peutInstaller = $state(false)
  miseAJourDisponible = $state(false)
  // Pas d'état « hors ligne » ici : il en existait un que rien n'alimentait ni
  // ne lisait. Le carnet fonctionne identiquement avec ou sans réseau (M7), donc
  // il n'a rien à en dire — et surtout pas à inquiéter sur une perte de connexion
  // qui ne change rien pour lui.

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
          onRegisteredSW: (_url, enregistrement) => {
            if (enregistrement) this.#surveillerLesMisesAJour(enregistrement)
          },
        })
      })
      .catch(() => { /* pas de service worker en développement : sans conséquence */ })
  }

  /**
   * Le navigateur ne cherche une nouvelle version qu'au chargement de la page.
   * Une application installée reste ouverte des jours entiers : sans cette
   * vérification périodique, une correction publiée le lundi n'apparaîtrait que
   * le jour où l'on penserait à tout fermer.
   *
   * La requête ne part que si l'appareil se dit connecté, et son échec ne se
   * voit pas : c'est une vérification de version, pas un service dont dépend le
   * carnet.
   */
  #surveillerLesMisesAJour(enregistrement: ServiceWorkerRegistration): void {
    const verifier = () => {
      if (navigator.onLine === false) return
      enregistrement.update().catch(() => { /* hors ligne, ou serveur muet */ })
    }
    setInterval(verifier, INTERVALLE_VERIFICATION_MS)
    // Revenir à l'application après l'avoir laissée de côté est le moment le
    // plus probable pour découvrir qu'une version l'attend.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') verifier()
    })
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
