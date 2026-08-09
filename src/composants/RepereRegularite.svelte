<script lang="ts">
  /**
   * Affichage d'un objectif de régularité (F4, § 9.1).
   *
   * Tout le soin est dans le dénominateur. On écrit « 3 fois sur les 5 jours
   * notés », jamais « 3 fois sur 7 » : les deux jours non saisis n'ont pas été
   * observés, ils n'ont pas échoué (règle 2 de la charte). Il n'y a donc ici ni
   * décompte de ce qui manque, ni série à préserver, ni couleur d'alerte —
   * un repère se situe, il ne se réussit pas (§ 8.3).
   */
  import Barre from './Barre.svelte'
  import { JOURS_PERIODE, type Regularite } from '$lib/domain/objectifs'

  interface Props {
    regularite: Regularite
  }

  let { regularite }: Props = $props()

  const jours = $derived(JOURS_PERIODE[regularite.periode])
  const parPeriode = $derived(regularite.periode === 'semaine' ? 'par semaine' : 'par mois')
  const pluriel = $derived(regularite.joursNotes > 1 ? 's' : '')
</script>

{#if regularite.joursNotes === 0}
  <p class="attente">
    Ce repère s'affichera à la première saisie de la période.
  </p>
{:else}
  <div class="repere">
    <Barre
      pourcent={regularite.pourcent ?? 0}
      intitule="Fois notées par rapport au repère"
    />

    <p class="compte">
      <span class="nombre fort">{regularite.joursConformes} fois</span>
      <span class="sur">sur {regularite.joursNotes} jour{pluriel} noté{pluriel}</span>
    </p>

    <p class="detail">
      Repère : {regularite.occurrencesVisees} fois {parPeriode}, sur les {jours} derniers jours.
      {#if regularite.repereAtteint}
        <span class="atteint">Repère atteint.</span>
      {/if}
    </p>
  </div>
{/if}

<style>
  .repere { display: flex; flex-direction: column; gap: 0.4rem; }

  .compte {
    display: flex;
    align-items: baseline;
    gap: 0.45rem;
    flex-wrap: wrap;
  }
  .fort { font-weight: 600; font-size: 1.05rem; }
  .sur { color: var(--encre-2); font-size: 0.9rem; }

  .detail { color: var(--encre-2); font-size: 0.87rem; }
  /* L'information ne tient pas à la seule couleur : le mot « atteint » la porte (§ 13). */
  .atteint { color: var(--sauge-texte); font-weight: 600; }

  .attente { color: var(--encre-3); font-size: 0.9rem; }
</style>
