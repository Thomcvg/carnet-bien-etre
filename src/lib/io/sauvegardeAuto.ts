/**
 * Sauvegarde automatique vers un fichier local (L7, § 11.6).
 *
 * Repose sur l'API d'accès au système de fichiers, disponible uniquement sur
 * Chrome et Edge de bureau (§ 11.6) : `estDisponible()` doit être vérifié avant
 * tout appel, et l'export manuel (déjà construit) reste le repli partout ailleurs.
 *
 * Le descripteur de fichier (`FileSystemFileHandle`) n'a de sens que sur
 * l'appareil qui l'a créé — il ne fait donc pas partie du `Carnet` exportable
 * (§ 4) et vit dans sa propre table Dexie, hors du cycle export/import JSON.
 */

// `FileSystemFileHandle` et `FileSystemWritableFileStream` sont déjà dans
// lib.dom.d.ts ; seuls `showSaveFilePicker` et les méthodes de permission
// (encore expérimentales) manquent, donc seuls ceux-là sont complétés ici —
// redéclarer les membres déjà connus provoquerait un conflit de fusion.
declare global {
  interface Window {
    showSaveFilePicker?: (options?: {
      suggestedName?: string
      types?: { description: string; accept: Record<string, string[]> }[]
    }) => Promise<FileSystemFileHandle>
  }
  interface FileSystemFileHandle {
    queryPermission?: (options: { mode: 'read' | 'readwrite' }) => Promise<PermissionState>
    requestPermission?: (options: { mode: 'read' | 'readwrite' }) => Promise<PermissionState>
  }
}

export function estDisponible(): boolean {
  return typeof window !== 'undefined' && typeof window.showSaveFilePicker === 'function'
}

/** Ouvre le sélecteur système pour choisir où créer le fichier de sauvegarde. */
export async function choisirFichier(nomSuggere: string): Promise<FileSystemFileHandle | undefined> {
  if (!window.showSaveFilePicker) return undefined
  try {
    return await window.showSaveFilePicker({
      suggestedName: nomSuggere,
      types: [{ description: 'Carnet Bien-être (JSON)', accept: { 'application/json': ['.json'] } }],
    })
  } catch (e) {
    // L'utilisateur a annulé le sélecteur : ce n'est pas une erreur.
    if (e instanceof DOMException && e.name === 'AbortError') return undefined
    throw e
  }
}

/** Vérifie — et redemande si besoin — la permission d'écriture sur un fichier déjà choisi. */
export async function permissionEcriture(handle: FileSystemFileHandle): Promise<boolean> {
  const options = { mode: 'readwrite' as const }
  if (!handle.queryPermission) return true // navigateur qui ignore l'API de permission : on tente directement
  const etat = await handle.queryPermission(options)
  if (etat === 'granted') return true
  if (!handle.requestPermission) return false
  return (await handle.requestPermission(options)) === 'granted'
}

export async function ecrireDans(handle: FileSystemFileHandle, contenu: string): Promise<void> {
  const flux = await handle.createWritable()
  await flux.write(contenu)
  await flux.close()
}
