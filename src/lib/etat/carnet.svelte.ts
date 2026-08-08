/**
 * État de l'application.
 *
 * Une seule source de vérité, chargée depuis la base au démarrage puis tenue
 * à jour en mémoire. Les indicateurs sont exposés en lecture seule et recalculés
 * à la volée : conformément au § 20 v1.0, aucune valeur dérivée n'est stockée.
 */

import { base, idChamp, maintenant, nouvelId, type ChampStocke } from '../db/db'
import type {
  Carnet, DefinitionChamp, Evenement, Mesure, Objectif, Profil, ReflexionMensuelle,
  Traitement, UsageDeclare, ValeurChamp,
} from '../domain/types'
import {
  champsParDefaut, CLE_POIDS, CLE_TAILLE, CLE_TOUR_TAILLE,
  CLE_ACTIVITE_DUREE, CLE_RENFORCEMENT, activerPourUsage, estDernierChampActif,
  porteUneObservation,
  creerChampPersonnalise, prochainOrdre, type NouveauChampPersonnalise,
} from '../domain/champs'
import { versISO } from '../domain/dates'
import { calculerImc, lireImc, poidsDeReference, ratioTailleStature } from '../domain/imc'
import { ageA } from '../domain/dates'
import { calculerProgression } from '../domain/objectifs'
import { bilanChamp, derniereValeur, valeurLaPlusProche } from '../domain/bilan'
import { comparerMesures, detecterPerteRapide, serie, variationParJour } from '../domain/tendance'
import { trierEvenements } from '../domain/evenements'
import { jalonsDeRegularite, estAnniversaireCarnet, anneesDeCarnet } from '../domain/jalons'
import { calculerRepereActivite } from '../domain/activite'
import { traitementsEnCours } from '../domain/traitements'
import { construireCarnet } from '../io/sauvegarde'

/** Délai pendant lequel une suppression reste annulable (K8). */
const DELAI_ANNULATION_MS = 12_000

export interface SuppressionAnnulable {
  mesure: Mesure
  expireLe: number
}

function profilParDefaut(): Profil {
  return {
    id: nouvelId(),
    nomCarnet: 'Mon carnet',
    uniteMasse: 'kg',
    formatDate: 'jj/mm/aaaa',
    langue: 'fr',
    mode: 'essentiel',
    usage: 'indecis',
    theme: 'auto',
    taillePolice: 100,
    modeSansChiffre: false,
    creeLe: maintenant(),
  }
}

class EtatCarnet {
  profil = $state<Profil | null>(null)
  /** Tous les profils de l'appareil (O1), pour le sélecteur — pas seulement l'actif. */
  profils = $state<Profil[]>([])
  champs = $state<DefinitionChamp[]>([])
  mesures = $state<Mesure[]>([])
  objectif = $state<Objectif | null>(null)
  evenements = $state<Evenement[]>([])
  reflexions = $state<ReflexionMensuelle[]>([])
  traitements = $state<Traitement[]>([])

  chargement = $state(true)
  premierLancement = $state(false)
  suppressionAnnulable = $state<SuppressionAnnulable | null>(null)

  #minuteurAnnulation: ReturnType<typeof setTimeout> | null = null

  /* ---------------- chargement ---------------- */

