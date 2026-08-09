/**
 * Météo (C20, § 11.8) — la seule fonctionnalité qui sorte de l'appareil.
 *
 * Ce module ne fait aucun appel : il ne contient que les décisions, pour qu'on
 * puisse les lire et les tester sans réseau. L'appel lui-même est dans
 * `io/meteo.ts`, où il est seul et visible.
 *
 * **Un écart assumé avec le § 11.8.** Le cahier des charges parle de coordonnées
 * arrondies à deux décimales avant l'envoi, ce qui suppose de lire la position de
 * l'appareil. On demande à la place **une commune, choisie une fois**, dont les
 * coordonnées arrondies sont conservées localement. C'est plus restrictif que ce
 * qui était prévu, et cela suit à la lettre l'argument que le § 11.8 donne
 * lui-même : « la météo d'une commune suffit ; la position exacte d'une personne
 * ne regarde personne. » Cela évite en prime une permission de géolocalisation
 * sur Android, et fait que la PWA et l'APK se comportent exactement pareil.
 */

/** Deux décimales : environ un kilomètre, la résolution d'une commune. */
export const DECIMALES_COORDONNEE = 2

export function arrondirCoordonnee(v: number): number {
  const facteur = 10 ** DECIMALES_COORDONNEE
  return Math.round(v * facteur) / facteur
}

/** Lieu retenu pour la météo, tel qu'il est conservé dans le profil. */
export interface LieuMeteo {
  nom: string
  latitude: number
  longitude: number
}

/**
 * Météo attachée à une mesure.
 *
 * `libelle` est toujours renseigné : c'est lui qui s'affiche, et il existe aussi
 * bien pour un relevé automatique que pour une saisie à la main. `automatique`
 * dit d'où vient la valeur — une donnée relevée par une machine et une donnée
 * notée par une personne ne se valent pas, et le carnet n'a pas à les confondre.
 */
export interface MeteoMesure {
  libelle: string
  /** Degrés Celsius, absent si la valeur a été saisie à la main. */
  temperature?: number
  automatique: boolean
}

/**
 * Codes WMO renvoyés par Open-Meteo. La table est volontairement plate et
 * exhaustive : une correspondance manquante afficherait un nombre brut.
 */
const LIBELLES_WMO: Record<number, string> = {
  0: 'Ciel dégagé',
  1: 'Plutôt dégagé',
  2: 'Partiellement nuageux',
  3: 'Couvert',
  45: 'Brouillard',
  48: 'Brouillard givrant',
  51: 'Bruine légère',
  53: 'Bruine',
  55: 'Bruine dense',
  56: 'Bruine verglaçante',
  57: 'Bruine verglaçante dense',
  61: 'Pluie faible',
  63: 'Pluie',
  65: 'Forte pluie',
  66: 'Pluie verglaçante',
  67: 'Pluie verglaçante forte',
  71: 'Neige faible',
  73: 'Neige',
  75: 'Forte neige',
  77: 'Grains de neige',
  80: 'Averses faibles',
  81: 'Averses',
  82: 'Fortes averses',
  85: 'Averses de neige',
  86: 'Fortes averses de neige',
  95: 'Orage',
  96: 'Orage et grêle',
  99: 'Orage et forte grêle',
}

export function libelleWmo(code: number): string {
  return LIBELLES_WMO[code] ?? 'Temps indéterminé'
}

/**
 * Repli permanent (§ 11.8) : la météo reste notable à la main, réseau ou pas.
 * La liste est courte à dessein — il s'agit de situer une journée, pas de tenir
 * une station météorologique.
 */
export const METEOS_MANUELLES = [
  'Ciel dégagé',
  'Partiellement nuageux',
  'Couvert',
  'Brouillard',
  'Pluie',
  'Neige',
  'Orage',
  'Vent fort',
  'Chaleur',
  'Froid',
] as const

/** Mise en forme d'une météo pour l'affichage, température comprise si connue. */
export function formaterMeteo(m: MeteoMesure): string {
  if (m.temperature === undefined) return m.libelle
  return `${m.libelle}, ${Math.round(m.temperature)} °C`
}
