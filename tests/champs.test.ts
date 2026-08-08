import { describe, it, expect } from 'vitest'
import {
  champsParDefaut, champsActifs, champsDeCategorie, trouverChamp, mensurationsActives,
  champsBienEtreActifs, champsActiviteActifs, activerPourUsage,
  genererCle, cleUnique, creerChampPersonnalise, prochainOrdre,
  estDernierChampActif, porteUneObservation,
  CLE_POIDS,
} from '$lib/domain/champs'
import type { CategorieChamp } from '$lib/domain/types'

describe('champsParDefaut (§ 20)', () => {
  const catalogue = champsParDefaut()

  it('couvre les quatre catégories', () => {
    const categories = new Set(catalogue.map((c) => c.categorie))
    expect(categories).toEqual(new Set(['corps', 'sante', 'bienetre', 'activite']))
  })

  it('livre tout désactivé, sauf le socle du lot 1', () => {
    const actifs = catalogue.filter((c) => c.actif).map((c) => c.cle)
    // Le socle « corps » du lot 1 reste actif par défaut (poids, taille, mensurations de base).
    expect(actifs).toContain('poids')
    expect(actifs).toContain(CLE_POIDS)
    // Rien de bien-être, santé ou activité n'est actif sans que l'utilisateur l'ait demandé.
    const actifsHorsCorps = catalogue.filter((c) => c.actif && c.categorie !== 'corps')
    expect(actifsHorsCorps).toEqual([])
  })

  it('ne duplique aucune clé', () => {
    const cles = catalogue.map((c) => c.cle)
    expect(new Set(cles).size).toBe(cles.length)
  })

  it('le poids est désactivable comme tout autre champ', () => {
    // Il n'existe plus de champ privilégié : suivre uniquement son sommeil ou
    // son stress est un usage à part entière (§ 3).
    const poids = catalogue.find((c) => c.cle === CLE_POIDS)
    expect(poids).toBeDefined()
    expect(estDernierChampActif(catalogue, CLE_POIDS)).toBe(false)
  })

  it('refuse de désactiver le dernier champ actif, quel qu\'il soit', () => {
    const seulStress = catalogue.map((c) => ({ ...c, actif: c.cle === 'stress' }))
    expect(estDernierChampActif(seulStress, 'stress')).toBe(true)
    expect(estDernierChampActif(seulStress, CLE_POIDS)).toBe(false)
  })
})

describe('porteUneObservation', () => {
  const mesure = (valeurs: Record<string, number>) => ({
    id: 'm', profilId: 'p', date: '2026-08-01', valeurs,
    creeLe: '', modifieLe: '',
  })

  it('écarte une saisie qui ne porte que la taille', () => {
    // Renseigner sa taille depuis les paramètres ne doit pas compter comme un relevé.
    expect(porteUneObservation(mesure({ taille: 165 }))).toBe(false)
  })

  it('retient toute saisie portant autre chose', () => {
    expect(porteUneObservation(mesure({ poids: 70 }))).toBe(true)
    expect(porteUneObservation(mesure({ stress: 3 }))).toBe(true)
    expect(porteUneObservation(mesure({ taille: 165, sommeil_qualite: 4 }))).toBe(true)
  })
})

describe('champsActifs — tri par catégorie puis par ordre', () => {
  it('groupe corps, santé, bien-être puis activité', () => {
    const catalogue = champsParDefaut().map((c) => ({ ...c, actif: true }))
    const tries = champsActifs(catalogue)
    const categories = tries.map((c) => c.categorie)
    // Chaque catégorie doit former un bloc contigu, dans l'ordre attendu.
    const premiereApparition = (cat: CategorieChamp) => categories.indexOf(cat)
    expect(premiereApparition('corps')).toBeLessThan(premiereApparition('sante'))
    expect(premiereApparition('sante')).toBeLessThan(premiereApparition('bienetre'))
    expect(premiereApparition('bienetre')).toBeLessThan(premiereApparition('activite'))
  })

  it('ignore les champs désactivés', () => {
    const catalogue = champsParDefaut()
    const actifs = champsActifs(catalogue)
    expect(actifs.every((c) => c.actif)).toBe(true)
  })
})

