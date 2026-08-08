import { describe, it, expect } from 'vitest'
import {
  calculerImc,
  lireImc,
  fourchetteReference,
  poidsDeReference,
  ratioTailleStature,
  formaterImc,
  FOURCHETTE_ADULTE,
  FOURCHETTE_APRES_65,
} from '$lib/domain/imc'

describe('calculerImc', () => {
  it('applique poids / taille²', () => {
    // Crystèle : 74 kg pour 1,65 m
    expect(calculerImc(74, 165)).toBeCloseTo(27.18, 2)
  })

  it('ne calcule rien si une donnée manque (règle 14)', () => {
    expect(calculerImc(74, undefined)).toBeUndefined()
    expect(calculerImc(undefined, 165)).toBeUndefined()
    expect(calculerImc(undefined, undefined)).toBeUndefined()
  })

  it('refuse les valeurs absurdes plutôt que de renvoyer zéro', () => {
    expect(calculerImc(0, 165)).toBeUndefined()
    expect(calculerImc(74, 0)).toBeUndefined()
    expect(calculerImc(-5, 165)).toBeUndefined()
    expect(calculerImc(Number.NaN, 165)).toBeUndefined()
  })
})

describe('fourchetteReference', () => {
  it('utilise le repère OMS avant 65 ans', () => {
    expect(fourchetteReference(40)).toEqual(FOURCHETTE_ADULTE)
    expect(fourchetteReference(64)).toEqual(FOURCHETTE_ADULTE)
  })

  it('relève la fourchette à partir de 65 ans', () => {
    expect(fourchetteReference(65)).toEqual(FOURCHETTE_APRES_65)
    expect(fourchetteReference(82)).toEqual(FOURCHETTE_APRES_65)
  })

  it('retombe sur le repère adulte quand l\'âge est inconnu', () => {
    expect(fourchetteReference(undefined)).toEqual(FOURCHETTE_ADULTE)
  })
})

describe('lireImc — la nuance liée à l\'âge', () => {
  it('lit le même IMC différemment selon l\'âge', () => {
    // C'est le cœur de l'exigence A7 : un IMC de 21 est confortable à 40 ans
    // et constitue un point de vigilance à 75 ans.
    const jeune = lireImc(21, 40)
    const age = lireImc(21, 75)

    expect(jeune.position).toBe('dans')
    expect(jeune.vigilanceBasse).toBe(false)

    expect(age.position).toBe('sous')
    expect(age.vigilanceBasse).toBe(true)
  })

  it('place correctement les bornes, incluses', () => {
    expect(lireImc(18.5, 40).position).toBe('dans')
    expect(lireImc(25, 40).position).toBe('dans')
    expect(lireImc(18.4, 40).position).toBe('sous')
    expect(lireImc(25.1, 40).position).toBe('au-dessus')

    expect(lireImc(22, 70).position).toBe('dans')
    expect(lireImc(27, 70).position).toBe('dans')
    expect(lireImc(21.9, 70).position).toBe('sous')
  })

  it('n\'emploie aucun terme de jugement (§ 12.1)', () => {
    const interdits = ['maigreur', 'surpoids', 'obésité', 'obese', 'normal', 'anormal', 'excès']
    for (const age of [30, 70, undefined]) {
      for (const imc of [16, 21, 24, 28, 35]) {
        const libelle = lireImc(imc, age).libelle.toLowerCase()
        for (const mot of interdits) {
          expect(libelle).not.toContain(mot)
        }
      }
    }
  })

  it('signale si la lecture a pu tenir compte de l\'âge', () => {
    expect(lireImc(24, 50).ageConnu).toBe(true)
    expect(lireImc(24, undefined).ageConnu).toBe(false)
  })
})

describe('poidsDeReference', () => {
  it('renvoie une zone, jamais un chiffre unique (A8)', () => {
    const z = poidsDeReference(165, 40)
    expect(z).toBeDefined()
    expect(z!.min).toBeCloseTo(50.4, 1)
    expect(z!.max).toBeCloseTo(68.1, 1)
    expect(z!.max).toBeGreaterThan(z!.min)
  })

  it('décale la zone vers le haut après 65 ans', () => {
    const avant = poidsDeReference(165, 40)!
    const apres = poidsDeReference(165, 70)!
    expect(apres.min).toBeGreaterThan(avant.min)
    expect(apres.max).toBeGreaterThan(avant.max)
  })

  it('ne calcule rien sans taille', () => {
    expect(poidsDeReference(undefined, 40)).toBeUndefined()
    expect(poidsDeReference(0, 40)).toBeUndefined()
  })
})

describe('ratioTailleStature', () => {
  it('rapporte le tour de taille à la stature (A5)', () => {
    expect(ratioTailleStature(92, 165)).toBeCloseTo(0.558, 3)
    expect(ratioTailleStature(80, 160)).toBeCloseTo(0.5, 3)
  })

  it('ne calcule rien si une des deux valeurs manque', () => {
    expect(ratioTailleStature(undefined, 165)).toBeUndefined()
    expect(ratioTailleStature(92, undefined)).toBeUndefined()
  })
})

describe('formaterImc', () => {
  it('affiche une décimale, virgule française (§ 9 v1.0)', () => {
    expect(formaterImc(27.1799)).toBe('27,2')
    expect(formaterImc(22)).toBe('22,0')
  })
})
