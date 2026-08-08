import { describe, it, expect } from 'vitest'
import {
  serie,
  moyenneMobile,
  estDansLeBruit,
  sensEvolution,
  variationParJour,
  detecterPerteRapide,
  variationsMensuelles,
} from '$lib/domain/tendance'
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

describe('serie', () => {
  it('saute les mesures où le champ n\'est pas renseigné, sans interpoler', () => {
    const mesures = [
      mesure('2026-07-01', { poids: 74.7, tour_taille: 92 }),
      mesure('2026-08-01', { poids: 74.0 }),           // pas de tour de taille
      mesure('2026-09-01', { poids: 73.6, tour_taille: 90 }),
    ]
    const taille = serie(mesures, 'tour_taille')
    expect(taille).toHaveLength(2)
    expect(taille.map((p) => p.date)).toEqual(['2026-07-01', '2026-09-01'])
    // Surtout : aucun point à zéro pour août.
    expect(taille.every((p) => p.valeur > 0)).toBe(true)
  })

  it('trie chronologiquement quelle que soit la saisie', () => {
    const mesures = [
      mesure('2026-09-01', { poids: 73.6 }),
      mesure('2026-07-01', { poids: 74.7 }),
      mesure('2026-08-01', { poids: 74.0 }),
    ]
    expect(serie(mesures, 'poids').map((p) => p.valeur)).toEqual([74.7, 74.0, 73.6])
  })

  it('renvoie une série vide pour un champ jamais renseigné', () => {
    expect(serie([mesure('2026-07-01', { poids: 74 })], 'tour_bras')).toEqual([])
  })
})

describe('moyenneMobile', () => {
  it('lisse sur la fenêtre glissante', () => {
    const points = [
      { date: '2026-07-01', valeur: 70 },
      { date: '2026-08-01', valeur: 72 },
      { date: '2026-09-01', valeur: 74 },
    ]
    expect(moyenneMobile(points, 3).map((p) => p.valeur)).toEqual([70, 71, 72])
  })

  it('produit autant de points que la série réelle', () => {
    const points = Array.from({ length: 8 }, (_, i) => ({
      date: `2026-0${i + 1}-01`,
      valeur: 70 + i,
    }))
    expect(moyenneMobile(points, 3)).toHaveLength(8)
  })

  it('ne renvoie rien pour une série vide', () => {
    expect(moyenneMobile([], 3)).toEqual([])
  })
})

describe('estDansLeBruit / sensEvolution (G21)', () => {
  it('présente une variation infime comme une stabilité', () => {
    expect(estDansLeBruit(0.3)).toBe(true)
    expect(sensEvolution(0.3)).toBe('stable')
    expect(sensEvolution(-0.7)).toBe('stable')
  })

  it('reconnaît une évolution réelle au-delà de la bande', () => {
    expect(estDansLeBruit(1.5)).toBe(false)
    expect(sensEvolution(1.5)).toBe('hausse')
    expect(sensEvolution(-2.4)).toBe('baisse')
  })
})

describe('variationParJour', () => {
  it('calcule la pente sur les derniers points', () => {
    const points = [
      { date: '2026-07-01', valeur: 74.7 },
      { date: '2026-07-31', valeur: 74.1 },
    ]
    expect(variationParJour(points, 2)).toBeCloseTo(-0.02, 3)
  })

  it('ne se prononce pas sur un point unique', () => {
    expect(variationParJour([{ date: '2026-07-01', valeur: 74 }], 2)).toBeUndefined()
  })
})

describe('detecterPerteRapide (B11)', () => {
  it('ne signale rien sur le rythme réel de Crystèle', () => {
    // 74,7 → 74,0 → 73,6 en deux mois : environ 0,2 % par semaine.
    const points = [
      { date: '2026-07-01', valeur: 74.7 },
      { date: '2026-08-01', valeur: 74.0 },
      { date: '2026-09-01', valeur: 73.6 },
    ]
    expect(detecterPerteRapide(points)).toBeUndefined()
  })

  it('signale une perte soutenue au-delà du seuil', () => {
    const points = [
      { date: '2026-07-01', valeur: 80 },
      { date: '2026-07-08', valeur: 78 },
      { date: '2026-07-15', valeur: 76 },
    ]
    const a = detecterPerteRapide(points)
    expect(a).toBeDefined()
    expect(a!.intervallesConcernes).toBe(2)
    expect(a!.fractionHebdo).toBeGreaterThan(0.01)
  })

  it('ne signale rien sur un seul écart isolé', () => {
    // Une pesée dans d'autres conditions ne doit pas déclencher un message.
    const points = [
      { date: '2026-07-01', valeur: 80 },
      { date: '2026-07-08', valeur: 77 },
      { date: '2026-07-15', valeur: 76.9 },
    ]
    expect(detecterPerteRapide(points)).toBeUndefined()
  })

  it('ne signale rien en cas de prise de poids', () => {
    const points = [
      { date: '2026-07-01', valeur: 76 },
      { date: '2026-07-08', valeur: 78 },
      { date: '2026-07-15', valeur: 80 },
    ]
    expect(detecterPerteRapide(points)).toBeUndefined()
  })

  it('exige au moins trois points', () => {
    expect(detecterPerteRapide([
      { date: '2026-07-01', valeur: 80 },
      { date: '2026-07-08', valeur: 75 },
    ])).toBeUndefined()
  })
})

describe('variationsMensuelles (G5)', () => {
  it('calcule les écarts d\'un mois sur l\'autre', () => {
    const points = [
      { date: '2026-07-01', valeur: 74.7 },
      { date: '2026-08-01', valeur: 74.0 },
      { date: '2026-09-01', valeur: 73.6 },
    ]
    const v = variationsMensuelles(points)
    expect(v).toHaveLength(2)
    expect(v[0]!.mois).toBe('2026-08')
    expect(v[0]!.delta).toBeCloseTo(-0.7, 5)
    expect(v[1]!.delta).toBeCloseTo(-0.4, 5)
  })

  it('saute simplement les mois sans mesure', () => {
    const points = [
      { date: '2026-07-01', valeur: 74.7 },
      { date: '2026-10-01', valeur: 73.0 },  // août et septembre absents
    ]
    const v = variationsMensuelles(points)
    expect(v).toHaveLength(1)
    expect(v[0]!.mois).toBe('2026-10')
  })

  it('ne produit rien avec une seule mesure', () => {
    expect(variationsMensuelles([{ date: '2026-07-01', valeur: 74.7 }])).toEqual([])
  })
})
