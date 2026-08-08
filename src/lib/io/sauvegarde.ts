/**
 * Export et import (L2, L4) — § 11.2.
 *
 * Le JSON est la vraie sauvegarde : complète, réimportable à l'identique, et
 * versionnée par le même mécanisme que la base (§ 11.4). C'est ce qui garantit
 * qu'on n'est jamais prisonnier de l'application.
 */

import type {
  Carnet, DefinitionChamp, Evenement, Mesure, Objectif, Profil, ReflexionMensuelle, Traitement,
} from '../domain/types'
import { migrer, VERSION_SCHEMA } from '../domain/migrations'
import { versCsv } from './csv'
// La bibliothèque XLSX pèse largement plus que le reste de l'application
// (§ 15.3 : viser une app légère, chargée instantanément). Elle n'est donc
// jamais dans le bundle principal — seulement chargée au moment où quelqu'un
// clique réellement sur « Exporter en Excel ».

export function construireCarnet(
  profils: Profil[],
  champs: DefinitionChamp[],
  mesures: Mesure[],
  objectifs: Objectif[],
  evenements: Evenement[] = [],
  reflexions: ReflexionMensuelle[] = [],
  traitements: Traitement[] = [],
): Carnet {
  return {
    versionSchema: VERSION_SCHEMA,
    exporteLe: new Date().toISOString(),
    profils,
    champs,
    mesures,
    objectifs,
    evenements,
    reflexions,
    traitements,
  }
}

export function versJson(carnet: Carnet): string {
  return JSON.stringify(carnet, null, 2)
}

/** Relit un fichier de sauvegarde, en le migrant si besoin. Lève une erreur explicite sinon. */
export function depuisJson(texte: string): Carnet {
  let brut: unknown
  try {
    brut = JSON.parse(texte)
  } catch {
    throw new Error("Ce fichier n'est pas lisible : il ne contient pas de données au format attendu.")
  }
  return migrer(brut)
}

/* ------------------------------------------------------------------ */
/* Téléchargement                                                      */
/* ------------------------------------------------------------------ */

function telecharger(contenu: BlobPart, nomFichier: string, type: string): void {
  const blob = new Blob([contenu], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nomFichier
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // Laisse au navigateur le temps de démarrer le téléchargement avant de libérer l'URL.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function horodatageFichier(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function nomSur(nomCarnet: string): string {
  return nomCarnet
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'carnet'
}

export function telechargerJson(carnet: Carnet, nomCarnet: string): void {
  telecharger(
    versJson(carnet),
    `${nomSur(nomCarnet)}-${horodatageFichier()}.json`,
    'application/json;charset=utf-8',
  )
}

export function telechargerCsv(
  mesures: Mesure[],
  champs: DefinitionChamp[],
  nomCarnet: string,
  formatDate: 'jj/mm/aaaa' | 'aaaa-mm-jj',
): void {
  telecharger(
    versCsv(mesures, champs, { formatDate }),
    `${nomSur(nomCarnet)}-${horodatageFichier()}.csv`,
    'text/csv;charset=utf-8',
  )
}

export async function telechargerXlsx(
  mesures: Mesure[],
  champs: DefinitionChamp[],
  nomCarnet: string,
  formatDate: 'jj/mm/aaaa' | 'aaaa-mm-jj',
): Promise<void> {
  const { versXlsx } = await import('./xlsx')
  telecharger(
    versXlsx(mesures, champs, nomCarnet, { formatDate }),
    `${nomSur(nomCarnet)}-${horodatageFichier()}.xlsx`,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
}

/** Lit un fichier choisi par l'utilisateur. */
export function lireFichier(fichier: File): Promise<string> {
  return new Promise((resoudre, rejeter) => {
    const lecteur = new FileReader()
    lecteur.onload = () => resoudre(String(lecteur.result ?? ''))
    lecteur.onerror = () => rejeter(new Error('Le fichier n\'a pas pu être lu.'))
    lecteur.readAsText(fichier, 'utf-8')
  })
}
