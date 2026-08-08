/**
 * Conversions d'unités (A25, K17).
 *
 * Règle 16 : changer l'unité d'affichage ne modifie jamais les données stockées.
 * Le stockage est toujours canonique — kilogrammes et centimètres — et la conversion
 * n'intervient qu'à l'affichage et à la saisie.
 *
 * Les longueurs n'ont volontairement **pas** de conversion : le carnet ne propose
 * que le centimètre. Des fonctions pouces↔centimètres ont existé ici sans jamais
 * être appelées, à côté d'un réglage `uniteLongueur` que rien ne modifiait — une
 * capacité annoncée par le code et absente de l'application. Le jour où les pouces
 * seront proposés, ils reviendront avec l'interface qui va avec.
 */

const LB_PAR_KG = 2.204_622_621_848_775_5

export function kgVersLb(kg: number): number {
  return kg * LB_PAR_KG
}

export function lbVersKg(lb: number): number {
  return lb / LB_PAR_KG
}

export type UniteMasse = 'kg' | 'lb'

/** Depuis le stockage canonique (kg) vers l'unité d'affichage. */
export function masseVersAffichage(kg: number, unite: UniteMasse): number {
  return unite === 'lb' ? kgVersLb(kg) : kg
}

/** Depuis la saisie utilisateur vers le stockage canonique (kg). */
export function masseVersStockage(valeur: number, unite: UniteMasse): number {
  return unite === 'lb' ? lbVersKg(valeur) : valeur
}

/**
 * Formatage numérique français : virgule décimale, pas de séparateur de milliers
 * sur des valeurs de cette échelle.
 */
export function formaterNombre(v: number, decimales = 1): string {
  return v.toFixed(decimales).replace('.', ',')
}

/** Formate une évolution avec son signe explicite : « −0,7 kg », « +1,2 kg ». */
export function formaterEvolution(v: number, decimales = 1, unite = ''): string {
  const signe = v > 0 ? '+' : v < 0 ? '−' : ''
  const corps = Math.abs(v).toFixed(decimales).replace('.', ',')
  return `${signe}${corps}${unite ? ' ' + unite : ''}`
}

/** Accepte indifféremment la virgule et le point à la saisie (K3). */
export function analyserNombre(saisie: string): number | undefined {
  const nettoye = saisie.trim().replace(',', '.').replace(/\s/g, '')
  if (nettoye === '') return undefined
  const n = Number(nettoye)
  return Number.isFinite(n) ? n : undefined
}
