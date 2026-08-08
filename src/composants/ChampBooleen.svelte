<script lang="ts">
  /** Champ oui/non (renforcement musculaire, par exemple). */
  import type { DefinitionChamp } from '$lib/domain/types'

  interface Props {
    champ: DefinitionChamp
    valeur: boolean | undefined
    onchange: (v: boolean | undefined) => void
  }

  let { champ, valeur, onchange }: Props = $props()

  function choisir(v: boolean) {
    // Choisir à nouveau la même réponse l'efface : rien n'est obligatoire.
    onchange(valeur === v ? undefined : v)
  }
</script>

<div class="champ">
  <span id="champ-{champ.cle}-legende">{champ.libelle}</span>
  <div class="deux-boutons" role="radiogroup" aria-labelledby="champ-{champ.cle}-legende">
    <button type="button" role="radio" aria-checked={valeur === true}
      class="option" class:option--actif={valeur === true} onclick={() => choisir(true)}>
      Oui
    </button>
    <button type="button" role="radio" aria-checked={valeur === false}
      class="option" class:option--actif={valeur === false} onclick={() => choisir(false)}>
      Non
    </button>
  </div>
</div>

<style>
  .deux-boutons { display: flex; gap: 0.4rem; }
  .option {
    flex: 1;
    min-height: var(--cible-tactile);
    border: 1px solid var(--trait);
    border-radius: var(--rayon-s);
    background: var(--carte);
    color: var(--encre);
    cursor: pointer;
  }
  .option:hover { border-color: var(--sauge); }
  .option--actif { background: var(--sauge-voile); border-color: var(--sauge-texte); color: var(--sauge-texte); font-weight: 600; }
</style>
