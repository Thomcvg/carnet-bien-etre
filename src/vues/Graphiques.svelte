<script lang="ts">
  /**
   * Graphiques (§ 5.4).
   *
   * Un champ à la fois, choisi explicitement : c'est ce qui évite le graphique
   * illisible que redoutait le § 11.6 de la v1.0. Le mode « Comparer » (lot 3)
   * ajoute la comparaison multi-mensurations demandée par ce même paragraphe,
   * volontairement limitée aux mensurations : elles partagent l'unité centimètre,
   * ce qui rend un axe commun lisible — contrairement à poids et nombre de pas.
   */
  import Courbe from '../composants/Courbe.svelte'
  import CourbeComparaison from '../composants/CourbeComparaison.svelte'
  import { carnet } from '$lib/etat/carnet.svelte'
  import { champsActifs, mensurationsActives, CLE_POIDS } from '$lib/domain/champs'
  import {
    moyenneMobile, serie, variationsMensuelles, sensEvolution, BANDE_INCERTITUDE_KG,
  } from '$lib/domain/tendance'
  import { formaterMoisLong, versISO } from '$lib/domain/dates'
  import { formaterEvolution, masseVersAffichage } from '$lib/domain/unites'

  type Periode = '3m' | '6m' | '1a' | 'tout'
  type Mode = 'simple' | 'comparer'

  let mode = $state<Mode>('simple')
  let champChoisi = $state<string>(CLE_POIDS)
  let periode = $state<Periode>('tout')
  let clesComparees = $state<string[]>([])

  const profil = $derived(carnet.profil)
  const unite = $derived(profil?.uniteMasse ?? 'kg')
  const formatDate = $derived(profil?.formatDate ?? 'jj/mm/aaaa')
  const sansChiffre = $derived(profil?.modeSansChiffre ?? false)

  /**
   * Tout ce qui se stocke comme un nombre se trace.
   *
   * `duree` en faisait déjà partie partout ailleurs (historique, repères de
   * saisie, export) et manquait ici. `echelle5` aussi : une note de 1 à 5 suivie
   * mois après mois est une courbe parfaitement lisible — et c'est même la seule
   * qu'aurait quelqu'un qui ne suit que son sommeil ou son stress, le poids étant
   * désormais optionnel.
   */
  const champsNumeriques = $derived(
    champsActifs(carnet.champs).filter(
      (c) => c.type === 'nombre' || c.type === 'duree' || c.type === 'echelle5',
    ),
  )
  const mensurations = $derived(mensurationsActives(carnet.champs))

  /**
   * Le champ affiché : celui choisi, sinon le premier qui porte réellement des
   * données. Retomber bêtement sur le premier de la liste ouvrait l'écran sur
   * une courbe vide alors qu'un autre champ, juste en dessous, avait un an
   * d'historique — d'autant plus visible depuis que le poids n'est plus le
   * défaut garanti.
   */
  const champ = $derived(
    champsNumeriques.find((c) => c.cle === champChoisi)
    ?? champsNumeriques.find((c) => serie(carnet.mesures, c.cle).length > 0)
    ?? champsNumeriques[0],
  )

  const MOIS: Record<Periode, number | null> = { '3m': 3, '6m': 6, '1a': 12, tout: null }

  function filtrerPeriode(tous: ReturnType<typeof serie>) {
    const n = MOIS[periode]
    if (n === null) return tous
    const limite = new Date()
    limite.setMonth(limite.getMonth() - n)
    // `versISO` et non `toISOString` : ce dernier bascule en UTC et peut décaler
    // le seuil d'un jour selon le fuseau et l'heure (§ 3.4 de l'audit).
    const seuil = versISO(limite)
    return tous.filter((p) => p.date >= seuil)
  }

  const points = $derived.by(() => {
    if (!champ) return []
    return filtrerPeriode(serie(carnet.mesures, champ.cle))
  })

  const serieComparaison = $derived(
    mensurations
      .filter((c) => clesComparees.includes(c.cle))
      .map((c) => ({ cle: c.cle, libelle: c.libelle, points: filtrerPeriode(serie(carnet.mesures, c.cle)) })),
  )

  function basculerComparaison(cle: string, coche: boolean) {
    clesComparees = coche ? [...clesComparees, cle] : clesComparees.filter((c) => c !== cle)
  }

  const tendance = $derived(moyenneMobile(points))
  const variations = $derived(variationsMensuelles(points).slice(-12))

  const zoneObjectif = $derived.by(() => {
    const o = carnet.objectif
    if (!o || champ?.cle !== o.champCle || o.valeurMin === undefined) return null
    return {
      min: Math.min(o.valeurMin, o.valeurMax ?? o.valeurMin),
      max: Math.max(o.valeurMin, o.valeurMax ?? o.valeurMin),
    }
  })

  const estPoids = $derived(champ?.cle === CLE_POIDS)

  const maxVariation = $derived(
    variations.length === 0 ? 1 : Math.max(...variations.map((v) => Math.abs(v.delta)), 0.1),
  )

  function afficherDelta(delta: number): string {
    // § 12.1 : un écart mensuel chiffré est exactement ce que le mode sans
    // chiffre cherche à éviter — on en garde le sens, pas la valeur.
    if (estPoids && sansChiffre) {
      if (sensEvolution(delta) === 'stable') return 'stable'
      return delta > 0 ? 'en hausse' : 'en baisse'
    }
    return estPoids
      ? formaterEvolution(masseVersAffichage(delta, unite), 1, unite)
      : formaterEvolution(delta, 1, champ?.unite ?? '')
  }
