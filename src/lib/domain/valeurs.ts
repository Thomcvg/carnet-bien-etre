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

import type { ContextePesee, DefinitionChamp, Mesure } from './types'
import { lireNombre, lireTexte, lireBooleen, lireTension, lireChoixMultiple } from './types'
import { formaterNombre, masseVersAffichage, type UniteMasse } from './unites'
import { CLE_POIDS } from './champs'
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
