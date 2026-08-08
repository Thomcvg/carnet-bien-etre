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

/**
 * Traitements en cours dont un rappel de prise a été demandé (B6, K12).
 *
 * Une PWA ne peut pas programmer une notification à heure fixe hors de
 * l'application (§ 15.1) : le repli assumé est un rappel affiché à l'ouverture.
 * Ce qui suppose de l'afficher — la case était cochée, l'heure enregistrée, et
 * rien n'arrivait jamais.
 */
export function rappelsDuJour(traitements: Traitement[], date: DateISO): Traitement[] {
  return traitementsEnCours(traitements, date).filter(
    (t) => t.rappelActif && t.heuresRappel.length > 0,
  )
}
