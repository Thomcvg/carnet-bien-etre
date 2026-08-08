import { describe, it, expect } from 'vitest'
import { trierEvenements, evenementCouvre, evenementsSurPeriode, libelleType } from '$lib/domain/evenements'
import type { Evenement } from '$lib/domain/types'

function evenement(p: Partial<Evenement>): Evenement {
  return {
    id: p.id ?? 'e1',
    profilId: 'p1',
    dateDebut: '2026-07-01',
    libelle: 'Vacances',
    type: 'personnel',
    ...p,
  }
}

describe('trierEvenements', () => {
  it('trie par date de début', () => {
    const e = [evenement({ id: 'b', dateDebut: '2026-09-01' }), evenement({ id: 'a', dateDebut: '2026-07-01' })]
    expect(trierEvenements(e).map((x) => x.id)).toEqual(['a', 'b'])
  })
})

describe('evenementCouvre', () => {
  it('couvre une période avec fin', () => {
    const e = evenement({ dateDebut: '2026-07-01', dateFin: '2026-07-15' })
    expect(evenementCouvre(e, '2026-07-01')).toBe(true)
    expect(evenementCouvre(e, '2026-07-10')).toBe(true)
    expect(evenementCouvre(e, '2026-07-15')).toBe(true)
    expect(evenementCouvre(e, '2026-07-16')).toBe(false)
    expect(evenementCouvre(e, '2026-06-30')).toBe(false)
  })

  it('un événement ponctuel ne couvre que son jour', () => {
    const e = evenement({ dateDebut: '2026-07-01', dateFin: undefined })
    expect(evenementCouvre(e, '2026-07-01')).toBe(true)
    expect(evenementCouvre(e, '2026-07-02')).toBe(false)
  })
})

describe('evenementsSurPeriode', () => {
  it('retient un événement qui chevauche partiellement', () => {
    const e = [evenement({ dateDebut: '2026-06-20', dateFin: '2026-07-05' })]
    expect(evenementsSurPeriode(e, '2026-07-01', '2026-07-31')).toHaveLength(1)
  })

  it('exclut un événement hors période', () => {
    const e = [evenement({ dateDebut: '2026-01-01', dateFin: '2026-01-10' })]
    expect(evenementsSurPeriode(e, '2026-07-01', '2026-07-31')).toEqual([])
  })

  it('renvoie un résultat trié', () => {
    const e = [
      evenement({ id: 'b', dateDebut: '2026-07-20' }),
      evenement({ id: 'a', dateDebut: '2026-07-01' }),
    ]
    expect(evenementsSurPeriode(e, '2026-07-01', '2026-07-31').map((x) => x.id)).toEqual(['a', 'b'])
  })
})

describe('libelleType', () => {
  it('donne un libellé pour chaque type', () => {
    for (const t of ['personnel', 'sante', 'activite', 'autre'] as const) {
      expect(libelleType(t)).toBeTruthy()
    }
  })
})
