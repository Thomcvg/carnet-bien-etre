import { describe, it, expect } from 'vitest'
import { calculerRepereActivite, CIBLE_MINUTES_HEBDO_OMS } from '$lib/domain/activite'

describe('calculerRepereActivite', () => {
  it('ne calcule rien sans donnée (règle 14)', () => {
    const r = calculerRepereActivite(undefined, undefined)
    expect(r.pourcentCible).toBeNull()
  })

  it('situe la saisie à 100 % du repère OMS à 150 minutes', () => {
    const r = calculerRepereActivite(150)
    expect(r.pourcentCible).toBe(100)
  })

  it('reste sous 100 % avant le repère', () => {
    const r = calculerRepereActivite(75)
    expect(r.pourcentCible).toBe(50)
  })

  it('borne l\'affichage à 100 % au-delà du repère', () => {
    const r = calculerRepereActivite(300)
    expect(r.pourcentCible).toBe(100)
  })

  it('ignore une valeur négative plutôt que d\'afficher un pourcentage absurde', () => {
    expect(calculerRepereActivite(-10).pourcentCible).toBeNull()
  })

  it('transmet le renforcement sans le conditionner à la durée', () => {
    expect(calculerRepereActivite(undefined, true).renforcementRegulier).toBe(true)
    expect(calculerRepereActivite(50, false).renforcementRegulier).toBe(false)
  })

  it('la cible correspond au repère OMS documenté', () => {
    expect(CIBLE_MINUTES_HEBDO_OMS).toBe(150)
  })
})