  async charger(): Promise<void> {
    this.chargement = true
    const profils = await base.profils.toArray()
    this.profils = profils

    if (profils.length === 0) {
      this.premierLancement = true
      this.profil = profilParDefaut()
      this.champs = champsParDefaut()
      this.mesures = []
      this.objectif = null
      this.evenements = []
      this.reflexions = []
      this.traitements = []
      this.chargement = false
      return
    }

    // O1 : plusieurs profils peuvent partager cet appareil. Celui à afficher
    // est un réglage local (jamais dans le carnet exportable, § 4) — s'il ne
    // désigne plus rien de valide (profil supprimé, premier lancement…), on
    // retombe sur le premier profil disponible plutôt que d'échouer.
    const profilActifId = await this.#lireProfilActifId()
    const profil = profils.find((p) => p.id === profilActifId) ?? profils[0]!
    this.profil = profil
    this.premierLancement = false

    const [champs, mesures, objectifs, evenements, reflexions, traitements] = await Promise.all([
      base.champs.where('profilId').equals(profil.id).toArray(),
      base.mesures.where('profilId').equals(profil.id).toArray(),
      base.objectifs.where('profilId').equals(profil.id).toArray(),
      base.evenements.where('profilId').equals(profil.id).toArray(),
      base.reflexions.where('profilId').equals(profil.id).toArray(),
      base.traitements.where('profilId').equals(profil.id).toArray(),
    ])

    const champsExistants = champs.length > 0
      ? champs.map(({ id: _id, profilId: _p, ...c }) => c)
      : champsParDefaut()

    // § 34 : une mise à jour de l'application doit atteindre les carnets déjà
    // créés, pas seulement les nouveaux. Deux choses distinctes s'y jouent :
    //
    //  - les préréglages que le carnet ne connaît pas encore lui sont ajoutés ;
    //  - la *définition* d'un préréglage connu — libellé, bornes, unité, légende
    //    d'échelle — est reprise du catalogue, tandis que les choix de la personne
    //    (l'avoir activé, l'avoir rangé) sont préservés tels quels.
    //
    // Sans ce second point, seuls les champs entièrement nouveaux arrivaient :
    // un champ renommé ou une échelle enfin légendée restaient indéfiniment dans
    // leur ancienne version sur les carnets existants.
    const parDefaut = champsParDefaut()
    const catalogue = new Map(parDefaut.map((c) => [c.cle, c]))

    const fusionnes = champsExistants.map((stocke) => {
      const reference = catalogue.get(stocke.cle)
      // Un champ personnalisé n'a pas de référence : il appartient à la personne.
      if (!reference || stocke.personnalise) return stocke
      return { ...reference, actif: stocke.actif, ordre: stocke.ordre }
    })

    const clesConnues = new Set(champsExistants.map((c) => c.cle))
    const manquants = parDefaut.filter((c) => !clesConnues.has(c.cle))

    this.champs = [...fusionnes, ...manquants]
    this.mesures = mesures.sort(comparerMesures)
    this.objectif = objectifs.find((o) => o.actif) ?? null
    this.evenements = trierEvenements(evenements)
    this.reflexions = reflexions
    this.traitements = traitements
    this.chargement = false

    // Réécrire à chaque ouverture serait inutile : on ne le fait que si le
    // catalogue stocké a réellement bougé. L'empreinte trie les clés, l'ordre
    // des propriétés renvoyées par la base n'étant pas garanti.
    const empreinte = (c: DefinitionChamp) =>
      JSON.stringify(Object.entries(c).sort(([a], [b]) => a.localeCompare(b)))
    const aChange = manquants.length > 0
      || fusionnes.some((c, i) => empreinte(c) !== empreinte(champsExistants[i]!))

    if (aChange) await this.#ecrireChamps()
  }

  /**
   * Écrit le profil et le catalogue de champs à l'issue de la première configuration.
   * Le choix d'usage (J5) active un sous-ensemble de préréglages avant l'écriture :
   * c'est le seul moment où l'application active des champs sans geste explicite
   * sur chacun d'eux.
   */
  async initialiser(profil: Profil): Promise<void> {
    this.profil = profil
    this.profils = [profil]
    this.champs = activerPourUsage(this.champs, profil.usage)
    await base.profils.put($state.snapshot(profil))
    await this.#ecrireChamps()
    await this.#definirProfilActif(profil.id)
    this.premierLancement = false
  }

