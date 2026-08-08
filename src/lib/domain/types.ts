/**
 * Types du domaine — Carnet Bien-être
 *
 * Deux invariants portés par le typage lui-même :
 *  - `valeurs` est un enregistrement creux : une clé absente signifie « non renseigné ».
 *    Avec `noUncheckedIndexedAccess`, TypeScript force à traiter ce cas (règle 5).
 *  - Aucun type ne décrit une valeur calculée : les indicateurs sont dérivés à la volée (§ 3.4).
 */

/** Date civile ISO, `AAAA-MM-JJ`. Le format d'affichage en est indépendant (§ 6.2 v1.0). */
export type DateISO = string

/** Horodatage ISO complet, pour la traçabilité des créations et modifications. */
export type HorodatageISO = string

export type Unite =
  | 'kg' | 'lb'
  | 'cm' | 'in'
  | 'h' | 'min'
  | 'mmHg'
  | 'pas' | 'km'
  | 'verres' | 'L'

/**
 * `DefinitionChamp.unite` n'est jamais lu par les fonctions de conversion — celles-ci
 * reçoivent leur unité explicitement (`masseVersAffichage(v, 'kg')`, etc.). Il ne sert
 * qu'à l'affichage, ce qui permet à un champ personnalisé (C18) de porter une unité
 * inventée par l'utilisateur (« pas », « cigarettes »…) sans que le moteur la connaisse.
 */
export type UniteChamp = Unite | (string & {})

export type TypeChamp =
  | 'nombre'
  | 'echelle5'
  | 'booleen'
  | 'texte'
  | 'choix'
  | 'duree'
  | 'tension'

export type CategorieChamp = 'corps' | 'sante' | 'bienetre' | 'activite'

export interface DefinitionChamp {
  /** Identifiant stable, jamais traduit ni renommé. */
  cle: string
  libelle: string
  categorie: CategorieChamp
  type: TypeChamp
  unite?: UniteChamp
  min?: number
  max?: number
  pas?: number
  options?: string[]
  /** Pour `type: 'choix'` uniquement : plusieurs options sélectionnables à la fois. */
  multiple?: boolean
  /**
   * Pour `type: 'echelle5'` : ce que valent concrètement le 1 et le 5.
   *
   * Une échelle sans ses pôles ne veut rien dire — « faible » et « élevé » ne
   * répondent pas à *faible quoi ?*. Et le sens change d'un champ à l'autre :
   * 5 en énergie est une bonne journée, 5 en stress non, et pour le transit
   * c'est le milieu de l'échelle qui est confortable, pas une extrémité.
   * Chaque échelle porte donc sa propre légende.
   */
  echelle?: { bas: string; haut: string }
  actif: boolean
  ordre: number
  /** Non supprimable ni désactivable. Le poids uniquement. */
  systeme: boolean
  /** Créé par l'utilisateur (C18). */
  personnalise: boolean
}

export interface ValeurTension {
  sys: number
  dia: number
  pouls?: number
}

export type ValeurChamp = number | string | boolean | ValeurTension | string[]

export type ContextePesee = 'a_jeun' | 'habille' | 'apres_sport' | 'autre'

export interface Mesure {
  id: string
  profilId: string
  date: DateISO
  /** `HH:MM`, seulement si plusieurs pesées le même jour (A29). */
  moment?: string
  contextePesee?: ContextePesee
  /** Creux : seules les clés réellement saisies existent. */
  valeurs: Record<string, ValeurChamp>
  notes?: string
  etiquettes?: string[]
  creeLe: HorodatageISO
  modifieLe: HorodatageISO
}

/**
 * Marqueur de contexte sur une période (G3, C14) : retraite, deuil, vacances,
 * arrêt d'une activité… Sert au lot 3 à annoter les courbes ; le modèle et la
 * gestion de base arrivent dès le lot 2 (§ 4, § 17).
 */
export interface Evenement {
  id: string
  profilId: string
  dateDebut: DateISO
  dateFin?: DateISO
  libelle: string
  type: 'personnel' | 'sante' | 'activite' | 'autre'
  couleur?: string
}

/**
 * Réponse à la question du mois (C22, § 8.1) : « qu'est-ce qui a bien fonctionné
 * ce mois-ci ? ». Rattachée à un mois plutôt qu'à une mesure — elle a du sens
 * même les mois sans saisie, et une seule réponse par mois suffit.
 */
export interface ReflexionMensuelle {
  id: string
  profilId: string
  /** Clé de mois `AAAA-MM`. */
  mois: string
  question: string
  reponse: string
  modifieLe: HorodatageISO
}

