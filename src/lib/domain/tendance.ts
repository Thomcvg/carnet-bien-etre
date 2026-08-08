/**
 * Séries, tendance et lecture du bruit (§ 7.3, § 8.2, § 9.5).
 *
 * Deux principes que le code doit tenir :
 *  - une mesure absente est sautée, jamais interpolée ni remplacée par zéro
 *    (§ 12 v1.0, règle 5) ;
 *  - une variation inférieure à la fluctuation physiologique normale est
 *    présentée comme une stabilité, pas comme une hausse ou une baisse (G21).
 */

import type { DateISO, Mesure } from './types'
import { lireNombre } from './types'
import { joursEntre, moisDe } from './dates'

/** Fluctuation quotidienne normale du poids corporel, en kilogrammes (A32). */
export const BANDE_INCERTITUDE_KG = 1
export const FENETRE_MOYENNE_MOBILE = 3

export interface PointSerie {
  date: DateISO
  valeur: number
}

/**
 * Ordre chronologique de deux mesures : la date, puis l'heure quand elle existe.
 *
 * Sans ce second critère, deux pesées du même jour (A29) s'ordonnent selon leur
 * ordre d'insertion — et « la dernière valeur » devient arbitraire.
 */
export function comparerMesures(a: Mesure, b: Mesure): number {
  return a.date.localeCompare(b.date) || (a.moment ?? '').localeCompare(b.moment ?? '')
}

/**
 * Extrait la série d'un champ, triée chronologiquement.
 * Les mesures où le champ n'est pas renseigné sont absentes de la série :
 * la courbe saute le point, elle ne descend pas à zéro.
 */
export function serie(mesures: Mesure[], cle: string): PointSerie[] {
  const points: PointSerie[] = []
  // Le tri porte sur les mesures, pas sur les points : `PointSerie` ne garde pas
  // l'heure, et deux pesées du même jour ne pourraient plus être départagées après.
  for (const m of [...mesures].sort(comparerMesures)) {
    const v = lireNombre(m, cle)
    if (v !== undefined) points.push({ date: m.date, valeur: v })
  }
  return points
}

/**
 * Moyenne mobile sur les `fenetre` derniers points disponibles.
 * Lisse les fluctuations sans jamais masquer les valeurs réelles,
 * qui restent affichées par-dessus (§ 5.3 v1.0).
 */
export function moyenneMobile(
  points: PointSerie[],
  fenetre = FENETRE_MOYENNE_MOBILE,
): PointSerie[] {
  if (fenetre < 1) return []
  const sortie: PointSerie[] = []
  for (let i = 0; i < points.length; i++) {
    const debut = Math.max(0, i - fenetre + 1)
    let somme = 0
    let n = 0
    for (let j = debut; j <= i; j++) {
      const p = points[j]
      if (p) {
        somme += p.valeur
        n++
      }
    }
    const courant = points[i]
    if (courant && n > 0) sortie.push({ date: courant.date, valeur: somme / n })
  }
  return sortie
}

/** Vrai si l'écart tient dans la fluctuation normale : à présenter comme stable. */
export function estDansLeBruit(delta: number, bande = BANDE_INCERTITUDE_KG): boolean {
  return Math.abs(delta) < bande
}

export type SensEvolution = 'hausse' | 'baisse' | 'stable'

export function sensEvolution(delta: number, bande = BANDE_INCERTITUDE_KG): SensEvolution {
  if (estDansLeBruit(delta, bande)) return 'stable'
  return delta > 0 ? 'hausse' : 'baisse'
}

/** Variation moyenne par jour sur les `n` derniers points, pour la projection (F7). */
export function variationParJour(points: PointSerie[], n = 3): number | undefined {
  const derniers = points.slice(-Math.max(2, n))
  const premier = derniers[0]
  const dernier = derniers[derniers.length - 1]
  if (!premier || !dernier) return undefined
  const jours = joursEntre(premier.date, dernier.date)
  if (jours <= 0) return undefined
  return (dernier.valeur - premier.valeur) / jours
}

/* ------------------------------------------------------------------ */
/* Perte trop rapide (B11, § 9.5)                                      */
/* ------------------------------------------------------------------ */

/** Au-delà d'environ 1 % du poids par semaine, il vaut la peine d'en parler. */
export const SEUIL_PERTE_HEBDO = 0.01

export interface AlertePerte {
  /** Fraction du poids perdue par semaine sur la période observée. */
  fractionHebdo: number
  depuis: DateISO
  intervallesConcernes: number
}

/**
 * Signale une perte soutenue au-delà du seuil, sur au moins deux intervalles
 * consécutifs — un seul écart peut n'être qu'une variation d'eau ou une pesée
 * dans d'autres conditions.
 *
 * Le message associé est informatif et bienveillant : il invite à en parler
 * à un professionnel, il n'alarme pas et ne bloque rien.
 */
export function detecterPerteRapide(
  points: PointSerie[],
  seuilHebdo = SEUIL_PERTE_HEBDO,
): AlertePerte | undefined {
  if (points.length < 3) return undefined

  const derniers = points.slice(-3)
  const concernes: { depuis: DateISO; fraction: number }[] = []

  for (let i = 1; i < derniers.length; i++) {
    const a = derniers[i - 1]
    const b = derniers[i]
    if (!a || !b) return undefined
    const jours = joursEntre(a.date, b.date)
    if (jours <= 0 || a.valeur <= 0) return undefined
    const perte = a.valeur - b.valeur
    if (perte <= 0) return undefined
    const fractionHebdo = (perte / a.valeur) / (jours / 7)
    if (fractionHebdo <= seuilHebdo) return undefined
    concernes.push({ depuis: a.date, fraction: fractionHebdo })
  }

  const premier = concernes[0]
  if (concernes.length < 2 || !premier) return undefined

  const moyenne = concernes.reduce((s, c) => s + c.fraction, 0) / concernes.length
  return {
    fractionHebdo: moyenne,
    depuis: premier.depuis,
    intervallesConcernes: concernes.length,
  }
}

/* ------------------------------------------------------------------ */
/* Variations mensuelles (G5)                                          */
/* ------------------------------------------------------------------ */

export interface VariationMensuelle {
  mois: string
  delta: number
  valeurFin: number
}

/**
 * Écart d'un mois sur l'autre, calculé entre les dernières valeurs connues
 * de chaque mois. Les mois sans mesure sont simplement absents du résultat.
 */
export function variationsMensuelles(points: PointSerie[]): VariationMensuelle[] {
  const parMois = new Map<string, PointSerie>()
  for (const p of points) parMois.set(moisDe(p.date), p) // la série est triée : le dernier gagne

  const mois = [...parMois.keys()].sort()
  const sortie: VariationMensuelle[] = []

  for (let i = 1; i < mois.length; i++) {
    const cleMois = mois[i]
    const clePrecedent = mois[i - 1]
    if (!cleMois || !clePrecedent) continue
    const courant = parMois.get(cleMois)
    const precedent = parMois.get(clePrecedent)
    if (!courant || !precedent) continue
    sortie.push({
      mois: cleMois,
      delta: courant.valeur - precedent.valeur,
      valeurFin: courant.valeur,
    })
  }
  return sortie
}
