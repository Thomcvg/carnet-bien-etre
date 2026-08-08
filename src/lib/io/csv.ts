/**
 * Export CSV (L2) — § 11.2.
 *
 * Le CSV sert à récupérer les données brutes dans un tableur. Il est donc écrit
 * pour être lisible par un tableur français : séparateur point-virgule et virgule
 * décimale, ce qu'attend Excel en configuration francophone.
 *
 * Une cellule vide reste vide : elle ne devient jamais zéro (règle 5).
 */

import type { DefinitionChamp, Mesure } from '../domain/types'
import { formaterDate } from '../domain/dates'

const SEPARATEUR = ';'

function echapper(v: string): string {
  if (v.includes(SEPARATEUR) || v.includes('"') || v.includes('\n')) {
    return `"${v.replace(/"/g, '""')}"`
  }
  return v
}

function cellule(v: unknown): string {
  if (v === undefined || v === null) return ''
  if (typeof v === 'number') return Number.isFinite(v) ? String(v).replace('.', ',') : ''
  if (typeof v === 'boolean') return v ? 'oui' : 'non'
  if (typeof v === 'object' && 'sys' in v && 'dia' in v) {
    const t = v as { sys: number; dia: number }
    return `${t.sys}/${t.dia}`
  }
  return echapper(String(v))
}

export interface OptionsCsv {
  formatDate: 'jj/mm/aaaa' | 'aaaa-mm-jj'
}

/**
 * Une ligne par mesure, une colonne par champ existant dans le carnet.
 * Les colonnes suivent l'ordre d'affichage des champs.
 */
export function versCsv(
  mesures: Mesure[],
  champs: DefinitionChamp[],
  options: OptionsCsv = { formatDate: 'jj/mm/aaaa' },
): string {
  const colonnes = [...champs].sort((a, b) => a.ordre - b.ordre)

  const entetes = [
    'Date',
    ...colonnes.map((c) => (c.unite ? `${c.libelle} (${c.unite})` : c.libelle)),
    'Notes',
  ]

  const lignes = [...mesures]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((m) => [
      echapper(formaterDate(m.date, options.formatDate)),
      ...colonnes.map((c) => cellule(m.valeurs[c.cle])),
      cellule(m.notes),
    ].join(SEPARATEUR))

  // Le BOM permet à Excel de reconnaître l'UTF-8 et d'afficher correctement les accents.
  return '﻿' + [entetes.map(echapper).join(SEPARATEUR), ...lignes].join('\r\n') + '\r\n'
}
