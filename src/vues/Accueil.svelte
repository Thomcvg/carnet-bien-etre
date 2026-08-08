<script lang="ts">
  /**
   * Tableau de bord (§ 5.1).
   *
   * Tout ce qui compte doit tenir sans défilement sur un téléphone, et le bouton
   * de saisie rester accessible au pouce. L'écran est épuré : aucune citation (§ 16.4 v1.0).
   */
  import Courbe from '../composants/Courbe.svelte'
  import Jauge from '../composants/Jauge.svelte'
  import { carnet } from '$lib/etat/carnet.svelte'
  import { formaterDate, joursEntre, versISO } from '$lib/domain/dates'
  import { formaterEvolution, formaterNombre, masseVersAffichage } from '$lib/domain/unites'
  import { formaterImc } from '$lib/domain/imc'
  import { moyenneMobile, sensEvolution, BANDE_INCERTITUDE_KG } from '$lib/domain/tendance'
  import type { TypeObjectif } from '$lib/domain/types'

  interface Props {
    onnouvelleMesure: () => void
    ondefinirObjectif: (type?: TypeObjectif) => void
  }

  let { onnouvelleMesure, ondefinirObjectif }: Props = $props()

  const profil = $derived(carnet.profil)
  const unite = $derived(profil?.uniteMasse ?? 'kg')
  const formatDate = $derived(profil?.formatDate ?? 'jj/mm/aaaa')
  const sansChiffre = $derived(profil?.modeSansChiffre ?? false)

  const m = (kg: number | undefined) =>
    kg === undefined ? '—' : formaterNombre(masseVersAffichage(kg, unite))

  const bilan = $derived(carnet.bilanPoids)
  const progression = $derived(carnet.progression)
  const lecture = $derived(carnet.lectureImc)
  const zone = $derived(carnet.zonePoidsSante)

  const tendance = $derived(moyenneMobile(carnet.poids))

  const zoneObjectif = $derived.by(() => {
    const o = carnet.objectif
    if (!o || o.valeurMin === undefined) return null
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
      <p>Enregistrez une première mesure : la date et le poids suffisent.</p>
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
          {#if sansChiffre}
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

      {#if !sansChiffre}
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
          {#if carnet.objectif && progression?.cible != null}
            <div>
              <dt>Objectif</dt>
              <dd class="nombre">
                {#if carnet.objectif.type === 'fourchette' || carnet.objectif.type === 'maintien'}
                  {m(carnet.objectif.valeurMin)}–{m(carnet.objectif.valeurMax)} {unite}
                {:else}
                  {m(carnet.objectif.valeurMin)} {unite}
                {/if}
              </dd>
            </div>
          {/if}
        </dl>
      {/if}
    </section>

    <!-- Progression -->
    <section class="carte" aria-labelledby="titre-progression">
      <h2 id="titre-progression">Progression</h2>
      {#if carnet.objectif && progression}
        <Jauge
          pourcent={progression.pourcent}
          restant={progression.restant === null ? null : masseVersAffichage(progression.restant, unite)}
          {unite}
          atteint={progression.atteint}
          maintien={carnet.objectif.type === 'maintien'}
          dansLaFourchette={progression.dansLaFourchette}
        />
        {#if progression.atteint && carnet.objectif.type !== 'maintien'}
          <!-- § 9.4 : atteindre la cible ne clôt pas le parcours. -->
          <p class="apres-objectif">
            Vous avez atteint votre objectif. Souhaitez-vous passer en maintien, avec une
            fourchette autour de votre poids actuel ?
            <button type="button" class="bouton bouton--discret lien" onclick={() => ondefinirObjectif('maintien')}>
              Définir un maintien
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

    <!-- Courbe -->
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
      />
    </section>

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
</style>
