/**
 * Catalogue des champs préréglés — § 20.
 *
 * Les catégories santé, bien-être et activité arrivent au lot 2 : elles se
 * déclarent exactement de la même manière que les champs « corps » du lot 1,
 * ce qui est précisément l'intérêt du moteur (§ 3). Tous ces préréglages sont
 * livrés désactivés — seul le choix d'usage du premier lancement en active un
 * sous-ensemble (§ 2.3).
 *
 * Les bornes `min` et `max` ne servent pas à interdire une saisie mais à
 * déclencher une demande de confirmation (A26). Elles sont donc larges à dessein :
 * elles doivent attraper la faute de frappe, pas le cas particulier.
 *
 * Deux préréglages simplifient volontairement l'annexe du cahier des charges :
 * `douleurs` et `menopause` y sont notés « echelle5 + zone » et « echelle5 + type »,
 * une nuance que le moteur ne modélise pas encore. Ils sont livrés en `echelle5`
 * simple ; le raffinement pourra venir plus tard sans casser les données déjà
 * saisies, puisque la clé du champ ne change pas.
 */

import type { DefinitionChamp, TypeChamp, CategorieChamp, UniteChamp, UsageDeclare } from './types'
import { masseVersAffichage, type UniteMasse } from './unites'

/** Le poids est le seul champ système : ni désactivable, ni supprimable. */
export const CLE_POIDS = 'poids'
export const CLE_TAILLE = 'taille'
export const CLE_TOUR_TAILLE = 'tour_taille'
/**
 * Les quelques clés que le moteur traite de façon particulière. Les nommer ici
 * rend cette liste d'exceptions visible d'un coup d'œil, au lieu de la laisser
 * dispersée en chaînes littérales dans les vues.
 */
export const CLE_TENSION = 'tension'
export const CLE_ACTIVITE_DUREE = 'activite_duree'
export const CLE_RENFORCEMENT = 'renforcement'

type Prereglage = Omit<DefinitionChamp, 'personnalise'>

const CORPS: Prereglage[] = [
  { cle: CLE_POIDS, libelle: 'Poids', categorie: 'corps', type: 'nombre', unite: 'kg', min: 20, max: 400, pas: 0.1, actif: true, ordre: 10, systeme: true },
  { cle: CLE_TAILLE, libelle: 'Taille', categorie: 'corps', type: 'nombre', unite: 'cm', min: 50, max: 250, pas: 0.5, actif: true, ordre: 20, systeme: false },

  { cle: 'tour_poitrine', libelle: 'Tour de poitrine', categorie: 'corps', type: 'nombre', unite: 'cm', min: 30, max: 200, pas: 0.5, actif: true, ordre: 30, systeme: false },
  { cle: CLE_TOUR_TAILLE, libelle: 'Tour de taille', categorie: 'corps', type: 'nombre', unite: 'cm', min: 30, max: 200, pas: 0.5, actif: true, ordre: 40, systeme: false },
  { cle: 'tour_ventre', libelle: 'Tour de ventre', categorie: 'corps', type: 'nombre', unite: 'cm', min: 30, max: 200, pas: 0.5, actif: true, ordre: 50, systeme: false },
  { cle: 'tour_hanches', libelle: 'Tour de hanches', categorie: 'corps', type: 'nombre', unite: 'cm', min: 30, max: 200, pas: 0.5, actif: true, ordre: 60, systeme: false },
  { cle: 'tour_cuisse', libelle: 'Tour de cuisse', categorie: 'corps', type: 'nombre', unite: 'cm', min: 20, max: 120, pas: 0.5, actif: true, ordre: 70, systeme: false },
  { cle: 'tour_bras', libelle: 'Tour de bras', categorie: 'corps', type: 'nombre', unite: 'cm', min: 10, max: 90, pas: 0.5, actif: true, ordre: 80, systeme: false },

  { cle: 'tour_cou', libelle: 'Tour de cou', categorie: 'corps', type: 'nombre', unite: 'cm', min: 20, max: 80, pas: 0.5, actif: false, ordre: 90, systeme: false },
  { cle: 'tour_mollet', libelle: 'Tour de mollet', categorie: 'corps', type: 'nombre', unite: 'cm', min: 15, max: 80, pas: 0.5, actif: false, ordre: 100, systeme: false },
  { cle: 'tour_avant_bras', libelle: "Tour d'avant-bras", categorie: 'corps', type: 'nombre', unite: 'cm', min: 10, max: 60, pas: 0.5, actif: false, ordre: 110, systeme: false },
  { cle: 'tour_epaules', libelle: "Tour d'épaules", categorie: 'corps', type: 'nombre', unite: 'cm', min: 60, max: 200, pas: 0.5, actif: false, ordre: 120, systeme: false },
  { cle: 'tour_poignet', libelle: 'Tour de poignet', categorie: 'corps', type: 'nombre', unite: 'cm', min: 10, max: 30, pas: 0.5, actif: false, ordre: 130, systeme: false },
  { cle: 'tour_cheville', libelle: 'Tour de cheville', categorie: 'corps', type: 'nombre', unite: 'cm', min: 10, max: 50, pas: 0.5, actif: false, ordre: 140, systeme: false },

  { cle: 'taille_vetement', libelle: 'Taille de vêtement', categorie: 'corps', type: 'texte', actif: false, ordre: 150, systeme: false },
  { cle: 'pointure', libelle: 'Pointure', categorie: 'corps', type: 'nombre', min: 15, max: 60, pas: 0.5, actif: false, ordre: 160, systeme: false },
]

