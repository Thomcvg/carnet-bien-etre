import { describe, it, expect } from 'vitest'
import {
  calculerProgression,
  cibleEffective,
  rythmeVise,
  joursJusquACible,
  evaluerLargeurFourchette,
} from '$lib/domain/objectifs'
import type { Objectif } from '$lib/domain/types'

function objectif(p: Partial<Objectif>): Objectif {
  return {
    id: 'o1',
    profilId: 'p1',
    type: 'cible',
    champCle: 'poids',
    actif: true,
    creeLe: '2026-07-01T00:00:00.000Z',
    ...p,
  }
}

describe('calculerProgression — objectif de perte', () => {
  const o = objectif({ type: 'cible', valeurMin: 62, valeurMax: 62 })

  it('reproduit le cas réel du carnet de Crystèle', () => {
    // 74,7 au départ, 74,0 aujourd'hui, objectif 62.
    const p = calculerProgression(o, 74.7, 74.0)
    expect(p.pourcent).toBeCloseTo(5.51, 2)
    expect(p.restant).toBeCloseTo(12, 5)
    expect(p.cible).toBe(62)
    expect(p.atteint).toBe(false)
  })

  it('borne l\'affichage à 100 % quand la cible est dépassée', () => {
    const p = calculerProgression(o, 74.7, 60)
    expect(p.pourcent).toBe(100)
    expect(p.atteint).toBe(true)
  })

  it('borne l\'affichage à 0 % en cas de recul, sans jamais passer sous zéro', () => {
    const p = calculerProgression(o, 74.7, 76)
    expect(p.pourcent).toBe(0)
    expect(p.atteint).toBe(false)
    // La distance réelle reste juste : on n'édulcore pas le chiffre.
    expect(p.restant).toBeCloseTo(14, 5)
  })
})

describe('calculerProgression — objectif de prise de poids (F3)', () => {
  it('fonctionne avec la même formule, sans cas particulier', () => {
    const o = objectif({ type: 'cible', valeurMin: 62, valeurMax: 62 })
    const p = calculerProgression(o, 55, 57)
    expect(p.pourcent).toBeCloseTo(28.57, 2)
    expect(p.restant).toBeCloseTo(5, 5)
    expect(p.atteint).toBe(false)
  })

  it('reconnaît l\'objectif atteint dans le sens montant', () => {
    const o = objectif({ type: 'cible', valeurMin: 62, valeurMax: 62 })
    expect(calculerProgression(o, 55, 63).atteint).toBe(true)
  })
})

describe('calculerProgression — objectif en fourchette (F1)', () => {
  const o = objectif({ type: 'fourchette', valeurMin: 61, valeurMax: 64 })

  it('vise la borne la plus proche quand on est en dehors', () => {
    expect(cibleEffective(o, 70)).toBe(64)
    expect(cibleEffective(o, 50)).toBe(61)
  })

  it('considère l\'objectif atteint partout dans la fourchette', () => {
    for (const poids of [61, 62.5, 64]) {
      const p = calculerProgression(o, 74.7, poids)
      expect(p.dansLaFourchette).toBe(true)
      expect(p.atteint).toBe(true)
      expect(p.pourcent).toBe(100)
    }
  })

  it('n\'échoue plus à 63,2 kg — ce que la cible unique ne permettait pas', () => {
    const p = calculerProgression(o, 74.7, 63.2)
    expect(p.atteint).toBe(true)
    expect(p.restant).toBe(0)
  })

  it('progresse normalement au-dessus de la fourchette', () => {
    const p = calculerProgression(o, 74.7, 66)
    expect(p.cible).toBe(64)
    expect(p.pourcent).toBeCloseTo(81.31, 2)
    expect(p.dansLaFourchette).toBe(false)
  })
})

describe('calculerProgression — maintien (F2)', () => {
  const o = objectif({ type: 'maintien', valeurMin: 61, valeurMax: 64 })

  it('n\'affiche pas de pourcentage mais une position', () => {
    const dedans = calculerProgression(o, 62, 62.5)
    expect(dedans.pourcent).toBeNull()
    expect(dedans.dansLaFourchette).toBe(true)
    expect(dedans.atteint).toBe(true)
    expect(dedans.restant).toBe(0)
  })

  it('mesure l\'écart à la borne la plus proche quand on en sort', () => {
    const dehors = calculerProgression(o, 62, 66)
    expect(dehors.dansLaFourchette).toBe(false)
    expect(dehors.restant).toBeCloseTo(2, 5)
    expect(dehors.pourcent).toBeNull()
  })
})

