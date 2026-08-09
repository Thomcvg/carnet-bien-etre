<script lang="ts">
  /**
   * Jauge de progression vers un objectif de niveau (§ 5.2 v1.0, § 7.4).
   *
   * La valeur est bornée à [0, 100] pour l'affichage, mais la légende dit toujours
   * la vérité : on n'édulcore pas un recul, on le formule sans reproche (§ 12.1).
   *
   * `masquerRestant` sert le mode sans chiffre (§ 12.1) : la part parcourue n'est
   * pas un poids et peut rester affichée, la distance restante en est un et doit
   * disparaître. Sans ce réglage, l'écran annonçait « Reste 3,2 kg » à quelqu'un
   * qui avait précisément demandé à ne plus voir de kilos.
   */
  import Barre from './Barre.svelte'
  import { formaterNombre } from '$lib/domain/unites'

  interface Props {
    pourcent: number | null
    restant?: number | null
    unite?: string
    atteint?: boolean
    /** Objectif de maintien : on affiche une position, pas une progression (F2). */
    maintien?: boolean
    dansLaFourchette?: boolean | null
    masquerRestant?: boolean
  }

  let {
    pourcent,
    restant = null,
    unite = 'kg',
    atteint = false,
    maintien = false,
    dansLaFourchette = null,
    masquerRestant = false,
  }: Props = $props()

  const restantAffiche = $derived(masquerRestant ? null : restant)
</script>

{#if maintien}
  <div class="maintien" class:maintien--dedans={dansLaFourchette}>
    <span class="pastille" aria-hidden="true">{dansLaFourchette ? '●' : '○'}</span>
    <span>
      {#if dansLaFourchette}
        Vous êtes dans votre fourchette.
      {:else if restantAffiche !== null}
        À {formaterNombre(restantAffiche)} {unite} de votre fourchette.
      {:else}
        Fourchette de maintien définie.
      {/if}
    </span>
  </div>
{:else if pourcent === null}
  <p class="indisponible">
    La progression s'affichera dès qu'il y aura un point de départ et un objectif distincts.
  </p>
{:else}
  <div class="jauge">
    <Barre {pourcent} intitule="Progression vers l'objectif" />

    <div class="legende">
      <span class="pourcent nombre">{formaterNombre(Math.max(0, Math.min(100, pourcent)), 0)} %</span>
      {#if atteint}
        <span class="mention">Objectif atteint</span>
      {:else if restantAffiche !== null}
        <span class="mention nombre">Reste {formaterNombre(restantAffiche)} {unite}</span>
      {/if}
    </div>
  </div>
{/if}

<style>
  .jauge { display: flex; flex-direction: column; gap: 0.45rem; }

  .legende {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 1rem;
    font-size: 0.9rem;
  }
  .pourcent { font-weight: 600; }
  .mention { color: var(--encre-2); }

  .indisponible { color: var(--encre-3); font-size: 0.9rem; }

  .maintien {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    padding: 0.6rem 0.8rem;
    border-radius: var(--rayon-s);
    background: var(--sauge-voile);
    border: 1px solid var(--sauge-trait);
    font-size: 0.95rem;
  }
  .pastille { color: var(--sauge-texte); }
</style>