</script>

<div class="pile gap-m">
  <h1>Graphiques</h1>

  {#if champsNumeriques.length === 0}
    <!-- Distinguer les deux causes : « pas encore de mesure » et « rien de
         traçable » appellent des gestes différents. -->
    <p class="vide">
      Aucune des données que vous suivez ne se prête à une courbe. Activez par
      exemple une mensuration ou une échelle dans les paramètres.
    </p>
  {:else if carnet.nombreMesures === 0}
    <p class="vide">Les graphiques apparaîtront dès les premières mesures.</p>
  {:else}
    {#if mensurations.length >= 2}
      <div class="seg" role="group" aria-label="Mode d'affichage">
        <button type="button" aria-pressed={mode === 'simple'} onclick={() => (mode = 'simple')}>
          Un champ
        </button>
        <button type="button" aria-pressed={mode === 'comparer'} onclick={() => (mode = 'comparer')}>
          Comparer des mensurations
        </button>
      </div>
    {/if}

    <div class="commandes">
      {#if mode === 'simple'}
        <div class="champ">
          <label for="choix-champ">Donnée</label>
          <select id="choix-champ" bind:value={champChoisi}>
            {#each champsNumeriques as c (c.cle)}
              <option value={c.cle}>{c.libelle}</option>
            {/each}
          </select>
        </div>
      {/if}

      <fieldset class="periodes">
        <legend>Période</legend>
        {#each [['3m', '3 mois'], ['6m', '6 mois'], ['1a', '1 an'], ['tout', 'Tout']] as [valeur, libelle]}
          <label class="segment" class:segment--actif={periode === valeur}>
            <input type="radio" name="periode" value={valeur} bind:group={periode} />
            <span>{libelle}</span>
          </label>
        {/each}
      </fieldset>
    </div>

    {#if mode === 'simple'}
      <section class="carte">
        <h2>{champ?.libelle}</h2>
        <Courbe
          {points}
          {tendance}
          {zoneObjectif}
          bandeIncertitude={estPoids ? BANDE_INCERTITUDE_KG : 0}
          evenements={carnet.evenements}
          unite={estPoids ? unite : (champ?.unite ?? '')}
          libelle={champ?.libelle ?? ''}
          {formatDate}
          masquerValeurs={estPoids && sansChiffre}
        />
        {#if points.length === 0}
          <p class="vide">Aucune mesure sur cette période.</p>
        {/if}
      </section>

      {#if variations.length > 0}
        <!-- G5 : les écarts d'un mois sur l'autre, plus lisibles qu'une courbe pour se situer. -->
        <section class="carte">
          <h2>Variations d'un mois sur l'autre</h2>
          <ul class="barres">
            {#each variations as v (v.mois)}
              <li>
                <span class="mois">{formaterMoisLong(v.mois)}</span>
                <span class="piste">
                  <span
                    class="barre"
                    class:barre--positive={v.delta > 0}
                    style="width: {(Math.abs(v.delta) / maxVariation) * 100}%"
                  ></span>
                </span>
                <span class="delta nombre">{afficherDelta(v.delta)}</span>
              </li>
            {/each}
          </ul>
        </section>
      {/if}
    {:else}
      <section class="carte">
        <h2>Choisir les mensurations à comparer</h2>
        <div class="options-comparaison">
          {#each mensurations as c (c.cle)}
            <label class="option-comparaison">
              <input type="checkbox" checked={clesComparees.includes(c.cle)}
                onchange={(e) => basculerComparaison(c.cle, e.currentTarget.checked)} />
              <span>{c.libelle}</span>
            </label>
          {/each}
        </div>
      </section>

      <section class="carte">
        <h2>Comparaison</h2>
        <CourbeComparaison series={serieComparaison} {formatDate} />
      </section>
    {/if}
  {/if}
</div>

<style>
  .seg {
    display: inline-flex;
    border: 1px solid var(--trait);
    border-radius: var(--rayon-s);
    overflow: hidden;
    width: fit-content;
  }
  .seg button {
    font: inherit;
    font-size: 0.9rem;
    min-height: var(--cible-tactile);
    padding: 0.4em 1em;
    border: 0;
    border-right: 1px solid var(--trait);
    background: var(--carte);
    color: var(--encre-2);
    cursor: pointer;
  }
  .seg button:last-child { border-right: 0; }
  .seg button[aria-pressed='true'] { background: var(--sauge-voile); color: var(--encre); font-weight: 600; }

  .options-comparaison { display: flex; flex-wrap: wrap; gap: 0.5rem; }
  .option-comparaison {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    min-height: 2.6rem;
    padding: 0.35em 0.85em;
    border: 1px solid var(--trait);
    border-radius: 999px;
    background: var(--carte);
    cursor: pointer;
    font-size: 0.9rem;
  }
  .option-comparaison:has(input:checked) { background: var(--sauge-voile); border-color: var(--sauge-trait); }
  .option-comparaison input { width: 1.1rem; height: 1.1rem; }

  .commandes {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    align-items: flex-end;
  }
  .commandes .champ { flex: 1 1 12rem; max-width: 20rem; }

  .periodes {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    border: 0;
    margin: 0;
    padding: 0;
  }
  .periodes legend { font-size: 0.9rem; color: var(--encre-2); padding: 0 0 0.3rem; }

  .segment {
    display: inline-flex;
    align-items: center;
    min-height: var(--cible-tactile);
    padding: 0.4em 0.9em;
    border: 1px solid var(--trait);
    border-radius: var(--rayon-s);
    background: var(--carte);
    cursor: pointer;
    font-size: 0.92rem;
  }
  .segment input { position: absolute; opacity: 0; width: 0; height: 0; }
  .segment--actif { background: var(--sauge-voile); border-color: var(--sauge-trait); font-weight: 600; }
  .segment:has(input:focus-visible) { outline: 3px solid var(--bleu); outline-offset: 2px; }

  .barres { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.4rem; }
  .barres li {
    display: grid;
    grid-template-columns: minmax(6rem, 9rem) 1fr minmax(4.5rem, auto);
    gap: 0.7rem;
    align-items: center;
    font-size: 0.9rem;
  }
  .mois { color: var(--encre-2); }
  /* `--sauge-voile` et non `--papier` : sur une carte blanche, la piste en
     couleur de fond de page était pratiquement invisible en thème clair. */
  .piste {
    background: var(--sauge-voile);
    border: 1px solid var(--sauge-trait);
    border-radius: 999px;
    height: 0.7rem;
    overflow: hidden;
  }
  .barre { display: block; height: 100%; background: var(--sauge-texte); border-radius: 999px; }
  /* Une hausse et une baisse se distinguent, sans que l'une soit « mauvaise » (§ 12.1). */
  .barre--positive { background: var(--bleu); }
  .delta { text-align: right; }

  .vide { color: var(--encre-2); }
  section h2 { margin-bottom: 0.7rem; }
</style>
