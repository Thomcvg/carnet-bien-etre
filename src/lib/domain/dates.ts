import type { DateISO } from './types'

/** `AAAA-MM-JJ` pour une date locale, sans décalage de fuseau. */
export function versISO(d: Date): DateISO {
  const a = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const j = String(d.getDate()).padStart(2, '0')
  return `${a}-${m}-${j}`
}

export function depuisISO(iso: DateISO): Date {
  const [a, m, j] = iso.split('-').map(Number)
  return new Date(a ?? 1970, (m ?? 1) - 1, j ?? 1)
}

export function estDateISOValide(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false
  const d = depuisISO(iso)
  return versISO(d) === iso
}

/** Clé de mois `AAAA-MM`, pour les regroupements et l'affichage compact. */
export function moisDe(iso: DateISO): string {
  return iso.slice(0, 7)
}

export function debutDeMois(cleMois: string): DateISO {
  return `${cleMois}-01`
}

/** Dernier jour civil du mois, quel que soit le nombre de jours qu'il compte. */
export function finDeMois(cleMois: string): DateISO {
  const [a, m] = cleMois.split('-').map(Number)
  const dernierJour = new Date(a ?? 1970, m ?? 1, 0).getDate()
  return `${cleMois}-${String(dernierJour).padStart(2, '0')}`
}

/**
 * Âge révolu à une date donnée. `undefined` si la date de naissance est inconnue —
 * l'âge sert à nuancer la lecture de l'IMC (§ 7.2), jamais à bloquer un calcul.
 */
export function ageA(naissance: DateISO | undefined, aLaDate: DateISO): number | undefined {
  if (!naissance || !estDateISOValide(naissance)) return undefined
  const n = depuisISO(naissance)
  const d = depuisISO(aLaDate)
  let age = d.getFullYear() - n.getFullYear()
  const moisEcoules = d.getMonth() - n.getMonth()
  if (moisEcoules < 0 || (moisEcoules === 0 && d.getDate() < n.getDate())) age -= 1
  return age >= 0 ? age : undefined
}

/** Nombre de jours entre deux dates civiles. */
export function joursEntre(a: DateISO, b: DateISO): number {
  const msParJour = 86_400_000
  return Math.round((depuisISO(b).getTime() - depuisISO(a).getTime()) / msParJour)
}

export function ajouterMois(iso: DateISO, n: number): DateISO {
  const d = depuisISO(iso)
  const jourVoulu = d.getDate()
  d.setDate(1)
  d.setMonth(d.getMonth() + n)
  // 31 janvier + 1 mois = 28 ou 29 février, jamais le 3 mars.
  const dernierJour = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  d.setDate(Math.min(jourVoulu, dernierJour))
  return versISO(d)
}

const MOIS_FR = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
]

export function formaterDate(iso: DateISO, format: 'jj/mm/aaaa' | 'aaaa-mm-jj'): string {
  if (format === 'aaaa-mm-jj') return iso
  const [a, m, j] = iso.split('-')
  return `${j}/${m}/${a}`
}

/** Affichage compact `MM/AA`, comme dans le carnet d'origine (§ 6.2 v1.0). */
export function formaterMoisCompact(iso: DateISO): string {
  const [a, m] = iso.split('-')
  return `${m}/${(a ?? '').slice(2)}`
}

export function formaterMoisLong(cleMois: string): string {
  const [a, m] = cleMois.split('-')
  const index = Number(m) - 1
  return `${MOIS_FR[index] ?? m} ${a}`
}