const SANTE: Prereglage[] = [
  { cle: 'tension', libelle: 'Tension artérielle', categorie: 'sante', type: 'tension', unite: 'mmHg', actif: false, ordre: 10, systeme: false },
]

const BIENETRE: Prereglage[] = [
  { cle: 'sommeil_qualite', libelle: 'Qualité du sommeil', categorie: 'bienetre', type: 'echelle5', echelle: { bas: 'très mauvaise', haut: 'très bonne' }, actif: false, ordre: 10, systeme: false },
  { cle: 'sommeil_duree', libelle: 'Durée de sommeil', categorie: 'bienetre', type: 'duree', unite: 'h', min: 0, max: 16, pas: 0.5, actif: false, ordre: 20, systeme: false },
  { cle: 'energie', libelle: 'Énergie', categorie: 'bienetre', type: 'echelle5', echelle: { bas: 'au plus bas', haut: 'au plus haut' }, actif: false, ordre: 30, systeme: false },
  { cle: 'humeur', libelle: 'Humeur', categorie: 'bienetre', type: 'echelle5', echelle: { bas: 'très basse', haut: 'très bonne' }, actif: false, ordre: 40, systeme: false },
  { cle: 'stress', libelle: 'Stress', categorie: 'bienetre', type: 'echelle5', echelle: { bas: 'aucun', haut: 'très fort' }, actif: false, ordre: 50, systeme: false },
  { cle: 'douleurs', libelle: 'Douleurs', categorie: 'bienetre', type: 'echelle5', echelle: { bas: 'aucune', haut: 'très fortes' }, actif: false, ordre: 60, systeme: false },
  { cle: 'motivation', libelle: 'Motivation', categorie: 'bienetre', type: 'echelle5', echelle: { bas: 'très faible', haut: 'très forte' }, actif: false, ordre: 70, systeme: false },
  { cle: 'confiance', libelle: 'Confiance en soi', categorie: 'bienetre', type: 'echelle5', echelle: { bas: 'très faible', haut: 'très forte' }, actif: false, ordre: 80, systeme: false },
  { cle: 'essoufflement', libelle: 'Essoufflement à l\'effort', categorie: 'bienetre', type: 'echelle5', echelle: { bas: 'aucun', haut: 'important' }, actif: false, ordre: 90, systeme: false },
  { cle: 'digestion', libelle: 'Confort digestif', categorie: 'bienetre', type: 'echelle5', echelle: { bas: 'très inconfortable', haut: 'très confortable' }, actif: false, ordre: 100, systeme: false },
  // Seule échelle dont aucune extrémité n'est souhaitable : c'est le milieu qui l'est.
  { cle: 'transit', libelle: 'Transit', categorie: 'bienetre', type: 'echelle5', echelle: { bas: 'très ralenti', haut: 'très accéléré' }, actif: false, ordre: 110, systeme: false },
  { cle: 'hydratation', libelle: 'Hydratation', categorie: 'bienetre', type: 'nombre', unite: 'verres', min: 0, max: 20, pas: 1, actif: false, ordre: 120, systeme: false },
  { cle: 'fringales', libelle: 'Fringales', categorie: 'bienetre', type: 'echelle5', echelle: { bas: 'aucune', haut: 'très fréquentes' }, actif: false, ordre: 130, systeme: false },
  // Renommé : « Faim et satiété » nommait deux sensations opposées sur une seule
  // échelle — noter 3 pouvait vouloir dire « moyennement affamée » ou « moyennement
  // rassasiée ». Une échelle, une seule sensation, deux extrémités explicites.
  { cle: 'satiete', libelle: 'Sensation de satiété', categorie: 'bienetre', type: 'echelle5', echelle: { bas: 'rarement rassasié', haut: 'facilement rassasié' }, actif: false, ordre: 140, systeme: false },
  { cle: 'menopause', libelle: 'Symptômes de ménopause', categorie: 'bienetre', type: 'echelle5', echelle: { bas: 'absents', haut: 'très présents' }, actif: false, ordre: 150, systeme: false },
  { cle: 'cycle', libelle: 'Cycle menstruel', categorie: 'bienetre', type: 'choix', options: ['Règles', 'Prémenstruel', 'Ovulation', 'Autre'], actif: false, ordre: 160, systeme: false },
  { cle: 'alcool', libelle: 'Alcool', categorie: 'bienetre', type: 'nombre', unite: 'verres', min: 0, max: 30, pas: 1, actif: false, ordre: 170, systeme: false },
  { cle: 'tabac', libelle: 'Tabac', categorie: 'bienetre', type: 'nombre', min: 0, max: 60, pas: 1, actif: false, ordre: 180, systeme: false },
  { cle: 'cafeine', libelle: 'Caféine', categorie: 'bienetre', type: 'nombre', min: 0, max: 15, pas: 1, actif: false, ordre: 190, systeme: false },
]

