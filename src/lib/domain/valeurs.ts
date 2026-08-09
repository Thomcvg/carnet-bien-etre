/**
 * Mise en forme d'une valeur de mesure — § 6.2, § 12.1.
 *
 * Trois écrans montrent les mêmes valeurs (accueil, historique, bilan) et n'ont
 * aucune raison de les présenter différemment. Cette fonction est l'endroit unique
 * où l'on décide comment une valeur se lit, ce qui règle du même coup deux
 * questions qui traînaient dans les vues :
 *
 *  - la conversion du poids dans l'unité d'affichage (règle 16) ;
 *  - le **mode sans chiffre**, qui remplace la valeur du poids par sa tendance
 *    au lieu de la masquer purement et simplement (§ 12.1). Ce mode existe pour
 *    les personnes que le chiffre met en difficulté : il ne concerne donc que le
 *    poids, et laisse les autres données lisibles.
 */

import type { ContextePesee, DefinitionChamp, Mesure, Objectif } from './types'
import { lireNombre, lireTexte, lireBooleen, lireTension, lireChoixMultiple } from './types'
import { formaterNombre, masseVersAffichage, type UniteMasse } from './unites'
import { CLE_POIDS, uniteAffichee, valeurVersAffichage } from './champs'
import { sensEvolution } from './tendance'

export interface OptionsAffichage {
  uniteMasse: UniteMasse
  /** § 12.1 : masque les valeurs de poids au profit de leur seule tendance. */
  sansChiffre?: boolean
  /**
   * Poids de la mesure précédente, en kilogrammes. Sert uniquement au mode sans
   * chiffre, pour dire un sens d'évolution plutôt qu'une valeur.
   */
  poidsPrecedent?: number
}

/** Conditions de pesée (A29), telles qu'elles se relisent dans l'historique. */
const LIBELLES_CONTEXTE: Record<ContextePesee, string> = {
  a_jeun: 'à jeun',
  habille: 'habillé·e',
  apres_sport: 'après une activité',
  autre: 'autre contexte',
}

export function libelleContextePesee(c: ContextePesee): string {
  return LIBELLES_CONTEXTE[c]
}

const MOTS_TENDANCE: Record<string, string> = {
  hausse: 'en hausse',
  baisse: 'en baisse',
  stable: 'stable',
}

/** Formulation du poids en mode sans chiffre : une direction, jamais une valeur. */
export function tendancePoids(actuel: number, precedent?: number): string {
  if (precedent === undefined) return 'noté'
  return MOTS_TENDANCE[sensEvolution(actuel - precedent)] ?? 'noté'
}

/**
 * Met en forme une valeur **brute** — telle qu'elle est stockée — pour un champ
 * donné : conversion d'unité si c'est une masse, unité accolée, « / 5 » pour une
 * échelle.
 *
 * Sert à tout ce qui affiche une valeur qui ne vient pas d'une mesure : les
 * bornes d'un objectif, un seuil de régularité. `formaterValeurChamp` ci-dessous
 * s'appuie dessus pour les cas numériques.
 */
export function formaterValeurBrute(
  champ: DefinitionChamp,
  valeur: number,
  uniteMasse: UniteMasse,
): string {
  const nu = valeurNue(champ, valeur, uniteMasse)
  // « 2 sur 5 » et non « 2 / 5 » : la barre oblique se lit dans une cellule de
  // tableau, pas au milieu d'une phrase. `formaterValeurChamp` garde l'autre
  // forme, qui est la bonne dans l'historique.
  if (champ.type === 'echelle5') return `${nu} sur 5`
  const unite = uniteAffichee(champ, uniteMasse)
  return unite ? `${nu} ${unite}` : nu
}

/** La valeur seule, sans unité ni « sur 5 » — pour le premier terme d'un intervalle. */
function valeurNue(champ: DefinitionChamp, valeur: number, uniteMasse: UniteMasse): string {
  return formaterNombre(
    valeurVersAffichage(champ, valeur, uniteMasse),
    champ.type === 'echelle5' ? 0 : 1,
  )
}

