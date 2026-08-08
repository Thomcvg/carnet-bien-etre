import { describe, it, expect } from 'vitest'
import {
  kgVersLb, lbVersKg,
  masseVersAffichage, masseVersStockage,
  formaterNombre, formaterEvolution, analyserNombre,
} from '$lib/domain/unites'
import {
  versISO, depuisISO, estDateISOValide, moisDe, ageA,
  joursEntre, ajouterMois, formaterDate, formaterMoisCompact, formaterMoisLong,
  debutDeMois, finDeMois,
} from '$lib/domain/dates'

describe('conversions d\'unités (A25)', () => {
  it('convertit les masses sans perte à l\'aller-retour', () => {
    expect(kgVersLb(1)).toBeCloseTo(2.2046, 4)
    expect(lbVersKg(kgVersLb(74.7))).toBeCloseTo(74.7, 10)
  })

  it('ne touche pas aux données quand l\'unité est déjà canonique (règle 16)', () => {
    expect(masseVersAffichage(74.7, 'kg')).toBe(74.7)
    expect(masseVersStockage(74.7, 'kg')).toBe(74.7)
  })

  it('garantit qu\'un changement d\'unité est réversible', () => {
    const stocke = 74.7
    const affiche = masseVersAffichage(stocke, 'lb')
    expect(masseVersStockage(affiche, 'lb')).toBeCloseTo(stocke, 10)
  })
})

describe('formatage numérique français', () => {
  it('utilise la virgule décimale', () => {
    expect(formaterNombre(74.65, 1)).toBe('74,7')
    expect(formaterNombre(74, 1)).toBe('74,0')
  })

  it('affiche l\'évolution avec un signe explicite', () => {
    expect(formaterEvolution(-0.7, 1, 'kg')).toBe('−0,7 kg')
    expect(formaterEvolution(1.2, 1, 'kg')).toBe('+1,2 kg')
    expect(formaterEvolution(0, 1, 'kg')).toBe('0,0 kg')
  })
})

describe('analyserNombre (K3)', () => {
  it('accepte indifféremment la virgule et le point', () => {
    expect(analyserNombre('74,5')).toBe(74.5)
    expect(analyserNombre('74.5')).toBe(74.5)
    expect(analyserNombre(' 74,5 ')).toBe(74.5)
  })

  it('ne transforme jamais une saisie vide en zéro (règle 5)', () => {
    expect(analyserNombre('')).toBeUndefined()
    expect(analyserNombre('   ')).toBeUndefined()
  })

  it('ne renvoie rien sur une saisie non numérique', () => {
    expect(analyserNombre('bonjour')).toBeUndefined()
  })
})

describe('dates', () => {
  it('convertit sans décalage de fuseau', () => {
    expect(versISO(depuisISO('2026-08-08'))).toBe('2026-08-08')
    expect(versISO(depuisISO('2026-01-01'))).toBe('2026-01-01')
    expect(versISO(depuisISO('2026-12-31'))).toBe('2026-12-31')
  })

  it('valide le format et l\'existence de la date', () => {
    expect(estDateISOValide('2026-08-08')).toBe(true)
    expect(estDateISOValide('2026-02-30')).toBe(false)
    expect(estDateISOValide('08/08/2026')).toBe(false)
    expect(estDateISOValide('2026-8-8')).toBe(false)
  })

  it('extrait la clé de mois', () => {
    expect(moisDe('2026-08-08')).toBe('2026-08')
  })

  it('délimite le mois (§ 8.1, résumé du mois)', () => {
    expect(debutDeMois('2026-08')).toBe('2026-08-01')
    expect(finDeMois('2026-08')).toBe('2026-08-31')
    expect(finDeMois('2026-02')).toBe('2026-02-28')
    expect(finDeMois('2028-02')).toBe('2028-02-29') // bissextile
    expect(finDeMois('2026-04')).toBe('2026-04-30')
  })

  it('compte les jours écoulés', () => {
    expect(joursEntre('2026-07-01', '2026-08-01')).toBe(31)
    expect(joursEntre('2026-08-01', '2026-07-01')).toBe(-31)
  })
})

describe('ageA (A7)', () => {
  it('calcule l\'âge révolu', () => {
    expect(ageA('1966-03-15', '2026-08-08')).toBe(60)
  })

  it('n\'accorde pas l\'année avant l\'anniversaire', () => {
    expect(ageA('1966-09-15', '2026-08-08')).toBe(59)
  })

  it('accorde l\'année le jour même', () => {
    expect(ageA('1966-08-08', '2026-08-08')).toBe(60)
  })

  it('ne se prononce pas sans date de naissance — l\'âge reste facultatif', () => {
    expect(ageA(undefined, '2026-08-08')).toBeUndefined()
    expect(ageA('pas une date', '2026-08-08')).toBeUndefined()
  })
})

describe('ajouterMois (K4, mode rattrapage)', () => {
  it('avance d\'un mois', () => {
    expect(ajouterMois('2026-07-01', 1)).toBe('2026-08-01')
  })

  it('ne déborde pas sur le mois suivant depuis un 31', () => {
    expect(ajouterMois('2026-01-31', 1)).toBe('2026-02-28')
    expect(ajouterMois('2026-03-31', 1)).toBe('2026-04-30')
  })

  it('gère le 29 février d\'une année bissextile', () => {
    expect(ajouterMois('2028-01-31', 1)).toBe('2028-02-29')
  })

  it('recule aussi bien qu\'il avance', () => {
    expect(ajouterMois('2026-08-01', -1)).toBe('2026-07-01')
    expect(ajouterMois('2026-01-15', -1)).toBe('2025-12-15')
  })
})

describe('formats d\'affichage (§ 6.2 v1.0)', () => {
  it('sépare le stockage de l\'affichage', () => {
    expect(formaterDate('2026-08-08', 'jj/mm/aaaa')).toBe('08/08/2026')
    expect(formaterDate('2026-08-08', 'aaaa-mm-jj')).toBe('2026-08-08')
  })

  it('propose la forme compacte du carnet d\'origine', () => {
    expect(formaterMoisCompact('2026-07-01')).toBe('07/26')
    expect(formaterMoisCompact('2026-08-01')).toBe('08/26')
  })

  it('nomme les mois en français', () => {
    expect(formaterMoisLong('2026-08')).toBe('août 2026')
    expect(formaterMoisLong('2026-01')).toBe('janvier 2026')
  })
})