const ACTIVITE: Prereglage[] = [
  { cle: 'activite_type', libelle: "Type d'activité", categorie: 'activite', type: 'choix', options: ['Marche', 'Natation', 'Vélo', 'Renforcement', 'Yoga', 'Autre'], actif: false, ordre: 10, systeme: false },
  { cle: 'activite_duree', libelle: "Durée d'activité", categorie: 'activite', type: 'duree', unite: 'min', min: 0, max: 600, pas: 5, actif: false, ordre: 20, systeme: false },
  { cle: 'activite_intensite', libelle: 'Intensité', categorie: 'activite', type: 'echelle5', echelle: { bas: 'très douce', haut: 'très soutenue' }, actif: false, ordre: 30, systeme: false },
  { cle: 'activite_quotidien', libelle: 'Activité du quotidien', categorie: 'activite', type: 'choix', multiple: true, options: ['Jardinage', 'Ménage', 'Courses', 'Escaliers', 'Bricolage'], actif: false, ordre: 40, systeme: false },
  { cle: 'renforcement', libelle: 'Renforcement musculaire', categorie: 'activite', type: 'booleen', actif: false, ordre: 50, systeme: false },
  { cle: 'distance', libelle: 'Distance parcourue', categorie: 'activite', type: 'nombre', unite: 'km', min: 0, max: 200, pas: 0.1, actif: false, ordre: 60, systeme: false },
  { cle: 'pas', libelle: 'Nombre de pas', categorie: 'activite', type: 'nombre', unite: 'pas', min: 0, max: 100_000, pas: 100, actif: false, ordre: 70, systeme: false },
]

