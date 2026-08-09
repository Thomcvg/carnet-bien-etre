import { describe, it, expect } from 'vitest'
import {
  calculerProgression,
  cibleEffective,
  rythmeVise,
  joursJusquACible,
  evaluerLargeurFourchette,
  evaluerRegularite,
  valeursDeProgression,
  peutPorterObjectif,
  estObjectivable,
  familleObjectif,
  suivreObjectifs,
} from '$lib/domain/objectifs'
import { serie } from '$lib/domain/tendance'
import type { DefinitionChamp, Mesure, Objectif, TypeChamp, ValeurChamp } from '$lib/domain/types'

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

function champ(cle: string, type: TypeChamp, p: Partial<DefinitionChamp> = {}): DefinitionChamp {
  return {
    cle,
    libelle: cle,
    categorie: 'bienetre',
    type,
    actif: true,
    ordre: 10,
    personnalise: false,
    ...p,
  }
}

let compteur = 0
function mesure(date: string, valeurs: Record<string, ValeurChamp>): Mesure {
  compteur += 1
  return {
    id: `m${compteur}`,
    profilId: 'p1',
    date,
    valeurs,
    creeLe: `${date}T08:00:00.000Z`,
    modifieLe: `${date}T08:00:00.000Z`,
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

  it('ne calcule pas de progression pour un objectif de régularité', () => {
    // Il a son propre moteur : un décompte d'occurrences, pas un chemin parcouru.
    const c = objectif({ type: 'regularite', valeurMin: 3, champCle: 'marche' })
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

/* ------------------------------------------------------------------ */
/* Un objectif sur n'importe quelle donnée (F4)                        */
/* ------------------------------------------------------------------ */

describe('quels champs peuvent porter un objectif', () => {
  it('accepte les champs numériques pour un objectif de niveau', () => {
    for (const t of ['nombre', 'duree', 'echelle5'] as const) {
      expect(peutPorterObjectif(champ('x', t), 'niveau')).toBe(true)
    }
  })

  it('accepte en plus le booléen pour une régularité — « deux fois par semaine »', () => {
    expect(peutPorterObjectif(champ('renforcement', 'booleen'), 'regularite')).toBe(true)
    // Un booléen n'a pas de niveau à atteindre : il vaut oui, ou il vaut non.
    expect(peutPorterObjectif(champ('renforcement', 'booleen'), 'niveau')).toBe(false)
  })

  it('refuse ce qui n\'a pas d\'ordre, et la tension qui n\'a pas de valeur unique', () => {
    for (const t of ['texte', 'choix', 'tension'] as const) {
      expect(estObjectivable(champ('x', t))).toBe(false)
    }
  })

  it('range chaque type d\'objectif dans sa famille de calcul', () => {
    expect(familleObjectif('regularite')).toBe('regularite')
    for (const t of ['cible', 'fourchette', 'maintien'] as const) {
      expect(familleObjectif(t)).toBe('niveau')
    }
  })
})

describe('valeursDeProgression', () => {
  const points = [
    { date: '2026-08-01', valeur: 5 },
    { date: '2026-08-02', valeur: 1 },
    { date: '2026-08-03', valeur: 3 },
  ]

  it('lit la dernière mesure pour une donnée qui dérive lentement', () => {
    const v = valeursDeProgression(points, champ('tour_taille', 'nombre'))
    expect(v.initiale).toBe(5)
    expect(v.actuelle).toBe(3)
  })

  it('lisse une échelle de 1 à 5, qu\'une seule journée ferait bondir', () => {
    const v = valeursDeProgression(points, champ('stress', 'echelle5'))
    // Moyenne des trois derniers relevés, et non le 3 isolé.
    expect(v.actuelle).toBeCloseTo(3, 5)
    // Le point de départ, lui, reste le fait brut de l'historique.
    expect(v.initiale).toBe(5)
  })

  it('ne rend rien sur une série vide (règle 14)', () => {
    const v = valeursDeProgression([], champ('poids', 'nombre'))
    expect(v.initiale).toBeUndefined()
    expect(v.actuelle).toBeUndefined()
  })
})

/* ------------------------------------------------------------------ */
/* Objectif de régularité (F4)                                         */
/* ------------------------------------------------------------------ */

describe('evaluerRegularite — le dénominateur (règle 2 de la charte)', () => {
  const sommeil = champ('sommeil_duree', 'nombre', { unite: 'h' })
  const o = objectif({
    type: 'regularite',
    champCle: 'sommeil_duree',
    valeurMin: 7,
    regularite: { occurrences: 5, periode: 'semaine' },
  })

  it('ne compte que les jours notés, jamais les sept jours de la période', () => {
    // Trois nuits notées sur les sept derniers jours, deux à 7 h ou plus.
    const mesures = [
      mesure('2026-08-09', { sommeil_duree: 8 }),
      mesure('2026-08-07', { sommeil_duree: 6 }),
      mesure('2026-08-05', { sommeil_duree: 7 }),
    ]
    const r = evaluerRegularite(mesures, o, sommeil, '2026-08-09')
    expect(r).toBeDefined()
    expect(r!.joursNotes).toBe(3)
    expect(r!.joursConformes).toBe(2)
    // Et surtout : pas 7. Les quatre jours sans saisie n'ont rien manqué,
    // ils n'ont simplement pas été observés.
    expect(r!.joursNotes).not.toBe(7)
  })

  it('ignore les mesures hors de la fenêtre glissante', () => {
    const mesures = [
      mesure('2026-08-09', { sommeil_duree: 8 }),
      mesure('2026-08-02', { sommeil_duree: 8 }), // huitième jour : dehors
      mesure('2026-08-03', { sommeil_duree: 8 }), // septième jour : dedans
    ]
    const r = evaluerRegularite(mesures, o, sommeil, '2026-08-09')
    expect(r!.joursNotes).toBe(2)
  })

  it('ignore une mesure postérieure à la date de lecture', () => {
    const mesures = [mesure('2026-08-12', { sommeil_duree: 8 })]
    expect(evaluerRegularite(mesures, o, sommeil, '2026-08-09')!.joursNotes).toBe(0)
  })

  it('ne compte pas deux fois une journée saisie deux fois', () => {
    const mesures = [
      mesure('2026-08-09', { sommeil_duree: 8 }),
      mesure('2026-08-09', { sommeil_duree: 5 }),
    ]
    const r = evaluerRegularite(mesures, o, sommeil, '2026-08-09')
    expect(r!.joursNotes).toBe(1)
    // Il suffit qu'une des deux saisies remplisse la condition.
    expect(r!.joursConformes).toBe(1)
  })

  it('saute une mesure où le champ visé n\'est pas renseigné', () => {
    const mesures = [
      mesure('2026-08-09', { sommeil_duree: 8 }),
      mesure('2026-08-08', { poids: 70 }),
    ]
    expect(evaluerRegularite(mesures, o, sommeil, '2026-08-09')!.joursNotes).toBe(1)
  })

  it('ne calcule pas de part tant qu\'aucun jour n\'est noté (règle 14)', () => {
    const r = evaluerRegularite([], o, sommeil, '2026-08-09')
    expect(r!.joursNotes).toBe(0)
    expect(r!.pourcent).toBeNull()
    expect(r!.repereAtteint).toBe(false)
  })
})

describe('evaluerRegularite — les conditions', () => {
  it('lit un seuil haut : « stress à 2 au plus, quatre jours par semaine »', () => {
    const stress = champ('stress', 'echelle5')
    const o = objectif({
      type: 'regularite',
      champCle: 'stress',
      valeurMax: 2,
      regularite: { occurrences: 4, periode: 'semaine' },
    })
    const mesures = [
      mesure('2026-08-09', { stress: 1 }),
      mesure('2026-08-08', { stress: 2 }),
      mesure('2026-08-07', { stress: 4 }),
    ]
    const r = evaluerRegularite(mesures, o, stress, '2026-08-09')
    expect(r!.joursConformes).toBe(2)
    expect(r!.joursNotes).toBe(3)
  })

  it('lit un encadrement : « entre 6 et 9 heures »', () => {
    const sommeil = champ('sommeil_duree', 'nombre')
    const o = objectif({
      type: 'regularite',
      champCle: 'sommeil_duree',
      valeurMin: 6,
      valeurMax: 9,
      regularite: { occurrences: 5, periode: 'semaine' },
    })
    const mesures = [
      mesure('2026-08-09', { sommeil_duree: 7 }),
      mesure('2026-08-08', { sommeil_duree: 11 }),
      mesure('2026-08-07', { sommeil_duree: 4 }),
    ]
    expect(evaluerRegularite(mesures, o, sommeil, '2026-08-09')!.joursConformes).toBe(1)
  })

  it('compte un booléen sans seuil : « renforcement, deux fois par semaine »', () => {
    const renfo = champ('renforcement', 'booleen')
    const o = objectif({
      type: 'regularite',
      champCle: 'renforcement',
      regularite: { occurrences: 2, periode: 'semaine' },
    })
    const mesures = [
      mesure('2026-08-09', { renforcement: true }),
      mesure('2026-08-07', { renforcement: false }),
      mesure('2026-08-05', { renforcement: true }),
    ]
    const r = evaluerRegularite(mesures, o, renfo, '2026-08-09')
    expect(r!.joursNotes).toBe(3)
    expect(r!.joursConformes).toBe(2)
    expect(r!.repereAtteint).toBe(true)
  })

  it('borne la part à 100 quand le repère est dépassé', () => {
    const renfo = champ('renforcement', 'booleen')
    const o = objectif({
      type: 'regularite',
      champCle: 'renforcement',
      regularite: { occurrences: 2, periode: 'semaine' },
    })
    const mesures = ['2026-08-09', '2026-08-08', '2026-08-07', '2026-08-06']
      .map((d) => mesure(d, { renforcement: true }))
    expect(evaluerRegularite(mesures, o, renfo, '2026-08-09')!.pourcent).toBe(100)
  })

  it('ouvre la fenêtre à trente jours pour une période mensuelle', () => {
    const renfo = champ('renforcement', 'booleen')
    const o = objectif({
      type: 'regularite',
      champCle: 'renforcement',
      regularite: { occurrences: 8, periode: 'mois' },
    })
    const mesures = [
      mesure('2026-08-09', { renforcement: true }),
      mesure('2026-07-20', { renforcement: true }), // vingtième jour : dedans
      mesure('2026-07-05', { renforcement: true }), // trente-cinquième : dehors
    ]
    expect(evaluerRegularite(mesures, o, renfo, '2026-08-09')!.joursNotes).toBe(2)
  })

  it('ne se prononce pas sans critère, ni sur un champ inéligible', () => {
    const sansCritere = objectif({ type: 'regularite', champCle: 'stress', valeurMin: 2 })
    expect(evaluerRegularite([], sansCritere, champ('stress', 'echelle5'), '2026-08-09'))
      .toBeUndefined()

    const o = objectif({
      type: 'regularite',
      champCle: 'humeur',
      regularite: { occurrences: 3, periode: 'semaine' },
    })
    expect(evaluerRegularite([], o, champ('humeur', 'texte'), '2026-08-09')).toBeUndefined()
  })
})

/* ------------------------------------------------------------------ */
/* Plusieurs objectifs à la fois                                       */
/* ------------------------------------------------------------------ */

describe('suivreObjectifs', () => {
  const champs = [
    champ('poids', 'nombre', { categorie: 'corps', unite: 'kg' }),
    champ('sommeil_duree', 'nombre', { unite: 'h' }),
  ]
  const mesures = [
    mesure('2026-08-05', { poids: 74.7, sommeil_duree: 8 }),
    mesure('2026-08-09', { poids: 74, sommeil_duree: 6 }),
  ]

  const objPoids = objectif({ id: 'o-poids', type: 'cible', valeurMin: 62, valeurMax: 62 })
  const objSommeil = objectif({
    id: 'o-sommeil',
    type: 'regularite',
    champCle: 'sommeil_duree',
    valeurMin: 7,
    regularite: { occurrences: 5, periode: 'semaine' },
  })

  it('résout les deux familles côte à côte, sans que l\'une chasse l\'autre', () => {
    const s = suivreObjectifs([objPoids, objSommeil], champs, mesures, '2026-08-09')
    expect(s).toHaveLength(2)

    const poids = s.find((x) => x.champ.cle === 'poids')!
    expect(poids.progression).not.toBeNull()
    expect(poids.regularite).toBeNull()
    expect(poids.progression!.cible).toBe(62)

    const sommeil = s.find((x) => x.champ.cle === 'sommeil_duree')!
    expect(sommeil.regularite).not.toBeNull()
    expect(sommeil.progression).toBeNull()
    expect(sommeil.regularite!.joursConformes).toBe(1)
  })

  it('fait taire un objectif dont le champ a été désactivé, sans le perdre', () => {
    const eteint = champs.map((c) => (c.cle === 'poids' ? { ...c, actif: false } : c))
    const s = suivreObjectifs([objPoids, objSommeil], eteint, mesures, '2026-08-09')
    expect(s.map((x) => x.champ.cle)).toEqual(['sommeil_duree'])
  })

  it('ignore un objectif retiré et un objectif sur un champ inconnu', () => {
    const retire = { ...objPoids, actif: false }
    const fantome = objectif({ id: 'o-x', champCle: 'inexistant', valeurMin: 1, valeurMax: 2 })
    expect(suivreObjectifs([retire, fantome], champs, mesures, '2026-08-09')).toHaveLength(0)
  })

  it('calcule la progression sur la série du champ visé, pas sur celle du poids', () => {
    const objNiveauSommeil = objectif({
      id: 'o-s2',
      type: 'fourchette',
      champCle: 'sommeil_duree',
      valeurMin: 7,
      valeurMax: 9,
    })
    const s = suivreObjectifs([objNiveauSommeil], champs, mesures, '2026-08-09')
    const attendu = valeursDeProgression(serie(mesures, 'sommeil_duree'), champs[1]!)
    expect(attendu.initiale).toBe(8)
    expect(attendu.actuelle).toBe(6)
    expect(s[0]!.progression!.cible).toBe(7)
  })
})
