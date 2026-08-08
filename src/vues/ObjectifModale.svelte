<script lang="ts">
  /**
   * Définition d'un objectif (§ 9).
   *
   * La fourchette est proposée par défaut : c'est le mode recommandé par le § 9.1,
   * parce qu'on n'échoue plus à 63,2 kg quand la cible est « entre 61 et 64 ».
   *
   * Deux garde-fous, tous deux non bloquants :
   *  - un objectif dont l'IMC visé passe sous la borne basse déclenche un
   *    avertissement et une confirmation séparée (I2, § 12.2) ;
   *  - un rythme supérieur à 1 % du poids par semaine est signalé (F6).
   */
  import Modale from '../composants/Modale.svelte'
  import { carnet } from '$lib/etat/carnet.svelte'
  import { analyserNombre, formaterNombre, masseVersAffichage, masseVersStockage } from '$lib/domain/unites'
  import { calculerImc, fourchetteReference, formaterImc } from '$lib/domain/imc'
  import { rythmeVise, evaluerLargeurFourchette } from '$lib/domain/objectifs'
  import { BANDE_INCERTITUDE_KG } from '$lib/domain/tendance'
  import { joursEntre, versISO } from '$lib/domain/dates'
  import { CLE_POIDS } from '$lib/domain/champs'
  import type { TypeObjectif } from '$lib/domain/types'

  interface Props {
    ouvert: boolean
    /** Type proposé à l'ouverture, quand l'écran d'accueil en suggère un (§ 9.4). */
    typeInitial?: TypeObjectif | undefined
    onfermer: () => void
  }
  let { ouvert, typeInitial = undefined, onfermer }: Props = $props()

  let type = $state<TypeObjectif>('fourchette')
  let bas = $state('')
  let haut = $state('')
  let dateCible = $state('')
  let risqueAccepte = $state(false)

  const unite = $derived(carnet.profil?.uniteMasse ?? 'kg')

  $effect(() => {
    if (!ouvert) return
    const o = carnet.objectif
    risqueAccepte = false
    if (o && o.valeurMin !== undefined) {
      type = o.type === 'comportemental' ? 'fourchette' : o.type
      bas = formaterNombre(masseVersAffichage(o.valeurMin, unite))
      haut = formaterNombre(masseVersAffichage(o.valeurMax ?? o.valeurMin, unite))
      dateCible = o.dateCible ?? ''
    } else {
      type = typeInitial ?? 'fourchette'
      const actuel = carnet.poidsActuel
      if (type === 'maintien' && actuel !== undefined) {
        // L'accueil propose « une fourchette autour de votre poids actuel » :
        // la promesse est tenue ici. La demi-largeur est la fluctuation
        // physiologique quotidienne (A32), pas un chiffre arbitraire.
        const centre = masseVersAffichage(actuel, unite)
        const demi = masseVersAffichage(BANDE_INCERTITUDE_KG, unite)
        bas = formaterNombre(centre - demi)
        haut = formaterNombre(centre + demi)
      } else {
        bas = ''
        haut = ''
      }
      dateCible = ''
    }
  })

  const valeurBas = $derived(analyserNombre(bas))
  const valeurHaut = $derived(analyserNombre(haut))

  const enKg = (v: number | undefined) =>
    v === undefined ? undefined : masseVersStockage(v, unite)

  /** Pour une cible unique, seul le champ bas est utilisé. */
  const bornes = $derived.by(() => {
    const b = enKg(valeurBas)
    if (b === undefined) return undefined
    if (type === 'cible') return { min: b, max: b }
    const h = enKg(valeurHaut)
    if (h === undefined) return undefined
    return { min: Math.min(b, h), max: Math.max(b, h) }
  })

  const imcVise = $derived.by(() => {
    if (!bornes) return undefined
    return calculerImc(bornes.min, carnet.taille)
  })

  const fourchetteImc = $derived(fourchetteReference(carnet.age))

  /** § 12.2 : un objectif sous la borne basse de la fourchette demande une confirmation explicite. */
  const objectifRisque = $derived(imcVise !== undefined && imcVise < fourchetteImc.min)

  const rythme = $derived.by(() => {
    const actuel = carnet.poidsActuel
    if (!bornes || actuel === undefined || !dateCible) return undefined
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
    if (!bornes || type !== 'fourchette') return undefined
    return evaluerLargeurFourchette(carnet.poidsActuel, bornes.min, bornes.max)
  })

  const peutValider = $derived(bornes !== undefined && (!objectifRisque || risqueAccepte))

  async function valider() {
    if (!bornes || !peutValider) return
    await carnet.definirObjectif({
      type,
      champCle: CLE_POIDS,
      valeurMin: bornes.min,
      valeurMax: bornes.max,
      dateCible: dateCible || undefined,
      actif: true,
    })
    onfermer()
  }

  async function retirer() {
    await carnet.retirerObjectif()
    onfermer()
  }
</script>

<Modale ouverte={ouvert} titre="Votre objectif" {onfermer}>
  <div class="pile gap-m">
    <fieldset class="types">
      <legend>Quel type d'objectif ?</legend>

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
        <span class="titre">Un poids précis</span>
        <span class="explication">Une valeur unique à atteindre.</span>
      </label>
    </fieldset>

    <div class="valeurs">
      <div class="champ">
        <label for="obj-bas">{type === 'cible' ? `Poids visé (${unite})` : `De (${unite})`}</label>
        <input id="obj-bas" type="text" inputmode="decimal" bind:value={bas} />
      </div>

      {#if type !== 'cible'}
        <div class="champ">
          <label for="obj-haut">À ({unite})</label>
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

    {#if imcVise !== undefined}
      <p class="detail">Cet objectif correspond à un IMC de {formaterImc(imcVise)}.</p>
    {/if}

    {#if largeurFourchette?.tropLarge}
      <!-- § 9.1 : on signale, on n'empêche pas. -->
      <p class="avertissement" role="status">
        Cette fourchette fait {formaterNombre(masseVersAffichage(largeurFourchette.largeur, unite))}
        {unite} de large, alors qu'il vous reste
        {formaterNombre(masseVersAffichage(largeurFourchette.distance, unite))} {unite} pour
        en atteindre le bord. Elle se refermerait donc avant que le chemin soit fait.
        Une fourchette plus étroite rendrait mieux compte de ce que vous visez.
      </p>
    {/if}

    {#if rythme?.inconfortable}
      <!-- F6 : on signale, on n'empêche pas. -->
      <p class="avertissement" role="status">
        Ce rythme demande environ {formaterNombre(masseVersAffichage(rythme.parSemaine, unite))}
        {unite} par semaine, ce qui est difficile à tenir dans la durée.
        Une échéance plus lointaine serait sans doute plus confortable — mais vous pouvez
        tout à fait garder celle-ci.
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
    </p>
  </div>

  {#snippet pied()}
    {#if carnet.objectif}
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
