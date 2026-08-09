<script lang="ts">
  /**
   * Définition d'un objectif (§ 9).
   *
   * Un objectif porte sur **n'importe quelle donnée suivie**, pas seulement le
   * poids (F4, § 9.1) : on choisit d'abord le champ, puis la forme.
   *
   * Deux formes, parce qu'elles ne se calculent pas pareil :
   *  - **niveau** — atteindre ou tenir une plage de valeurs. La fourchette est
   *    proposée par défaut : c'est le mode recommandé par le § 9.1, parce qu'on
   *    n'échoue plus à 63,2 kg quand la cible est « entre 61 et 64 » ;
   *  - **régularité** — remplir une condition un certain nombre de fois par
   *    période. « Dormir 7 h, cinq nuits sur sept. »
   *
   * Trois garde-fous, tous non bloquants, et les deux premiers propres au poids
   * parce qu'ils relèvent de sa physiologie :
   *  - un objectif dont l'IMC visé passe sous la borne basse déclenche un
   *    avertissement et une confirmation séparée (I2, § 12.2) ;
   *  - un rythme supérieur à 1 % du poids par semaine est signalé (F6) ;
   *  - une fourchette plus large que le chemin restant est signalée (§ 9.1).
   */
  import { untrack } from 'svelte'
  import Modale from '../composants/Modale.svelte'
  import { carnet } from '$lib/etat/carnet.svelte'
  import { analyserNombre, formaterNombre } from '$lib/domain/unites'
  import { calculerImc, fourchetteReference, formaterImc } from '$lib/domain/imc'
  import {
    rythmeVise, evaluerLargeurFourchette, valeursDeProgression,
    estObjectivable, peutPorterObjectif, JOURS_PERIODE,
  } from '$lib/domain/objectifs'
  import { BANDE_INCERTITUDE_KG, serie } from '$lib/domain/tendance'
  import { joursEntre, versISO } from '$lib/domain/dates'
  import {
    CLE_POIDS, champsActifs, estChampMasse, uniteAffichee,
    valeurVersAffichage, valeurVersStockage,
  } from '$lib/domain/champs'
  import type {
    DefinitionChamp, Objectif, PeriodeRegularite, TypeObjectif,
  } from '$lib/domain/types'

  interface Props {
    ouvert: boolean
    /** Type proposé à l'ouverture, quand l'écran d'accueil en suggère un (§ 9.4). */
    typeInitial?: TypeObjectif | undefined
    /** Champ proposé à l'ouverture, quand l'appel vient d'un objectif existant. */
    champInitial?: string | undefined
    onfermer: () => void
  }
  let { ouvert, typeInitial = undefined, champInitial = undefined, onfermer }: Props = $props()

  /** Sens de la condition d'un objectif de régularité. */
  type SensCondition = 'min' | 'max' | 'entre'

  let champCle = $state<string>(CLE_POIDS)
  let type = $state<TypeObjectif>('fourchette')
  // `bas` et `haut` servent aux deux formes : bornes de la plage visée pour un
  // objectif de niveau, seuil(s) de la condition pour un objectif de régularité.
  let bas = $state('')
  let haut = $state('')
  let sens = $state<SensCondition>('min')
  // Un nombre, et non une chaîne comme les autres saisies : `bind:value` sur un
  // `input[type=number]` écrit un `number` (ou `null` si le champ est vidé).
  // Le traiter comme du texte faisait échouer l'analyse dès la première frappe.
  let occurrences = $state<number | null>(3)
  let periode = $state<PeriodeRegularite>('semaine')
  let dateCible = $state('')
  let risqueAccepte = $state(false)

  const uniteMasse = $derived(carnet.profil?.uniteMasse ?? 'kg')

  const champsEligibles = $derived(champsActifs(carnet.champs).filter(estObjectivable))
  const champ = $derived<DefinitionChamp | undefined>(
    champsEligibles.find((c) => c.cle === champCle) ?? champsEligibles[0],
  )

  const unite = $derived(champ ? uniteAffichee(champ, uniteMasse) : '')
  const estPoids = $derived(champ?.cle === CLE_POIDS)
  const estBooleen = $derived(champ?.type === 'booleen')

  const peutNiveau = $derived(champ ? peutPorterObjectif(champ, 'niveau') : false)
  const peutRegularite = $derived(champ ? peutPorterObjectif(champ, 'regularite') : false)

  /* ---------------- conversions ---------------- */

  const versStockage = (v: number | undefined) =>
    v === undefined || !champ ? undefined : valeurVersStockage(champ, v, uniteMasse)

  /** Un écart (largeur, distance) n'est pas une valeur : pas de « / 5 » ici. */
  const ecart = (v: number) =>
    !champ ? '' : `${formaterNombre(valeurVersAffichage(champ, v, uniteMasse))}${unite ? ` ${unite}` : ''}`

  /* ---------------- reprise d'un objectif existant ---------------- */

  /**
   * Le champ proposé à l'ouverture : celui demandé explicitement, sinon le
   * premier **qui n'a pas déjà son objectif** — le poids d'abord, parce qu'il
   * reste le cas le plus courant.
   *
   * L'ordre compte : proposer le poids inconditionnellement rouvrait un objectif
   * déjà défini alors que le geste venait de « définir un objectif sur une autre
   * donnée ». On ne propose de redéfinir un objectif existant que s'il ne reste
   * plus rien de libre.
   */
  function champParDefaut(): string {
    if (champInitial && champsEligibles.some((c) => c.cle === champInitial)) return champInitial

    const libres = champsEligibles.filter((c) => !carnet.objectifDe(c.cle))
    if (libres.some((c) => c.cle === CLE_POIDS)) return CLE_POIDS
    if (libres[0]) return libres[0].cle

    return (champsEligibles.find((c) => c.cle === CLE_POIDS) ?? champsEligibles[0])?.cle ?? CLE_POIDS
  }

  function valeurCouranteDe(c: DefinitionChamp): number | undefined {
    return valeursDeProgression(serie(carnet.mesures, c.cle), c).actuelle
  }

  function chargerPour(cle: string): void {
    champCle = cle
    risqueAccepte = false

    const c = carnet.champs.find((x) => x.cle === cle)
    const o = carnet.objectifDe(cle)
    const niveauPossible = c ? peutPorterObjectif(c, 'niveau') : true

    if (o) {
      type = o.type
      dateCible = o.dateCible ?? ''
      if (o.type === 'regularite') {
        periode = o.regularite?.periode ?? 'semaine'
        occurrences = o.regularite?.occurrences ?? 3
        sens = o.valeurMin !== undefined && o.valeurMax !== undefined
          ? 'entre'
          : o.valeurMax !== undefined ? 'max' : 'min'
        bas = versSaisieDe(c, sens === 'max' ? o.valeurMax : o.valeurMin)
        haut = versSaisieDe(c, o.valeurMax)
      } else {
        bas = versSaisieDe(c, o.valeurMin)
        haut = versSaisieDe(c, o.valeurMax ?? o.valeurMin)
      }
      return
    }

    type = !niveauPossible ? 'regularite' : (typeInitial ?? 'fourchette')
    dateCible = ''
    sens = 'min'
    occurrences = 3
    periode = 'semaine'
    bas = ''
    haut = ''

    // L'accueil propose « une fourchette autour de votre poids actuel » : la
    // promesse est tenue ici. La demi-largeur est la fluctuation physiologique
    // quotidienne (A32), qui n'a de sens que pour une masse.
    const actuel = c ? valeurCouranteDe(c) : undefined
    if (type === 'maintien' && actuel !== undefined && c) {
      const demi = estChampMasse(c.cle) ? BANDE_INCERTITUDE_KG : 0
      bas = versSaisieDe(c, actuel - demi)
      haut = versSaisieDe(c, actuel + demi)
    }
  }

  function versSaisieDe(c: DefinitionChamp | undefined, v: number | undefined): string {
    if (v === undefined || !c) return ''
    return formaterNombre(valeurVersAffichage(c, v, uniteMasse), c.type === 'echelle5' ? 0 : 1)
  }

  // Une seule dépendance — l'ouverture. Sans `untrack`, l'enregistrement
  // réécrirait `carnet.objectifs` et relancerait la reprise en pleine fermeture.
  $effect(() => {
    if (!ouvert) return
    untrack(() => chargerPour(champParDefaut()))
  })

  /* ---------------- valeurs saisies ---------------- */

  const valeurBas = $derived(analyserNombre(bas))
  const valeurHaut = $derived(analyserNombre(haut))

  /** Pour une cible unique, seul le champ bas est utilisé. */
  const bornes = $derived.by(() => {
    if (type === 'regularite') return undefined
    const b = versStockage(valeurBas)
    if (b === undefined) return undefined
    if (type === 'cible') return { min: b, max: b }
    const h = versStockage(valeurHaut)
    if (h === undefined) return undefined
    return { min: Math.min(b, h), max: Math.max(b, h) }
  })

  /**
   * Condition d'un objectif de régularité, exprimée par les mêmes bornes.
   * Elles sont volontairement unilatérales : « au moins 7 h » ne renseigne que
   * `valeurMin` et ne doit pas se voir inventer un plafond.
   */
  const condition = $derived.by<{ valeurMin?: number; valeurMax?: number } | undefined>(() => {
    if (type !== 'regularite') return undefined
    if (estBooleen) return {}
    const b = versStockage(valeurBas)
    if (b === undefined) return undefined
    if (sens === 'min') return { valeurMin: b }
    if (sens === 'max') return { valeurMax: b }
    const h = versStockage(valeurHaut)
    if (h === undefined) return undefined
    return { valeurMin: Math.min(b, h), valeurMax: Math.max(b, h) }
  })

  const joursPeriode = $derived(JOURS_PERIODE[periode])
  const occurrencesValides = $derived(
    occurrences !== null
    && Number.isFinite(occurrences)
    && occurrences >= 1
    && occurrences <= joursPeriode,
  )

  /* ---------------- garde-fous ---------------- */

  const imcVise = $derived.by(() => {
    if (!estPoids || !bornes) return undefined
    return calculerImc(bornes.min, carnet.taille)
  })

  const fourchetteImc = $derived(fourchetteReference(carnet.age))

  /** § 12.2 : un objectif sous la borne basse de la fourchette demande une confirmation explicite. */
  const objectifRisque = $derived(imcVise !== undefined && imcVise < fourchetteImc.min)

  /**
   * F6 : le seuil de 1 % par semaine décrit ce que le corps encaisse quand il
   * perd de la masse. Appliqué à des heures de sommeil, il ne voudrait rien dire.
   */
  const rythme = $derived.by(() => {
    if (!estPoids || !bornes || !dateCible) return undefined
    const actuel = carnet.poidsActuel
    if (actuel === undefined) return undefined
    const jours = joursEntre(versISO(new Date()), dateCible)
    const cible = Math.abs(actuel - bornes.max) < Math.abs(actuel - bornes.min) ? bornes.max : bornes.min
    return rythmeVise(actuel, cible, jours)
  })

  /**
   * § 9.1 : une fourchette plus large que le chemin à parcourir se déclare
   * atteinte à mi-parcours. On le signale — sans bloquer, comme pour le rythme.
   * Le maintien n'est pas concerné : sa largeur *est* son objet.
   */
  const largeurFourchette = $derived.by(() => {
    if (!bornes || type !== 'fourchette' || !champ) return undefined
    return evaluerLargeurFourchette(valeurCouranteDe(champ), bornes.min, bornes.max)
  })

  const peutValider = $derived.by(() => {
    if (!champ) return false
    if (type === 'regularite') return condition !== undefined && occurrencesValides
    return bornes !== undefined && (!objectifRisque || risqueAccepte)
  })

  /* ---------------- enregistrement ---------------- */

  async function valider() {
    if (!champ || !peutValider) return

    const commun = { champCle: champ.cle, actif: true as const }

    let objectif: Omit<Objectif, 'id' | 'profilId' | 'creeLe'>
    if (type === 'regularite') {
      objectif = {
        ...commun,
        type,
        ...(condition ?? {}),
        regularite: { occurrences: Math.round(occurrences ?? 1), periode },
      }
    } else {
      if (!bornes) return
      objectif = {
        ...commun,
        type,
        valeurMin: bornes.min,
        valeurMax: bornes.max,
        ...(dateCible ? { dateCible } : {}),
      }
    }

    await carnet.definirObjectif(objectif)
    onfermer()
  }

  async function retirer() {
    if (!champ) return
    await carnet.retirerObjectif(champ.cle)
    onfermer()
  }

  const objectifExistant = $derived(champ ? carnet.objectifDe(champ.cle) : undefined)
