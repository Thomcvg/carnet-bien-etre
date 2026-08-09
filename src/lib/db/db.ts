/**
 * Base locale (L1) — § 11.1.
 *
 * Tout est stocké dans le navigateur, sans compte et sans serveur. L'application
 * n'émet aucune requête réseau : c'est l'engagement le plus fort qu'on puisse
 * prendre sur la confidentialité, parce qu'il n'y a rien à sécuriser ailleurs.
 *
 * Deux numéros de version coexistent, et ils ne sont **pas** égaux : celui de
 * Dexie décrit la forme des tables de cette base, `VERSION_SCHEMA` décrit la
 * forme du carnet exportable (§ 11.4). Ils avancent pour des raisons différentes —
 * `parametresLocaux` a fait monter Dexie à 5 sans rien changer au carnet, resté
 * en 4, parce que ces réglages sont propres à l'appareil et jamais exportés.
 */

import Dexie, { type Table } from 'dexie'
import type {
  DefinitionChamp, Evenement, Mesure, Objectif, Profil, ReflexionMensuelle, Traitement,
} from '../domain/types'

export type ChampStocke = DefinitionChamp & { id: string; profilId: string }

/**
 * Réglages propres à cet appareil, jamais au carnet lui-même — donc **hors du
 * `Carnet` exportable** (§ 4) : jamais migrés, jamais inclus dans l'export JSON.
 * Un descripteur de fichier ou un profil actif n'ont de sens que sur l'appareil
 * qui les a choisis ; les transmettre via un export briserait leur portabilité.
 */
export interface ParametreSauvegardeAuto {
  id: 'sauvegarde-auto'
  activee: boolean
  handle?: FileSystemFileHandle
}

/** Quel profil afficher au démarrage, quand plusieurs partagent cet appareil (O1). */
export interface ParametreProfilActif {
  id: 'profil-actif'
  profilId: string
}

/**
 * Synchronisation WebDAV (L8, § 11.7).
 *
 * Ces réglages sont **délibérément** ici et non dans le `Profil` : ils contiennent
 * un identifiant et un mot de passe, et le `Profil` part dans l'export JSON. Un
 * carnet sauvegardé, transmis à un proche ou déposé sur une clé emporterait
 * sinon de quoi écrire sur le Nextcloud de son propriétaire.
 *
 * `versionSynchronisee` retient l'horodatage `exporteLe` de la version que cet
 * appareil a échangée en dernier avec le serveur. C'est lui qui permet de
 * détecter qu'un autre appareil est passé entre-temps — et donc de demander
 * plutôt que de fusionner en silence (§ 11.7).
 */
export interface ParametreWebdav {
  id: 'webdav'
  urlDossier: string
  identifiant: string
  motDePasse: string
  nomFichier: string
  versionSynchronisee?: string
  derniereReussite?: string
}

export type ParametreLocal = ParametreSauvegardeAuto | ParametreProfilActif | ParametreWebdav

export function idChamp(profilId: string, cle: string): string {
  return `${profilId}:${cle}`
}

class BaseCarnet extends Dexie {
  profils!: Table<Profil, string>
  champs!: Table<ChampStocke, string>
  mesures!: Table<Mesure, string>
  objectifs!: Table<Objectif, string>
  evenements!: Table<Evenement, string>
  reflexions!: Table<ReflexionMensuelle, string>
  traitements!: Table<Traitement, string>
  parametresLocaux!: Table<ParametreLocal, string>

  constructor() {
    super('carnet-bien-etre')

    this.version(1).stores({
      profils: 'id',
      champs: 'id, profilId, cle, [profilId+cle]',
      mesures: 'id, profilId, date, [profilId+date]',
      objectifs: 'id, profilId, actif',
    })

    // Lot 2 : les événements de contexte (§ 4). Les tables inchangées depuis la
    // version 1 n'ont pas besoin d'être redéclarées — Dexie les conserve telles quelles.
    this.version(2).stores({
      evenements: 'id, profilId, dateDebut',
    })

    // Lot 3 : la question du mois (C22, § 8.1).
    this.version(3).stores({
      reflexions: 'id, profilId, mois, [profilId+mois]',
    })

    // Lot 4 : les traitements en cours (B4, § 10.2).
    this.version(4).stores({
      traitements: 'id, profilId, debut',
    })

    // Lot 4 : le descripteur de sauvegarde automatique (L7). Table à part,
    // hors du schéma versionné du Carnet — voir ParametreSauvegardeAuto.
    this.version(5).stores({
      parametresLocaux: 'id',
    })
  }
}

export const base = new BaseCarnet()

/** Identifiant unique sans dépendance externe. */
export function nouvelId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function maintenant(): string {
  return new Date().toISOString()
}
