/**
 * Résumé du mois (G6, § 8.1).
 *
 * La question du mois (C22) tourne dans une petite liste plutôt que d'être
 * toujours la même — elle reste ouverte, jamais orientée vers un jugement.
 */

const QUESTIONS = [
  "Qu'est-ce qui a bien fonctionné ce mois-ci ?",
  "Qu'est-ce qui a été difficile ce mois-ci ?",
  'Qu\'avez-vous appris sur vous ce mois-ci ?',
  'Quel moment retenez-vous de ce mois ?',
]

/** Choisit une question de façon stable pour un mois donné (même mois → même question). */
export function questionDuMois(cleMois: string): string {
  let somme = 0
  for (let i = 0; i < cleMois.length; i++) somme += cleMois.charCodeAt(i)
  return QUESTIONS[somme % QUESTIONS.length]!
}
