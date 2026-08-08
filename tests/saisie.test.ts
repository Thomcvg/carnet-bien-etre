import { describe, it, expect } from 'vitest'
import { controlerValeur, trouverDoublon, reperesDeSaisie } from '$lib/domain/saisie'
import { champsParDefaut, trouverChamp, CLE_POIDS } from '$lib/domain/champs'
import type { Mesure } from '$lib/domain/types'

const CHAMPS = champsParDefaut()
const POIDS = trouverChamp(CHAMPS, CLE_POIDS)!

function mesure(date: string, valeurs: Record<string, number>, id = date): Mesure {
  return {
    id,
    profilId: 'p1',
    date,
    valeurs,
    creeLe: `${date}T08:00:00.000Z`,
    modifieLe: `${date}T08:00:00.000Z`,
  }
}

describe('controlerValeur (A26)', () => {
  it('laisse passer une valeur ordinaire', () => {
    expect(controlerValeur(POIDS, 74).niveau).toBe('ok')
  })

  it('demande confirmation sur une faute de frappe manifeste', () => {
    const c = controlerValeur(POIDS, 740)
    expect(c.niveau).toBe('confirmation')
    expect(c.message).toContain('740')
  })

  it('demande confirmation sous la borne basse', () => {
    expect(controlerValeur(POIDS, 7.4).niveau).toBe('confirmation')
  })

  it('accepte la variation normale d\'un mois sur l\'autre', () => {
    // 74,7 → 74,0 : moins de 1 % d'écart.
    expect(controlerValeur(POIDS, 74.0, 74.7).niveau).toBe('ok')
  })

  it('demande confirmation sur un écart inhabituel avec la mesure précédente', () => {
    const c = controlerValeur(POIDS, 74, 100)
    expect(c.niveau).toBe('confirmation')
    expect(c.message).toContain('100')
  })

  it('ne connaît aucun niveau bloquant : le pire cas reste une confirmation', () => {
    const cas = [740, 0.1, -5, Number.NaN, 1e9]
    for (const v of cas) {
      expect(['ok', 'confirmation']).toContain(controlerValeur(POIDS, v).niveau)
    }
  })

  it('formule sans reproche : ni « erreur », ni « invalide », ni « faux »', () => {
    const interdits = ['erreur', 'invalide', 'faux', 'incorrect', 'impossible', 'refus']
    for (const v of [740, 0.1, -5]) {
      const m = (controlerValeur(POIDS, v, 74).message ?? '').toLowerCase()
      for (const mot of interdits) expect(m).not.toContain(mot)
    }
  })
})

describe('trouverDoublon (K7)', () => {
  const carnet = [
    mesure('2026-07-01', { poids: 74.7 }),
    mesure('2026-08-01', { poids: 74.0 }),
  ]

  it('repère une mesure déjà enregistrée à cette date', () => {
    const d = trouverDoublon(carnet, '2026-08-01')
    expect(d).toBeDefined()
    expect(d!.mesure.valeurs['poids']).toBe(74.0)
  })

  it('ne signale rien sur une date libre', () => {
    expect(trouverDoublon(carnet, '2026-09-01')).toBeUndefined()
  })

  it('ne se signale pas lui-même lors d\'une modification', () => {
    expect(trouverDoublon(carnet, '2026-08-01', '2026-08-01')).toBeUndefined()
  })
})

describe('reperesDeSaisie (K2)', () => {
  const carnet = [
    mesure('2026-07-01', { poids: 74.7, tour_taille: 92, tour_bras: 30 }),
    mesure('2026-08-01', { poids: 74.0, tour_taille: 91 }),
    mesure('2026-09-01', { poids: 73.6 }),
  ]

  it('propose la dernière valeur connue de chaque champ', () => {
    const r = reperesDeSaisie(carnet, ['poids', 'tour_taille', 'tour_bras'])
    expect(r['poids']).toBe(73.6)
    expect(r['tour_taille']).toBe(91)   // remonte à août
    expect(r['tour_bras']).toBe(30)     // remonte à juillet
  })

  it('ne propose rien pour un champ jamais renseigné', () => {
    const r = reperesDeSaisie(carnet, ['tour_cou'])
    expect(r['tour_cou']).toBeUndefined()
    expect(Object.keys(r)).toHaveLength(0)
  })

  it('reste vide sur un carnet neuf', () => {
    expect(reperesDeSaisie([], ['poids'])).toEqual({})
  })
})
