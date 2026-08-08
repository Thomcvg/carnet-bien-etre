<script lang="ts">
  /** Sélection multiple (par exemple l'activité du quotidien : jardinage ET ménage le même jour). */
  import type { DefinitionChamp } from '$lib/domain/types'

  interface Props {
    champ: DefinitionChamp
    valeurs: string[] | undefined
    onchange: (v: string[] | undefined) => void
  }

  let { champ, valeurs, onchange }: Props = $props()
  const idGroupe = $derived(`champ-${champ.cle}`)

  function basculer(option: string, coche: boolean) {
    const actuelles = valeurs ?? []
    const suivantes = coche ? [...actuelles, option] : actuelles.filter((v) => v !== option)
    onchange(suivantes.length > 0 ? suivantes : undefined)
  }
</script>

<fieldset class="champ groupe">
  <legend id="{idGroupe}-legende">{champ.libelle}</legend>
  <div class="options">
    {#each champ.options ?? [] as option (option)}
      <label class="option">
        <input
          type="checkbox"
          checked={(valeurs ?? []).includes(option)}
          onchange={(e) => basculer(option, e.currentTarget.checked)}
        />
        <span>{option}</span>
      </label>
    {/each}
  </div>
</fieldset>

<style>
  .groupe { border: 0; margin: 0; padding: 0; }
  .groupe legend { padding: 0; font-size: 0.9rem; color: var(--encre-2); margin-bottom: 0.3rem; }
  .options { display: flex; flex-wrap: wrap; gap: 0.4rem; }
  .option {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    min-height: 2.4rem;
    padding: 0.3em 0.8em;
    border: 1px solid var(--trait);
    border-radius: 999px;
    background: var(--carte);
    cursor: pointer;
    font-size: 0.9rem;
  }
  .option:has(input:checked) { background: var(--sauge-voile); border-color: var(--sauge-texte); }
  .option input { width: 1rem; height: 1rem; }
</style>
