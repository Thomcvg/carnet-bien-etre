/**
 * Les deux seules requêtes réseau de l'application (§ 11.8, règle 18).
 *
 * Elles sont volontairement rassemblées dans un fichier qui ne fait que cela :
 * on doit pouvoir vérifier d'un coup d'œil, et pour toujours, que rien d'autre
 * ne sort de l'appareil. La règle 7 de la charte n'a de valeur que si elle est
 * vérifiable.
 *
 * Ce qui est transmis, et rien de plus :
 *  - à la recherche d'une commune, le nom tapé ;
 *  - au relevé, deux coordonnées arrondies à deux décimales (~ 1 km).
 *
 * Ce qui n'est jamais transmis : aucun identifiant, aucun horodatage de carnet,
 * aucune donnée de santé, aucun cookie — `credentials: 'omit'` le garantit même
 * si le service en posait un jour. Aucune réponse n'est mise en cache : il n'y a
 * donc pas d'historique de requêtes à conserver ni à effacer.
 *
 * Open-Meteo est retenu par le § 11.8 : données ouvertes, sans clé, sans compte,
 * sans traceur.
 */

import { arrondirCoordonnee, libelleWmo, type LieuMeteo, type MeteoMesure } from '../domain/meteo'

const RACINE_GEOCODAGE = 'https://geocoding-api.open-meteo.com/v1/search'
const RACINE_PREVISION = 'https://api.open-meteo.com/v1/forecast'

/** Au-delà, on renonce plutôt que de faire attendre devant un formulaire. */
const DELAI_MS = 8000

export class MeteoIndisponibleError extends Error {
  constructor(raison: string) {
    super(raison)
    this.name = 'MeteoIndisponibleError'
  }
}

async function interroger(url: string): Promise<unknown> {
  const abandon = new AbortController()
  const minuteur = setTimeout(() => abandon.abort(), DELAI_MS)
  try {
    const reponse = await fetch(url, {
      signal: abandon.signal,
      credentials: 'omit',
      cache: 'no-store',
      referrerPolicy: 'no-referrer',
    })
    if (!reponse.ok) throw new MeteoIndisponibleError(`réponse ${reponse.status}`)
    return await reponse.json()
  } catch (e) {
    if (e instanceof MeteoIndisponibleError) throw e
    throw new MeteoIndisponibleError(
      e instanceof Error && e.name === 'AbortError'
        ? 'le service met trop de temps à répondre'
        : 'le service est injoignable',
    )
  } finally {
    clearTimeout(minuteur)
  }
}

interface ResultatGeocodage {
  nom: string
  region?: string
  pays?: string
  latitude: number
  longitude: number
}

/**
 * Cherche une commune par son nom. C'est la seule fois où du texte tapé par la
 * personne quitte l'appareil, et cela n'arrive qu'à sa demande explicite.
 */
export async function chercherCommune(nom: string): Promise<ResultatGeocodage[]> {
  const requete = nom.trim()
  if (requete.length < 2) return []

  const url = `${RACINE_GEOCODAGE}?name=${encodeURIComponent(requete)}&count=5&language=fr&format=json`
  const brut = await interroger(url)

  const resultats = (brut as { results?: unknown }).results
  if (!Array.isArray(resultats)) return []

  return resultats
    .map((r) => r as Record<string, unknown>)
    .filter((r) => typeof r['latitude'] === 'number' && typeof r['longitude'] === 'number')
    .map((r) => ({
      nom: String(r['name'] ?? requete),
      region: typeof r['admin1'] === 'string' ? r['admin1'] : undefined,
      pays: typeof r['country'] === 'string' ? r['country'] : undefined,
      // Arrondi dès la réception : les coordonnées précises ne sont jamais
      // écrites, donc jamais exportées ni renvoyées.
      latitude: arrondirCoordonnee(r['latitude'] as number),
      longitude: arrondirCoordonnee(r['longitude'] as number),
    }))
}

/** Relève la météo courante du lieu enregistré. */
export async function relever(lieu: LieuMeteo): Promise<MeteoMesure> {
  const lat = arrondirCoordonnee(lieu.latitude)
  const lon = arrondirCoordonnee(lieu.longitude)

  const url = `${RACINE_PREVISION}?latitude=${lat}&longitude=${lon}`
    + '&current=temperature_2m,weather_code&timezone=auto'
  const brut = await interroger(url)

  const courant = (brut as { current?: Record<string, unknown> }).current
  if (!courant) throw new MeteoIndisponibleError('réponse inattendue du service')

  const code = courant['weather_code']
  const temperature = courant['temperature_2m']

  return {
    libelle: typeof code === 'number' ? libelleWmo(code) : 'Temps indéterminé',
    temperature: typeof temperature === 'number' ? temperature : undefined,
    automatique: true,
  }
}
