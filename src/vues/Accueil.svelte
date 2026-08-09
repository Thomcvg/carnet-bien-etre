<script lang="ts">
  /**
   * Tableau de bord (§ 5.1).
   *
   * Tout ce qui compte doit tenir sans défilement sur un téléphone, et le bouton
   * de saisie rester accessible au pouce. L'écran est épuré : aucune citation (§ 16.4 v1.0).
   */
  import Courbe from '../composants/Courbe.svelte'
  import Jauge from '../composants/Jauge.svelte'
  import RepereRegularite from '../composants/RepereRegularite.svelte'
  import { carnet } from '$lib/etat/carnet.svelte'
  import { formaterDate, joursEntre, versISO } from '$lib/domain/dates'
  import { formaterEvolution, formaterNombre, masseVersAffichage } from '$lib/domain/unites'
  import { formaterImc } from '$lib/domain/imc'
  import { moyenneMobile, sensEvolution, BANDE_INCERTITUDE_KG } from '$lib/domain/tendance'
  import {
    champsActifs, estChampMasse, uniteAffichee, valeurVersAffichage,
  } from '$lib/domain/champs'
  import { estObjectivable } from '$lib/domain/objectifs'
  import { enonceObjectif, formaterValeurChamp } from '$lib/domain/valeurs'
  import { formaterDosage } from '$lib/domain/traitements'
  import type { DefinitionChamp, TypeObjectif } from '$lib/domain/types'

  interface Props {
    onnouvelleMesure: () => void
    ondefinirObjectif: (type?: TypeObjectif, champCle?: string) => void
  }

  let { onnouvelleMesure, ondefinirObjectif }: Props = $props()

  const profil = $derived(carnet.profil)
  const unite = $derived(profil?.uniteMasse ?? 'kg')
  const formatDate = $derived(profil?.formatDate ?? 'jj/mm/aaaa')
  const sansChiffre = $derived(profil?.modeSansChiffre ?? false)

  const m = (kg: number | undefined) =>
    kg === undefined ? '—' : formaterNombre(masseVersAffichage(kg, unite))

  const suitPoids = $derived(carnet.suitLePoids)

  /**
   * Sans poids à mettre en tête, l'écran présente les dernières valeurs relevées,
   * quelles qu'elles soient — un carnet de sommeil ou de stress est un carnet à
   * part entière.
   */
  const dernieresValeurs = $derived.by(() => {
    const derniere = carnet.mesures[carnet.mesures.length - 1]
    if (!derniere) return []
    return champsActifs(carnet.champs)
      .map((champ) => ({
        champ,
        texte: formaterValeurChamp(champ, derniere, { uniteMasse: unite, sansChiffre }),
      }))
      .filter((v): v is { champ: DefinitionChamp; texte: string } => v.texte !== undefined)
  })

  const bilan = $derived(carnet.bilanPoids)
  const lecture = $derived(carnet.lectureImc)
  const zone = $derived(carnet.zonePoidsSante)

  const tendance = $derived(moyenneMobile(carnet.poids))

  /* ---------------- objectifs (F1 à F4) ---------------- */

  const suivis = $derived(carnet.suivisObjectifs)

  /** Reste-t-il une donnée suivie sans objectif ? Sinon, ne rien proposer. */
  const resteAObjectiver = $derived(
    champsActifs(carnet.champs).some((c) => estObjectivable(c) && !carnet.objectifDe(c.cle)),
  )

  /**
   * La distance restante ne s'affiche pas toujours :
   *  - § 12.1 : la part parcourue n'est pas un poids, la distance restante en
   *    est un — elle disparaît donc en mode sans chiffre ;
   *  - sur une échelle de 1 à 5, « reste 0,3 » annonce une précision qui n'existe
   *    pas : on ne note pas un stress au tiers de point.
   */
  const masquerRestant = (c: DefinitionChamp) =>
    (sansChiffre && estChampMasse(c.cle)) || c.type === 'echelle5'

  /** La bande d'objectif sous la courbe ne concerne que la courbe affichée. */
  const zoneObjectif = $derived.by(() => {
    const o = carnet.objectifPoids
    if (!o || o.type === 'regularite' || o.valeurMin === undefined) return null
    return { min: Math.min(o.valeurMin, o.valeurMax ?? o.valeurMin),
             max: Math.max(o.valeurMin, o.valeurMax ?? o.valeurMin) }
  })

  const joursDepuis = $derived.by(() => {
    const d = carnet.dateDerniereMesure
    return d ? joursEntre(d, versISO(new Date())) : null
  })

  // K12, § 27 : repli PWA d'un rappel programmé — un simple message à
  // l'ouverture, seulement si la personne l'a explicitement demandé.
  const rappelsActifs = $derived(profil?.rappelsActifs ?? false)
  const frequenceRappel = $derived(profil?.frequenceRappelJours ?? 30)
  const rappelDu = $derived(
    rappelsActifs && joursDepuis !== null && joursDepuis > frequenceRappel,
  )

  const sens = $derived(bilan.evolution === null ? null : sensEvolution(bilan.evolution))

  const motEvolution: Record<string, string> = {
    hausse: 'en légère hausse depuis le début',
    baisse: 'en baisse depuis le début',
    stable: 'stable depuis le début',
  }
