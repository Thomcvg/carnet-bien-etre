/**
 * État de la sauvegarde automatique (L7, § 11.6).
 *
 * Une seule ligne en base (`parametresLocaux`), un seul fichier choisi une
 * fois. L'écriture elle-même est déclenchée depuis App.svelte, par un effet
 * qui observe l'ensemble des données du carnet plutôt que d'instrumenter
 * chaque méthode de mutation une par une.
 */

import { base } from '../db/db'
import { estDisponible, choisirFichier, permissionEcriture, ecrireDans } from '../io/sauvegardeAuto'
import { versJson } from '../io/sauvegarde'
import type { Carnet } from '../domain/types'

const ID = 'sauvegarde-auto' as const

class EtatSauvegardeAuto {
  readonly disponible = estDisponible()
  activee = $state(false)
  nomFichier = $state<string | undefined>(undefined)
  derniereEcriture = $state<Date | null>(null)
  erreur = $state<string | null>(null)

  #handle: FileSystemFileHandle | undefined

  async charger(): Promise<void> {
    if (!this.disponible) return
    const p = await base.parametresLocaux.get(ID)
    if (p?.id === 'sauvegarde-auto' && p.activee && p.handle) {
      this.#handle = p.handle
      this.activee = true
      this.nomFichier = p.handle.name
    }
  }

  async activer(nomSuggere: string): Promise<boolean> {
    if (!this.disponible) return false
    const handle = await choisirFichier(nomSuggere)
    if (!handle) return false

    this.#handle = handle
    this.activee = true
    this.nomFichier = handle.name
    this.erreur = null
    await base.parametresLocaux.put({ id: ID, activee: true, handle })
    return true
  }

  async desactiver(): Promise<void> {
    this.#handle = undefined
    this.activee = false
    this.nomFichier = undefined
    await base.parametresLocaux.put({ id: ID, activee: false })
  }

  /** Écrit l'état courant du carnet dans le fichier choisi, si l'autorisation tient toujours. */
  async ecrire(carnet: Carnet): Promise<void> {
    if (!this.activee || !this.#handle) return
    try {
      const autorise = await permissionEcriture(this.#handle)
      if (!autorise) {
        this.erreur = "L'autorisation d'écrire dans le fichier a été retirée. Choisissez-le à nouveau."
        this.activee = false
        return
      }
      await ecrireDans(this.#handle, versJson(carnet))
      this.derniereEcriture = new Date()
      this.erreur = null
    } catch {
      this.erreur = "L'écriture automatique a échoué. Vos données restent disponibles ; exportez-les manuellement si besoin."
    }
  }
}

export const sauvegardeAuto = new EtatSauvegardeAuto()