/** Catalogue livré à la création d'un carnet, toutes catégories confondues. */
export function champsParDefaut(): DefinitionChamp[] {
  return [...CORPS, ...SANTE, ...BIENETRE, ...ACTIVITE].map((c) => ({ ...c, personnalise: false }))
}

/**
 * Ordre d'affichage des catégories dans le formulaire (§ 5.2) : mensurations,
 * puis santé, bien-être et activité dans leurs sections repliables respectives.
 * Le champ `ordre` d'un `DefinitionChamp` n'est significatif qu'à l'intérieur
 * d'une catégorie ; ce tableau départage les catégories entre elles.
 */
const ORDRE_CATEGORIES: CategorieChamp[] = ['corps', 'sante', 'bienetre', 'activite']

function rangCategorie(c: CategorieChamp): number {
  const i = ORDRE_CATEGORIES.indexOf(c)
  return i === -1 ? ORDRE_CATEGORIES.length : i
}

/** Champs proposés dans le formulaire, groupés par catégorie puis triés, hors désactivés. */
export function champsActifs(champs: DefinitionChamp[]): DefinitionChamp[] {
  return champs
    .filter((c) => c.actif)
    .sort((a, b) => rangCategorie(a.categorie) - rangCategorie(b.categorie) || a.ordre - b.ordre)
}

export function champsDeCategorie(
  champs: DefinitionChamp[],
  categorie: DefinitionChamp['categorie'],
): DefinitionChamp[] {
  return champs.filter((c) => c.categorie === categorie).sort((a, b) => a.ordre - b.ordre)
}

export function trouverChamp(
  champs: DefinitionChamp[],
  cle: string,
): DefinitionChamp | undefined {
  return champs.find((c) => c.cle === cle)
}

/**
 * Les mensurations proposées dans la section repliable du formulaire :
 * tout ce qui est actif dans « corps », sauf le poids (saisi au-dessus)
 * et la taille (qui relève du profil et change rarement).
 */
export function mensurationsActives(champs: DefinitionChamp[]): DefinitionChamp[] {
  return champsActifs(champs).filter(
    (c) => c.categorie === 'corps' && c.cle !== CLE_POIDS && c.cle !== CLE_TAILLE,
  )
}

export function champsBienEtreActifs(champs: DefinitionChamp[]): DefinitionChamp[] {
  return champsActifs(champs).filter((c) => c.categorie === 'bienetre')
}

export function champsActiviteActifs(champs: DefinitionChamp[]): DefinitionChamp[] {
  return champsActifs(champs).filter((c) => c.categorie === 'sante' || c.categorie === 'activite')
}

/* -------------------------------------------------------------------- */
/* Unité d'affichage d'un champ (A25, règle 16)                          */
/* -------------------------------------------------------------------- */

/**
 * Le stockage est canonique — le poids est toujours en kilogrammes (règle 16).
 * Le préréglage porte donc `unite: 'kg'`, ce qui est vrai du stockage mais faux
 * de ce qu'on doit montrer à quelqu'un qui a choisi les livres.
 *
 * Cette fonction rend le champ **tel qu'il doit s'afficher** : unité, bornes de
 * confirmation et pas convertis. Elle évite que chaque composant de saisie ait
 * à savoir lesquelles des trente-quatre clés du catalogue sont des masses.
 *
 * Seul le poids est concerné : les mensurations sont en centimètres, et le
 * carnet n'offre pas d'autre unité de longueur (voir § 2.2 de l'audit).
 */
