/**
 * Objectifs et progression (§ 7.4 et § 9).
 *
 * Un objectif porte sur **n'importe quel champ suivi**, pas seulement le poids :
 * `Objectif.champCle` le dit depuis le premier jour, et le § 9.1 (F4) le prévoit.
 * Ce module est donc écrit sans jamais nommer le poids. Les deux règles qui lui
 * sont propres — l'avertissement d'IMC (§ 12.2) et le seuil de rythme
 * hebdomadaire (F6) — relèvent de la physiologie du poids et restent
 * conditionnées à ce champ par leurs appelants.
 *
 * Deux familles cohabitent ici, et elles ne partagent aucun calcul.
 *
 * **Niveau** — la formule du cahier des charges, indifférente au sens de la marche :
 *
 *     progression = (initial − actuel) / (initial − cible) × 100
 *
 * Pour une prise de poids, numérateur et dénominateur changent de signe ensemble
 * et le résultat reste juste. C'est la raison pour laquelle le mode « reprise »
 * (F3) ne demande aucune formule séparée.
 *
 * **Régularité** — voir plus bas : un décompte d'occurrences, sans point de départ.
 */

import type {
  DateISO, DefinitionChamp, Mesure, Objectif, PeriodeRegularite, TypeChamp,
} from './types'
import { lireBooleen, lireNombre } from './types'
import { CLE_TAILLE } from './champs'
import { joursEntre } from './dates'
import { moyenneMobile, serie, type PointSerie } from './tendance'

/* ------------------------------------------------------------------ */
/* Quels champs peuvent porter quel objectif                           */
/* ------------------------------------------------------------------ */

export type FamilleObjectif = 'niveau' | 'regularite'

export function familleObjectif(type: Objectif['type']): FamilleObjectif {
  return type === 'regularite' ? 'regularite' : 'niveau'
}

/**
 * Un objectif de niveau suppose une valeur qui se compare et se parcourt : il
 * lui faut un nombre. Un objectif de régularité y ajoute le booléen — « faire du
 * renforcement musculaire deux fois par semaine » se compte très bien.
 *
 * Sont exclus des deux : `texte` et `choix` (aucun ordre entre les valeurs) et
 * `tension`, qui porte trois composantes dont aucune ne représente le champ à
 * elle seule. Le jour où un objectif de tension aura du sens, il visera une
 * composante nommée, pas le triplet.
 */
const TYPES_NIVEAU: readonly TypeChamp[] = ['nombre', 'duree', 'echelle5']
const TYPES_REGULARITE: readonly TypeChamp[] = ['nombre', 'duree', 'echelle5', 'booleen']

export function peutPorterObjectif(champ: DefinitionChamp, famille: FamilleObjectif): boolean {
  const types = famille === 'regularite' ? TYPES_REGULARITE : TYPES_NIVEAU
  return types.includes(champ.type)
}

/**
 * Vrai si le champ peut porter au moins une des deux familles.
 *
 * La taille en est écartée bien qu'elle soit un nombre : ce n'est pas une donnée
 * qu'on suit mais un attribut qu'on renseigne, et « viser 1,68 m » n'a pas de
 * sens. Le moteur la traite déjà à part ailleurs (`porteUneObservation`).
 */
export function estObjectivable(champ: DefinitionChamp): boolean {
  if (champ.cle === CLE_TAILLE) return false
  return peutPorterObjectif(champ, 'niveau') || peutPorterObjectif(champ, 'regularite')
}

/* ------------------------------------------------------------------ */
/* Objectif de niveau (F1, F2, F3)                                     */
/* ------------------------------------------------------------------ */

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

  // Un objectif de régularité ne se mesure pas sur un chemin parcouru (F4) :
  // il a son propre calcul, `evaluerRegularite`.
  if (o.type === 'regularite') return NON_CALCULABLE

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

/**
 * Le couple (départ, valeur actuelle) sur lequel se calcule la progression.
 *
 * Pour un poids ou un tour de taille, la dernière mesure fait l'affaire : la
 * valeur dérive lentement et une saisie isolée reste représentative. Pour une
 * échelle de 1 à 5, non — un mauvais jour de stress ferait reculer la jauge de
 * 40 % sans que rien n'ait changé. On lit donc la moyenne mobile, qui est déjà
 * ce que l'application affiche par-dessus la courbe (§ 5.3 v1.0).
 *
 * Le point de départ, lui, reste toujours la première valeur réellement notée :
 * c'est un fait de l'historique, il n'a pas à être lissé.
 */