describe('champsDeCategorie / trouverChamp / mensurationsActives', () => {
  const catalogue = champsParDefaut().map((c) => ({ ...c, actif: true }))

  it('filtre par catégorie', () => {
    expect(champsDeCategorie(catalogue, 'bienetre').every((c) => c.categorie === 'bienetre')).toBe(true)
  })

  it('trouve un champ par sa clé', () => {
    expect(trouverChamp(catalogue, 'stress')?.libelle).toBe('Stress')
    expect(trouverChamp(catalogue, 'inexistant')).toBeUndefined()
  })

  it('exclut le poids et la taille des mensurations', () => {
    const m = mensurationsActives(catalogue)
    expect(m.some((c) => c.cle === 'poids')).toBe(false)
    expect(m.some((c) => c.cle === 'taille')).toBe(false)
    expect(m.some((c) => c.cle === 'tour_taille')).toBe(true)
  })
})

describe('champsBienEtreActifs / champsActiviteActifs', () => {
  const catalogue = champsParDefaut().map((c) => ({ ...c, actif: true }))

  it('regroupe santé et activité ensemble, bien-être à part', () => {
    expect(champsBienEtreActifs(catalogue).every((c) => c.categorie === 'bienetre')).toBe(true)
    expect(champsActiviteActifs(catalogue).every((c) => ['sante', 'activite'].includes(c.categorie))).toBe(true)
  })
})

describe('activerPourUsage (J5)', () => {
  it('active un sous-ensemble ciblé pour un usage sportif', () => {
    const catalogue = champsParDefaut()
    const adapte = activerPourUsage(catalogue, 'sport')
    expect(trouverChamp(adapte, 'activite_type')?.actif).toBe(true)
    expect(trouverChamp(adapte, 'renforcement')?.actif).toBe(true)
    // Un champ bien-être non concerné par cet usage reste désactivé.
    expect(trouverChamp(adapte, 'stress')?.actif).toBe(false)
  })

  it('ne modifie rien pour un usage encore indécis', () => {
    const catalogue = champsParDefaut()
    const adapte = activerPourUsage(catalogue, 'indecis')
    expect(adapte).toEqual(catalogue)
  })

  it('ne désactive jamais un champ déjà actif ailleurs', () => {
    const catalogue = champsParDefaut()
    const adapte = activerPourUsage(catalogue, 'constantes')
    expect(trouverChamp(adapte, 'poids')?.actif).toBe(true)
  })
})

describe('genererCle (C18)', () => {
  it('normalise en identifiant stable', () => {
    expect(genererCle('Raideur matinale')).toBe('raideur_matinale')
    expect(genererCle('Énergie décroissante')).toBe('energie_decroissante')
    expect(genererCle('  Espaces   multiples  ')).toBe('espaces_multiples')
  })

  it('ne produit jamais une clé vide', () => {
    expect(genererCle('!!!')).toBe('champ')
    expect(genererCle('')).toBe('champ')
  })
})

describe('cleUnique', () => {
  it('laisse une clé libre inchangée', () => {
    expect(cleUnique('moral', [])).toBe('moral')
  })

  it('suffixe une clé déjà prise', () => {
    const existants = [{ cle: 'moral' } as never]
    expect(cleUnique('moral', existants)).toBe('moral_2')
  })

  it('avance au premier suffixe libre', () => {
    const existants = [{ cle: 'moral' }, { cle: 'moral_2' }] as never[]
    expect(cleUnique('moral', existants)).toBe('moral_3')
  })
})

describe('creerChampPersonnalise', () => {
  it('crée un champ actif, non système, marqué personnalisé', () => {
    const c = creerChampPersonnalise(
      { libelle: 'Raideur matinale', categorie: 'bienetre', type: 'echelle5' },
      champsParDefaut(),
      10,
    )
    expect(c.cle).toBe('raideur_matinale')
    expect(c.actif).toBe(true)
    expect(c.personnalise).toBe(true)
  })

  it('évite toute collision avec le catalogue existant', () => {
    const c = creerChampPersonnalise(
      { libelle: 'Stress', categorie: 'bienetre', type: 'echelle5' },
      champsParDefaut(),
      10,
    )
    expect(c.cle).not.toBe('stress')
  })
})

describe('prochainOrdre', () => {
  it('se place après le dernier champ de la catégorie', () => {
    const catalogue = champsParDefaut()
    const rang = prochainOrdre(catalogue, 'bienetre')
    const max = Math.max(...catalogue.filter((c) => c.categorie === 'bienetre').map((c) => c.ordre))
    expect(rang).toBe(max + 10)
  })

  it('démarre à 10 pour une catégorie vide', () => {
    expect(prochainOrdre([], 'bienetre')).toBe(10)
  })
})
