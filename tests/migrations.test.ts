import { describe, it, expect } from 'vitest'
import {
  migrer,
  estLisible,
  VERSION_SCHEMA,
  CarnetTropRecentError,
  CarnetIllisibleError,
  type Migration,
} from '$lib/domain/migrations'

function carnetV1(extra: Record<string, unknown> = {}) {
  return {
    versionSchema: 1,
    exporteLe: '2026-08-08T10:00:00.000Z',
    profils: [],
    champs: [],
    mesures: [],
    objectifs: [],
    ...extra,
  }
}

describe('migrer — carnet courant', () => {
  it('accepte un carnet à la version en cours', () => {
    const c = migrer(carnetV1())
    expect(c.versionSchema).toBe(VERSION_SCHEMA)
    expect(c.mesures).toEqual([])
  })

  it('préserve les données', () => {
    const mesures = [{ id: 'm1', profilId: 'p1', date: '2026-07-01', valeurs: { poids: 74.7 }, creeLe: '', modifieLe: '' }]
    const c = migrer(carnetV1({ mesures }))
    expect(c.mesures).toHaveLength(1)
    expect(c.mesures[0]!.valeurs['poids']).toBe(74.7)
  })
})

describe('migrer — migrations réelles depuis le lot 1', () => {
  it('ouvre un carnet du lot 1 sans intervention, jusqu\'au schéma courant (§ 11.4)', () => {
    // Un carnet créé par le lot 1 n'a jamais entendu parler d'événements, de
    // réflexions ni de traitements.
    const c = migrer(carnetV1())
    expect(c.evenements).toEqual([])
    expect(c.reflexions).toEqual([])
    expect(c.traitements).toEqual([])
    expect(c.versionSchema).toBe(VERSION_SCHEMA)
  })

  it('ne touche à rien d\'autre', () => {
    const mesures = [{ id: 'm1', profilId: 'p1', date: '2026-07-01', valeurs: { poids: 74.7 }, creeLe: '', modifieLe: '' }]
    const c = migrer(carnetV1({ mesures }))
    expect(c.mesures).toHaveLength(1)
  })
})

describe('migrer — le mécanisme lui-même (§ 11.4)', () => {
  // On exerce l'enchaînement avec une table simulée, pour que le mécanisme soit
  // couvert indépendamment des vraies migrations. La première étape ajoute
  // d'un coup tout ce que le carnet réel attend au final (§ 11.4 impose que les
  // six collections existent), pour ne tester ici que l'enchaînement lui-même.
  const table: Record<number, Migration> = {
    1: (c) => ({ ...c, evenements: [], reflexions: [], traitements: [] }),
    2: (c) => ({ ...c, champs: [{ cle: 'poids', ajouteParMigration: true }] }),
  }

  it('applique les migrations successives dans l\'ordre', () => {
    const c = migrer(carnetV1(), 3, table) as unknown as Record<string, unknown>
    expect(c['evenements']).toEqual([])
    expect(c['versionSchema']).toBe(3)
    expect((c['champs'] as unknown[])[0]).toMatchObject({ ajouteParMigration: true })
  })

  it('s\'arrête à la version demandée', () => {
    const c = migrer(carnetV1(), 2, table) as unknown as Record<string, unknown>
    expect(c['versionSchema']).toBe(2)
    expect(c['evenements']).toEqual([])
    // La migration 2 → 3 ne doit pas avoir été appliquée.
    expect(c['champs']).toEqual([])
  })

  it('ouvre un carnet ancien de plusieurs versions de retard', () => {
    // C'est l'exigence du § 11.4 : un carnet de 2026 doit s'ouvrir en 2036.
    expect(() => migrer(carnetV1(), 3, table)).not.toThrow()
  })

  it('refuse clairement s\'il manque une étape de migration', () => {
    const trouee: Record<number, Migration> = { 1: (c) => c }
    expect(() => migrer(carnetV1(), 3, trouee)).toThrow(CarnetIllisibleError)
  })
})

describe('migrer — refus explicites', () => {
  it('refuse un carnet venant d\'une version plus récente, avec un message utile', () => {
    let erreur: unknown
    try {
      migrer(carnetV1({ versionSchema: 99 }))
    } catch (e) {
      erreur = e
    }
    expect(erreur).toBeInstanceOf(CarnetTropRecentError)
    expect((erreur as Error).message).toContain('Mettez l\'application à jour')
  })

  it('refuse un fichier sans numéro de schéma', () => {
    expect(() => migrer({ profils: [], champs: [], mesures: [], objectifs: [] }))
      .toThrow(CarnetIllisibleError)
  })

  it('refuse un fichier auquel il manque une collection', () => {
    const ampute = carnetV1()
    delete (ampute as Record<string, unknown>)['mesures']
    expect(() => migrer(ampute)).toThrow(CarnetIllisibleError)
  })

  it('refuse ce qui n\'est pas un objet', () => {
    expect(() => migrer(null)).toThrow(CarnetIllisibleError)
    expect(() => migrer('bonjour')).toThrow(CarnetIllisibleError)
    expect(() => migrer(42)).toThrow(CarnetIllisibleError)
  })
})

describe('estLisible', () => {
  it('répond sans lever d\'exception', () => {
    expect(estLisible(carnetV1())).toBe(true)
    expect(estLisible({ versionSchema: 99 })).toBe(false)
    expect(estLisible(null)).toBe(false)
  })
})
