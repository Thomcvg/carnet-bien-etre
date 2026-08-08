import { describe, it, expect } from 'vitest'
import { jalonsDeRegularite, estAnniversaireCarnet, anneesDeCarnet } from '$lib/domain/jalons'
import type { Mesure, Profil } from '$lib/domain/types'

function profil(creeLe: string): Profil {
  return {
    id: 'p1',
    nomCarnet: 'Carnet',
    uniteMasse: 'kg',
    formatDate: 'jj/mm/aaaa',
    langue: 'fr',
    mode: 'essentiel',
    usage: 'suivre',
    theme: 'auto',
    taillePolice: 100,
    modeSansChiffre: false,
    creeLe,
  }
}

function mesures(n: number): Mesure[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `m${i}`,
    profilId: 'p1',
    date: `2026-01-${String((i % 28) + 1).padStart(2, '0')}`,
    valeurs: { poids: 70 },
    creeLe: '',
    modifieLe: '',
  }))
}

describe('jalonsDeRegularite', () => {
  it('un carnet tout neuf, sans mesure, n\'a aucun jalon atteint', () => {
    const j = jalonsDeRegularite([], profil('2026-08-08T10:00:00.000Z'), '2026-08-08')
    expect(j.every((x) => !x.atteint)).toBe(true)
  })

  it('la première mesure suffit à débloquer le jalon correspondant', () => {
    const j = jalonsDeRegularite(mesures(1), profil('2026-08-08T10:00:00.000Z'), '2026-08-08')
    expect(j.find((x) => x.cle === 'premiere_mesure')?.atteint).toBe(true)
    expect(j.find((x) => x.cle === 'douze_mesures')?.atteint).toBe(false)
  })

  it('douze mesures débloquent le jalon de volume sans exiger d\'ancienneté', () => {
    const j = jalonsDeRegularite(mesures(12), profil('2026-08-08T10:00:00.000Z'), '2026-08-08')
    expect(j.find((x) => x.cle === 'douze_mesures')?.atteint).toBe(true)
    // Créé aujourd'hui : aucun jalon d'ancienneté ne peut être atteint le même jour.
    expect(j.find((x) => x.cle === 'trois_mois')?.atteint).toBe(false)
  })

  it('l\'ancienneté du carnet débloque ses propres jalons, indépendamment du nombre de mesures', () => {
    const j = jalonsDeRegularite([], profil('2025-05-01T10:00:00.000Z'), '2026-08-08')
    expect(j.find((x) => x.cle === 'trois_mois')?.atteint).toBe(true)
    expect(j.find((x) => x.cle === 'un_an')?.atteint).toBe(true)
  })

  it('reste factuel : aucun terme de performance dans les libellés (§ 12.1)', () => {
    const j = jalonsDeRegularite(mesures(50), profil('2024-01-01T10:00:00.000Z'), '2026-08-08')
    const interdits = ['bravo', 'félicitations', 'réussi', 'gagné', 'champion']
    for (const jalon of j) {
      const l = jalon.libelle.toLowerCase()
      for (const mot of interdits) expect(l).not.toContain(mot)
    }
  })
})

describe('estAnniversaireCarnet', () => {
  it('vrai le jour anniversaire, après au moins un an', () => {
    expect(estAnniversaireCarnet(profil('2025-08-08T10:00:00.000Z'), '2026-08-08')).toBe(true)
  })

  it('faux un autre jour de l\'année', () => {
    expect(estAnniversaireCarnet(profil('2025-08-08T10:00:00.000Z'), '2026-08-09')).toBe(false)
  })

  it('faux avant qu\'une année complète ne soit écoulée', () => {
    expect(estAnniversaireCarnet(profil('2026-08-08T10:00:00.000Z'), '2026-08-08')).toBe(false)
  })
})

describe('anneesDeCarnet', () => {
  it('compte les années pleines écoulées', () => {
    expect(anneesDeCarnet(profil('2024-08-08T10:00:00.000Z'), '2026-08-08')).toBe(2)
    expect(anneesDeCarnet(profil('2026-08-08T10:00:00.000Z'), '2026-08-08')).toBe(0)
  })
})
