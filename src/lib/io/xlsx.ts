/**
 * Export XLSX (L2) — § 11.2.
 *
 * Complète le CSV : les cellules gardent leur type (un nombre reste un nombre),
 * ce que le CSV ne peut pas faire puisqu'il est du texte pur. Une cellule vide
 * reste vide, jamais zéro (règle 5).
 *
 * Le paquet `xlsx` provient du CDN officiel de SheetJS plutôt que du registre
 * npm public : la dernière version qui y est publiée (0.18.5) porte deux failles
 * non corrigées (pollution de prototype, ReDoS). Sans conséquence pour un usage
 * qui ne fait qu'écrire — jamais lire — un fichier, mais la version du CDN les
 * corrige de toute façon. Voir `package.json`.
 */

import * as XLSX from 'xlsx'
import type { DefinitionChamp, Mesure } from '../domain/types'
import { formaterDate } from '../domain/dates'
import { comparerMesures } from '../domain/tendance'

type CelluleTypee = string | number | undefined

function valeurCellule(v: unknown): CelluleTypee {
  if (v === undefined || v === null) return undefined
  if (typeof v === 'number') return Number.isFinite(v) ? v : undefined
  if (typeof v === 'boolean') return v ? 'oui' : 'non'
  if (typeof v === 'object' && !Array.isArray(v) && 'sys' in v && 'dia' in v) {
    const t = v as { sys: number; dia: number }
    return `${t.sys}/${t.dia}`
  }
  if (Array.isArray(v)) return v.join(', ')
  return String(v)
}

export interface OptionsXlsx {
  formatDate: 'jj/mm/aaaa' | 'aaaa-mm-jj'
}

export function versXlsx(
  mesures: Mesure[],
  champs: DefinitionChamp[],
  nomCarnet: string,
  options: OptionsXlsx = { formatDate: 'jj/mm/aaaa' },
): ArrayBuffer {
  const colonnes = [...champs].sort((a, b) => a.ordre - b.ordre)

  // Mêmes colonnes que l'export CSV, et l'heure qui distingue deux pesées d'un
  // même jour (A29) — sans elle, deux lignes identiques restent inexplicables.
  const entetes = [
    'Date',
    'Heure',
    ...colonnes.map((c) => (c.unite ? `${c.libelle} (${c.unite})` : c.libelle)),
    'Étiquettes',
    'Notes',
  ]

  const lignes = [...mesures]
    .sort(comparerMesures)
    .map((m) => [
      formaterDate(m.date, options.formatDate),
      m.moment,
      ...colonnes.map((c) => valeurCellule(m.valeurs[c.cle])),
      m.etiquettes && m.etiquettes.length > 0 ? m.etiquettes.join(', ') : undefined,
      m.notes,
    ])

  const feuille = XLSX.utils.aoa_to_sheet([entetes, ...lignes])

  // Largeurs de colonnes approximatives, pour que le fichier soit lisible
  // dès l'ouverture sans avoir à ajuster manuellement.
  feuille['!cols'] = entetes.map((e) => ({ wch: Math.max(10, e.length + 2) }))

  const classeur = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(classeur, feuille, 'Mesures')
  classeur.Props = { Title: nomCarnet, Application: 'Carnet Bien-être' }

  return XLSX.write(classeur, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
}
