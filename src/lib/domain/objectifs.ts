/**
 * Objectifs et progression (§ 7.4 et § 9).
 *
 * La formule du cahier des charges est indifférente au sens de la marche :
 *
 *     progression = (initial − actuel) / (initial − cible) × 100
 *
 * Pour une prise de poids, numérateur et dénominateur changent de signe ensemble
 * et le résultat reste juste. C'est la raison pour laquelle le mode « reprise »
 * (F3) ne demande aucune formule séparée.
 */

import type { Objectif } from './types'

export interface Progression {
  /** Pourcentage borné à [0, 100] pour l'affichage (§ 5.2 v1.0). */
  pourcent: number | null
  /** Valeur à atteindre, une fois la fourchette résolue. */
  cible: number | null
  /** Distance restante, toujours positive. */
  restant: number | null
  atteint: boolean
  /** Uniquement pour les objectifs de type fourchette ou maintien. */
  dansLaFourchette: boolean | null
}

const NON_CALCULABLE: Progression = {
  pourcent: null,
  cible: null,
  restant: null,
  atteint: false,
  dansLaFourchette: null,
}

function bornes(o: Objectif): { min: number; max: number } | undefined {
  const { valeurMin, valeurMax } = o
  if (valeurMin === undefined && valeurMax === undefined) return undefined
  const a = valeurMin ?? valeurMax
  const b = valeurMax ?? valeurMin
  if (a === undefined || b === undefined) return undefined
  return { min: Math.min(a, b), max: Math.max(a, b) }
}

/**
 * Résout la valeur visée.
 * Pour une fourchette, c'est la borne la plus proche de la valeur actuelle (§ 7.4) :
 * quelqu'un qui vise « entre 61 et 64 kg » et pèse 70 kg vise d'abord 64.
 */
export function cibleEffective(o: Objectif, actuelle: number): number | undefined {
  const b = bornes(o)
  if (!b) return undefined
  if (o.type === 'cible') return b.min === b.max ? b.min : b.min
  if (actuelle >= b.min && actuelle <= b.max) return actuelle
  return Math.abs(actuelle - b.min) <= Math.abs(actuelle - b.max) ? b.min : b.max
}

export function calculerProgression(
  o: Objectif,
  initiale: number | undefined,
  actuelle: number | undefined,
): Progression {
  if (initiale === undefined || actuelle === undefined) return NON_CALCULABLE
  if (!Number.isFinite(initiale) || !Number.isFinite(actuelle)) return NON_CALCULABLE

  const b = bornes(o)
  if (!b) return NON_CALCULABLE

  const dansLaFourchette = actuelle >= b.min && actuelle <= b.max

  // Un objectif de maintien n'a pas de progression : on est dedans, ou on ne l'est pas.
  if (o.type === 'maintien') {
    return {
      pourcent: null,
      cible: null,
      restant: dansLaFourchette
        ? 0
        : Math.min(Math.abs(actuelle - b.min), Math.abs(actuelle - b.max)),
      atteint: dansLaFourchette,
      dansLaFourchette,
    }
  }

  // Un objectif comportemental ne se mesure pas sur une échelle de poids (F4).
  if (o.type === 'comportemental') return NON_CALCULABLE

  const cible = cibleEffective(o, actuelle)
  if (cible === undefined) return NON_CALCULABLE

  // Sens de la marche, déduit du point de départ.
  const versLeBas = initiale > b.max
  const versLeHaut = initiale < b.min
  const atteint = o.type === 'fourchette'
    ? dansLaFourchette || (versLeBas && actuelle <= b.max) || (versLeHaut && actuelle >= b.min)
    : (initiale > cible && actuelle <= cible) || (initiale < cible && actuelle >= cible)

  const denominateur = initiale - cible

  // Départ confondu avec l'objectif : rien à parcourir, donc rien à calculer (règle 14).
  if (denominateur === 0) {
    return {
      pourcent: null,
      cible,
      restant: 0,
      atteint: true,
      dansLaFourchette: o.type === 'fourchette' ? dansLaFourchette : null,
    }
  }

  const brut = ((initiale - actuelle) / denominateur) * 100

  return {
    pourcent: Math.max(0, Math.min(100, brut)),
    cible,
    restant: Math.abs(actuelle - cible),
    atteint,
    dansLaFourchette: o.type === 'fourchette' ? dansLaFourchette : null,
  }
}

