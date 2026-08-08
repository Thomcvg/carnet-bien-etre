/**
 * Garde-fous de saisie (A26) et détection de doublon (K7) — § 5.2.
 *
 * Principe directeur : **rien ne bloque jamais**. Le contrôle le plus sévère
 * demande une confirmation ; il n'existe pas de niveau « erreur ». Une personne
 * qui sait ce qu'elle saisit doit toujours pouvoir l'enregistrer.
 */

import type { DefinitionChamp, DateISO, Mesure } from './types'

/** Écart relatif à la mesure précédente au-delà duquel on demande confirmation. */
export const ECART_SUSPECT = 0.2

export type NiveauControle = 'ok' | 'confirmation'

export interface Controle {
  niveau: NiveauControle
  message?: string
}

const OK: Controle = { niveau: 'ok' }

function formater(v: number, unite?: string): string {
  const n = Number.isInteger(v) ? String(v) : v.toFixed(1).replace('.', ',')
  return unite ? `${n} ${unite}` : n
}

/**
 * Contrôle une valeur numérique au moment de la saisie.
 * Retourne au plus une demande de confirmation, formulée sans reproche.
 */
export function controlerValeur(
  champ: DefinitionChamp,
  valeur: number,
  precedente?: number,
): Controle {
  if (!Number.isFinite(valeur)) {
    return { niveau: 'confirmation', message: 'Cette valeur ne semble pas être un nombre.' }
  }

  const { min, max, unite, libelle } = champ

  if (min !== undefined && valeur < min) {
    return {
      niveau: 'confirmation',
      message: `${formater(valeur, unite)} pour « ${libelle.toLowerCase()} » — `
        + `c'est bien ce que vous vouliez saisir ?`,
    }
  }

  if (max !== undefined && valeur > max) {
    return {
      niveau: 'confirmation',
      message: `${formater(valeur, unite)} pour « ${libelle.toLowerCase()} » — `
        + `c'est bien ce que vous vouliez saisir ?`,
    }
  }

  if (precedente !== undefined && precedente > 0) {
    const ecart = Math.abs(valeur - precedente) / precedente
    if (ecart > ECART_SUSPECT) {
      return {
        niveau: 'confirmation',
        message: `Votre dernière valeur était ${formater(precedente, unite)}. `
          + `On enregistre ${formater(valeur, unite)} ?`,
      }
    }
  }

  return OK
}

/* ------------------------------------------------------------------ */
/* Doublons de date (K7)                                               */
/* ------------------------------------------------------------------ */

export interface Doublon {
  mesure: Mesure
}

/**
 * Cherche une mesure existante à la même date.
 * Sa présence n'interdit rien : elle ouvre un choix, conformément au § 5.2.
 *
 * `idExclu` écarte la mesure en cours de modification : sans lui, déplacer une
 * mesure sur une date déjà occupée ne signalerait rien — ou bien la mesure se
 * signalerait elle-même comme son propre doublon.
 */
export function trouverDoublon(
  mesures: Mesure[],
  date: DateISO,
  idExclu?: string,
): Doublon | undefined {
  const existante = mesures.find((m) => m.date === date && m.id !== idExclu)
  return existante ? { mesure: existante } : undefined
}

/* ------------------------------------------------------------------ */
/* Valeurs de repère au remplissage (K2)                               */
/* ------------------------------------------------------------------ */

/**
 * Dernière valeur connue de chaque champ, servie comme repère grisé dans le
 * formulaire. Règle 13 : un repère non confirmé n'est jamais enregistré —
 * c'est une aide à la saisie, pas une donnée.
 */
export function reperesDeSaisie(
  mesures: Mesure[],
  cles: string[],
): Record<string, number> {
  const triees = [...mesures].sort((a, b) => b.date.localeCompare(a.date))
  const reperes: Record<string, number> = {}

  for (const cle of cles) {
    for (const m of triees) {
      const v = m.valeurs[cle]
      if (typeof v === 'number' && Number.isFinite(v)) {
        reperes[cle] = v
        break
      }
    }
  }
  return reperes
}