/**
 * Traitement en cours (B4) et ses rappels de prise (B6) — § 10.2.
 * Module entièrement facultatif, désactivé par défaut. Sans traitement
 * enregistré, aucun rappel n'est possible (§ 10.2) : B6 dépend de B4.
 */
export interface Traitement {
  id: string
  profilId: string
  nom: string
  dosage?: string
  debut: DateISO
  fin?: DateISO
  rappelActif: boolean
  /** Heures au format `HH:MM`, une ou plusieurs prises par jour. */
  heuresRappel: string[]
}

export type TypeObjectif = 'cible' | 'fourchette' | 'maintien' | 'comportemental'

export interface Objectif {
  id: string
  profilId: string
  type: TypeObjectif
  /** Champ visé. `poids` dans l'immense majorité des cas, mais pas toujours (F4). */
  champCle: string
  valeurMin?: number
  valeurMax?: number
  dateCible?: DateISO
  actif: boolean
  creeLe: HorodatageISO
}

export type ModeAffichage = 'essentiel' | 'complet'

export type UsageDeclare =
  | 'suivre'
  | 'stabiliser'
  | 'reprendre'
  | 'constantes'
  | 'sport'
  | 'indecis'

export type Sexe = 'femme' | 'homme' | 'autre' | 'non_precise'

export interface Profil {
  id: string
  nomCarnet: string
  dateNaissance?: DateISO
  sexe?: Sexe
  uniteMasse: 'kg' | 'lb'
  formatDate: 'jj/mm/aaaa' | 'aaaa-mm-jj'
  langue: string
  mode: ModeAffichage
  usage: UsageDeclare
  theme: 'auto' | 'clair' | 'sombre' | 'contraste'
  taillePolice: 100 | 125 | 150 | 200
  modeSansChiffre: boolean
  /**
   * Rappel local (K12, § 27) — facultatif et **désactivé par défaut** :
   * « Si l'utilisateur refuse, aucune notification ne doit être envoyée. »
   * Champs optionnels plutôt qu'ajoutés à `profilParDefaut()` : un profil
   * créé avant le lot 4 n'a jamais entendu parler de rappels, et doit rester
   * lisible sans migration dédiée — d'où la lecture systématique avec repli
   * (`profil?.rappelsActifs ?? false`) partout où ces champs sont consultés.
   */
  rappelsActifs?: boolean
  frequenceRappelJours?: number
  creeLe: HorodatageISO
}

/**
 * Sauvegarde complète et réimportable (L4).
 * Porte le numéro de schéma, ce qui permet de migrer un fichier
 * exactement comme on migre la base (§ 11.4).
 */
export interface Carnet {
  versionSchema: number
  exporteLe: HorodatageISO
  profils: Profil[]
  champs: DefinitionChamp[]
  mesures: Mesure[]
  objectifs: Objectif[]
  evenements: Evenement[]
  reflexions: ReflexionMensuelle[]
  traitements: Traitement[]
}

/* ------------------------------------------------------------------ */
/* Accès typés aux valeurs creuses                                     */
/* ------------------------------------------------------------------ */

/**
 * Lit une valeur numérique. Retourne `undefined` si la clé est absente
 * ou si la valeur n'est pas un nombre exploitable.
 *
 * C'est le seul point d'entrée autorisé pour lire un nombre dans une mesure :
 * il garantit qu'une donnée absente ne devient jamais zéro (règle 5).
 */
export function lireNombre(
  mesure: Mesure,
  cle: string,
): number | undefined {
  const brut = mesure.valeurs[cle]
  return typeof brut === 'number' && Number.isFinite(brut) ? brut : undefined
}

export function lireTexte(mesure: Mesure, cle: string): string | undefined {
  const brut = mesure.valeurs[cle]
  return typeof brut === 'string' && brut.length > 0 ? brut : undefined
}

export function lireTension(mesure: Mesure, cle: string): ValeurTension | undefined {
  const brut = mesure.valeurs[cle]
  if (brut !== null && typeof brut === 'object' && !Array.isArray(brut) && 'sys' in brut && 'dia' in brut) {
    return brut
  }
  return undefined
}

export function lireBooleen(mesure: Mesure, cle: string): boolean | undefined {
  const brut = mesure.valeurs[cle]
  return typeof brut === 'boolean' ? brut : undefined
}

/** Pour les champs `choix` à sélection multiple (par exemple l'activité du quotidien). */
export function lireChoixMultiple(mesure: Mesure, cle: string): string[] | undefined {
  const brut = mesure.valeurs[cle]
  return Array.isArray(brut) && brut.length > 0 ? brut : undefined
}

/** Vrai si la mesure porte au moins une valeur pour ce champ. */
export function estRenseigne(mesure: Mesure, cle: string): boolean {
  return mesure.valeurs[cle] !== undefined
}