export function champAffiche(champ: DefinitionChamp, uniteMasse: UniteMasse): DefinitionChamp {
  if (champ.cle !== CLE_POIDS || uniteMasse === 'kg') return champ
  const convertir = (v: number | undefined) =>
    v === undefined ? undefined : masseVersAffichage(v, uniteMasse)
  return {
    ...champ,
    unite: uniteMasse,
    min: convertir(champ.min),
    max: convertir(champ.max),
    pas: champ.pas,
  }
}

/** Vrai si les valeurs de ce champ sont stockées en kilogrammes. */
export function estChampMasse(cle: string): boolean {
  return cle === CLE_POIDS
}

/* -------------------------------------------------------------------- */
/* Préréglages par usage déclaré (J5, § 2.3)                             */
/* -------------------------------------------------------------------- */

/**
 * Clés de champ à activer selon la réponse donnée au premier lancement.
 * Une réponse ne fait qu'activer un sous-ensemble du catalogue livré : rien
 * n'est créé, rien n'est verrouillé, tout reste modifiable dans les paramètres.
 */
const CLES_PAR_USAGE: Record<UsageDeclare, string[]> = {
  suivre: [],
  stabiliser: [],
  reprendre: [],
  constantes: ['tension', 'sommeil_qualite', 'energie'],
  sport: ['activite_type', 'activite_duree', 'activite_intensite', 'renforcement', 'tour_taille', 'tour_bras', 'tour_cuisse'],
  indecis: [],
}

/** Applique les préréglages d'un usage déclaré sur un catalogue de champs. */
export function activerPourUsage(
  champs: DefinitionChamp[],
  usage: UsageDeclare,
): DefinitionChamp[] {
  const cles = new Set(CLES_PAR_USAGE[usage])
  if (cles.size === 0) return champs
  return champs.map((c) => (cles.has(c.cle) ? { ...c, actif: true } : c))
}

/* -------------------------------------------------------------------- */
/* Champs personnalisés (C18)                                            */
/* -------------------------------------------------------------------- */

/** Transforme un libellé en identifiant stable : minuscules, sans accent, tirets bas. */
export function genererCle(libelle: string): string {
  const base = libelle
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return base || 'champ'
}

/** Ajoute un suffixe numérique si la clé générée existe déjà (règle : la clé est stable et unique). */
export function cleUnique(cle: string, champsExistants: DefinitionChamp[]): string {
  const existantes = new Set(champsExistants.map((c) => c.cle))
  if (!existantes.has(cle)) return cle
  let n = 2
  while (existantes.has(`${cle}_${n}`)) n++
  return `${cle}_${n}`
}

export interface NouveauChampPersonnalise {
  libelle: string
  categorie: CategorieChamp
  type: TypeChamp
  unite?: UniteChamp
  min?: number
  max?: number
  options?: string[]
}

/**
 * Construit un champ personnalisé prêt à être ajouté au catalogue (C18).
 * Il est actif dès sa création — un champ qu'on vient de créer et qu'on ne
 * voit pas dans le formulaire serait déroutant — et se comporte ensuite en
 * tout point comme un champ livré : historique, graphiques, exports.
 */
export function creerChampPersonnalise(
  saisie: NouveauChampPersonnalise,
  champsExistants: DefinitionChamp[],
  ordre: number,
): DefinitionChamp {
  const cle = cleUnique(genererCle(saisie.libelle), champsExistants)
  return {
    cle,
    libelle: saisie.libelle.trim(),
    categorie: saisie.categorie,
    type: saisie.type,
    unite: saisie.unite,
    min: saisie.min,
    max: saisie.max,
    options: saisie.options,
    actif: true,
    ordre,
    systeme: false,
    personnalise: true,
  }
}

/** Prochain rang d'affichage dans une catégorie : après le dernier champ existant. */
export function prochainOrdre(champs: DefinitionChamp[], categorie: CategorieChamp): number {
  const dansCategorie = champs.filter((c) => c.categorie === categorie)
  if (dansCategorie.length === 0) return 10
  return Math.max(...dansCategorie.map((c) => c.ordre)) + 10
}
