/**
 * État de la synchronisation WebDAV (L8, § 11.7).
 *
 * Volontairement **manuelle** : deux gestes, envoyer et récupérer. Un envoi
 * automatique après chaque saisie supposerait de résoudre une divergence sans
 * personne pour trancher, c'est-à-dire exactement la fusion silencieuse que le
 * § 11.7 refuse. Deux boutons et une date de dernier échange disent la vérité ;
 * une roue qui tourne toute seule la cacherait.
 *
 * Les identifiants vivent dans `parametresLocaux` — propres à l'appareil, hors
 * de l'export JSON. Voir le commentaire de `ParametreWebdav` dans `db.ts`.
 */

import { base } from '../db/db'
import type { Carnet } from '../domain/types'
import { evaluerDivergence, type Divergence } from '../domain/synchro'
import { depuisJson, versJson } from '../io/sauvegarde'
import {
  envoyer as envoyerFichier,
  recuperer as recupererFichier,
  synchroDisponible,
  WebdavError,
  type ConfigWebdav,
} from '../io/webdav'

const ID = 'webdav' as const

/** Ce qu'on montre quand deux appareils ne sont pas d'accord. */
export interface DivergenceConstatee {
  motif: Divergence
  distant: Carnet
  nbMesuresDistantes: number
  nbMesuresLocales: number
}

class EtatWebdav {
  /**
   * Faux dans la PWA : la requête y serait bloquée par la politique d'origine.
   * Lu à chaque fois plutôt que figé à la construction, pour qu'une vérification
   * puisse installer son transport après le chargement du module.
   */
  get disponible(): boolean { return synchroDisponible() }

  configuree = $state(false)
  urlDossier = $state('')
  identifiant = $state('')
  nomFichier = $state('carnet-bien-etre.json')
  derniereReussite = $state<string | undefined>(undefined)

  occupe = $state(false)
  message = $state<{ ton: 'ok' | 'probleme'; texte: string } | null>(null)
  divergence = $state<DivergenceConstatee | null>(null)

  #motDePasse = ''
  #versionSynchronisee: string | undefined = undefined

  #config(): ConfigWebdav {
    return {
      urlDossier: this.urlDossier,
      identifiant: this.identifiant,
      motDePasse: this.#motDePasse,
      nomFichier: this.nomFichier,
    }
  }

  async charger(): Promise<void> {
    const p = await base.parametresLocaux.get(ID)
    if (!p || p.id !== 'webdav') return
    this.urlDossier = p.urlDossier
    this.identifiant = p.identifiant
    this.nomFichier = p.nomFichier
    this.derniereReussite = p.derniereReussite
    this.#motDePasse = p.motDePasse
    this.#versionSynchronisee = p.versionSynchronisee
    this.configuree = true
  }

  async #ecrire(): Promise<void> {
    await base.parametresLocaux.put({
      id: ID,
      urlDossier: this.urlDossier,
      identifiant: this.identifiant,
      motDePasse: this.#motDePasse,
      nomFichier: this.nomFichier,
      versionSynchronisee: this.#versionSynchronisee,
      derniereReussite: this.derniereReussite,
    })
  }

  async configurer(c: ConfigWebdav): Promise<void> {
    this.urlDossier = c.urlDossier.trim()
    this.identifiant = c.identifiant.trim()
    this.nomFichier = c.nomFichier.trim() || 'carnet-bien-etre.json'
    this.#motDePasse = c.motDePasse
    // Changer de serveur, de compte ou de fichier : ce qu'on croyait savoir du
    // contenu distant ne vaut plus rien.
    this.#versionSynchronisee = undefined
    this.derniereReussite = undefined
    this.configuree = true
    this.message = null
    await this.#ecrire()
  }

  async oublier(): Promise<void> {
    await base.parametresLocaux.delete(ID)
    this.configuree = false
    this.urlDossier = ''
    this.identifiant = ''
    this.#motDePasse = ''
    this.#versionSynchronisee = undefined
    this.derniereReussite = undefined
    this.divergence = null
    this.message = null
  }

  /**
   * Envoie le carnet. Regarde d'abord ce qui se trouve sur le serveur : si ce
   * n'est pas ce que cet appareil y a laissé, on s'arrête et on demande.
   * `forcer` reprend la main après ce choix.
   */
  async envoyer(carnet: Carnet, options: { forcer?: boolean } = {}): Promise<void> {
    if (!this.configuree || this.occupe) return
    this.occupe = true
    this.message = null
    try {
      if (!options.forcer) {
        const distantBrut = await recupererFichier(this.#config())
        const distant = distantBrut === null ? null : this.#lire(distantBrut)
        const motif = evaluerDivergence(distant?.exporteLe, this.#versionSynchronisee)
        if (motif !== 'aucune' && distant) {
          this.divergence = {
            motif,
            distant,
            nbMesuresDistantes: distant.mesures.length,
            nbMesuresLocales: carnet.mesures.length,
          }
          return
        }
      }

      const contenu = versJson(carnet)
      await envoyerFichier(this.#config(), contenu)
      this.#versionSynchronisee = carnet.exporteLe
      this.derniereReussite = new Date().toISOString()
      this.divergence = null
      this.message = { ton: 'ok', texte: 'Carnet envoyé sur le serveur.' }
      await this.#ecrire()
    } catch (e) {
      this.message = { ton: 'probleme', texte: this.#raison(e) }
    } finally {
      this.occupe = false
    }
  }

  /**
   * Rapporte le carnet distant **sans rien écrire** : c'est l'écran appelant qui
   * le confirme, comme pour une restauration de fichier. Récupérer remplace tout.
   */
  async recuperer(): Promise<Carnet | null> {
    if (!this.configuree || this.occupe) return null
    this.occupe = true
    this.message = null
    try {
      const brut = await recupererFichier(this.#config())
      if (brut === null) {
        this.message = { ton: 'probleme', texte: 'Aucun carnet n’a encore été déposé sur ce serveur.' }
        return null
      }
      return this.#lire(brut)
    } catch (e) {
      this.message = { ton: 'probleme', texte: this.#raison(e) }
      return null
    } finally {
      this.occupe = false
    }
  }

  /** À appeler une fois la récupération réellement appliquée au carnet local. */
  async marquerRecupere(carnet: Carnet): Promise<void> {
    this.#versionSynchronisee = carnet.exporteLe
    this.derniereReussite = new Date().toISOString()
    this.divergence = null
    this.message = { ton: 'ok', texte: 'Carnet récupéré depuis le serveur.' }
    await this.#ecrire()
  }

  annulerDivergence(): void {
    this.divergence = null
  }

  #lire(brut: string): Carnet {
    try {
      return depuisJson(brut)
    } catch {
      throw new WebdavError(
        'Le fichier trouvé sur le serveur n’est pas un carnet lisible par cette version.',
      )
    }
  }

  #raison(e: unknown): string {
    if (e instanceof WebdavError) return e.message
    return 'La synchronisation n’a pas abouti.'
  }
}

export const webdav = new EtatWebdav()
