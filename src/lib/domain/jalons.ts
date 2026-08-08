/**
 * Jalons de régularité (F11, § 9.3, § 15 v1.0).
 *
 * Ils récompensent l'assiduité, pas un résultat — la seule chose réellement
 * sous contrôle de l'utilisateur. Contrairement au modèle esquissé au § 4 (une
 * entité `Jalon` persistée avec sa date d'obtention), ces jalons sont **recalculés
 * à la volée** à partir des mesures et du profil : ce sont des faits dérivés, pas
 * des données sources, et le § 20 v1.0 interdit de stocker ce qu'on peut recalculer.
 * Persister l'instant exact d'obtention n'aura de sens que le jour où un message
 * ponctuel de type « vous venez d'atteindre… » sera construit — pas encore le cas.
 *
 * Les libellés restent factuels, sans superlatif ni ton de performance (§ 12.1).
 */

import type { DateISO, Mesure, Profil } from './types'
import { joursEntre } from './dates'

export interface Jalon {
  cle: string
  libelle: string
  atteint: boolean
}

const JOURS_PAR_MOIS = 30
const JOURS_PAR_AN = 365

function joursDepuisCreation(profil: Profil, aujourdhui: DateISO): number {
  return joursEntre(profil.creeLe.slice(0, 10), aujourdhui)
}

/**
 * Jalons de régularité atteints ou non. L'ordre reflète un parcours naturel :
 * la première mesure vient toujours avant l'ancienneté, qui vient avant le volume.
 */
export function jalonsDeRegularite(
  mesures: Mesure[],
  profil: Profil,
  aujourdhui: DateISO,
): Jalon[] {
  const nombreMesures = mesures.length
  const joursCarnet = joursDepuisCreation(profil, aujourdhui)

  return [
    { cle: 'premiere_mesure', libelle: 'Première mesure enregistrée', atteint: nombreMesures >= 1 },
    { cle: 'trois_mois', libelle: '3 mois de carnet', atteint: joursCarnet >= 3 * JOURS_PAR_MOIS },
    { cle: 'douze_mesures', libelle: '12 mesures enregistrées', atteint: nombreMesures >= 12 },
    { cle: 'un_an', libelle: '1 an de carnet', atteint: joursCarnet >= JOURS_PAR_AN },
    { cle: 'cinquante_mesures', libelle: '50 mesures enregistrées', atteint: nombreMesures >= 50 },
  ]
}

/**
 * Vrai le jour anniversaire de la création du carnet (K18) — un jalon qui n'a
 * rien à voir avec le poids, à part pour marquer le calendrier.
 */
export function estAnniversaireCarnet(profil: Profil, aujourdhui: DateISO): boolean {
  const creation = profil.creeLe.slice(5, 10) // MM-JJ
  const jourAujourdhui = aujourdhui.slice(5, 10)
  return creation === jourAujourdhui && joursDepuisCreation(profil, aujourdhui) >= JOURS_PAR_AN
}

export function anneesDeCarnet(profil: Profil, aujourdhui: DateISO): number {
  return Math.floor(joursDepuisCreation(profil, aujourdhui) / JOURS_PAR_AN)
}
