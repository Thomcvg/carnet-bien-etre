<script lang="ts">
  /**
   * Comparaison de plusieurs mensurations sur un même graphique (§ 11.6 v1.0).
   *
   * Volontairement limitée aux mensurations : elles partagent toutes l'unité
   * centimètre et des échelles proches, ce qui rend un axe commun lisible.
   * Comparer le poids et le nombre de pas sur le même axe n'aurait aucun sens —
   * ce n'est pas ce que demande le § 11.6, qui parle explicitement de mensurations.
   *
   * Chaque courbe se distingue par sa couleur **et** son tracé (plein, tirets,
   * pointillés…) : la couleur seule ne porte jamais l'information (§ 13).
   */
  import type { PointSerie } from '$lib/domain/tendance'
  import { formaterDate } from '$lib/domain/dates'
  import { formaterNombre } from '$lib/domain/unites'

  export interface SerieComparee {
    cle: string
    libelle: string
    points: PointSerie[]
  }

  interface Props {
    series: SerieComparee[]
    unite?: string
    formatDate?: 'jj/mm/aaaa' | 'aaaa-mm-jj'
  }

  let { series, unite = 'cm', formatDate = 'jj/mm/aaaa' }: Props = $props()

  const L = 46, R = 14, T = 16, B = 30
  const W = 640, H = 260
  const largeur = W - L - R
  const hauteur = H - T - B

  const tempsDe = (d: string) => new Date(d + 'T00:00:00').getTime()

  const seriesAvecPoints = $derived(series.filter((s) => s.points.length > 0))

  const domaine = $derived.by(() => {
    const tousPoints = seriesAvecPoints.flatMap((s) => s.points)
    if (tousPoints.length === 0) return null

    const temps = tousPoints.map((p) => tempsDe(p.date))
    let tmin = Math.min(...temps)
    let tmax = Math.max(...temps)
    if (tmin === tmax) { tmin -= 86_400_000 * 15; tmax += 86_400_000 * 15 }

    const valeurs = tousPoints.map((p) => p.valeur)
    let vmin = Math.min(...valeurs)
    let vmax = Math.max(...valeurs)
    const marge = Math.max((vmax - vmin) * 0.12, 0.5)
    vmin -= marge; vmax += marge
    if (vmin === vmax) { vmin -= 1; vmax += 1 }

    return { tmin, tmax, vmin, vmax }
  })

  const x = (d: string) => {
    if (!domaine) return L
    return L + ((tempsDe(d) - domaine.tmin) / (domaine.tmax - domaine.tmin)) * largeur
  }
  const y = (v: number) => {
    if (!domaine) return T + hauteur
    return T + ((domaine.vmax - v) / (domaine.vmax - domaine.vmin)) * hauteur
  }

  const chemin = (points: PointSerie[]) =>
    points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.date).toFixed(1)},${y(p.valeur).toFixed(1)}`).join(' ')

  const graduationsY = $derived.by(() => {
    if (!domaine) return []
    const n = 4
    return Array.from({ length: n + 1 }, (_, i) => {
      const v = domaine.vmin + ((domaine.vmax - domaine.vmin) * i) / n
      return { v, y: y(v) }
    })
  })

  const graduationsX = $derived.by(() => {
    const reference = seriesAvecPoints[0]?.points ?? []
    if (reference.length === 0) return []
    const max = 6
    const pas = Math.max(1, Math.ceil(reference.length / max))
    return reference.filter((_, i) => i % pas === 0 || i === reference.length - 1)
  })

  /** Quatre tracés bien distincts, combinés à une couleur — jamais la couleur seule. */
  const STYLES = [
    { classe: 'style-0', tiret: undefined },
    { classe: 'style-1', tiret: '6 4' },
    { classe: 'style-2', tiret: '1.5 3.5' },
    { classe: 'style-3', tiret: '8 3 2 3' },
  ]
  function styleDe(index: number) {
    return STYLES[index % STYLES.length]!
  }

  const idTable = `comparaison-donnees-${Math.random().toString(36).slice(2, 8)}`
</script>

{#if seriesAvecPoints.length === 0}
  <p class="vide">Sélectionnez au moins une mensuration avec des mesures pour la comparer.</p>
{:else}
  <figure class="figure">
    <svg
      viewBox="0 0 {W} {H}"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-describedby={idTable}
      aria-label="Comparaison de {seriesAvecPoints.map((s) => s.libelle).join(', ')}"
    >
      {#each graduationsY as g}
        <line x1={L} x2={W - R} y1={g.y} y2={g.y} class="grille" />
        <text x={L - 8} y={g.y + 4} class="etiquette-y">{formaterNombre(g.v, 0)}</text>
      {/each}

      {#each seriesAvecPoints as s, i (s.cle)}
        {@const style = styleDe(i)}
        <path
          d={chemin(s.points)}
          class="ligne {style.classe}"
          stroke-dasharray={style.tiret}
        />
      {/each}

      {#each graduationsX as p}
        <text x={x(p.date)} y={H - 8} class="etiquette-x">{formaterDate(p.date, 'aaaa-mm-jj').slice(2)}</text>
      {/each}
    </svg>

    <figcaption class="legende">
      {#each seriesAvecPoints as s, i (s.cle)}
        <span class="cle {styleDe(i).classe}">{s.libelle}</span>
      {/each}
    </figcaption>
  </figure>

  <table id={idTable} class="pour-lecteur">
    <caption>Comparaison de mensurations, {unite}</caption>
    <thead>
      <tr>
        <th scope="col">Date</th>
        {#each seriesAvecPoints as s (s.cle)}<th scope="col">{s.libelle}</th>{/each}
      </tr>
    </thead>
    <tbody>
      {#each [...new Set(seriesAvecPoints.flatMap((s) => s.points.map((p) => p.date)))].sort() as date (date)}
        <tr>
          <td>{formaterDate(date, formatDate)}</td>
          {#each seriesAvecPoints as s (s.cle)}
            <td>{s.points.find((p) => p.date === date) ? formaterNombre(s.points.find((p) => p.date === date)!.valeur) : ''}</td>
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
{/if}

<style>
  .figure { margin: 0; }
  svg { width: 100%; height: auto; display: block; overflow: visible; }

  .grille { stroke: var(--trait); stroke-width: 1; }
  .etiquette-y, .etiquette-x { fill: var(--encre-3); font-size: 11px; font-family: var(--sans); }
  .etiquette-y { text-anchor: end; }
  .etiquette-x { text-anchor: middle; }

  .ligne { fill: none; stroke-width: 2.25; stroke-linejoin: round; stroke-linecap: round; }
  .style-0 { stroke: var(--sauge-texte); }
  .style-1 { stroke: var(--bleu-texte); }
  .style-2 { stroke: var(--attention); }
  .style-3 { stroke: var(--encre); }

  .legende {
    display: flex;
    flex-wrap: wrap;
    gap: 0.9rem;
    margin-top: 0.6rem;
    font-size: 0.82rem;
    color: var(--encre-2);
  }
  .cle { display: inline-flex; align-items: center; gap: 0.35em; }
  .cle::before { content: ''; width: 1.3em; height: 0; border-top-width: 2.5px; border-top-style: solid; }
  .cle.style-0::before { border-color: var(--sauge-texte); }
  .cle.style-1::before { border-color: var(--bleu-texte); border-top-style: dashed; }
  .cle.style-2::before { border-color: var(--attention); border-top-style: dotted; border-top-width: 3px; }
  .cle.style-3::before { border-color: var(--encre); border-top-style: double; border-top-width: 3px; }

  .vide { color: var(--encre-2); font-size: 0.95rem; }
</style>