/**
 * L'énoncé d'un objectif en une phrase : « Entre 61,0 et 64,0 kg »,
 * « Au moins 7,0 h, 5 fois par semaine ».
 *
 * C'est de la mise en forme, donc c'est ici et pas dans un composant — une vue
 * assemble et affiche, elle ne traduit pas. Le mode sans chiffre ne se décide
 * pas ici : l'appelant choisit d'afficher cette phrase ou non, selon le champ.
 */
export function enonceObjectif(
  objectif: Objectif,
  champ: DefinitionChamp,
  uniteMasse: UniteMasse,
): string {
  const v = (x: number) => formaterValeurBrute(champ, x, uniteMasse)
  // Dans un intervalle, l'unité ne se répète pas : « entre 61,0 et 64,0 kg ».
  const nu = (x: number) => valeurNue(champ, x, uniteMasse)
  const { valeurMin, valeurMax } = objectif

  if (objectif.type === 'regularite') {
    const fois = objectif.regularite?.occurrences ?? 1
    const par = objectif.regularite?.periode === 'mois' ? 'par mois' : 'par semaine'
    const cadence = `${fois} fois ${par}`

    if (champ.type === 'booleen') return `Oui, ${cadence}`
    if (valeurMin !== undefined && valeurMax !== undefined) {
      return `Entre ${nu(valeurMin)} et ${v(valeurMax)}, ${cadence}`
    }
    if (valeurMax !== undefined) return `Au plus ${v(valeurMax)}, ${cadence}`
    if (valeurMin !== undefined) return `Au moins ${v(valeurMin)}, ${cadence}`
    return cadence
  }

  if (valeurMin === undefined) return 'Objectif défini'
  const haut = valeurMax ?? valeurMin

  if (objectif.type === 'cible' || valeurMin === haut) return `Atteindre ${v(valeurMin)}`
  return objectif.type === 'maintien'
    ? `Rester entre ${nu(valeurMin)} et ${v(haut)}`
    : `Entre ${nu(valeurMin)} et ${v(haut)}`
}

/**
 * Rend une valeur telle qu'elle doit s'afficher, ou `undefined` si le champ
 * n'est pas renseigné dans cette mesure — auquel cas rien ne doit apparaître
 * (règle 14 : pas de tiret, pas de zéro).
 */
export function formaterValeurChamp(
  champ: DefinitionChamp,
  mesure: Mesure,
  options: OptionsAffichage,
): string | undefined {
  const { uniteMasse, sansChiffre = false, poidsPrecedent } = options

  switch (champ.type) {
    case 'nombre':
    case 'duree': {
      const v = lireNombre(mesure, champ.cle)
      if (v === undefined) return undefined
      if (champ.cle === CLE_POIDS) {
        if (sansChiffre) return tendancePoids(v, poidsPrecedent)
        return `${formaterNombre(masseVersAffichage(v, uniteMasse))} ${uniteMasse}`
      }
      return champ.unite ? `${formaterNombre(v)} ${champ.unite}` : formaterNombre(v)
    }
    case 'echelle5': {
      const v = lireNombre(mesure, champ.cle)
      return v === undefined ? undefined : `${v} / 5`
    }
    case 'booleen': {
      const v = lireBooleen(mesure, champ.cle)
      return v === undefined ? undefined : (v ? 'Oui' : 'Non')
    }
    case 'choix': {
      if (champ.multiple) {
        const v = lireChoixMultiple(mesure, champ.cle)
        return v === undefined ? undefined : v.join(', ')
      }
      return lireTexte(mesure, champ.cle)
    }
    case 'texte':
      return lireTexte(mesure, champ.cle)
    case 'tension': {
      const v = lireTension(mesure, champ.cle)
      if (v === undefined) return undefined
      return v.pouls !== undefined
        ? `${v.sys}/${v.dia} mmHg, ${v.pouls} bpm`
        : `${v.sys}/${v.dia} mmHg`
    }
    default:
      return undefined
  }
}
