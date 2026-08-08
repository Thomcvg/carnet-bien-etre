<script lang="ts">
  /**
   * Courbe SVG écrite pour le projet (§ 15.2).
   *
   * Trois exigences qu'aucune bibliothèque générique ne sert bien ici :
   *  - les valeurs manquantes sont sautées, jamais interpolées ni ramenées à zéro ;
   *  - la zone objectif et la bande d'incertitude se dessinent derrière les valeurs
   *    réelles, qui restent toujours lisibles (§ 5.3 v1.0) ;
   *  - le graphique est doublé d'une table de données pour les lecteurs d'écran (J6).
   */
  import { sensEvolution, type PointSerie } from '$lib/domain/tendance'
  import type { Evenement } from '$lib/domain/types'
  import { formaterMoisCompact, formaterDate } from '$lib/domain/dates'
  import { formaterNombre } from '$lib/domain/unites'

  interface Props {
    points: PointSerie[]
    tendance?: PointSerie[]
    zoneObjectif?: { min: number; max: number } | null
    bandeIncertitude?: number
    /** Événements de contexte à annoter sur l'axe temporel (G3). */
    evenements?: Evenement[]
    unite?: string
    libelle?: string
    formatDate?: 'jj/mm/aaaa' | 'aaaa-mm-jj'
    /**
     * § 12.1, mode sans chiffre : la forme de la courbe reste — c'est elle qui
     * porte la tendance — mais les valeurs chiffrées de l'axe et de la table
     * alternative disparaissent. Sans cela, le mode se contournerait d'un regard
     * sur la graduation.
     */
    masquerValeurs?: boolean
  }

  let {
    points,
    tendance = [],
    zoneObjectif = null,
    bandeIncertitude = 0,
    evenements = [],
    unite = 'kg',
    libelle = 'Poids',
    formatDate = 'jj/mm/aaaa',
    masquerValeurs = false,
  }: Props = $props()

  /** Sens d'évolution d'un point au précédent, pour la table en mode sans chiffre. */
  function sensDuPoint(i: number): string {
    const courant = points[i]
    const precedent = points[i - 1]
    if (!courant || !precedent) return 'première valeur'
    const delta = courant.valeur - precedent.valeur
    return sensEvolution(delta) === 'stable'
      ? 'stable'
      : (delta > 0 ? 'en hausse' : 'en baisse')
  }

  const L = 46, R = 14, T = 16, B = 30
  const W = 640, H = 260
  const largeur = W - L - R
  const hauteur = H - T - B

  const tempsDe = (d: string) => new Date(d + 'T00:00:00').getTime()

  const domaine = $derived.by(() => {
    if (points.length === 0) return null

    const temps = points.map((p) => tempsDe(p.date))
    let tmin = Math.min(...temps)
    let tmax = Math.max(...temps)
    if (tmin === tmax) { tmin -= 86_400_000 * 15; tmax += 86_400_000 * 15 }

    const valeurs = points.map((p) => p.valeur)
    let vmin = Math.min(...valeurs)
    let vmax = Math.max(...valeurs)
    if (zoneObjectif) { vmin = Math.min(vmin, zoneObjectif.min); vmax = Math.max(vmax, zoneObjectif.max) }
    if (bandeIncertitude > 0) { vmin -= bandeIncertitude; vmax += bandeIncertitude }

    const marge = Math.max((vmax - vmin) * 0.12, 0.5)
    vmin -= marge; vmax += marge
    if (vmin === vmax) { vmin -= 1; vmax += 1 }

    return { tmin, tmax, vmin, vmax }
  })

  const x = (d: string) => {
    if (!domaine) return L
    const { tmin, tmax } = domaine
    return L + ((tempsDe(d) - tmin) / (tmax - tmin)) * largeur
  }
  const y = (v: number) => {
    if (!domaine) return T + hauteur
    const { vmin, vmax } = domaine
    return T + ((vmax - v) / (vmax - vmin)) * hauteur
  }

  const chemin = (serie: PointSerie[]) =>
    serie.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.date).toFixed(1)},${y(p.valeur).toFixed(1)}`).join(' ')

  const graduationsY = $derived.by(() => {
    if (!domaine) return []
    const { vmin, vmax } = domaine
    const n = 4
    return Array.from({ length: n + 1 }, (_, i) => {
      const v = vmin + ((vmax - vmin) * i) / n
      return { v, y: y(v) }
    })
  })

  /** Une étiquette de mois sur l'axe, sans jamais les entasser. */
  const graduationsX = $derived.by(() => {
    if (points.length === 0) return []
    const max = 6
    const pas = Math.max(1, Math.ceil(points.length / max))
    return points.filter((_, i) => i % pas === 0 || i === points.length - 1)
  })

  const aireIncertitude = $derived.by(() => {
    if (bandeIncertitude <= 0 || tendance.length < 2) return ''
    const haut = tendance.map((p) => `${x(p.date).toFixed(1)},${y(p.valeur + bandeIncertitude).toFixed(1)}`)
    const bas = [...tendance].reverse().map((p) => `${x(p.date).toFixed(1)},${y(p.valeur - bandeIncertitude).toFixed(1)}`)
    return `M${haut.join(' L')} L${bas.join(' L')} Z`
  })

  /**
   * Événements dont le début tombe dans la période affichée. Une annotation
   * n'est utile que si elle se rapporte à la portion de courbe visible ; un
   * événement hors-champ n'apporte rien ici (il reste consultable dans l'Historique).
   */
  const evenementsVisibles = $derived.by(() => {
    if (!domaine || evenements.length === 0) return []
    return evenements.filter((e) => {
      const t = tempsDe(e.dateDebut)
      return t >= domaine.tmin && t <= domaine.tmax
    })
  })

  const idTable = `courbe-donnees-${Math.random().toString(36).slice(2, 8)}`
</script>

{#if points.length === 0}
  <p class="vide">Pas encore de mesure à afficher. La courbe apparaîtra dès la première saisie.</p>
{:else}
  <figure class="figure">
    <svg
      viewBox="0 0 {W} {H}"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-describedby={idTable}
      aria-label="Évolution : {libelle}, de {formaterDate(points[0]!.date, formatDate)} à {formaterDate(points[points.length - 1]!.date, formatDate)}"
    >
      <!-- Zone objectif : une bande, pas une ligne (G1) -->
      {#if zoneObjectif && domaine}
        <rect
          x={L} width={largeur}
          y={y(zoneObjectif.max)}
          height={Math.max(1, y(zoneObjectif.min) - y(zoneObjectif.max))}
          class="zone-objectif"
        />
      {/if}

      <!-- Bande d'incertitude physiologique (A32) -->
      {#if aireIncertitude}
        <path d={aireIncertitude} class="bande-incertitude" />
      {/if}

      {#each graduationsY as g}
        <line x1={L} x2={W - R} y1={g.y} y2={g.y} class="grille" />
        {#if !masquerValeurs}
          <text x={L - 8} y={g.y + 4} class="etiquette-y">{formaterNombre(g.v, 0)}</text>
        {/if}
      {/each}

      <!-- Tendance lissée, derrière les valeurs réelles (G4) -->
      {#if tendance.length > 1}
        <path d={chemin(tendance)} class="tendance" />
      {/if}

      <!-- Valeurs réelles, toujours au premier plan -->
      <path d={chemin(points)} class="ligne" />
      {#each points as p}
        <circle cx={x(p.date)} cy={y(p.valeur)} r="3.5" class="point" />
      {/each}

      {#each graduationsX as p}
        <text x={x(p.date)} y={H - 8} class="etiquette-x">{formaterMoisCompact(p.date)}</text>
      {/each}

      <!-- Événements de contexte (G3) : un repère discret, jamais devant les valeurs réelles. -->
      {#each evenementsVisibles as e (e.id)}
        <g class="annotation" aria-hidden="true">
          <line x1={x(e.dateDebut)} x2={x(e.dateDebut)} y1={T} y2={T + hauteur} class="annotation-trait" />
          <circle cx={x(e.dateDebut)} cy={T} r="3" class="annotation-point" />
          <title>{formaterDate(e.dateDebut, formatDate)} — {e.libelle}</title>
        </g>
      {/each}
    </svg>

    <figcaption class="legende-bloc">
      <div class="legende">
        <span class="cle cle--reel">Mesures</span>
        {#if tendance.length > 1}<span class="cle cle--tendance">Tendance</span>{/if}
        {#if zoneObjectif}<span class="cle cle--objectif">Zone objectif</span>{/if}
        {#if evenementsVisibles.length > 0}<span class="cle cle--evenement">Événements</span>{/if}
      </div>
      {#if evenementsVisibles.length > 0}
        <p class="aide-evenements">Survolez un repère pour voir l'événement — la liste complète reste dans l'historique.</p>
      {/if}
    </figcaption>
  </figure>

  <!-- Alternative textuelle : même information, lisible au lecteur d'écran (J6) -->
  <table id={idTable} class="pour-lecteur">
    <caption>{libelle} — {points.length} mesures</caption>
    <thead>
      <tr>
        <th scope="col">Date</th>
        <!-- Une échelle n'a pas d'unité : « Stress () » n'aurait aucun sens. -->
        <th scope="col">
          {masquerValeurs ? 'Évolution' : (unite ? `${libelle} (${unite})` : libelle)}
        </th>
      </tr>
    </thead>
    <tbody>
      {#each points as p, i}
        <tr>
          <td>{formaterDate(p.date, formatDate)}</td>
          <td>{masquerValeurs ? sensDuPoint(i) : formaterNombre(p.valeur)}</td>
        </tr>
      {/each}
    </tbody>
  </table>
{/if}

<style>
  .figure { margin: 0; }
  svg { width: 100%; height: auto; display: block; overflow: visible; }

  .grille { stroke: var(--trait); stroke-width: 1; }
  .etiquette-y, .etiquette-x {
    fill: var(--encre-3);
    font-size: 11px;
    font-family: var(--sans);
  }
  .etiquette-y { text-anchor: end; }
  .etiquette-x { text-anchor: middle; }

  .zone-objectif { fill: var(--sauge-voile); }
  .bande-incertitude { fill: var(--bleu); opacity: 0.1; }

  .tendance {
    fill: none;
    stroke: var(--bleu);
    stroke-width: 2;
    stroke-dasharray: 5 4;
    stroke-linecap: round;
  }
  .ligne {
    fill: none;
    stroke: var(--sauge-texte);
    stroke-width: 2.5;
    stroke-linejoin: round;
    stroke-linecap: round;
  }
  .point { fill: var(--sauge-texte); }

  .legende {
    display: flex;
    flex-wrap: wrap;
    gap: 0.9rem;
    margin-top: 0.6rem;
    font-size: 0.82rem;
    color: var(--encre-2);
  }
  /* La légende ne repose pas sur la seule couleur : chaque clé porte son libellé (§ 13). */
  .cle { display: inline-flex; align-items: center; gap: 0.35em; }
  .cle::before {
    content: '';
    width: 1.1em; height: 0;
    border-top-width: 3px;
    border-top-style: solid;
  }
  .cle--reel::before { border-color: var(--sauge-texte); }
  .cle--tendance::before { border-top-style: dashed; border-color: var(--bleu); }
  .cle--objectif::before { border-top-width: 0.7em; border-color: var(--sauge-voile); }
  .cle--evenement::before { border-top-style: dotted; border-top-width: 2px; border-color: var(--encre-3); }

  .annotation-trait { stroke: var(--encre-3); stroke-width: 1; stroke-dasharray: 2 3; opacity: 0.7; }
  .annotation-point { fill: var(--carte); stroke: var(--encre-3); stroke-width: 1.5; }
  .annotation:hover .annotation-trait,
  .annotation:hover .annotation-point { opacity: 1; stroke: var(--bleu-texte); }

  .aide-evenements { margin-top: 0.4rem; font-size: 0.78rem; color: var(--encre-3); }

  .vide { color: var(--encre-2); font-size: 0.95rem; }
</style>
