/**
 * Bilan par champ (§ 5.5 et § 14 v1.0).
 *
 * Règle 14 : si une extrémité manque, on ne calcule rien et on n'affiche rien.
 * Pas de tiret, pas de zéro, pas de « — » qui laisserait croire à une valeur nulle.
 */

import type { Mesure } from './types'
import { serie, type PointSerie } from './tendance'
import { joursEntre } from './dates'

export interface BilanChamp {
  cle: string
  premiere: PointSerie | null
  derniere: PointSerie | null
  minimum: PointSerie | null
  maximum: PointSerie | null
  /** Dernière valeur moins première valeur. `null` si l'une des deux manque. */
  evolution: number | null
  nombreMesures: number
}

export function bilanChamp(mesures: Mesure[], cle: string): BilanChamp {
  const points = serie(mesures, cle)

  const premiere = points[0] ?? null
  const derniere = points[points.length - 1] ?? null

  let minimum: PointSerie | null = null
  let maximum: PointSerie | null = null
  for (const p of points) {
    if (!minimum || p.valeur < minimum.valeur) minimum = p
    if (!maximum || p.valeur > maximum.valeur) maximum = p
  }

  // Une seule mesure ne constitue pas une évolution.
  const evolution =
    premiere && derniere && points.length >= 2 ? derniere.valeur - premiere.valeur : null

  return {
    cle,
    premiere,
    derniere,
    minimum,
    maximum,
    evolution,
    nombreMesures: points.length,
  }
}

/** Dernière valeur connue d'un champ, quelle que soit la mesure qui la porte. */
export function derniereValeur(mesures: Mesure[], cle: string): PointSerie | undefined {
  const points = serie(mesures, cle)
  return points[points.length - 1]
}

/**
 * Valeur d'un champ la plus proche d'une date donnée.
 * Sert notamment à l'IMC : la taille est un champ suivi (A4), et l'IMC d'une
 * mesure de 2026 doit utiliser la taille de 2026, pas celle saisie en 2031.
 */
export function valeurLaPlusProche(
  mesures: Mesure[],
  cle: string,
  date: string,
): number | undefined {
  const points = serie(mesures, cle)
  if (points.length === 0) return undefined

  let meilleure: PointSerie | undefined
  let ecartMin = Number.POSITIVE_INFINITY

  for (const p of points) {
    // `joursEntre` plutôt que `new Date(iso)` : ce dernier interprète la date en
    // UTC alors que tout le reste du carnet raisonne en heure locale.
    const ecart = Math.abs(joursEntre(p.date, date))
    if (ecart < ecartMin) {
      ecartMin = ecart
      meilleure = p
    }
  }
  return meilleure?.valeur
}