describe('calculerProgression — cas non calculables (règle 14)', () => {
  const o = objectif({ type: 'cible', valeurMin: 62, valeurMax: 62 })

  it('ne calcule rien sans donnée', () => {
    expect(calculerProgression(o, undefined, 74).pourcent).toBeNull()
    expect(calculerProgression(o, 74.7, undefined).pourcent).toBeNull()
  })

  it('ne divise pas par zéro quand le départ est déjà l\'objectif', () => {
    const p = calculerProgression(o, 62, 62)
    expect(p.pourcent).toBeNull()
    expect(p.atteint).toBe(true)
  })

  it('ne calcule pas de progression pour un objectif comportemental', () => {
    const c = objectif({ type: 'comportemental', valeurMin: 3, valeurMax: 3, champCle: 'marche' })
    expect(calculerProgression(c, 0, 2).pourcent).toBeNull()
  })

  it('ne calcule rien si l\'objectif n\'a aucune borne', () => {
    const vide = objectif({ type: 'cible' })
    expect(calculerProgression(vide, 74.7, 74).pourcent).toBeNull()
  })
})

describe('rythmeVise (F6)', () => {
  it('signale un rythme intenable', () => {
    // 12 kg à perdre en un mois.
    const r = rythmeVise(74, 62, 30)
    expect(r).toBeDefined()
    expect(r!.inconfortable).toBe(true)
  })

  it('accepte un rythme raisonnable', () => {
    // 2 kg sur un an.
    const r = rythmeVise(74, 72, 365)
    expect(r!.inconfortable).toBe(false)
  })

  it('ne se prononce pas sur une échéance passée ou nulle', () => {
    expect(rythmeVise(74, 62, 0)).toBeUndefined()
    expect(rythmeVise(74, 62, -10)).toBeUndefined()
  })
})

describe('joursJusquACible (F7)', () => {
  it('projette au rythme observé', () => {
    // −0,02 kg/jour, 12 kg à parcourir.
    expect(joursJusquACible(74, 62, -0.02)).toBe(600)
  })

  it('ne projette rien si la tendance s\'éloigne de la cible', () => {
    expect(joursJusquACible(74, 62, +0.02)).toBeUndefined()
  })

  it('ne projette rien sans tendance', () => {
    expect(joursJusquACible(74, 62, 0)).toBeUndefined()
  })
})

describe('evaluerLargeurFourchette (§ 9.1)', () => {
  it('signale une fourchette plus large que le chemin à parcourir', () => {
    // 75 kg, vise « 67,5 à 72,5 » : 5 kg de large pour 2,5 kg à parcourir.
    // L'objectif se déclarerait atteint à mi-chemin.
    const e = evaluerLargeurFourchette(75, 67.5, 72.5)
    expect(e?.tropLarge).toBe(true)
    expect(e?.largeur).toBe(5)
    expect(e?.distance).toBe(2.5)
  })

  it('accepte une fourchette étroite au regard du chemin', () => {
    // 75 kg, vise « 69 à 71 » : 2 kg de large pour 4 kg à parcourir.
    expect(evaluerLargeurFourchette(75, 69, 71)?.tropLarge).toBe(false)
  })

  it('vaut aussi pour une reprise de poids (F3)', () => {
    // 50 kg et vise « 52 à 58 » : 6 kg de large pour 2 kg à parcourir.
    expect(evaluerLargeurFourchette(50, 52, 58)?.tropLarge).toBe(true)
  })

  it('ne se prononce pas quand on est déjà dans la fourchette', () => {
    expect(evaluerLargeurFourchette(70, 68, 72)).toBeUndefined()
  })

  it('ne se prononce pas sans poids actuel ni sur une fourchette nulle', () => {
    expect(evaluerLargeurFourchette(undefined, 68, 72)).toBeUndefined()
    expect(evaluerLargeurFourchette(75, 70, 70)).toBeUndefined()
  })
})
