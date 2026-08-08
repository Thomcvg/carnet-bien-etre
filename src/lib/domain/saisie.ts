/**
 * Garde-fous de saisie (A26) et détection de doublon (K7) — § 5.2.
 *
 * Principe directeur : **rien ne bloque jamais**. Le contrôle le plus sévère
 * demande une confirmation ; il n'existe pas de niveau « erreur ». Une personne
 * qui sait ce qu'elle saisit doit toujours pouvoir l'enregistrer.
 */

import type { DefinitionChamp, DateISO, Mesure, ValeurChamp, ValeurTension } from './types'
import { CLE_POIDS, CLE_TENSION } from './champs'
import { analyserNombre, formaterNombre, masseVersAffichage, masseVersStockage, type UniteMasse } from './unites'

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
/* Traduction formulaire ↔ mesure                                      */
/* ------------------------------------------------------------------ */

/**
 * Ces deux fonctions sont la **couture** entre ce que l'on tape et ce que l'on
 * stocke, et elles vivent ici plutôt que dans le composant de saisie pour une
 * raison précise.
 *
 * Le défaut le plus grave qu'ait connu ce projet — un poids saisi en livres
 * enregistré tel quel, comme s'il s'agissait de kilogrammes — tenait entièrement
 * dans cette traduction. Les conversions elles-mêmes étaient justes et testées ;
 * simplement, le formulaire ne les appelait pas. Aucun test ne pouvait le voir,
 * parce que la logique était enfermée dans un `.svelte`.
 *
 * Tout ce qui transforme une saisie en donnée est donc ici, pur et testé.
 *
 * Deux familles de valeurs cohabitent, comme dans le formulaire : les champs
 * numériques et texte transitent par des chaînes (`textes`), les échelles,
 * booléens et choix sont déjà dans leur type final (`typees`).
 */
export interface SaisieFormulaire {
  textes: Record<string, string>
  typees: Record<string, ValeurChamp>
}

/**
 * Construit les valeurs à enregistrer.
 *
 * `mesureExistante` sert à la modification : les champs qu'elle porte et que le
 * formulaire n'affiche pas — un champ désactivé depuis, par exemple — sont
 * reconduits plutôt que perdus.
 */
export function construireValeurs(
  saisie: SaisieFormulaire,
  uniteMasse: UniteMasse,
  mesureExistante?: Mesure,
): Record<string, ValeurChamp> {
  const valeurs: Record<string, ValeurChamp> = {}

  for (const [cle, texte] of Object.entries(saisie.textes)) {
    if (cle.startsWith('tension_')) continue
    const n = analyserNombre(texte)
    if (n === undefined) continue
    // Le stockage est canonique : le poids repart en kilogrammes (règle 16).
    valeurs[cle] = cle === CLE_POIDS ? masseVersStockage(n, uniteMasse) : n
  }

  for (const [cle, v] of Object.entries(saisie.typees)) {
    valeurs[cle] = v
  }

  const sys = analyserNombre(saisie.textes['tension_sys'] ?? '')
  const dia = analyserNombre(saisie.textes['tension_dia'] ?? '')
  const tensionSaisie = sys !== undefined && dia !== undefined
  if (tensionSaisie) {
    const pouls = analyserNombre(saisie.textes['tension_pouls'] ?? '')
    valeurs[CLE_TENSION] = pouls !== undefined
      ? { sys: sys!, dia: dia!, pouls }
      : { sys: sys!, dia: dia! }
  }

  if (mesureExistante) {
    for (const [cle, v] of Object.entries(mesureExistante.valeurs)) {
      if (cle in valeurs) continue
      // Une tension saisie remplace l'ancienne, y compris pour l'effacer en partie.
      if (cle === CLE_TENSION && tensionSaisie) continue
      valeurs[cle] = v
    }
  }

  return valeurs
}

/**
 * Opération inverse : prépare le formulaire à partir d'une mesure existante.
 * Le poids repasse dans l'unité d'affichage — sans quoi modifier une mesure en
 * livres afficherait des kilogrammes.
 */
export function reprendreValeurs(mesure: Mesure, uniteMasse: UniteMasse): SaisieFormulaire {
  const textes: Record<string, string> = {}
  const typees: Record<string, ValeurChamp> = {}

  for (const [cle, v] of Object.entries(mesure.valeurs)) {
    if (cle === CLE_TENSION && v !== null && typeof v === 'object' && !Array.isArray(v)) {
      const t = v as ValeurTension
      textes['tension_sys'] = String(t.sys)
      textes['tension_dia'] = String(t.dia)
      if (t.pouls !== undefined) textes['tension_pouls'] = String(t.pouls)
    } else if (typeof v === 'number') {
      textes[cle] = cle === CLE_POIDS
        ? formaterNombre(masseVersAffichage(v, uniteMasse))
        : String(v).replace('.', ',')
    } else if (typeof v === 'boolean' || typeof v === 'string' || Array.isArray(v)) {
      typees[cle] = v
    }
  }

  return { textes, typees }
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