export function valeursDeProgression(
  points: PointSerie[],
  champ: DefinitionChamp,
): { initiale: number | undefined; actuelle: number | undefined } {
  const initiale = points[0]?.valeur
  if (champ.type !== 'echelle5') {
    return { initiale, actuelle: points[points.length - 1]?.valeur }
  }
  const lisse = moyenneMobile(points)
  return { initiale, actuelle: lisse[lisse.length - 1]?.valeur }
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

/* ------------------------------------------------------------------ */
/* Objectif de régularité (F4, § 9.1)                                  */
/* ------------------------------------------------------------------ */

/**
 * « Dormir sept heures cinq nuits sur sept », « marcher trente minutes trois fois
 * par semaine ». Ce que compte cet objectif n'est pas un niveau atteint mais un
 * **nombre de fois**, sur une période glissante.
 *
 * Une seule difficulté, et elle commande tout le reste : **un jour sans saisie
 * n'est pas un jour sans marche.** Afficher « 2 fois sur 7 » alors que trois
 * jours seulement ont été notés affirme que quatre journées n'ont rien vu, quand
 * elles n'ont simplement pas été écrites. C'est très exactement ce que la règle 2
 * de la charte interdit — *une donnée absente n'est jamais zéro, jamais
 * interpolée, jamais traitée comme une erreur*.
 *
 * Le dénominateur est donc le nombre de jours **documentés**, jamais la longueur
 * de la période. « 2 fois sur les 3 jours notés » dit quelque chose de vrai ;
 * « 2/7 » dit quelque chose de faux, et fait porter à la personne une absence
 * qui n'est que celle du carnet.
 *
 * Pour la même raison il n'y a ici ni série à ne pas rompre, ni décompte de ce
 * qui manque : le § 9.3 a tranché que l'assiduité se constate et ne se réclame pas.
 */

export const JOURS_PERIODE: Record<PeriodeRegularite, number> = { semaine: 7, mois: 30 }

export interface Regularite {
  /** Jours de la période portant une valeur pour ce champ — le seul dénominateur honnête. */
  joursNotes: number
  /** Parmi eux, ceux qui remplissent la condition. */
  joursConformes: number
  occurrencesVisees: number
  periode: PeriodeRegularite
  /** Part du repère, bornée à 100. `null` tant qu'aucun jour n'est noté (règle 14). */
  pourcent: number | null
  repereAtteint: boolean
}

/**
 * `undefined` quand le champ n'est pas renseigné dans cette mesure : la journée
 * n'est alors ni conforme ni non conforme, elle est absente du décompte.
 */
function estConforme(
  mesure: Mesure,
  objectif: Objectif,
  champ: DefinitionChamp,
): boolean | undefined {
  if (champ.type === 'booleen') return lireBooleen(mesure, champ.cle)

  const v = lireNombre(mesure, champ.cle)
  if (v === undefined) return undefined

  // Bornes volontairement unilatérales : « au moins 7 h » ne renseigne que
  // `valeurMin`, et ne doit pas se voir inventer un plafond.
  const { valeurMin, valeurMax } = objectif
  if (valeurMin !== undefined && v < valeurMin) return false
  if (valeurMax !== undefined && v > valeurMax) return false
  return true
}

export function evaluerRegularite(
  mesures: Mesure[],
  objectif: Objectif,
  champ: DefinitionChamp,
  aujourdhui: DateISO,
): Regularite | undefined {
  const critere = objectif.regularite
  if (!critere || !peutPorterObjectif(champ, 'regularite')) return undefined
  if (!Number.isFinite(critere.occurrences) || critere.occurrences < 1) return undefined

  const jours = JOURS_PERIODE[critere.periode]

  // Une journée est conforme ou ne l'est pas : deux saisies le même jour ne
  // comptent pas deux fois. Il suffit que l'une remplisse la condition — avoir
  // marché le matin reste avoir marché, même si le soir n'a rien donné.
  const parJour = new Map<DateISO, boolean>()
  for (const m of mesures) {
    const ecart = joursEntre(m.date, aujourdhui)
    if (ecart < 0 || ecart >= jours) continue
    const conforme = estConforme(m, objectif, champ)
    if (conforme === undefined) continue
    parJour.set(m.date, (parJour.get(m.date) ?? false) || conforme)
  }

  const joursNotes = parJour.size
  const joursConformes = [...parJour.values()].filter(Boolean).length

  return {
    joursNotes,
    joursConformes,
    occurrencesVisees: critere.occurrences,
    periode: critere.periode,
    pourcent: joursNotes === 0 ? null : Math.min(100, (joursConformes / critere.occurrences) * 100),
    repereAtteint: joursConformes >= critere.occurrences,
  }
}

/* ------------------------------------------------------------------ */
/* Lecture d'ensemble                                                  */
/* ------------------------------------------------------------------ */

export interface SuiviObjectif {
  objectif: Objectif
  champ: DefinitionChamp
  /** Renseignée pour un objectif de niveau, `null` pour un objectif de régularité. */
  progression: Progression | null
  /** L'inverse. Les deux ne sont jamais renseignés ensemble. */
  regularite: Regularite | null
}

/**
 * Résout tous les objectifs actifs en une liste prête à afficher. C'est ici que
 * se règle, en un seul endroit, la question « que devient un objectif dont le
 * champ a été désactivé ? » : il se tait, sans être supprimé pour autant.
 * Réactiver le champ le fait réapparaître tel qu'il était.
 */
export function suivreObjectifs(
  objectifs: Objectif[],
  champs: DefinitionChamp[],
  mesures: Mesure[],
  aujourdhui: DateISO,
): SuiviObjectif[] {
  const suivis: SuiviObjectif[] = []

  for (const objectif of objectifs) {
    if (!objectif.actif) continue
    const champ = champs.find((c) => c.cle === objectif.champCle)
    if (!champ || !champ.actif) continue

    if (familleObjectif(objectif.type) === 'regularite') {
      const regularite = evaluerRegularite(mesures, objectif, champ, aujourdhui)
      if (regularite) suivis.push({ objectif, champ, progression: null, regularite })
      continue
    }

    const { initiale, actuelle } = valeursDeProgression(serie(mesures, champ.cle), champ)
    suivis.push({
      objectif,
      champ,
      progression: calculerProgression(objectif, initiale, actuelle),
      regularite: null,
    })
  }

  return suivis
}
