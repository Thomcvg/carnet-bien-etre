/**
 * IMC et lecture nuancée par l'âge (§ 7.1 et § 7.2).
 *
 * Le point délicat : la fourchette de référence de l'OMS est établie pour l'adulte
 * jusqu'à 65 ans environ. Au-delà, un IMC bas est un facteur de risque bien plus
 * préoccupant qu'un IMC légèrement élevé. La Haute Autorité de santé retient un IMC
 * inférieur à 22 comme critère de dénutrition chez la personne de 70 ans et plus.
 *
 * Afficher « maigreur » à une personne de 70 ans dont l'IMC est de 22 serait donc
 * à la fois faux et anxiogène. L'application relève la fourchette à partir de 65 ans.
 *
 * Le vocabulaire est positionnel — « sous », « dans », « au-dessus » de la fourchette —
 * et jamais qualificatif. On décrit une position sur une échelle, pas une personne (§ 12.1).
 */

/** Âge à partir duquel la fourchette de référence est relevée (§ 7.2). */
export const AGE_FOURCHETTE_RELEVEE = 65

export interface FourchetteImc {
  min: number
  max: number
  /** Origine du repère, affichée dans l'aide contextuelle (J10). */
  source: string
}

export const FOURCHETTE_ADULTE: FourchetteImc = {
  min: 18.5,
  max: 25,
  source: 'Organisation mondiale de la santé',
}

export const FOURCHETTE_APRES_65: FourchetteImc = {
  min: 22,
  max: 27,
  source: 'repère gériatrique — la Haute Autorité de santé retient un IMC inférieur à 22 '
    + 'comme critère de dénutrition à partir de 70 ans',
}

export function fourchetteReference(age?: number): FourchetteImc {
  return age !== undefined && age >= AGE_FOURCHETTE_RELEVEE
    ? FOURCHETTE_APRES_65
    : FOURCHETTE_ADULTE
}

/**
 * `IMC = poids / taille²`, taille en mètres.
 * Retourne `undefined` plutôt que zéro si une donnée manque (règle 14).
 */
export function calculerImc(poidsKg?: number, tailleCm?: number): number | undefined {
  if (poidsKg === undefined || tailleCm === undefined) return undefined
  if (!Number.isFinite(poidsKg) || !Number.isFinite(tailleCm)) return undefined
  if (poidsKg <= 0 || tailleCm <= 0) return undefined
  const m = tailleCm / 100
  return poidsKg / (m * m)
}

export type PositionImc = 'sous' | 'dans' | 'au-dessus'

export interface LectureImc {
  imc: number
  fourchette: FourchetteImc
  position: PositionImc
  /** Formulation neutre, sans terme de jugement. */
  libelle: string
  /**
   * Vrai si l'IMC passe sous la borne basse. Déclenche une invitation
   * bienveillante à en parler, jamais une alerte (§ 9.5, § 10.4).
   */
  vigilanceBasse: boolean
  /** Vrai si la lecture a pu tenir compte de l'âge. */
  ageConnu: boolean
}

const LIBELLES: Record<PositionImc, string> = {
  sous: 'sous la fourchette de référence',
  dans: 'dans la fourchette de référence',
  'au-dessus': 'au-dessus de la fourchette de référence',
}

export function lireImc(imc: number, age?: number): LectureImc {
  const fourchette = fourchetteReference(age)
  const position: PositionImc =
    imc < fourchette.min ? 'sous' : imc > fourchette.max ? 'au-dessus' : 'dans'

  return {
    imc,
    fourchette,
    position,
    libelle: LIBELLES[position],
    vigilanceBasse: position === 'sous',
    ageConnu: age !== undefined,
  }
}

/**
 * Fourchette de poids correspondant à la fourchette d'IMC de référence (A8).
 * Présentée comme une zone, jamais comme un chiffre unique.
 */
export function poidsDeReference(
  tailleCm?: number,
  age?: number,
): { min: number; max: number } | undefined {
  if (tailleCm === undefined || !Number.isFinite(tailleCm) || tailleCm <= 0) return undefined
  const m = tailleCm / 100
  const f = fourchetteReference(age)
  return { min: f.min * m * m, max: f.max * m * m }
}

/**
 * Ratio tour de taille / stature (A5). Seuil de référence 0,5 :
 * garder son tour de taille sous la moitié de sa taille.
 * Prédicteur cardiométabolique plus fiable que l'IMC, et calculable de tête.
 */
export const SEUIL_RATIO_TAILLE_STATURE = 0.5

export function ratioTailleStature(
  tourTailleCm?: number,
  tailleCm?: number,
): number | undefined {
  if (tourTailleCm === undefined || tailleCm === undefined) return undefined
  if (!Number.isFinite(tourTailleCm) || !Number.isFinite(tailleCm)) return undefined
  if (tourTailleCm <= 0 || tailleCm <= 0) return undefined
  return tourTailleCm / tailleCm
}

/** L'IMC s'affiche à une décimale (§ 9 v1.0). */
export function formaterImc(imc: number): string {
  return imc.toFixed(1).replace('.', ',')
}