  async #ecrireChamps(): Promise<void> {
    const p = this.profil
    if (!p) return
    const stockes: ChampStocke[] = $state.snapshot(this.champs).map((c) => ({
      ...c,
      id: idChamp(p.id, c.cle),
      profilId: p.id,
    }))
    await base.champs.bulkPut(stockes)
  }

  async #lireProfilActifId(): Promise<string | undefined> {
    const p = await base.parametresLocaux.get('profil-actif')
    return p?.id === 'profil-actif' ? p.profilId : undefined
  }

  async #definirProfilActif(profilId: string): Promise<void> {
    await base.parametresLocaux.put({ id: 'profil-actif', profilId })
  }

  /* ---------------- profils multiples (O1) ---------------- */

  /**
   * Bascule vers un autre profil de l'appareil. Aucune donnée n'est partagée
   * entre profils (§ 12.3) : basculer revient à recharger un carnet distinct.
   */
  async basculerProfil(profilId: string): Promise<void> {
    if (profilId === this.profil?.id) return
    await this.#definirProfilActif(profilId)
    await this.charger()
  }

  /**
   * Crée un nouveau profil sur cet appareil et bascule dessus. Reprend la
   * même logique que la première configuration (§ 2.3), sans jamais toucher
   * aux profils déjà existants.
   */
  async creerProfil(nomCarnet: string, usage: UsageDeclare): Promise<void> {
    const profil: Profil = {
      id: nouvelId(),
      nomCarnet,
      uniteMasse: 'kg',
        formatDate: 'jj/mm/aaaa',
      langue: 'fr',
      mode: 'essentiel',
      usage,
      theme: 'auto',
      taillePolice: 100,
      modeSansChiffre: false,
      creeLe: maintenant(),
    }
    await base.profils.put(profil)

    const champsInitiaux = activerPourUsage(champsParDefaut(), usage)
    await base.champs.bulkPut(
      champsInitiaux.map((c) => ({ ...c, id: idChamp(profil.id, c.cle), profilId: profil.id })),
    )

    await this.#definirProfilActif(profil.id)
    await this.charger()
  }

  /* ---------------- profil ---------------- */

  async majProfil(modifs: Partial<Profil>): Promise<void> {
    if (!this.profil) return
    this.profil = { ...this.profil, ...modifs }
    await base.profils.put($state.snapshot(this.profil))
  }

  /* ---------------- mesures ---------------- */

  async enregistrerMesure(
    date: string,
    valeurs: Record<string, ValeurChamp>,
    options: {
      notes?: string
      etiquettes?: string[]
      moment?: string
      contextePesee?: Mesure['contextePesee']
      id?: string
    } = {},
  ): Promise<Mesure> {
    const p = this.profil
    if (!p) throw new Error('Aucun profil chargé.')

    const existante = options.id ? this.mesures.find((m) => m.id === options.id) : undefined

    const mesure: Mesure = existante
      ? {
          ...existante,
          date,
          valeurs: { ...valeurs },
          notes: options.notes,
          etiquettes: options.etiquettes,
          moment: options.moment,
          contextePesee: options.contextePesee,
          modifieLe: maintenant(),
        }
      : {
          id: nouvelId(),
          profilId: p.id,
          date,
          valeurs: { ...valeurs },
          notes: options.notes,
          etiquettes: options.etiquettes,
          moment: options.moment,
          contextePesee: options.contextePesee,
          creeLe: maintenant(),
          modifieLe: maintenant(),
        }

    await base.mesures.put($state.snapshot(mesure))

    this.mesures = [
      ...this.mesures.filter((m) => m.id !== mesure.id),
      mesure,
    ].sort(comparerMesures)

    return mesure
  }

  /** Ajoute ou met à jour une seule valeur sur la mesure du jour (utilisé pour la taille). */
  async enregistrerValeurDuJour(cle: string, valeur: ValeurChamp): Promise<void> {
    const aujourdhui = versISO(new Date())
    const duJour = this.mesures.find((m) => m.date === aujourdhui)
    const valeurs = { ...(duJour?.valeurs ?? {}), [cle]: valeur }
    // `enregistrerMesure` réécrit la mesure entière : tout ce qui n'est pas
    // reconduit ici serait effacé. Enregistrer sa taille depuis les paramètres
    // ne doit pas faire disparaître les étiquettes de la mesure du jour.
    await this.enregistrerMesure(aujourdhui, valeurs, {
      notes: duJour?.notes,
      etiquettes: duJour?.etiquettes ? [...duJour.etiquettes] : undefined,
      moment: duJour?.moment,
      contextePesee: duJour?.contextePesee,
      id: duJour?.id,
    })
  }

  /**
   * Supprime une mesure en gardant la possibilité de revenir en arrière (K8).
   * L'annulation est plus rassurante qu'une boîte de confirmation supplémentaire.
   */
  async supprimerMesure(id: string): Promise<void> {
    const mesure = this.mesures.find((m) => m.id === id)
    if (!mesure) return

    await base.mesures.delete(id)
    this.mesures = this.mesures.filter((m) => m.id !== id)

    this.suppressionAnnulable = {
      mesure: $state.snapshot(mesure) as Mesure,
      expireLe: Date.now() + DELAI_ANNULATION_MS,
    }

    if (this.#minuteurAnnulation) clearTimeout(this.#minuteurAnnulation)
    this.#minuteurAnnulation = setTimeout(() => {
      this.suppressionAnnulable = null
    }, DELAI_ANNULATION_MS)
  }

  async annulerSuppression(): Promise<void> {
    const en = this.suppressionAnnulable
    if (!en) return

    await base.mesures.put(en.mesure)
    this.mesures = [...this.mesures, en.mesure].sort(comparerMesures)
    this.suppressionAnnulable = null
    if (this.#minuteurAnnulation) clearTimeout(this.#minuteurAnnulation)
  }

  /* ---------------- objectif ---------------- */

  async definirObjectif(o: Omit<Objectif, 'id' | 'profilId' | 'creeLe'>): Promise<void> {
    const p = this.profil
    if (!p) return

    // Un seul objectif actif à la fois ; les précédents sont désactivés, pas effacés (§ 9.1).
    const anciens = await base.objectifs.where('profilId').equals(p.id).toArray()
    await Promise.all(
      anciens.filter((a) => a.actif).map((a) => base.objectifs.put({ ...a, actif: false })),
    )

    const objectif: Objectif = { ...o, id: nouvelId(), profilId: p.id, creeLe: maintenant() }
    await base.objectifs.put(objectif)
    this.objectif = objectif
  }

  async retirerObjectif(): Promise<void> {
    const o = this.objectif
    if (!o) return
    await base.objectifs.put({ ...$state.snapshot(o), actif: false })
    this.objectif = null
  }

  /* ---------------- champs ---------------- */

  async basculerChamp(cle: string, actif: boolean): Promise<void> {
    // Tous les champs se désactivent, y compris le poids. Le seul refus possible
    // est de vider entièrement le carnet de ses champs : il n'aurait alors plus
    // de formulaire de saisie.
    if (!actif && estDernierChampActif(this.champs, cle)) return
    this.champs = this.champs.map((c) => (c.cle === cle ? { ...c, actif } : c))
    await this.#ecrireChamps()
  }

  /** Crée un champ personnalisé (C18) : actif dès sa création, en fin de sa catégorie. */
  async ajouterChampPersonnalise(saisie: NouveauChampPersonnalise): Promise<DefinitionChamp> {
    const ordre = prochainOrdre(this.champs, saisie.categorie)
    const champ = creerChampPersonnalise(saisie, this.champs, ordre)
    this.champs = [...this.champs, champ]
    await this.#ecrireChamps()
    return champ
  }

  /**
   * Retire la définition d'un champ personnalisé (règle 12). Les valeurs déjà
   * enregistrées dans l'historique ne sont pas touchées — seule la définition
   * disparaît, ce qui suffit à ce qu'elles cessent de s'afficher.
   */
  async supprimerChampPersonnalise(cle: string): Promise<void> {
    const p = this.profil
    if (!p) return
    const champ = this.champs.find((c) => c.cle === cle)
    if (!champ || !champ.personnalise) return

    this.champs = this.champs.filter((c) => c.cle !== cle)
    await base.champs.delete(idChamp(p.id, cle))
  }

  /** Nombre de mesures portant une valeur pour ce champ — à afficher avant confirmation (règle 12). */
  nombreMesuresAvec(cle: string): number {
    return this.mesures.filter((m) => m.valeurs[cle] !== undefined).length
  }

  /* ---------------- événements ---------------- */

  async ajouterEvenement(e: Omit<Evenement, 'id' | 'profilId'>): Promise<void> {
    const p = this.profil
    if (!p) return
    const evenement: Evenement = { ...e, id: nouvelId(), profilId: p.id }
    await base.evenements.put(evenement)
    this.evenements = trierEvenements([...this.evenements, evenement])
  }

  async modifierEvenement(id: string, modifs: Partial<Omit<Evenement, 'id' | 'profilId'>>): Promise<void> {
    const existant = this.evenements.find((e) => e.id === id)
    if (!existant) return
    const modifie: Evenement = { ...existant, ...modifs }
    await base.evenements.put($state.snapshot(modifie))
    this.evenements = trierEvenements(this.evenements.map((e) => (e.id === id ? modifie : e)))
  }

  async supprimerEvenement(id: string): Promise<void> {
    await base.evenements.delete(id)
    this.evenements = this.evenements.filter((e) => e.id !== id)
  }

  /* ---------------- réflexion du mois (C22) ---------------- */

  reflexionDuMois(cleMois: string): ReflexionMensuelle | undefined {
    return this.reflexions.find((r) => r.mois === cleMois)
  }

  /** Une seule réflexion par mois : enregistrer la remplace plutôt que d'en cumuler. */
  async enregistrerReflexion(cleMois: string, question: string, reponse: string): Promise<void> {
    const p = this.profil
    if (!p) return
    const existante = this.reflexionDuMois(cleMois)
    const reflexion: ReflexionMensuelle = {
      id: existante?.id ?? nouvelId(),
      profilId: p.id,
      mois: cleMois,
      question,
      reponse,
      modifieLe: maintenant(),
    }
    await base.reflexions.put(reflexion)
    this.reflexions = [...this.reflexions.filter((r) => r.mois !== cleMois), reflexion]
  }

  /* ---------------- traitements (B4) ---------------- */

  async ajouterTraitement(t: Omit<Traitement, 'id' | 'profilId'>): Promise<void> {
    const p = this.profil
    if (!p) return
    const traitement: Traitement = { ...t, id: nouvelId(), profilId: p.id }
    await base.traitements.put(traitement)
    this.traitements = [...this.traitements, traitement]
  }

  async modifierTraitement(id: string, modifs: Partial<Omit<Traitement, 'id' | 'profilId'>>): Promise<void> {
    const existant = this.traitements.find((t) => t.id === id)
    if (!existant) return
    const modifie: Traitement = { ...existant, ...modifs }
    await base.traitements.put($state.snapshot(modifie))
    this.traitements = this.traitements.map((t) => (t.id === id ? modifie : t))
  }

  async supprimerTraitement(id: string): Promise<void> {
    await base.traitements.delete(id)
    this.traitements = this.traitements.filter((t) => t.id !== id)
  }

  /* ---------------- données ---------------- */

  exporter(): Carnet {
    const p = this.profil
    return construireCarnet(
      p ? [$state.snapshot(p)] : [],
      $state.snapshot(this.champs),
      $state.snapshot(this.mesures),
      this.objectif ? [$state.snapshot(this.objectif)] : [],
      $state.snapshot(this.evenements),
      $state.snapshot(this.reflexions),
      $state.snapshot(this.traitements),
    )
  }

  /**
   * Restaure une sauvegarde **dans le profil actif**, et lui seul.
   *
   * Symétrique de `toutSupprimer()` : avec plusieurs profils sur un appareil (O1),
   * restaurer son carnet ne doit pas emporter celui d'un proche. Le profil actif
   * garde son identifiant et adopte les réglages du fichier ; ses anciennes
   * données sont remplacées, celles des autres profils ne sont pas lues.
   *
   * Les identifiants de lignes sont régénérés : deux profils qui restaurent la
   * même sauvegarde partageraient sinon les mêmes clés primaires, et le second
   * import déplacerait les mesures du premier (le défaut même qu'on corrige ici).
   */
  async importer(carnet: Carnet): Promise<void> {
    const importe = carnet.profils[0] ?? profilParDefaut()
    const profilId = this.profil?.id ?? importe.id
    const profil: Profil = { ...importe, id: profilId }

    // Dexie ne type explicitement la transaction que jusqu'à quatre tables : au-delà,
    // on passe la liste en tableau plutôt qu'en arguments séparés.
    await base.transaction(
      'rw',
      [
        base.profils, base.champs, base.mesures, base.objectifs,
        base.evenements, base.reflexions, base.traitements,
      ],
      async () => {
        await Promise.all([
          base.champs.where('profilId').equals(profilId).delete(),
          base.mesures.where('profilId').equals(profilId).delete(),
          base.objectifs.where('profilId').equals(profilId).delete(),
          base.evenements.where('profilId').equals(profilId).delete(),
          base.reflexions.where('profilId').equals(profilId).delete(),
          base.traitements.where('profilId').equals(profilId).delete(),
        ])
        await base.profils.put(profil)
        await base.champs.bulkPut(
          (carnet.champs.length > 0 ? carnet.champs : champsParDefaut()).map((c) => ({
            ...c, id: idChamp(profilId, c.cle), profilId,
          })),
        )
        await base.mesures.bulkPut(
          carnet.mesures.map((m) => ({ ...m, id: nouvelId(), profilId })),
        )
        await base.objectifs.bulkPut(
          carnet.objectifs.map((o) => ({ ...o, id: nouvelId(), profilId })),
        )
        await base.evenements.bulkPut(
          (carnet.evenements ?? []).map((e) => ({ ...e, id: nouvelId(), profilId })),
        )
        await base.reflexions.bulkPut(
          (carnet.reflexions ?? []).map((r) => ({ ...r, id: nouvelId(), profilId })),
        )
        await base.traitements.bulkPut(
          (carnet.traitements ?? []).map((t) => ({ ...t, id: nouvelId(), profilId })),
        )
      })

    await this.#definirProfilActif(profilId)
    await this.charger()
  }

  /**
   * Suppression totale et définitive (L13, § 11.5) — **du seul profil actif**.
   * Avec plusieurs profils sur un même appareil (O1), effacer « mon carnet »
   * ne doit jamais emporter celui d'un proche : on retire uniquement les
   * lignes qui portent son `profilId`, dans toutes les tables. S'il ne
   * restait qu'un seul profil, l'appareil retombe sur le premier lancement —
   * le même comportement qu'avant l'existence des profils multiples.
   */
  async toutSupprimer(): Promise<void> {
    const p = this.profil
    if (!p) return

    await base.transaction(
      'rw',
      [
        base.profils, base.champs, base.mesures, base.objectifs,
        base.evenements, base.reflexions, base.traitements, base.parametresLocaux,
      ],
      async () => {
        await Promise.all([
          base.profils.delete(p.id),
          base.champs.where('profilId').equals(p.id).delete(),
          base.mesures.where('profilId').equals(p.id).delete(),
          base.objectifs.where('profilId').equals(p.id).delete(),
          base.evenements.where('profilId').equals(p.id).delete(),
          base.reflexions.where('profilId').equals(p.id).delete(),
          base.traitements.where('profilId').equals(p.id).delete(),
        ])
        const restants = await base.profils.toArray()
        if (restants.length > 0) await base.parametresLocaux.put({ id: 'profil-actif', profilId: restants[0]!.id })
        else await base.parametresLocaux.delete('profil-actif')
      })

    this.profil = null
    this.champs = []
    this.mesures = []
    this.objectif = null
    this.evenements = []
    this.reflexions = []
    this.traitements = []
    this.suppressionAnnulable = null
    await this.charger()
  }

  /* ---------------- indicateurs dérivés ---------------- */

  /**
   * Le poids est un champ comme un autre : il peut être désactivé. Tout ce qui
   * en dépend — courbe d'accueil, IMC, objectif, bilan du poids — se tait alors,
   * au lieu d'afficher des sections vides.
   */
  get suitLePoids(): boolean {
    return this.champs.some((c) => c.cle === CLE_POIDS && c.actif)
  }

  get poids() { return serie(this.mesures, CLE_POIDS) }

  get poidsActuel(): number | undefined { return derniereValeur(this.mesures, CLE_POIDS)?.valeur }
  get poidsInitial(): number | undefined { return this.poids[0]?.valeur }

  /**
   * Date de la dernière mesure, **quel que soit le champ renseigné**.
   * Elle se déduisait autrefois de la dernière pesée, ce qui n'a plus de sens
   * dès lors qu'un carnet peut ne suivre que le sommeil — et n'en avait déjà
   * pas beaucoup pour un carnet où une saisie n'avait porté que des mensurations.
   */
  get dateDerniereMesure(): string | undefined {
    return this.mesures[this.mesures.length - 1]?.date
  }

  get taille(): number | undefined {
    const d = this.dateDerniereMesure ?? versISO(new Date())
    return valeurLaPlusProche(this.mesures, CLE_TAILLE, d)
  }

  get age(): number | undefined {
    return ageA(this.profil?.dateNaissance, this.dateDerniereMesure ?? versISO(new Date()))
  }

  get imc(): number | undefined { return calculerImc(this.poidsActuel, this.taille) }

  get lectureImc() {
    const i = this.imc
    return i === undefined ? undefined : lireImc(i, this.age)
  }

  get zonePoidsSante() { return poidsDeReference(this.taille, this.age) }

  get ratioTaille(): number | undefined {
    const tt = derniereValeur(this.mesures, CLE_TOUR_TAILLE)?.valeur
    return ratioTailleStature(tt, this.taille)
  }

  get bilanPoids() { return bilanChamp(this.mesures, CLE_POIDS) }

  get progression() {
    const o = this.objectif
    if (!o) return null
    return calculerProgression(o, this.poidsInitial, this.poidsActuel)
  }

  get variationParJour(): number | undefined { return variationParJour(this.poids) }

  get alertePerte() { return detecterPerteRapide(this.poids) }

  get nombreMesures(): number { return this.mesures.filter(porteUneObservation).length }

  get jalons() {
    const p = this.profil
    if (!p) return []
    return jalonsDeRegularite(this.mesures, p, versISO(new Date()))
  }

  get estAnniversaireCarnet(): boolean {
    const p = this.profil
    return p ? estAnniversaireCarnet(p, versISO(new Date())) : false
  }

  get anneesDeCarnet(): number {
    const p = this.profil
    return p ? anneesDeCarnet(p, versISO(new Date())) : 0
  }

  get repereActivite() {
    const duree = derniereValeur(this.mesures, CLE_ACTIVITE_DUREE)?.valeur
    const derniereMesureAvecRenfo = [...this.mesures].reverse()
      .find((m) => m.valeurs[CLE_RENFORCEMENT] !== undefined)
    const renforcement = derniereMesureAvecRenfo?.valeurs[CLE_RENFORCEMENT]
    return calculerRepereActivite(duree, typeof renforcement === 'boolean' ? renforcement : undefined)
  }

  get traitementsEnCours() {
    return traitementsEnCours(this.traitements, versISO(new Date()))
  }
}

export const carnet = new EtatCarnet()
