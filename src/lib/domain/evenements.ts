/**
 * Événements de contexte (G3, C14) — § 4 et § 17 (lot 2).
 *
 * Le modèle et la gestion de base arrivent au lot 2 ; l'annotation visuelle sur
 * les courbes (G3) est un raffinement du lot 3. Ces fonctions restent pures et
 * ne présument pas de la manière dont elles seront affichées plus tard.
 */

import type { DateISO, Evenement } from './types'

export function trierEvenements(evenements: Evenement[]): Evenement[] {
  return [...evenements].sort((a, b) => a.dateDebut.localeCompare(b.dateDebut))
}

/**
 * Vrai si une date tombe dans la période de l'événement, bornes incluses.
 * Sans date de fin, l'événement ne couvre que son jour de départ — comme dans
 * un calendrier, l'absence de fin signifie « ponctuel », pas « et pour toujours ».
 * Pour un événement réellement ouvert (une retraite, un arrêt d'activité), on
 * saisit une date de fin lointaine plutôt que de la laisser vide.
 */
export function evenementCouvre(e: Evenement, date: DateISO): boolean {
  if (date < e.dateDebut) return false
  const fin = e.dateFin ?? e.dateDebut
  return date <= fin
}

/** Les événements dont la période croise, même partiellement, l'intervalle donné. */
export function evenementsSurPeriode(
  evenements: Evenement[],
  debut: DateISO,
  fin: DateISO,
): Evenement[] {
  return trierEvenements(evenements).filter((e) => {
    const finEvenement = e.dateFin ?? e.dateDebut
    return e.dateDebut <= fin && finEvenement >= debut
  })
}

const LIBELLES_TYPE: Record<Evenement['type'], string> = {
  personnel: 'Personnel',
  sante: 'Santé',
  activite: 'Activité',
  autre: 'Autre',
}

export function libelleType(type: Evenement['type']): string {
  return LIBELLES_TYPE[type]
}
