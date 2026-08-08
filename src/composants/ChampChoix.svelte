<script lang="ts">
  /** Sélection unique parmi des options prédéfinies (activité, cycle…). */
  import type { DefinitionChamp } from '$lib/domain/types'

  interface Props {
    champ: DefinitionChamp
    valeur: string | undefined
    onchange: (v: string | undefined) => void
  }

  let { champ, valeur, onchange }: Props = $props()
  const idChamp = $derived(`champ-${champ.cle}`)
</script>

<div class="champ">
  <label for={idChamp}>{champ.libelle}</label>
  <select
    id={idChamp}
    value={valeur ?? ''}
    onchange={(e) => onchange(e.currentTarget.value || undefined)}
  >
    <option value="">— Non renseigné —</option>
    {#each champ.options ?? [] as option (option)}
      <option value={option}>{option}</option>
    {/each}
  </select>
</div>
