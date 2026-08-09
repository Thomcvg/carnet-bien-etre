<script lang="ts">
  /**
   * La barre elle-même, sans légende ni vocabulaire.
   *
   * Deux composants s'en servent avec des mots très différents — `Jauge` pour la
   * progression vers un niveau, `RepereRegularite` pour un décompte d'occurrences.
   * Les séparer garantit que la formulation de l'un ne déteindra pas sur l'autre :
   * une progression se mesure, un repère se situe (§ 8.3).
   */
  interface Props {
    /** Part remplie, en pourcentage. Bornée à [0, 100] pour l'affichage. */
    pourcent: number
    /** Ce que la barre représente, pour les lecteurs d'écran. */
    intitule: string
  }

  let { pourcent, intitule }: Props = $props()

  const largeur = $derived(Math.max(0, Math.min(100, pourcent)))
</script>

<div
  class="piste"
  role="progressbar"
  aria-valuenow={Math.round(largeur)}
  aria-valuemin="0"
  aria-valuemax="100"
  aria-label={intitule}
>
  <div class="remplissage" style="width: {largeur}%"></div>
</div>

<style>
  .piste {
    height: 0.85rem;
    background: var(--accent-voile);
    border: 1px solid var(--accent-trait);
    border-radius: 999px;
    overflow: hidden;
  }
  .remplissage {
    height: 100%;
    background: var(--accent-texte);
    border-radius: 999px;
    transition: width 0.3s ease;
  }
  /* Une barre qui s'anime sans qu'on l'ait demandé n'apporte rien ici (§ 13). */
  @media (prefers-reduced-motion: reduce) {
    .remplissage { transition: none; }
  }
</style>
