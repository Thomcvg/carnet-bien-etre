/**
 * Repères d'activité (E2, E4, § 8.3).
 *
 * L'OMS recommande 150 minutes d'activité modérée par semaine et un renforcement
 * musculaire deux fois par semaine. Le carnet est conçu pour une saisie mensuelle
 * (§ 6.1 v1.0) : il n'existe pas de journal quotidien dont dériver une vraie
 * moyenne glissante sur sept jours. `activite_duree` est donc lu comme une
 * estimation auto-rapportée — « en moyenne, ces dernières semaines » — et non
 * comme la durée d'une séance isolée. C'est un choix de conception assumé plutôt
 * qu'une approximation cachée ; le texte d'aide de l'écran qui l'affiche le dit.
 *
 * Ce sont des repères, jamais des quotas : aucun vocabulaire de manque.
 */

export const CIBLE_MINUTES_HEBDO_OMS = 150

/**
 * Aucun booléen « atteint » ici : il en existait un, que rien ne lisait, et qui
 * disait exactement ce que ce module refuse de dire. Un repère se situe, il ne
 * se réussit pas.
 */
export interface RepereActivite {
  minutesHebdo?: number
  pourcentCible: number | null
  renforcementRegulier?: boolean
}

export function calculerRepereActivite(
  minutesHebdo?: number,
  renforcementRegulier?: boolean,
): RepereActivite {
  if (minutesHebdo === undefined || !Number.isFinite(minutesHebdo) || minutesHebdo < 0) {
    return { pourcentCible: null, renforcementRegulier }
  }
  const pourcent = Math.max(0, Math.min(100, (minutesHebdo / CIBLE_MINUTES_HEBDO_OMS) * 100))
  return {
    minutesHebdo,
    pourcentCible: pourcent,
    renforcementRegulier,
  }
}