</script>

<Modale ouverte={ouvert} titre="Votre objectif" {onfermer}>
  <div class="pile gap-m">
    {#if champsEligibles.length === 0}
      <p class="detail">
        Aucune des données que vous suivez ne se prête à un objectif. Activez par
        exemple le poids, une mensuration ou une échelle dans les paramètres.
      </p>
    {:else}
      <!-- 1. Sur quoi porte l'objectif -->
      {#if champsEligibles.length > 1}
        <div class="champ">
          <label for="obj-champ">Sur quelle donnée ?</label>
          <select
            id="obj-champ"
            value={champ?.cle}
            onchange={(e) => chargerPour(e.currentTarget.value)}
          >
            {#each champsEligibles as c (c.cle)}
              <option value={c.cle}>
                {c.libelle}{carnet.objectifDe(c.cle) ? ' — objectif défini' : ''}
              </option>
            {/each}
          </select>
        </div>
      {/if}

      <!-- 2. Quelle forme -->
      <fieldset class="types">
        <legend>Quel type d'objectif ?</legend>

        {#if peutNiveau}
          <label class="option" class:option--actif={type === 'fourchette'}>
            <input type="radio" bind:group={type} value="fourchette" />
            <span class="titre">Une fourchette</span>
            <span class="explication">Recommandé. Un intervalle plutôt qu'un chiffre unique.</span>
          </label>

          <label class="option" class:option--actif={type === 'maintien'}>
            <input type="radio" bind:group={type} value="maintien" />
            <span class="titre">Me maintenir</span>
            <span class="explication">Rester dans une fourchette, sans direction particulière.</span>
          </label>

          <label class="option" class:option--actif={type === 'cible'}>
            <input type="radio" bind:group={type} value="cible" />
            <span class="titre">Une valeur précise</span>
            <span class="explication">Une valeur unique à atteindre.</span>
          </label>
        {/if}

        {#if peutRegularite}
          <label class="option" class:option--actif={type === 'regularite'}>
            <input type="radio" bind:group={type} value="regularite" />
            <span class="titre">Une régularité</span>
            <span class="explication">
              Un nombre de fois par période, plutôt qu'une valeur à atteindre.
            </span>
          </label>
        {/if}
      </fieldset>

      <!-- 3. Les valeurs -->
      {#if type === 'regularite'}
        <div class="pile gap-s">
          {#if !estBooleen}
            <fieldset class="sens">
              <legend>Une journée compte quand la valeur est…</legend>
              <label class="segment" class:segment--actif={sens === 'min'}>
                <input type="radio" bind:group={sens} value="min" />
                <span>au moins</span>
              </label>
              <label class="segment" class:segment--actif={sens === 'max'}>
                <input type="radio" bind:group={sens} value="max" />
                <span>au plus</span>
              </label>
              <label class="segment" class:segment--actif={sens === 'entre'}>
                <input type="radio" bind:group={sens} value="entre" />
                <span>entre</span>
              </label>
            </fieldset>

            <div class="valeurs">
              <div class="champ">
                <label for="obj-bas">{sens === 'entre' ? `De${unite ? ` (${unite})` : ''}` : `Valeur${unite ? ` (${unite})` : ''}`}</label>
                <input id="obj-bas" type="text" inputmode="decimal" bind:value={bas} />
              </div>
              {#if sens === 'entre'}
                <div class="champ">
                  <label for="obj-haut">À {unite ? `(${unite})` : ''}</label>
                  <input id="obj-haut" type="text" inputmode="decimal" bind:value={haut} />
                </div>
              {/if}
            </div>
          {:else}
            <p class="detail">
              Une journée compte lorsque « {champ?.libelle} » est noté à oui.
            </p>
          {/if}

          <div class="valeurs">
            <div class="champ">
              <label for="obj-occurrences">Combien de fois</label>
              <input
                id="obj-occurrences"
                type="number"
                inputmode="numeric"
                min="1"
                max={joursPeriode}
                step="1"
                bind:value={occurrences}
              />
            </div>
            <div class="champ">
              <label for="obj-periode">Par</label>
              <select id="obj-periode" bind:value={periode}>
                <option value="semaine">semaine</option>
                <option value="mois">mois</option>
              </select>
            </div>
          </div>

          {#if !occurrencesValides && occurrences !== null}
            <p class="detail">
              Le décompte porte sur les {joursPeriode} derniers jours : indiquez un
              nombre de fois entre 1 et {joursPeriode}.
            </p>
          {/if}

          <!-- La règle 2 de la charte, dite à l'endroit où elle se décide. -->
          <p class="detail">
            Les jours sans saisie ne sont pas comptés comme des jours manqués : le
            repère se lit sur les jours que vous avez notés.
          </p>
        </div>
      {:else}
        <div class="valeurs">
          <div class="champ">
            <label for="obj-bas">
              {type === 'cible' ? 'Valeur visée' : 'De'}{unite ? ` (${unite})` : ''}
            </label>
            <input id="obj-bas" type="text" inputmode="decimal" bind:value={bas} />
          </div>

          {#if type !== 'cible'}
            <div class="champ">
              <label for="obj-haut">À {unite ? `(${unite})` : ''}</label>
              <input id="obj-haut" type="text" inputmode="decimal" bind:value={haut} />
            </div>
          {/if}
        </div>

        {#if type !== 'maintien'}
          <div class="champ">
            <label for="obj-date">Échéance <span class="facultatif">facultatif</span></label>
            <input id="obj-date" type="date" bind:value={dateCible} />
          </div>
        {/if}
      {/if}

      <!-- 4. Les garde-fous -->
      {#if imcVise !== undefined}
        <p class="detail">Cet objectif correspond à un IMC de {formaterImc(imcVise)}.</p>
      {/if}

      {#if largeurFourchette?.tropLarge}
        <!-- § 9.1 : on signale, on n'empêche pas. -->
        <p class="avertissement" role="status">
          Cette fourchette fait {ecart(largeurFourchette.largeur)} de large, alors qu'il
          vous reste {ecart(largeurFourchette.distance)} pour en atteindre le bord.
          Elle se refermerait donc avant que le chemin soit fait. Une fourchette plus
          étroite rendrait mieux compte de ce que vous visez.
        </p>
      {/if}

      {#if rythme?.inconfortable}
        <!-- F6 : on signale, on n'empêche pas. -->
        <p class="avertissement" role="status">
          Ce rythme demande environ {ecart(rythme.parSemaine)} par semaine, ce qui est
          difficile à tenir dans la durée. Une échéance plus lointaine serait sans doute
          plus confortable — mais vous pouvez tout à fait garder celle-ci.
        </p>
      {/if}

      {#if objectifRisque}
        <!-- § 12.2 : avertissement explicite et confirmation séparée. -->
        <div class="risque">
          <p>
            Cet objectif se situe sous la fourchette de référence
            (IMC {formaterNombre(fourchetteImc.min)} à {formaterNombre(fourchetteImc.max)}
            {#if carnet.age !== undefined}pour votre âge{/if}).
            Descendre en dessous peut avoir des conséquences sur la santé.
            Nous vous encourageons à en parler avec un professionnel.
          </p>
          <label class="case">
            <input type="checkbox" bind:checked={risqueAccepte} />
            <span>J'ai lu et je souhaite quand même définir cet objectif.</span>
          </label>
        </div>
      {/if}

      <p class="note">
        Modifier votre objectif ne change jamais votre historique de mesures.
        Vous pouvez en définir un par donnée suivie.
      </p>
    {/if}
  </div>

  {#snippet pied()}
    {#if objectifExistant}
      <button type="button" class="bouton" onclick={retirer}>Retirer l'objectif</button>
    {/if}
    <button type="button" class="bouton" onclick={onfermer}>Annuler</button>
    <button type="button" class="bouton bouton--principal" disabled={!peutValider} onclick={valider}>
      Enregistrer
    </button>
  {/snippet}
</Modale>

<style>
  .types { border: 0; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.5rem; }
  .types legend { font-size: 0.9rem; color: var(--encre-2); padding: 0 0 0.4rem; }

  .option {
    display: grid;
    grid-template-columns: auto 1fr;
    grid-template-areas: 'radio titre' 'radio explication';
    gap: 0 0.7rem;
    align-items: center;
    padding: 0.7rem 0.85rem;
    border: 1px solid var(--trait);
    border-radius: var(--rayon-s);
    background: var(--carte);
    cursor: pointer;
  }
  .option--actif { border-color: var(--sauge-trait); background: var(--sauge-voile); }
  .option:has(input:focus-visible) { outline: 3px solid var(--bleu); outline-offset: 2px; }
  .option input { grid-area: radio; width: 1.15rem; height: 1.15rem; }
  .titre { grid-area: titre; font-weight: 600; }
  .explication { grid-area: explication; font-size: 0.87rem; color: var(--encre-2); }

  .sens {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    border: 0;
    margin: 0;
    padding: 0;
  }
  .sens legend { font-size: 0.9rem; color: var(--encre-2); padding: 0 0 0.35rem; }
  .segment {
    display: inline-flex;
    align-items: center;
    min-height: var(--cible-tactile);
    padding: 0.4em 0.9em;
    border: 1px solid var(--trait);
    border-radius: var(--rayon-s);
    background: var(--carte);
    cursor: pointer;
    font-size: 0.92rem;
  }
  .segment input { position: absolute; opacity: 0; width: 0; height: 0; }
  .segment--actif { background: var(--sauge-voile); border-color: var(--sauge-trait); font-weight: 600; }
  .segment:has(input:focus-visible) { outline: 3px solid var(--bleu); outline-offset: 2px; }

  .valeurs { display: flex; gap: 0.9rem; flex-wrap: wrap; }
  .valeurs .champ { flex: 1 1 8rem; }

  .facultatif {
    font-size: 0.78rem; color: var(--encre-3);
    border: 1px solid var(--trait); border-radius: 999px;
    padding: 0.05em 0.55em;
  }

  .detail { color: var(--encre-2); font-size: 0.9rem; }

  .avertissement {
    background: var(--attention-fond);
    color: var(--attention);
    border: 1px solid currentColor;
    border-radius: var(--rayon-s);
    padding: 0.7rem 0.85rem;
    font-size: 0.9rem;
  }

  .risque {
    background: var(--attention-fond);
    border: 2px solid var(--attention);
    border-radius: var(--rayon-s);
    padding: 0.85rem;
    font-size: 0.92rem;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }
  .case { display: flex; align-items: flex-start; gap: 0.6rem; cursor: pointer; }
  .case input { width: 1.15rem; height: 1.15rem; margin-top: 0.15rem; flex: none; }

  .note { color: var(--encre-3); font-size: 0.85rem; }
</style>
