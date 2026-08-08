import { describe, it, expect } from 'vitest'
import { bilanChamp, derniereValeur, valeurLaPlusProche } from '$lib/domain/bilan'
import type { Mesure } from '$lib/domain/types'

function mesure(date: string, valeurs: Record<string, number>): Mesure {
  return {
    id: date,
    profilId: 'p1',
    date,
    valeurs,
    creeLe: `${date}T08:00:00.000Z`,
    modifieLe: `${date}T08:00:00.000Z`,
  }
}

const CARNET = [
  mesure('2026-07-01', { poids: 74.7, tour_taille: 92 }),
  mesure('2026-08-01', { poids: 74.0 }),
  mesure('2026-09-01', { poids: 73.6, tour_taille: 90 }),
  mesure('2026-11-01', { poids: 74.2 }),
]

describe('bilanChamp', () => {
  it('donne les repères attendus par le § 14 v1.0', () => {
    const b = bilanChamp(CARNET, 'poids')
    expect(b.premiere!.valeur).toBe(74.7)
    expect(b.derniere!.valeur).toBe(74.2)
    expect(b.minimum!.valeur).toBe(73.6)
    expect(b.minimum!.date).toBe('2026-09-01')
    expect(b.maximum!.valeur).toBe(74.7)
    expect(b.evolution).toBeCloseTo(-0.5, 5)
    expect(b.nombreMesures).toBe(4)
  })

  it('ne calcule aucune évolution sur une mesure unique (règle 14)', () => {
    const b = bilanChamp([mesure('2026-07-01', { poids: 74.7 })], 'poids')
    expect(b.premiere).not.toBeNull()
    expect(b.evolution).toBeNull()
  })

  it('ne renvoie rien pour un champ jamais renseigné, et surtout pas zéro', () => {
    const b = bilanChamp(CARNET, 'tour_bras')
    expect(b.premiere).toBeNull()
    expect(b.derniere).toBeNull()
    expect(b.minimum).toBeNull()
    expect(b.evolution).toBeNull()
    expect(b.nombreMesures).toBe(0)
  })

  it('ignore les mesures où le champ manque, sans les compter', () => {
    const b = bilanChamp(CARNET, 'tour_taille')
    expect(b.nombreMesures).toBe(2)
    expect(b.evolution).toBeCloseTo(-2, 5)
  })

  it('reste juste sur un carnet vide', () => {
    const b = bilanChamp([], 'poids')
    expect(b.evolution).toBeNull()
    expect(b.nombreMesures).toBe(0)
  })
})

describe('derniereValeur', () => {
  it('retourne la valeur la plus récente du champ', () => {
    expect(derniereValeur(CARNET, 'poids')!.valeur).toBe(74.2)
    // La dernière mesure ne porte pas de tour de taille : on remonte à septembre.
    expect(derniereValeur(CARNET, 'tour_taille')!.valeur).toBe(90)
  })

  it('ne renvoie rien pour un champ absent', () => {
    expect(derniereValeur(CARNET, 'tour_cou')).toBeUndefined()
  })
})

describe('valeurLaPlusProche', () => {
  // La taille est un champ suivi (A4) : l'IMC d'une mesure ancienne doit utiliser
  // la taille de l'époque, pas celle saisie des années plus tard.
  const tailles = [
    mesure('2026-07-01', { taille: 165 }),
    mesure('2031-07-01', { taille: 163.5 }),
  ]

  it('choisit la taille contemporaine de la mesure', () => {
    expect(valeurLaPlusProche(tailles, 'taille', '2026-08-01')).toBe(165)
    expect(valeurLaPlusProche(tailles, 'taille', '2031-09-01')).toBe(163.5)
  })

  it('ne renvoie rien si le champ n\'a jamais été renseigné', () => {
    expect(valeurLaPlusProche(tailles, 'tour_bras', '2026-08-01')).toBeUndefined()
  })
})
