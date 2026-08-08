import { describe, it, expect } from 'vitest'
import {
  controlerValeur, trouverDoublon, reperesDeSaisie,
  construireValeurs, reprendreValeurs,
} from '$lib/domain/saisie'
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

/* ------------------------------------------------------------------ */
/* La couture formulaire ↔ mesure                                      */
/* ------------------------------------------------------------------ */

/**
 * Ces tests existent à cause d'un bug précis : un poids saisi en livres était
 * enregistré tel quel, comme des kilogrammes. Les conversions étaient justes et
 * testées — le formulaire ne les appelait simplement pas, et 160 tests verts
 * n'y voyaient rien parce que la logique vivait dans un composant.
 */
describe('construireValeurs / reprendreValeurs (règle 16)', () => {
  const mesure = (valeurs: Record<string, unknown>): Mesure => ({
    id: 'm1', profilId: 'p1', date: '2026-08-01',
    valeurs: valeurs as Mesure['valeurs'],
    creeLe: '2026-08-01T10:00:00Z', modifieLe: '2026-08-01T10:00:00Z',
  })

  it('convertit un poids saisi en livres vers le stockage canonique', () => {
    const v = construireValeurs({ textes: { poids: '150' }, typees: {} }, 'lb')
    expect(v['poids']).toBeCloseTo(68.0389, 3)
  })

  it('n\'altère pas un poids déjà saisi en kilogrammes', () => {
    const v = construireValeurs({ textes: { poids: '68' }, typees: {} }, 'kg')
    expect(v['poids']).toBe(68)
  })

  it('fait l\'aller-retour sans dérive en livres', () => {
    const stocke = construireValeurs({ textes: { poids: '150' }, typees: {} }, 'lb')
    const repris = reprendreValeurs(mesure(stocke), 'lb')
    expect(repris.textes['poids']).toBe('150,0')
  })

  it('ne convertit que le poids, jamais les mensurations', () => {
    // Les longueurs n'ont pas d'unité alternative : un tour de taille reste tel quel.
    const v = construireValeurs({ textes: { poids: '150', tour_taille: '89' }, typees: {} }, 'lb')
    expect(v['tour_taille']).toBe(89)
  })

  it('accepte la virgule comme séparateur décimal (K3)', () => {
    expect(construireValeurs({ textes: { poids: '73,6' }, typees: {} }, 'kg')['poids']).toBe(73.6)
  })

  it('n\'enregistre rien pour un champ laissé vide (règle 5)', () => {
    const v = construireValeurs({ textes: { poids: '70', tour_taille: '' }, typees: {} }, 'kg')
    expect('tour_taille' in v).toBe(false)
  })

  it('assemble la tension à partir de ses trois sous-valeurs', () => {
    const v = construireValeurs(
      { textes: { tension_sys: '128', tension_dia: '82', tension_pouls: '68' }, typees: {} },
      'kg',
    )
    expect(v['tension']).toEqual({ sys: 128, dia: 82, pouls: 68 })
  })

  it('n\'enregistre aucune tension si la diastolique manque', () => {
    const v = construireValeurs({ textes: { tension_sys: '128' }, typees: {} }, 'kg')
    expect('tension' in v).toBe(false)
    // Et surtout : aucune clé parasite « tension_sys » ne se glisse dans la mesure.
    expect('tension_sys' in v).toBe(false)
  })

  it('reconduit les champs d\'une mesure modifiée que le formulaire n\'affiche plus', () => {
    // Un champ désactivé depuis la saisie ne doit pas disparaître de l'historique.
    const existante = mesure({ poids: 70, stress: 4, taille_vetement: 'M' })
    const v = construireValeurs({ textes: { poids: '71' }, typees: {} }, 'kg', existante)
    expect(v['poids']).toBe(71)
    expect(v['stress']).toBe(4)
    expect(v['taille_vetement']).toBe('M')
  })

  it('permet une saisie sans poids (le poids est facultatif)', () => {
    const v = construireValeurs({ textes: {}, typees: { stress: 4 } }, 'kg')
    expect(v).toEqual({ stress: 4 })
  })

  it('sépare les valeurs déjà typées des valeurs textuelles', () => {
    const repris = reprendreValeurs(
      mesure({ poids: 70, stress: 4, renforcement: true, activite_quotidien: ['Jardinage'] }),
      'kg',
    )
    expect(repris.textes).toEqual({ poids: '70,0', stress: '4' })
    expect(repris.typees).toEqual({ renforcement: true, activite_quotidien: ['Jardinage'] })
  })

  it('éclate la tension en trois champs à la reprise', () => {
    const repris = reprendreValeurs(mesure({ tension: { sys: 128, dia: 82, pouls: 68 } }), 'kg')
    expect(repris.textes).toEqual({ tension_sys: '128', tension_dia: '82', tension_pouls: '68' })
  })
})
