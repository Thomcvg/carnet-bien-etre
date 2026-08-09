<script lang="ts">
  /**
   * Saisie d'une mesure (§ 5.2).
   *
   * L'exigence tenue ici : une mesure valide ne demande **qu'une date et une
   * seule valeur**, quelle qu'elle soit. Tout le reste est replié, et le bouton
   * d'enregistrement s'active dès qu'un champ est renseigné — le poids compris,
   * mais pas le poids seulement, depuis qu'il se désactive comme les autres.
   *
   * Deux familles de valeurs cohabitent : les champs numériques et texte transitent
   * par `saisies` (chaînes de caractères, comme au lot 1) ; les champs à échelle,
   * oui/non ou choix transitent par `valeursTypees` (déjà dans leur type final),
   * parce que sérialiser un booléen ou un tableau en texte n'apporterait rien.
   * La tension artérielle est un cas particulier : trois sous-valeurs numériques
   * assemblées en un seul objet au moment d'enregistrer.
   */
  import Modale from '../composants/Modale.svelte'
  import ChampNombre from '../composants/ChampNombre.svelte'
  import ChampEchelle from '../composants/ChampEchelle.svelte'
  import ChampChoix from '../composants/ChampChoix.svelte'
  import ChampChoixMultiple from '../composants/ChampChoixMultiple.svelte'
  import ChampBooleen from '../composants/ChampBooleen.svelte'
  import ChampTexte from '../composants/ChampTexte.svelte'
  import ChampTension from '../composants/ChampTension.svelte'
  import { carnet } from '$lib/etat/carnet.svelte'
  import {
    mensurationsActives, champsBienEtreActifs, champsActiviteActifs, trouverChamp, CLE_POIDS,
    champAffiche, CLE_TENSION,
  } from '$lib/domain/champs'
  import { analyserNombre, masseVersAffichage } from '$lib/domain/unites'
  import {
    reperesDeSaisie, trouverDoublon, construireValeurs, reprendreValeurs,
  } from '$lib/domain/saisie'
  import { versISO, ajouterMois, formaterDate, estDateISOValide } from '$lib/domain/dates'
  import type { ContextePesee, DefinitionChamp, ValeurChamp } from '$lib/domain/types'

  interface Props {
    ouvert: boolean
    mesureId?: string | null
    onfermer: () => void
  }

  let { ouvert, mesureId = null, onfermer }: Props = $props()

  let date = $state(versISO(new Date()))
  /** `HH:MM` — renseigné seulement quand plusieurs pesées coexistent le même jour (A29). */
  let moment = $state('')
  /** A29 : à jeun, habillé… Facultatif, et jamais deviné. */
  let contextePesee = $state<ContextePesee | ''>('')
  let saisies = $state<Record<string, string>>({})
  let valeursTypees = $state<Record<string, ValeurChamp>>({})
  let etiquettesTexte = $state('')
  let notes = $state('')
  let mensurationsDepliees = $state(false)
  let bienEtreDeplie = $state(false)
  let activiteDepliee = $state(false)
  let noteDepliee = $state(false)
  let enchainer = $state(false)
  let doublonConfirme = $state(false)

  const unite = $derived(carnet.profil?.uniteMasse ?? 'kg')

  // Règle 16 : le poids est stocké en kilogrammes et saisi dans l'unité choisie.
  // La traduction elle-même vit dans `domain/saisie.ts` (`construireValeurs` et
  // `reprendreValeurs`) : seul endroit où elle est testable, et donc seul endroit
  // où elle a le droit d'exister.
  const versSaisie = (kg: number) => masseVersAffichage(kg, unite)

  // Le poids ne s'affiche que s'il est suivi : c'est un champ comme un autre (§ 3).
  const champPoidsBrut = $derived(trouverChamp(carnet.champs, CLE_POIDS))
  const champPoids = $derived(
    champPoidsBrut?.actif ? champAffiche(champPoidsBrut, unite) : undefined,
  )
  const mensurations = $derived(mensurationsActives(carnet.champs))
  const champsBienEtre = $derived(champsBienEtreActifs(carnet.champs))
  const champsActivite = $derived(champsActiviteActifs(carnet.champs))

  const champTension = $derived(champsActivite.find((c) => c.cle === CLE_TENSION))
  const champsActiviteSansTension = $derived(champsActivite.filter((c) => c.cle !== CLE_TENSION))

  const champsNumeriquesRepetables = $derived([
    CLE_POIDS,
    ...mensurations.map((c) => c.cle),
    ...[...champsBienEtre, ...champsActiviteSansTension]
      .filter((c) => c.type === 'nombre' || c.type === 'duree')
      .map((c) => c.cle),
  ])
  const reperes = $derived.by(() => {
    const bruts = reperesDeSaisie(carnet.mesures, champsNumeriquesRepetables)
    const poids = bruts[CLE_POIDS]
    // Le repère du poids vient du stockage : il s'affiche dans l'unité de saisie.
    return poids === undefined ? bruts : { ...bruts, [CLE_POIDS]: versSaisie(poids) }
  })

  const modification = $derived(mesureId !== null)

  // La détection vaut aussi en modification : déplacer une mesure sur une date
  // déjà occupée mérite le même signalement qu'en créer une seconde.
  const doublon = $derived(
    doublonConfirme || !estDateISOValide(date)
      ? undefined
      : trouverDoublon(carnet.mesures, date, mesureId ?? undefined),
  )

  /**
   * Une mesure valide demande une date et **au moins une valeur**.
   *
   * Elle exigeait un poids : cela revenait à interdire le carnet à quelqu'un qui
   * ne veut suivre que son sommeil ou son stress. Le poids étant désormais
   * désactivable comme le reste, la condition porte sur le fait d'avoir noté
   * quelque chose — peu importe quoi.
   */
  const auMoinsUneValeur = $derived.by(() => {
    for (const [cle, texte] of Object.entries(saisies)) {
      if (cle.startsWith('tension_')) continue
      if (analyserNombre(texte) !== undefined) return true
    }
    if (Object.keys(valeursTypees).length > 0) return true
    return analyserNombre(saisies['tension_sys'] ?? '') !== undefined
      && analyserNombre(saisies['tension_dia'] ?? '') !== undefined
  })

  const peutEnregistrer = $derived(estDateISOValide(date) && auMoinsUneValeur)

  function reinitialiser() {
    date = versISO(new Date())
    moment = ''
    contextePesee = ''
    saisies = {}
    valeursTypees = {}
    etiquettesTexte = ''
    notes = ''
    mensurationsDepliees = false
    bienEtreDeplie = false
    activiteDepliee = false
    noteDepliee = false

    // Sans le poids en tête, le formulaire n'offrirait que des sections repliées
    // et paraîtrait vide : on ouvre la première qui contient quelque chose.
    if (!champPoids) {
      if (mensurations.length > 0) mensurationsDepliees = true
      else if (champsBienEtre.length > 0) bienEtreDeplie = true
      else if (champsActivite.length > 0) activiteDepliee = true
    }
  }

  // Prépare le formulaire à chaque ouverture, en mode création comme en modification.
  $effect(() => {
    if (!ouvert) return

    const existante = mesureId ? carnet.mesures.find((m) => m.id === mesureId) : undefined
    if (existante) {
      date = existante.date
      moment = existante.moment ?? ''
      contextePesee = existante.contextePesee ?? ''
      notes = existante.notes ?? ''
      etiquettesTexte = (existante.etiquettes ?? []).join(', ')

      const { textes: reprisesTexte, typees: reprisesTypees } = reprendreValeurs(existante, unite)
      saisies = reprisesTexte
      valeursTypees = reprisesTypees

      mensurationsDepliees = mensurations.some((m) => reprisesTexte[m.cle] !== undefined)
      bienEtreDeplie = champsBienEtre.some(
        (c) => reprisesTexte[c.cle] !== undefined || reprisesTypees[c.cle] !== undefined,
      )
      activiteDepliee = champsActivite.some(
        (c) => reprisesTexte[c.cle] !== undefined || reprisesTypees[c.cle] !== undefined
          || reprisesTexte['tension_sys'] !== undefined,
      )
      noteDepliee = Boolean(notes) || Boolean(existante.etiquettes?.length)
    } else {
      reinitialiser()
    }
    doublonConfirme = false
  })

  function majSaisie(cle: string, texte: string) {
    saisies = { ...saisies, [cle]: texte }
  }

  function majValeurTypee(cle: string, v: ValeurChamp | undefined) {
    const suivantes = { ...valeursTypees }
    if (v === undefined) delete suivantes[cle]
    else suivantes[cle] = v
    valeursTypees = suivantes
  }

  function etiquettesSaisies(): string[] {
    return etiquettesTexte
      .split(',')
      .map((e) => e.trim())
      .filter((e) => e.length > 0)
  }

  async function enregistrer() {
    if (!peutEnregistrer) return

    // Règle 5 et règle 13 : seules les valeurs réellement saisies sont enregistrées.
    // Un repère grisé non confirmé ne devient jamais une donnée. Toute la
    // traduction — conversions comprises — vit dans le domaine, où elle est testée.
    const existante = mesureId ? carnet.mesures.find((m) => m.id === mesureId) : undefined
    const valeurs = construireValeurs(
      { textes: saisies, typees: valeursTypees },
      unite,
      existante ? $state.snapshot(existante) : undefined,
    )

    const dateEnregistree = date
    const etiquettes = etiquettesSaisies()

    await carnet.enregistrerMesure(date, valeurs, {
      notes: notes.trim() || undefined,
      etiquettes: etiquettes.length > 0 ? etiquettes : undefined,
      moment: moment || undefined,
      contextePesee: contextePesee || undefined,
      id: mesureId ?? undefined,
    })

    if (enchainer && !modification) {
      // Mode rattrapage (K4) : on reste dans le formulaire, un mois plus loin.
      reinitialiser()
      date = ajouterMois(dateEnregistree, 1)
    } else {
      onfermer()
    }
  }

  /**
   * A29 : deux pesées le même jour ne se distinguent que par leur heure.
   * L'accepter sans la renseigner produirait deux lignes identiques dans
   * l'historique — l'heure est donc posée en même temps que le choix.
   */
  function accepterSecondePesee() {
    doublonConfirme = true
    const d = new Date()
    moment = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  function completerDoublon() {
    const d = doublon
    if (!d) return
    onfermer()
    queueMicrotask(() => {
      const evenement = new CustomEvent('modifier-mesure', { detail: d.mesure.id })
      window.dispatchEvent(evenement)
    })
  }

  function texteDe(cle: string): string {
    return saisies[cle] ?? ''
  }
  function nombreTypeDe(champ: DefinitionChamp): number | undefined {
    const v = valeursTypees[champ.cle]
    return typeof v === 'number' ? v : undefined
  }
  function texteTypeDe(champ: DefinitionChamp): string | undefined {
    const v = valeursTypees[champ.cle]
    return typeof v === 'string' ? v : undefined
  }
  function booleenTypeDe(champ: DefinitionChamp): boolean | undefined {
    const v = valeursTypees[champ.cle]
    return typeof v === 'boolean' ? v : undefined
  }
  function tableauTypeDe(champ: DefinitionChamp): string[] | undefined {
    const v = valeursTypees[champ.cle]
    return Array.isArray(v) ? v : undefined
  }
</script>

<Modale ouverte={ouvert} titre={modification ? 'Modifier la mesure' : 'Nouvelle mesure'} {onfermer}>
  <form class="pile gap-m" onsubmit={(e) => { e.preventDefault(); enregistrer() }}>
    <div class="champ">
      <label for="date-mesure">Date</label>
      <input id="date-mesure" type="date" bind:value={date} required />
    </div>

    {#if moment}
      <!-- A29 : n'apparaît que lorsqu'une seconde pesée du jour est assumée. -->
      <div class="champ">
        <label for="moment-mesure">Heure de la pesée</label>
        <input id="moment-mesure" type="time" bind:value={moment} />
        <p class="aide">
          Distingue cette pesée de l'autre mesure du même jour.
          <button type="button" class="bouton bouton--discret retirer-moment" onclick={() => (moment = '')}>
            Retirer l'heure
          </button>
        </p>
      </div>
    {/if}

    {#if doublon}
      <div class="doublon" role="status">
        <p>
          Une mesure existe déjà au {formaterDate(doublon.mesure.date, carnet.profil?.formatDate ?? 'jj/mm/aaaa')}.
        </p>
        <div class="doublon-actions">
          {#if !modification}
            <!-- Basculer vers l'autre mesure abandonnerait la saisie en cours :
                 l'option n'a de sens qu'en création. -->
            <button type="button" class="bouton" onclick={completerDoublon}>
              Compléter celle-ci
            </button>
          {/if}
          <button type="button" class="bouton" onclick={accepterSecondePesee}>
            {modification ? 'Distinguer par l\'heure' : 'Ajouter une seconde pesée'}
          </button>
        </div>
      </div>
    {/if}

    {#if champPoids}
      <ChampNombre
        champ={champPoids}
        valeur={texteDe(CLE_POIDS)}
        repere={reperes[CLE_POIDS]}
        autofocus={ouvert}
        onchange={(t) => majSaisie(CLE_POIDS, t)}
      />

      <!-- A29 : dans quelles conditions la pesée a eu lieu. Facultatif, et
           déterminant pour relire un écart sans s'en inquiéter. -->
      <div class="champ contexte">
        <label for="contexte-pesee">Conditions de la pesée <span class="facultatif">facultatif</span></label>
        <select id="contexte-pesee" bind:value={contextePesee}>
          <option value="">Non précisé</option>
          <option value="a_jeun">À jeun</option>
          <option value="habille">Habillé·e</option>
          <option value="apres_sport">Après une activité</option>
          <option value="autre">Autre</option>
        </select>
      </div>
    {/if}

    {#if mensurations.length > 0}
      <div class="repliable">
        <button
          type="button"
          class="bouton bouton--discret entete-repliable"
          aria-expanded={mensurationsDepliees}
          onclick={() => (mensurationsDepliees = !mensurationsDepliees)}
        >
          <span aria-hidden="true">{mensurationsDepliees ? '−' : '+'}</span>
          Mensurations
          <span class="facultatif">facultatif</span>
        </button>

        {#if mensurationsDepliees}
          <div class="grille-champs">
            {#each mensurations as champ (champ.cle)}
              <ChampNombre
                {champ}
                valeur={texteDe(champ.cle)}
                repere={reperes[champ.cle]}
                onchange={(t) => majSaisie(champ.cle, t)}
              />
            {/each}
          </div>
        {/if}
      </div>
    {/if}

    {#if champsBienEtre.length > 0}
      <div class="repliable">
        <button
          type="button"
          class="bouton bouton--discret entete-repliable"
          aria-expanded={bienEtreDeplie}
          onclick={() => (bienEtreDeplie = !bienEtreDeplie)}
        >
          <span aria-hidden="true">{bienEtreDeplie ? '−' : '+'}</span>
          Bien-être
          <span class="facultatif">facultatif</span>
        </button>

        {#if bienEtreDeplie}
          <div class="pile gap-s champs-varies">
            {#each champsBienEtre as champ (champ.cle)}
              {#if champ.type === 'echelle5'}
                <ChampEchelle {champ} valeur={nombreTypeDe(champ)} onchange={(v) => majValeurTypee(champ.cle, v)} />
              {:else if champ.type === 'choix' && champ.multiple}
                <ChampChoixMultiple {champ} valeurs={tableauTypeDe(champ)} onchange={(v) => majValeurTypee(champ.cle, v)} />
              {:else if champ.type === 'choix'}
                <ChampChoix {champ} valeur={texteTypeDe(champ)} onchange={(v) => majValeurTypee(champ.cle, v)} />
              {:else if champ.type === 'booleen'}
                <ChampBooleen {champ} valeur={booleenTypeDe(champ)} onchange={(v) => majValeurTypee(champ.cle, v)} />
              {:else if champ.type === 'texte'}
                <ChampTexte {champ} valeur={texteTypeDe(champ) ?? ''} onchange={(v) => majValeurTypee(champ.cle, v || undefined)} />
              {:else}
                <ChampNombre {champ} valeur={texteDe(champ.cle)} repere={reperes[champ.cle]} onchange={(t) => majSaisie(champ.cle, t)} />
              {/if}
            {/each}
          </div>
        {/if}
      </div>
    {/if}

    {#if champsActivite.length > 0}
      <div class="repliable">
        <button
          type="button"
          class="bouton bouton--discret entete-repliable"
          aria-expanded={activiteDepliee}
          onclick={() => (activiteDepliee = !activiteDepliee)}
        >
          <span aria-hidden="true">{activiteDepliee ? '−' : '+'}</span>
          Activité
          <span class="facultatif">facultatif</span>
        </button>

        {#if activiteDepliee}
          <div class="pile gap-s champs-varies">
            {#if champTension}
              <ChampTension
                champ={champTension}
                sys={texteDe('tension_sys')}
                dia={texteDe('tension_dia')}
                pouls={texteDe('tension_pouls')}
                onchange={(partie, texte) => majSaisie(`tension_${partie}`, texte)}
              />
            {/if}
            {#each champsActiviteSansTension as champ (champ.cle)}
              {#if champ.type === 'echelle5'}
                <ChampEchelle {champ} valeur={nombreTypeDe(champ)} onchange={(v) => majValeurTypee(champ.cle, v)} />
              {:else if champ.type === 'choix' && champ.multiple}
                <ChampChoixMultiple {champ} valeurs={tableauTypeDe(champ)} onchange={(v) => majValeurTypee(champ.cle, v)} />
              {:else if champ.type === 'choix'}
                <ChampChoix {champ} valeur={texteTypeDe(champ)} onchange={(v) => majValeurTypee(champ.cle, v)} />
              {:else if champ.type === 'booleen'}
                <ChampBooleen {champ} valeur={booleenTypeDe(champ)} onchange={(v) => majValeurTypee(champ.cle, v)} />
              {:else if champ.type === 'texte'}
                <ChampTexte {champ} valeur={texteTypeDe(champ) ?? ''} onchange={(v) => majValeurTypee(champ.cle, v || undefined)} />
              {:else}
                <ChampNombre {champ} valeur={texteDe(champ.cle)} repere={reperes[champ.cle]} onchange={(t) => majSaisie(champ.cle, t)} />
              {/if}
            {/each}
          </div>
        {/if}
      </div>
    {/if}

    <div class="repliable">
      <button
        type="button"
        class="bouton bouton--discret entete-repliable"
        aria-expanded={noteDepliee}
        onclick={() => (noteDepliee = !noteDepliee)}
      >
        <span aria-hidden="true">{noteDepliee ? '−' : '+'}</span>
        Note
        <span class="facultatif">facultatif</span>
      </button>

      {#if noteDepliee}
        <div class="pile gap-s" style="margin-top: 0.6rem;">
          <div class="champ">
            <label for="notes-mesure">Note</label>
            <textarea id="notes-mesure" rows="2" bind:value={notes}
              placeholder="Vacances, changement d'habitude, période particulière…"></textarea>
          </div>
          <div class="champ">
            <label for="etiquettes-mesure">Étiquettes</label>
            <input id="etiquettes-mesure" type="text" bind:value={etiquettesTexte}
              placeholder="vacances, stress boulot…" />
            <p class="aide">Séparez plusieurs étiquettes par une virgule.</p>
          </div>
        </div>
      {/if}
    </div>

    {#if !modification}
      <label class="case">
        <input type="checkbox" bind:checked={enchainer} />
        <span>Enchaîner sur le mois suivant après l'enregistrement</span>
      </label>
    {/if}
  </form>

  {#snippet pied()}
    <button type="button" class="bouton" onclick={onfermer}>Annuler</button>
    <button type="button" class="bouton bouton--principal" disabled={!peutEnregistrer} onclick={enregistrer}>
      Enregistrer
    </button>
  {/snippet}
</Modale>

<style>
  .facultatif {
    font-size: 0.78rem;
    color: var(--encre-3);
    border: 1px solid var(--trait);
    border-radius: 999px;
    padding: 0.05em 0.55em;
    font-weight: 400;
  }

  .retirer-moment {
    min-height: auto;
    padding: 0.1em 0.4em;
    font-size: inherit;
    text-decoration: underline;
    color: var(--second-texte);
  }

  .repliable { border-top: 1px solid var(--trait); padding-top: 0.6rem; }
  .entete-repliable { width: 100%; justify-content: flex-start; font-weight: 600; }

  .grille-champs {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
    gap: 0.5rem 0.9rem;
    margin-top: 0.6rem;
  }

  .champs-varies { margin-top: 0.6rem; }

  .doublon {
    background: var(--second-voile);
    border: 1px solid var(--second-trait);
    border-radius: var(--rayon-s);
    padding: 0.7rem 0.85rem;
    font-size: 0.92rem;
  }
  .doublon-actions { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.6rem; }
  .doublon-actions .bouton { min-height: 2.4rem; padding: 0.35em 0.8em; }

  .case {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    min-height: var(--cible-tactile);
    font-size: 0.92rem;
    cursor: pointer;
  }
  .case input { width: 1.15rem; height: 1.15rem; }

  textarea { resize: vertical; font-family: inherit; }
</style>
