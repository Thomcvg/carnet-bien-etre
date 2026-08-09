/**
 * Migrations de schéma (L16, § 11.4).
 *
 * Une migration est une **fonction pure** d'un carnet vers un carnet, ce qui la
 * rend testable sans navigateur (voir tests/migrations.test.ts). Elle est câblée
 * sur le fichier de sauvegarde JSON (`io/sauvegarde.ts`, à l'import).
 *
 * Pour la base locale, la situation est actuellement double : Dexie gère sa
 * propre montée de version (`db.ts`, `this.version(n).stores({...})`), qui
 * suffit tant qu'une migration ne fait qu'ajouter une table vide — c'est le cas
 * de la 1 → 2 ci-dessous, où les deux mécanismes produisent le même résultat par
 * coïncidence. Le jour où une migration devra transformer des valeurs déjà
 * enregistrées (renommer un champ, restructurer une valeur), il faudra soit
 * l'exprimer aussi comme une migration Dexie (`.upgrade(tx => …)`), soit faire
 * transiter le chargement par cette fonction `migrer()` pour n'avoir qu'un seul
 * endroit où la logique de transformation existe. Ce n'est pas encore fait.
 */

import type { Carnet } from './types'

/** Version courante du schéma. À incrémenter avec toute migration ajoutée. */
export const VERSION_SCHEMA = 5

/** Forme non encore validée, telle qu'elle sort d'un fichier ou de la base. */
export type CarnetBrut = Record<string, unknown> & { versionSchema?: unknown }

export type Migration = (carnet: CarnetBrut) => CarnetBrut

/**
 * Table des migrations. La clé `n` transforme un carnet de version `n` en version `n + 1`.
 *
 * Un carnet du lot 1 (schéma 1) n'a pas de liste d'événements : la migration
 * l'introduit vide, sans toucher au reste. C'est l'exemple même de l'exigence
 * du § 11.4 — un carnet de 2026 doit s'ouvrir sans intervention.
 */
export const MIGRATIONS: Record<number, Migration> = {
  1: (c) => ({ ...c, evenements: [] }),
  2: (c) => ({ ...c, reflexions: [] }),
  3: (c) => ({ ...c, traitements: [] }),
  // Premier renommage d'une valeur déjà écrite dans un fichier — et l'occasion de
  // vérifier que le mécanisme sait faire autre chose qu'ajouter une liste vide.
  // Aucune version publiée n'a jamais écrit `comportemental` (le type existait
  // dans le modèle, aucune interface ne le produisait), donc la migration ne
  // transformera vraisemblablement rien. C'est justement pour cela qu'elle est
  // écrite maintenant plutôt que dans six mois.
  4: (c) => ({
    ...c,
    objectifs: Array.isArray(c.objectifs)
      ? c.objectifs.map((o) =>
          o !== null && typeof o === 'object' && (o as { type?: unknown }).type === 'comportemental'
            ? { ...(o as object), type: 'regularite' }
            : o,
        )
      : c.objectifs,
  }),
}

export class CarnetTropRecentError extends Error {
  constructor(
    readonly versionFichier: number,
    readonly versionSupportee: number,
  ) {
    super(
      `Ce carnet a été enregistré avec une version plus récente de l'application `
      + `(schéma ${versionFichier}, cette version lit jusqu'au schéma ${versionSupportee}). `
      + `Mettez l'application à jour pour l'ouvrir.`,
    )
    this.name = 'CarnetTropRecentError'
  }
}

export class CarnetIllisibleError extends Error {
  constructor(raison: string) {
    super(`Ce fichier ne semble pas être un carnet : ${raison}`)
    this.name = 'CarnetIllisibleError'
  }
}

function estTableau(v: unknown): v is unknown[] {
  return Array.isArray(v)
}

/**
 * Applique les migrations successives jusqu'à la version cible.
 *
 * La table est injectable pour que les tests puissent exercer le mécanisme
 * lui-même sans attendre qu'une vraie migration existe.
 */
export function migrer(
  brut: unknown,
  cible: number = VERSION_SCHEMA,
  table: Record<number, Migration> = MIGRATIONS,
): Carnet {
  if (brut === null || typeof brut !== 'object') {
    throw new CarnetIllisibleError('le contenu n\'est pas un objet')
  }

  let carnet = { ...(brut as CarnetBrut) }

  const versionLue = carnet.versionSchema
  if (typeof versionLue !== 'number' || !Number.isInteger(versionLue) || versionLue < 1) {
    throw new CarnetIllisibleError('numéro de schéma absent ou invalide')
  }

  if (versionLue > cible) {
    throw new CarnetTropRecentError(versionLue, cible)
  }

  for (let v = versionLue; v < cible; v++) {
    const migration = table[v]
    if (!migration) {
      throw new CarnetIllisibleError(
        `aucune migration connue du schéma ${v} vers le schéma ${v + 1}`,
      )
    }
    carnet = migration(carnet)
  }

  carnet.versionSchema = cible

  for (const collection of ['profils', 'champs', 'mesures', 'objectifs', 'evenements', 'reflexions', 'traitements'] as const) {
    if (!estTableau(carnet[collection])) {
      throw new CarnetIllisibleError(`la liste « ${collection} » est absente ou mal formée`)
    }
  }

  return carnet as unknown as Carnet
}

/** Vrai si le carnet peut être ouvert par cette version de l'application. */
export function estLisible(brut: unknown, cible: number = VERSION_SCHEMA): boolean {
  try {
    migrer(brut, cible)
    return true
  } catch {
    return false
  }
}
