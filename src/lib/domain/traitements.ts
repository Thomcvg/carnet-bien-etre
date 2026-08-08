/**
 * Traitements en cours (B4, § 10.2).
 */

import type { DateISO, Traitement } from './types'

/** Un traitement est « en cours » à une date s'il a commencé et n'est pas terminé. */
export function traitementEnCours(t: Traitement, date: DateISO): boolean {
  if (date < t.debut) return false
  return t.fin === undefined || date <= t.fin
}

export function traitementsEnCours(traitements: Traitement[], date: DateISO): Traitement[] {
  return traitements.filter((t) => traitementEnCours(t, date))
}

export function formaterDosage(t: Traitement): string {
  return t.dosage ? `${t.nom} — ${t.dosage}` : t.nom
}
