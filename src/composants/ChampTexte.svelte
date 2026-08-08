<script lang="ts">
  import type { DefinitionChamp } from '$lib/domain/types'

  interface Props {
    champ: DefinitionChamp
    valeur: string
    onchange: (v: string) => void
  }

  let { champ, valeur, onchange }: Props = $props()
  const idChamp = $derived(`champ-${champ.cle}`)
</script>

<div class="champ">
  <label for={idChamp}>{champ.libelle}</label>
  <input
    id={idChamp}
    type="text"
    autocomplete="off"
    value={valeur}
    oninput={(e) => onchange(e.currentTarget.value)}
  />
</div>
