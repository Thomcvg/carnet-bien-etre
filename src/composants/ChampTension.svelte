<script lang="ts">
  /**
   * Tension artérielle (A16) : trois valeurs distinctes plutôt qu'un champ
   * composite peu lisible. Le pouls reste facultatif même quand la tension
   * est renseignée — rien n'impose de tout remplir d'un coup.
   */
  import type { DefinitionChamp } from '$lib/domain/types'
  import { analyserNombre } from '$lib/domain/unites'

  // Bornes indicatives, propres à ce champ : la tension ne se prête pas au
  // garde-fou générique à une seule borne min/max de `controlerValeur`.
  const PLAGE = { sys: [60, 260], dia: [30, 150], pouls: [30, 220] } as const

  interface Props {
    champ: DefinitionChamp
    sys: string
    dia: string
    pouls: string
    onchange: (partie: 'sys' | 'dia' | 'pouls', texte: string) => void
  }

  let { champ, sys, dia, pouls, onchange }: Props = $props()

  function horsPlage(texte: string, partie: keyof typeof PLAGE): boolean {
    const n = analyserNombre(texte)
    if (n === undefined) return false
    const [min, max] = PLAGE[partie]
    return n < min || n > max
  }
</script>

<div class="champ">
  <span id="champ-{champ.cle}-legende">{champ.libelle}</span>
  <div class="trois" role="group" aria-labelledby="champ-{champ.cle}-legende">
    <label class="sous-champ">
      <span>Systolique</span>
      <input type="text" inputmode="numeric" value={sys}
        oninput={(e) => onchange('sys', e.currentTarget.value)} placeholder="mmHg" />
    </label>
    <label class="sous-champ">
      <span>Diastolique</span>
      <input type="text" inputmode="numeric" value={dia}
        oninput={(e) => onchange('dia', e.currentTarget.value)} placeholder="mmHg" />
    </label>
    <label class="sous-champ">
      <span>Pouls <span class="facultatif">facultatif</span></span>
      <input type="text" inputmode="numeric" value={pouls}
        oninput={(e) => onchange('pouls', e.currentTarget.value)} placeholder="bpm" />
    </label>
  </div>
  {#if horsPlage(sys, 'sys') || horsPlage(dia, 'dia') || horsPlage(pouls, 'pouls')}
    <p class="aide aide--confirmation">
      Ces valeurs semblent inhabituelles — vérifiez-les avant d'enregistrer.
    </p>
  {/if}
</div>

<style>
  .trois { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.6rem; }
  .sous-champ { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.85rem; color: var(--encre-2); }
  .sous-champ input {
    min-height: var(--cible-tactile);
    padding: 0.5em 0.6em;
    border: 1px solid var(--trait);
    border-radius: var(--rayon-s);
    background: var(--carte);
    color: var(--encre);
    font-variant-numeric: tabular-nums;
  }
  .facultatif { font-size: 0.75rem; color: var(--encre-3); }
  .aide--confirmation {
    color: var(--attention);
    background: var(--attention-fond);
    border-radius: var(--rayon-s);
    padding: 0.3rem 0.5rem;
    margin-top: 0.4rem;
  }
</style>
