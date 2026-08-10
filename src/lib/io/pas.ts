/**
 * Import des pas depuis Health Connect (E7, § 15.1).
 *
 * Exclusivité de l'application Android : les interfaces de santé du système sont
 * inaccessibles à une page web, et le § 15.1 demande de le présenter comme tel
 * plutôt que d'offrir un bouton qui échoue. Le repli est la saisie manuelle du
 * champ `pas`, qui existe indépendamment de tout ceci.
 *
 * Rien ne part de l'appareil : les pas viennent d'un service local du téléphone
 * et rejoignent le carnet comme s'ils avaient été tapés à la main.
 */

import { Capacitor, registerPlugin } from '@capacitor/core'
import type { DateISO } from '../domain/types'

export type EtatPas = 'disponible' | 'mise-a-jour-requise' | 'indisponible'

export interface JourneeDePas {
  date: DateISO
  pas: number
}

interface GreffonPas {
  etat(): Promise<{ etat: EtatPas; autorise: boolean }>
  demanderAcces(): Promise<{ autorise: boolean }>
  lire(options: { debut: DateISO; fin: DateISO }): Promise<{ jours: JourneeDePas[] }>
}

const greffon = registerPlugin<GreffonPas>('Pas')

/** Faux hors de l'application Android : inutile d'aller plus loin. */
export function importPasPossible(): boolean {
  return Capacitor.getPlatform() === 'android'
}

export async function etatPas(): Promise<{ etat: EtatPas; autorise: boolean }> {
  if (!importPasPossible()) return { etat: 'indisponible', autorise: false }
  try {
    return await greffon.etat()
  } catch {
    return { etat: 'indisponible', autorise: false }
  }
}

export async function demanderAccesPas(): Promise<boolean> {
  if (!importPasPossible()) return false
  try {
    return (await greffon.demanderAcces()).autorise
  } catch {
    return false
  }
}

export class PasIndisponiblesError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PasIndisponiblesError'
  }
}

/**
 * Totaux quotidiens entre deux dates incluses. Les journées sans donnée sont
 * absentes du résultat — jamais ramenées à zéro (règle 5) : une journée non
 * mesurée n'est pas une journée sans marche.
 */
export async function lirePas(debut: DateISO, fin: DateISO): Promise<JourneeDePas[]> {
  if (!importPasPossible()) {
    throw new PasIndisponiblesError(
      'La lecture des pas n’existe que dans l’application Android.',
    )
  }
  try {
    const { jours } = await greffon.lire({ debut, fin })
    return jours
      .filter((j) => Number.isFinite(j.pas) && j.pas > 0)
      .sort((a, b) => a.date.localeCompare(b.date))
  } catch (e) {
    throw new PasIndisponiblesError(
      e instanceof Error && e.message ? e.message : 'La lecture des pas a échoué.',
    )
  }
}
