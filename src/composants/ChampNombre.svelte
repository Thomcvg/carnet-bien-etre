<script lang="ts">
  /**
   * Saisie d'une valeur numérique (K2, K3, A26).
   *
   * Trois détails qui font toute la différence à l'usage :
   *  - clavier décimal, virgule et point acceptés indifféremment ;
   *  - la dernière valeur connue s'affiche en repère grisé — mais un repère non
   *    confirmé n'est jamais enregistré (règle 13) ;
   *  - un contrôle hors bornes demande confirmation, il ne bloque jamais.
   */
  import type { DefinitionChamp } from '$lib/domain/types'
  import { analyserNombre, formaterNombre } from '$lib/domain/unites'
  import { controlerValeur } from '$lib/domain/saisie'

  interface Props {
    champ: DefinitionChamp
    valeur: string
    repere?: number | undefined
    autofocus?: boolean
    onchange: (texte: string) => void
  }

  let { champ, valeur, repere = undefined, autofocus = false, onchange }: Props = $props()

  const idChamp = $derived(`champ-${champ.cle}`)
  const idAide = $derived(`${idChamp}-aide`)

  // Le champ se contente de se **désigner** comme point d'entrée : c'est la modale
  // qui pose le focus, à l'ouverture, après `showModal()` (voir Modale.svelte).
  // Un effet local ne pourrait pas gagner cette course, et l'attribut HTML
  // `autofocus` volerait le focus au premier rendu de la page entière.
  const nombre = $derived(analyserNombre(valeur))

  const controle = $derived(
    nombre === undefined ? { niveau: 'ok' as const } : controlerValeur(champ, nombre, repere),
  )
</script>

<div class="champ">
  <label for={idChamp}>
    {champ.libelle}
    {#if champ.unite}<span class="unite">({champ.unite})</span>{/if}
  </label>

  <input
    id={idChamp}
    type="text"
    inputmode="decimal"
    autocomplete="off"
    data-focus-initial={autofocus ? '' : undefined}
    value={valeur}
    placeholder={repere !== undefined ? formaterNombre(repere) : ''}
    aria-describedby={idAide}
    oninput={(e) => onchange(e.currentTarget.value)}
  />

  <p id={idAide} class="aide" class:aide--confirmation={controle.niveau === 'confirmation'}>
    {#if controle.niveau === 'confirmation'}
      {controle.message}
    {:else if repere !== undefined && valeur === ''}
      Dernière valeur : {formaterNombre(repere)}{champ.unite ? ' ' + champ.unite : ''}. Laissez vide si rien n'a changé.
    {:else}
      &nbsp;
    {/if}
  </p>
</div>

<style>
  .unite { color: var(--encre-3); font-weight: 400; }

  input { font-variant-numeric: tabular-nums; }

  .aide { min-height: 1.2em; }

  /* Le signal ne repose pas sur la seule couleur : le texte porte le message (§ 13). */
  .aide--confirmation {
    color: var(--attention);
    background: var(--attention-fond);
    border-radius: var(--rayon-s);
    padding: 0.3rem 0.5rem;
  }
</style>
