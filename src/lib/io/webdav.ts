/**
 * Synchronisation WebDAV vers Nextcloud (L8, § 11.7).
 *
 * **Une seule opération, deux sens.** Le carnet complet est un fichier JSON ; le
 * synchroniser, c'est le déposer ou le reprendre. Il n'y a donc ni delta, ni
 * fusion, ni résolution automatique — le § 11.7 l'interdit explicitement : « en
 * cas de divergence entre deux appareils, l'application ne fusionne pas
 * silencieusement. Elle présente les deux versions avec leurs dates et laisse
 * choisir. »
 *
 * **Pourquoi l'APK et pas la PWA.** Un navigateur refuse une requête vers une
 * autre origine que la sienne si le serveur ne l'y autorise pas, et Nextcloud ne
 * l'autorise pas par défaut sur WebDAV. Sur Android, la requête part du code
 * natif via `CapacitorHttp` et n'est pas soumise à cette règle. C'est la limite
 * que le § 11.7 demandait de documenter plutôt que de contourner : dans la PWA,
 * la fonctionnalité s'annonce indisponible au lieu d'offrir un bouton qui échoue.
 *
 * **Les identifiants ne transitent nulle part ailleurs.** Ils ne sont lus que
 * pour composer l'en-tête `Authorization` de la requête, et vivent dans
 * `parametresLocaux`, hors de l'export (voir `db.ts`).
 */

import { Capacitor, CapacitorHttp } from '@capacitor/core'

export class WebdavError extends Error {
  constructor(
    message: string,
    /** Vrai si le geste peut être retenté tel quel — panne réseau plutôt que refus. */
    readonly reessayable = false,
  ) {
    super(message)
    this.name = 'WebdavError'
  }
}

export interface ConfigWebdav {
  urlDossier: string
  identifiant: string
  motDePasse: string
  nomFichier: string
}

/** Vrai si les requêtes peuvent partir du code natif, donc sans blocage d'origine. */
export function synchroDisponible(): boolean {
  return transport !== null || Capacitor.isNativePlatform()
}

/**
 * Compose l'adresse du fichier à partir du dossier et du nom, sans jamais
 * produire de double barre ni en avaler une.
 */
export function urlFichier(config: ConfigWebdav): string {
  const base = config.urlDossier.replace(/\/+$/, '')
  const nom = config.nomFichier.replace(/^\/+/, '')
  return `${base}/${encodeURIComponent(nom)}`
}

function entetes(config: ConfigWebdav): Record<string, string> {
  // `btoa` ne sait traiter que du latin-1 : un mot de passe accentué le ferait
  // échouer sur une exception incompréhensible. On passe par UTF-8 d'abord.
  const jeton = new TextEncoder().encode(`${config.identifiant}:${config.motDePasse}`)
  const binaire = Array.from(jeton, (o) => String.fromCharCode(o)).join('')
  return {
    Authorization: `Basic ${btoa(binaire)}`,
    'Content-Type': 'application/json; charset=utf-8',
  }
}

function traduireStatut(statut: number): WebdavError {
  if (statut === 401 || statut === 403) {
    return new WebdavError(
      'Le serveur a refusé l’identifiant ou le mot de passe.',
    )
  }
  if (statut === 404) {
    return new WebdavError('Le dossier indiqué n’existe pas sur le serveur.')
  }
  if (statut === 507) {
    return new WebdavError('Le serveur n’a plus assez d’espace libre.')
  }
  if (statut >= 500) {
    return new WebdavError('Le serveur a rencontré un problème.', true)
  }
  return new WebdavError(`Le serveur a répondu ${statut}.`)
}

/**
 * Le transport est remplaçable, et c'est le seul moyen d'éprouver ce module.
 *
 * `CapacitorHttp` n'existe que dans l'application native : sans cette couture,
 * tout ce fichier — l'en-tête d'authentification, l'assemblage de l'adresse, la
 * lecture des statuts — ne serait vérifiable que sur un téléphone, c'est-à-dire
 * jamais. C'est la même leçon que la conversion des livres en kilogrammes : une
 * logique enfermée là où aucun test n'entre finit par être fausse en silence.
 *
 * Rien dans l'application ne l'utilise : seule une vérification le remplace.
 */
export interface TransportWebdav {
  (requete: {
    url: string
    methode: string
    entetes: Record<string, string>
    corps?: string
  }): Promise<{ statut: number; texte: string }>
}

let transport: TransportWebdav | null = null

export function definirTransportDeTest(t: TransportWebdav | null): void {
  transport = t
}

async function requete(
  config: ConfigWebdav,
  methode: 'GET' | 'PUT',
  corps?: string,
): Promise<{ statut: number; texte: string }> {
  if (!transport && !synchroDisponible()) {
    throw new WebdavError(
      'La synchronisation WebDAV n’est disponible que dans l’application Android.',
    )
  }
  try {
    if (transport) {
      return await transport({
        url: urlFichier(config),
        methode,
        entetes: entetes(config),
        ...(corps === undefined ? {} : { corps }),
      })
    }
    const reponse = await CapacitorHttp.request({
      url: urlFichier(config),
      method: methode,
      headers: entetes(config),
      responseType: 'text',
      ...(corps === undefined ? {} : { data: corps }),
    })
    const texte = typeof reponse.data === 'string'
      ? reponse.data
      : JSON.stringify(reponse.data ?? '')
    return { statut: reponse.status, texte }
  } catch {
    // Le message natif ne dit rien d'utile à qui n'écrit pas de code ; l'adresse
    // et le réseau sont les deux seules causes qu'on puisse suggérer d'examiner.
    throw new WebdavError(
      'Le serveur est injoignable. Vérifiez l’adresse et votre connexion.',
      true,
    )
  }
}

/** Dépose le carnet sur le serveur, en écrasant la version qui s'y trouve. */
export async function envoyer(config: ConfigWebdav, contenu: string): Promise<void> {
  const { statut } = await requete(config, 'PUT', contenu)
  if (statut < 200 || statut >= 300) throw traduireStatut(statut)
}

/**
 * Reprend le carnet du serveur. `null` — et non une erreur — quand il n'y a
 * encore rien : un premier envoi n'a pas à ressembler à une panne.
 */
export async function recuperer(config: ConfigWebdav): Promise<string | null> {
  const { statut, texte } = await requete(config, 'GET')
  if (statut === 404) return null
  if (statut < 200 || statut >= 300) throw traduireStatut(statut)
  return texte
}
