import { describe, it, expect } from 'vitest'
import {
  arrondirCoordonnee,
  libelleWmo,
  formaterMeteo,
  METEOS_MANUELLES,
  DECIMALES_COORDONNEE,
} from '$lib/domain/meteo'

describe('arrondirCoordonnee (§ 11.8)', () => {
  it('arrondit à deux décimales, soit environ un kilomètre', () => {
    expect(DECIMALES_COORDONNEE).toBe(2)
    // Lons-le-Saunier, à la précision qu'un service de géocodage renvoie.
    expect(arrondirCoordonnee(46.674560)).toBe(46.67)
    expect(arrondirCoordonnee(5.554970)).toBe(5.55)
  })

  it('arrondit aussi les coordonnées négatives, sans se décaler vers zéro', () => {
    expect(arrondirCoordonnee(-0.129445)).toBe(-0.13)
    expect(arrondirCoordonnee(-33.868820)).toBe(-33.87)
  })

  it('ne rallonge pas une coordonnée déjà courte', () => {
    expect(arrondirCoordonnee(48.5)).toBe(48.5)
    expect(arrondirCoordonnee(0)).toBe(0)
  })

  it('perd bien la précision fine — c\'est tout son objet', () => {
    // Deux points distants d'une trentaine de mètres deviennent le même point.
    expect(arrondirCoordonnee(46.6741)).toBe(arrondirCoordonnee(46.6744))
  })
})

describe('libelleWmo', () => {
  it('traduit les codes que le service renvoie', () => {
    expect(libelleWmo(0)).toBe('Ciel dégagé')
    expect(libelleWmo(3)).toBe('Couvert')
    expect(libelleWmo(63)).toBe('Pluie')
    expect(libelleWmo(95)).toBe('Orage')
  })

  it('ne laisse jamais passer un nombre brut à l\'écran', () => {
    expect(libelleWmo(1234)).toBe('Temps indéterminé')
    expect(libelleWmo(-1)).toBe('Temps indéterminé')
  })
})

describe('formaterMeteo', () => {
  it('accole la température quand elle est connue', () => {
    expect(formaterMeteo({ libelle: 'Couvert', temperature: 12.4, automatique: true }))
      .toBe('Couvert, 12 °C')
  })

  it('arrondit la température : le dixième de degré n\'apprend rien', () => {
    expect(formaterMeteo({ libelle: 'Pluie', temperature: 7.6, automatique: true }))
      .toBe('Pluie, 8 °C')
  })

  it('affiche le seul libellé pour une météo notée à la main', () => {
    expect(formaterMeteo({ libelle: 'Brouillard', automatique: false })).toBe('Brouillard')
  })

  it('accepte une température négative', () => {
    expect(formaterMeteo({ libelle: 'Neige', temperature: -3.2, automatique: true }))
      .toBe('Neige, -3 °C')
  })
})

describe('repli manuel (§ 11.8)', () => {
  it('propose de quoi situer une journée sans aucun réseau', () => {
    expect(METEOS_MANUELLES.length).toBeGreaterThan(5)
    expect(METEOS_MANUELLES).toContain('Pluie')
    expect(METEOS_MANUELLES).toContain('Ciel dégagé')
  })
})
