/**
 * Décider s'il y a divergence entre deux appareils (L9, § 11.7).
 *
 * Le carnet entier tient dans un fichier : synchroniser, c'est le déposer ou le
 * reprendre. Il n'existe donc pas de fusion possible, et le § 11.7 l'exclut de
 * toute façon — « l'application ne fusionne pas silencieusement. Elle présente
 * les deux versions avec leurs dates et laisse choisir. »
 *
 * Toute la question est donc : **est-ce que quelqu'un est passé depuis mon
 * dernier échange avec le serveur ?** Cet appareil retient l'horodatage
 * `exporteLe` de la version qu'il a déposée ou reprise en dernier ; si le
 * fichier distant n'en porte plus la trace, c'est qu'un autre appareil a écrit
 * entre-temps.
 *
 * Écraser reste toujours possible — la règle 4 de la charte veut qu'aucun
 * contrôle ne bloque — mais jamais sans qu'on l'ait demandé.
 */

export type Divergence =
  /** Le serveur est vide, ou porte exactement ce que cet appareil y a mis. */
  | 'aucune'
  /** Un fichier existe, mais cet appareil n'a jamais synchronisé : origine inconnue. */
  | 'origine-inconnue'
  /** Le fichier distant a changé depuis le dernier échange de cet appareil. */
  | 'distant-modifie'

export function evaluerDivergence(
  versionDistante: string | undefined,
  versionSynchronisee: string | undefined,
): Divergence {
  // Rien sur le serveur : le premier envoi n'écrase personne.
  if (versionDistante === undefined) return 'aucune'
  // Premier échange de cet appareil, mais le serveur porte déjà quelque chose.
  // On ne peut pas savoir de quoi il s'agit : on demande.
  if (versionSynchronisee === undefined) return 'origine-inconnue'
  return versionDistante === versionSynchronisee ? 'aucune' : 'distant-modifie'
}

/** Vrai si l'envoi peut se faire sans rien demander. */
export function envoiSansQuestion(d: Divergence): boolean {
  return d === 'aucune'
}