/* ------------------------------------------------------------------ */
/* Largeur d'une fourchette (§ 9.1)                                    */
/* ------------------------------------------------------------------ */

/**
 * La fourchette est recommandée parce qu'elle évite d'échouer à 63,2 kg quand la
 * cible est « entre 61 et 64 ». Mais elle a une limite que le § 9.1 ne dit pas :
 * **une fourchette plus large que le chemin à parcourir se referme d'elle-même.**
 *
 * Quelqu'un à 75 kg qui vise 70 avec une fourchette de 5 kg (67,5–72,5) atteint
 * sa borne haute à 72,5 — soit la moitié du chemin — et l'application lui annonce
 * « objectif atteint ». La fourchette a mangé l'objectif.
 *
 * On compare donc la largeur à la distance restante jusqu'à la borne la plus
 * proche. Comme partout ailleurs (F6, A26), c'est un signalement : rien n'empêche
 * de valider une fourchette large si c'est un choix assumé.
 */
export interface LargeurFourchette {
  largeur: number
  /** Distance du poids actuel à la borne la plus proche — le chemin réellement à faire. */
  distance: number
  tropLarge: boolean
}

export function evaluerLargeurFourchette(
  actuelle: number | undefined,
  min: number,
  max: number,
): LargeurFourchette | undefined {
  if (actuelle === undefined || !Number.isFinite(actuelle)) return undefined
  if (!Number.isFinite(min) || !Number.isFinite(max)) return undefined

  // Déjà dans la fourchette : il n'y a pas de chemin à parcourir, donc pas de
  // raccourci possible. C'est un maintien, pas un objectif que la largeur fausse.
  if (actuelle >= min && actuelle <= max) return undefined

  const largeur = max - min
  if (largeur <= 0) return undefined

  const distance = Math.min(Math.abs(actuelle - min), Math.abs(actuelle - max))

  return { largeur, distance, tropLarge: largeur > distance }
}

/* ------------------------------------------------------------------ */
/* Rythme d'un objectif daté (F6)                                      */
/* ------------------------------------------------------------------ */

/**
 * Au-delà d'environ 1 % du poids par semaine, le rythme visé devient
 * difficilement tenable. L'application le signale ; elle n'empêche jamais de valider.
 */
export const RYTHME_HEBDO_INCONFORTABLE = 0.01

export interface RythmeVise {
  /** Fraction du poids actuel à faire évoluer par semaine. */
  fractionHebdo: number
  /** Valeur absolue à faire évoluer par semaine, en unité du champ. */
  parSemaine: number
  semaines: number
  inconfortable: boolean
}

export function rythmeVise(
  actuelle: number,
  cible: number,
  joursRestants: number,
): RythmeVise | undefined {
  if (!Number.isFinite(actuelle) || !Number.isFinite(cible)) return undefined
  if (joursRestants <= 0 || actuelle <= 0) return undefined

  const semaines = joursRestants / 7
  const parSemaine = Math.abs(actuelle - cible) / semaines
  const fractionHebdo = parSemaine / actuelle

  return {
    fractionHebdo,
    parSemaine,
    semaines,
    inconfortable: fractionHebdo > RYTHME_HEBDO_INCONFORTABLE,
  }
}

/**
 * Projection au rythme observé : à quelle date la cible serait atteinte
 * si la tendance récente se poursuivait. Retourne `undefined` si la tendance
 * s'éloigne de l'objectif — auquel cas on n'affiche rien plutôt qu'une date absurde.
 */
export function joursJusquACible(
  actuelle: number,
  cible: number,
  variationParJour: number,
): number | undefined {
  if (variationParJour === 0 || !Number.isFinite(variationParJour)) return undefined
  const ecart = cible - actuelle
  if (ecart === 0) return 0
  const jours = ecart / variationParJour
  return jours > 0 && Number.isFinite(jours) ? Math.round(jours) : undefined
}