</script>

<div class="pile gap-l">
  {#if carnet.nombreMesures === 0}
    <section class="carte accueil-vide">
      <h2>Votre carnet est prêt</h2>
      <p>
        {#if suitPoids}
          Enregistrez une première mesure : la date et le poids suffisent.
        {:else}
          <!-- Promettre le poids à quelqu'un qui ne le suit pas décrirait une
               autre application que la sienne (§ 3). -->
          Enregistrez une première mesure : la date et une seule valeur suffisent.
        {/if}
      </p>
      <button type="button" class="bouton bouton--principal" onclick={onnouvelleMesure}>
        + Nouvelle mesure
      </button>
    </section>
  {:else}
    <!-- Chiffres de tête -->
    <section class="carte" aria-labelledby="titre-actuel">
      <h2 id="titre-actuel" class="pour-lecteur">Situation actuelle</h2>

      <div class="tete">
        <div class="principal">
          {#if !suitPoids}
            <!-- Le poids n'est pas suivi (§ 3 : c'est un champ comme un autre).
                 La tête de l'écran présente alors le dernier relevé, quel qu'il soit. -->
            <p class="valeur-mot">Dernier relevé</p>
          {:else if sansChiffre}
            <p class="valeur-mot">{sens ? motEvolution[sens] : 'première mesure enregistrée'}</p>
          {:else}
            <p class="valeur nombre">{m(carnet.poidsActuel)}<span class="unite">{unite}</span></p>
          {/if}
          {#if carnet.dateDerniereMesure}
            <p class="sous-titre">
              Dernière mesure le {formaterDate(carnet.dateDerniereMesure, formatDate)}
            </p>
          {/if}
        </div>

        <button type="button" class="bouton bouton--principal saisir" onclick={onnouvelleMesure}>
          + Nouvelle mesure
        </button>
      </div>

      {#if !suitPoids}
        {#if dernieresValeurs.length > 0}
          <dl class="chiffres">
            {#each dernieresValeurs as v (v.champ.cle)}
              <div><dt>{v.champ.libelle}</dt><dd class="nombre">{v.texte}</dd></div>
            {/each}
          </dl>
        {/if}
      {:else if !sansChiffre}
        <dl class="chiffres">
          <div>
            <dt>Départ</dt>
            <dd class="nombre">{m(bilan.premiere?.valeur)} {unite}</dd>
          </div>
          <div>
            <dt>Évolution</dt>
            <dd class="nombre">
              {bilan.evolution === null ? '—' : formaterEvolution(masseVersAffichage(bilan.evolution, unite), 1, unite)}
            </dd>
          </div>
          {#if bilan.minimum && bilan.nombreMesures > 2}
            <div>
              <dt>Plus bas atteint</dt>
              <dd class="nombre">{m(bilan.minimum.valeur)} {unite}</dd>
            </div>
          {/if}
          <!-- Pas d'entrée « Objectif » ici : la carte du dessous l'énonce déjà,
               et le répéter à deux lignes d'intervalle n'apprend rien. Ces trois
               chiffres-ci sont des faits d'historique, pas une visée. -->
        </dl>
      {/if}
    </section>

    <!--
      Objectifs (F1 à F4). Ils ne dépendent plus du poids : on peut viser un tour
      de taille, un niveau de stress, ou une régularité de sommeil. Un objectif
      par donnée suivie, chacun avec sa propre forme.
    -->
    <section class="carte" aria-labelledby="titre-objectifs">
      <h2 id="titre-objectifs">Vos objectifs</h2>

      {#if suivis.length > 0}
        <ul class="objectifs">
          {#each suivis as s (s.objectif.id)}
            <li>
              <div class="entete-objectif">
                <h3>{s.champ.libelle}</h3>
                <button
                  type="button"
                  class="bouton bouton--discret lien"
                  onclick={() => ondefinirObjectif(undefined, s.champ.cle)}
                >
                  Modifier
                </button>
              </div>

              {#if !(sansChiffre && estChampMasse(s.champ.cle))}
                <p class="enonce">{enonceObjectif(s.objectif, s.champ, unite)}</p>
              {/if}

              {#if s.regularite}
                <RepereRegularite regularite={s.regularite} />
              {:else if s.progression}
                <Jauge
                  pourcent={s.progression.pourcent}
                  restant={s.progression.restant === null
                    ? null
                    : valeurVersAffichage(s.champ, s.progression.restant, unite)}
                  unite={uniteAffichee(s.champ, unite)}
                  atteint={s.progression.atteint}
                  maintien={s.objectif.type === 'maintien'}
                  dansLaFourchette={s.progression.dansLaFourchette}
                  masquerRestant={masquerRestant(s.champ)}
                />
                {#if s.progression.atteint && s.objectif.type !== 'maintien'}
                  <!-- § 9.4 : atteindre la cible ne clôt pas le parcours. -->
                  <p class="apres-objectif">
                    Vous avez atteint cet objectif. Souhaitez-vous passer en maintien, avec
                    une fourchette autour de votre valeur actuelle ?
                    <button
                      type="button"
                      class="bouton bouton--discret lien"
                      onclick={() => ondefinirObjectif('maintien', s.champ.cle)}
                    >
                      Définir un maintien
                    </button>
                  </p>
                {/if}
              {/if}
            </li>
          {/each}
        </ul>

        {#if resteAObjectiver}
          <p class="sans-objectif">
            <button type="button" class="bouton bouton--discret lien" onclick={() => ondefinirObjectif()}>
              Définir un objectif sur une autre donnée
            </button>
          </p>
        {/if}
      {:else}
        <p class="sans-objectif">
          Aucun objectif défini. Le carnet fonctionne très bien sans.
          <button type="button" class="bouton bouton--discret lien" onclick={() => ondefinirObjectif()}>
            En définir un
          </button>
        </p>
      {/if}
    </section>

    <!-- Courbe : n'a de sens que si le poids est suivi. -->
    {#if suitPoids}
    <section class="carte" aria-labelledby="titre-courbe">
      <h2 id="titre-courbe">Évolution du poids</h2>
      <Courbe
        points={carnet.poids}
        {tendance}
        {zoneObjectif}
        bandeIncertitude={BANDE_INCERTITUDE_KG}
        evenements={carnet.evenements}
        unite={unite}
        libelle="Poids"
        {formatDate}
        masquerValeurs={sansChiffre}
      />
    </section>
    {/if}

    <!-- Repères de santé -->
    {#if lecture}
      <section class="carte" aria-labelledby="titre-imc">
        <h2 id="titre-imc">Repères</h2>
        <p class="imc">
          <span class="nombre imc-valeur">{formaterImc(lecture.imc)}</span>
          <span class="imc-libelle">IMC, {lecture.libelle}</span>
        </p>
        <p class="detail">
          Fourchette de référence : {formaterNombre(lecture.fourchette.min)} à
          {formaterNombre(lecture.fourchette.max)}
          {#if !lecture.ageConnu}
            — renseignez votre année de naissance dans les paramètres pour une lecture
            adaptée à votre âge.
          {/if}
        </p>
        {#if zone && !sansChiffre}
          <p class="detail">
            Cela correspond à une zone de {formaterNombre(masseVersAffichage(zone.min, unite))}
            à {formaterNombre(masseVersAffichage(zone.max, unite))} {unite} pour votre taille.
          </p>
        {/if}
        {#if carnet.ratioTaille !== undefined}
          <p class="detail">
            Tour de taille rapporté à la stature : {formaterNombre(carnet.ratioTaille, 2)}
            (repère : rester sous 0,50).
          </p>
        {/if}
        <p class="mention-legale">
          Ces repères sont indicatifs. Carnet Bien-être n'est pas un dispositif médical.
        </p>
      </section>
    {/if}

    <!-- Messages de contexte, jamais alarmistes -->
    {#if carnet.alertePerte}
      <section class="carte note-douce" role="status">
        <p>
          Votre poids baisse assez vite depuis le {formaterDate(carnet.alertePerte.depuis, formatDate)}.
          Si cette évolution n'est pas volontaire, cela vaut la peine d'en parler à un médecin.
        </p>
      </section>
    {/if}

    {#if carnet.rappelsTraitementDuJour.length > 0}
      <!-- B6, K12 : repli PWA d'un rappel de prise — un message à l'ouverture,
           uniquement pour les traitements dont le rappel a été demandé. -->
      <section class="carte note-douce" role="status">
        <p>Prises prévues aujourd'hui :</p>
        <ul class="rappels">
          {#each carnet.rappelsTraitementDuJour as t (t.id)}
            <li>{formaterDosage(t)} — {t.heuresRappel.join(', ')}</li>
          {/each}
        </ul>
      </section>
    {/if}

    {#if rappelDu}
      <section class="carte note-douce" role="status">
        <p>
          Votre dernière mesure date d'il y a {Math.round((joursDepuis ?? 0) / 7)} semaines.
          Vous pouvez reprendre quand vous voulez — le carnet vous attend.
        </p>
      </section>
    {/if}
  {/if}
</div>

<style>
  .tete {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    flex-wrap: wrap;
  }
  .principal { margin-right: auto; }

  .valeur {
    font-family: var(--serif);
    font-size: 2.6rem;
    line-height: 1.05;
    display: flex;
    align-items: baseline;
    gap: 0.2em;
  }
  .valeur .unite { font-size: 1rem; color: var(--encre-2); font-family: var(--sans); }
  .valeur-mot { font-family: var(--serif); font-size: 1.5rem; line-height: 1.2; }
  .sous-titre { color: var(--encre-2); font-size: 0.9rem; margin-top: 0.15rem; }

  .saisir { flex: 0 0 auto; }

  .chiffres {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
    gap: 0.9rem;
    margin: 1.1rem 0 0;
    padding-top: 0.9rem;
    border-top: 1px solid var(--trait);
  }
  .chiffres dt { font-size: 0.82rem; color: var(--encre-2); }
  .chiffres dd { margin: 0.1rem 0 0; font-size: 1.05rem; font-weight: 600; }

  .accueil-vide { display: flex; flex-direction: column; gap: 0.8rem; align-items: flex-start; }
  .accueil-vide p { color: var(--encre-2); }

  .objectifs {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 1.1rem;
  }
  /* Un séparateur entre objectifs : sans lui, deux jauges se lisent comme une seule. */
  .objectifs li + li { border-top: 1px solid var(--trait); padding-top: 1.1rem; }

  .entete-objectif {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.7rem;
    flex-wrap: wrap;
  }
  .entete-objectif h3 { font-size: 1rem; margin: 0; }

  .enonce { color: var(--encre-2); font-size: 0.9rem; margin: 0.15rem 0 0.55rem; }

  .sans-objectif, .apres-objectif { color: var(--encre-2); font-size: 0.95rem; margin-top: 0.5rem; }
  .lien {
    min-height: auto;
    padding: 0.1em 0.35em;
    text-decoration: underline;
    color: var(--bleu-texte);
  }

  section h2 { margin-bottom: 0.7rem; }

  .imc { display: flex; align-items: baseline; gap: 0.6rem; flex-wrap: wrap; }
  .imc-valeur { font-family: var(--serif); font-size: 1.9rem; }
  .imc-libelle { color: var(--encre-2); }
  .detail { color: var(--encre-2); font-size: 0.9rem; margin-top: 0.4rem; }
  .mention-legale { color: var(--encre-3); font-size: 0.82rem; margin-top: 0.7rem; }

  .note-douce {
    background: var(--bleu-voile);
    border-color: var(--bleu-trait);
    font-size: 0.95rem;
  }
  .rappels { margin: 0.4rem 0 0; padding-left: 1.2rem; }
  .rappels li { margin-bottom: 0.15rem; }
</style>
