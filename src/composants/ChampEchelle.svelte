<script lang="ts">
  /**
   * Saisie d'une échelle 1–5 (sommeil, énergie, humeur, stress…) — § 8 v1.0.
   *
   * Cinq boutons plutôt qu'un curseur : chaque valeur reste identifiable et
   * atteignable au clavier comme au doigt (J8, J9), sans geste de glissement.
   * Aucune extrémité n'est qualifiée « bonne » ou « mauvaise » dans le libellé
   * du champ lui-même — seule l'aide contextuelle précise le sens de l'échelle.
   */
  import type { DefinitionChamp } from '$lib/domain/types'

  interface Props {
    champ: DefinitionChamp
    valeur: number | undefined
    onchange: (v: number | undefined) => void
  }

  let { champ, valeur, onchange }: Props = $props()

  const idGroupe = $derived(`champ-${champ.cle}`)
  const NIVEAUX = [1, 2, 3, 4, 5]

  function choisir(n: number) {
    // Cliquer à nouveau sur la valeur choisie l'efface : l'échelle reste facultative.
    onchange(valeur === n ? undefined : n)
  }
</script>

<div class="champ">
  <span id="{idGroupe}-legende">{champ.libelle}</span>
  <div class="echelle" role="radiogroup" aria-labelledby="{idGroupe}-legende">
    {#each NIVEAUX as n (n)}
      <button
        type="button"
        role="radio"
        aria-checked={valeur === n}
        class="niveau"
        class:niveau--actif={valeur === n}
        onclick={() => choisir(n)}
        aria-label="{n} sur 5{n === 1 && champ.echelle ? ` — ${champ.echelle.bas}` : ''}{n === 5 && champ.echelle ? ` — ${champ.echelle.haut}` : ''}"
      >
        {n}
      </button>
    {/each}
  </div>

  {#if champ.echelle}
    <!-- Les deux extrémités sont nommées sous les chiffres qu'elles qualifient,
         plutôt que dans une phrase générique qui vaudrait pour n'importe quoi. -->
    <p class="poles" aria-hidden="true">
      <span>1 · {champ.echelle.bas}</span>
      <span>5 · {champ.echelle.haut}</span>
    </p>
  {/if}
  <p class="aide">Cliquez à nouveau sur un chiffre pour l'effacer.</p>
</div>

<style>
  .echelle { display: flex; gap: 0.4rem; }

  .poles {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    font-size: 0.8rem;
    color: var(--encre-3);
    margin-top: 0.25rem;
  }
  .poles span:last-child { text-align: right; }
  .niveau {
    flex: 1;
    min-height: var(--cible-tactile);
    border: 1px solid var(--trait);
    border-radius: var(--rayon-s);
    background: var(--carte);
    color: var(--encre);
    cursor: pointer;
    font-variant-numeric: tabular-nums;
    font-weight: 600;
  }
  .niveau:hover { border-color: var(--accent); }
  .niveau--actif {
    background: var(--accent-voile);
    border-color: var(--accent-texte);
    color: var(--accent-texte);
  }
</style>
