<script lang="ts">
  /**
   * Bilan (§ 5.5, § 14 v1.0).
   *
   * Rassemble ce que le § 14 demande : le bilan complet du poids, le bilan de
   * chaque mensuration suivie, le résumé du mois avec sa question (G6, C22),
   * les repères d'activité (§ 8.3) et les jalons de régularité (F11).
   *
   * Règle 14 : une section sans donnée exploitable ne s'affiche pas — pas de
   * tiret, pas de zéro, juste rien.
   */
  import { carnet } from '$lib/etat/carnet.svelte'
  import {
    mensurationsActives, CLE_POIDS, CLE_ACTIVITE_DUREE, CLE_RENFORCEMENT,
  } from '$lib/domain/champs'
  import { bilanChamp } from '$lib/domain/bilan'
  import { serie, variationsMensuelles } from '$lib/domain/tendance'
  import { evenementsSurPeriode } from '$lib/domain/evenements'
  import { questionDuMois } from '$lib/domain/resume'
  import { moisDe, debutDeMois, finDeMois, formaterMoisLong, versISO } from '$lib/domain/dates'
  import { formaterEvolution, formaterNombre, masseVersAffichage } from '$lib/domain/unites'
  import { CIBLE_MINUTES_HEBDO_OMS } from '$lib/domain/activite'

  const profil = $derived(carnet.profil)
  const unite = $derived(profil?.uniteMasse ?? 'kg')

  /* ---------------- poids (§ 14.1) ---------------- */

  const bilanPoids = $derived(carnet.bilanPoids)
  const objectif = $derived(carnet.objectif)

  /* ---------------- mensurations (§ 14.2) ---------------- */

  const bilansMensurations = $derived(
    // Règle 14 : sans première et dernière valeur, il n'y a rien à montrer —
    // `flatMap` avec un retour vide écarte proprement ces champs et, au passage,
    // fait remonter `premiere`/`derniere` au type non-nul pour le template.
    mensurationsActives(carnet.champs).flatMap((champ) => {
      const bilan = bilanChamp(carnet.mesures, champ.cle)
      if (!bilan.premiere || !bilan.derniere) return []
      return [{ champ, premiere: bilan.premiere, derniere: bilan.derniere, evolution: bilan.evolution }]
    }),
  )

  /* ---------------- résumé du mois (G6, C22) ---------------- */

  const cleMoisActuel = $derived(moisDe(versISO(new Date())))
  const libelleMoisActuel = $derived(formaterMoisLong(cleMoisActuel))

  const mesuresDuMois = $derived(carnet.mesures.filter((m) => moisDe(m.date) === cleMoisActuel))
  const champsRenseignesDuMois = $derived.by(() => {
    const cles = new Set<string>()
    for (const m of mesuresDuMois) for (const cle of Object.keys(m.valeurs)) cles.add(cle)
    return carnet.champs.filter((c) => cles.has(c.cle))
  })

  const evenementsDuMois = $derived(
    evenementsSurPeriode(carnet.evenements, debutDeMois(cleMoisActuel), finDeMois(cleMoisActuel)),
  )

  const evolutionDuMois = $derived.by(() => {
    const variations = variationsMensuelles(serie(carnet.mesures, CLE_POIDS))
    return variations.find((v) => v.mois === cleMoisActuel)?.delta
  })

  const question = $derived(questionDuMois(cleMoisActuel))
  let reponseTexte = $state('')
  let cleMoisChargee = $state('')

  $effect(() => {
    if (cleMoisChargee === cleMoisActuel) return
    reponseTexte = carnet.reflexionDuMois(cleMoisActuel)?.reponse ?? ''
    cleMoisChargee = cleMoisActuel
  })

  async function enregistrerReponse() {
    const texte = reponseTexte.trim()
    const existante = carnet.reflexionDuMois(cleMoisActuel)
    // Traverser le champ sans rien y écrire ne doit rien enregistrer : sans ces
    // deux gardes, chaque passage créait une réflexion vide en base.
    if (texte === (existante?.reponse ?? '')) return
    if (texte === '' && !existante) return
    await carnet.enregistrerReflexion(cleMoisActuel, question, texte)
  }

  /* ---------------- repères d'activité (§ 8.3) ---------------- */

  const repereActivite = $derived(carnet.repereActivite)
  const activiteSuivie = $derived(carnet.champs.some((c) => c.cle === CLE_ACTIVITE_DUREE && c.actif))
  const renforcementSuivi = $derived(carnet.champs.some((c) => c.cle === CLE_RENFORCEMENT && c.actif))

  /* ---------------- jalons (F11) ---------------- */

  const jalons = $derived(carnet.jalons)
</script>

<div class="pile gap-l">
  <div class="entete-bilan">
    <h1>Bilan</h1>
    {#if carnet.nombreMesures > 0}
      <a class="bouton" href="#/fiche-medecin">Fiche pour le médecin</a>
    {/if}
  </div>

  {#if carnet.nombreMesures === 0}
    <p class="vide">Le bilan se construira au fil de vos mesures.</p>
  {:else}
    <!-- Poids -->
    <section class="carte">
      <h2>Poids</h2>
      <dl class="grille-bilan">
        {#if bilanPoids.premiere}
          <div><dt>Départ</dt><dd class="nombre">{formaterNombre(masseVersAffichage(bilanPoids.premiere.valeur, unite))} {unite}</dd></div>
        {/if}
        {#if bilanPoids.derniere}
          <div><dt>Actuel</dt><dd class="nombre">{formaterNombre(masseVersAffichage(bilanPoids.derniere.valeur, unite))} {unite}</dd></div>
        {/if}
        {#if bilanPoids.minimum}
          <div><dt>Minimum atteint</dt><dd class="nombre">{formaterNombre(masseVersAffichage(bilanPoids.minimum.valeur, unite))} {unite}</dd></div>
        {/if}
        {#if bilanPoids.evolution !== null}
          <div><dt>Évolution totale</dt><dd class="nombre">{formaterEvolution(masseVersAffichage(bilanPoids.evolution, unite), 1, unite)}</dd></div>
        {/if}
        {#if objectif?.valeurMin !== undefined}
          <div>
            <dt>Objectif</dt>
            <dd class="nombre">
              {formaterNombre(masseVersAffichage(objectif.valeurMin, unite))}{#if objectif.valeurMax !== undefined && objectif.valeurMax !== objectif.valeurMin}–{formaterNombre(masseVersAffichage(objectif.valeurMax, unite))}{/if} {unite}
            </dd>
          </div>
        {/if}
        {#if carnet.progression?.restant != null}
          <div><dt>Distance restante</dt><dd class="nombre">{formaterNombre(masseVersAffichage(carnet.progression.restant, unite))} {unite}</dd></div>
        {/if}
      </dl>
    </section>

    <!-- Mensurations -->
    {#if bilansMensurations.length > 0}
      <section class="carte">
        <h2>Mensurations</h2>
        <div class="liste-mensurations">
          {#each bilansMensurations as { champ, premiere, derniere, evolution } (champ.cle)}
            <div class="mensuration">
              <p class="mensuration-titre">{champ.libelle}</p>
              <dl class="grille-bilan grille-bilan--compacte">
                <div><dt>Départ</dt><dd class="nombre">{formaterNombre(premiere.valeur)} {champ.unite ?? ''}</dd></div>
                <div><dt>Actuel</dt><dd class="nombre">{formaterNombre(derniere.valeur)} {champ.unite ?? ''}</dd></div>
                {#if evolution !== null}
                  <div><dt>Évolution</dt><dd class="nombre">{formaterEvolution(evolution, 1, champ.unite ?? '')}</dd></div>
                {/if}
              </dl>
            </div>
          {/each}
        </div>
      </section>
    {/if}

    <!-- Résumé du mois (G6) -->
    <section class="carte">
      <h2>Résumé de {libelleMoisActuel}</h2>

      {#if mesuresDuMois.length === 0}
        <p class="aide">Aucune mesure ce mois-ci pour l'instant.</p>
      {:else}
        <dl class="grille-bilan">
          {#if evolutionDuMois !== undefined}
            <div><dt>Évolution du poids</dt><dd class="nombre">{formaterEvolution(masseVersAffichage(evolutionDuMois, unite), 1, unite)}</dd></div>
          {/if}
          <div><dt>Mesures enregistrées</dt><dd class="nombre">{mesuresDuMois.length}</dd></div>
        </dl>
        {#if champsRenseignesDuMois.length > 0}
          <p class="detail">
            Champs renseignés : {champsRenseignesDuMois.map((c) => c.libelle).join(', ')}.
          </p>
        {/if}
      {/if}

      {#if evenementsDuMois.length > 0}
        <p class="detail">
          Événements de la période : {evenementsDuMois.map((e) => e.libelle).join(', ')}.
        </p>
      {/if}

      <div class="question-mois">
        <label for="reponse-mois">{question}</label>
        <textarea id="reponse-mois" rows="2" bind:value={reponseTexte} onblur={enregistrerReponse}
          placeholder="Facultatif — deux lignes suffisent."></textarea>
      </div>
    </section>

    <!-- Repères d'activité -->
    {#if activiteSuivie || renforcementSuivi}
      <section class="carte">
        <h2>Repères d'activité</h2>
        <p class="aide">
          Estimé à partir de la durée d'activité que vous renseignez, en supposant qu'elle
          représente une semaine type — le carnet ne tient pas de journal quotidien.
        </p>

        {#if activiteSuivie}
          {#if repereActivite.minutesHebdo !== undefined}
            <div class="jauge-activite">
              <div class="piste-activite">
                <div class="remplissage-activite" style="width: {repereActivite.pourcentCible}%"></div>
              </div>
              <p class="detail">
                {formaterNombre(repereActivite.minutesHebdo, 0)} min / semaine environ,
                pour un repère OMS de {CIBLE_MINUTES_HEBDO_OMS} minutes.
              </p>
            </div>
          {:else}
            <p class="aide">Renseignez une durée d'activité pour voir ce repère.</p>
          {/if}
        {/if}

        {#if renforcementSuivi && repereActivite.renforcementRegulier !== undefined}
          <p class="detail">
            Renforcement musculaire régulier :
            {repereActivite.renforcementRegulier ? 'oui, d\'après votre dernière saisie.' : 'pas encore, d\'après votre dernière saisie.'}
          </p>
        {/if}
      </section>
    {/if}

    <!-- Jalons de régularité (F11) -->
    <section class="carte">
      <h2>Jalons</h2>
      <p class="aide">Ils marquent votre régularité, pas un résultat sur la balance.</p>

      {#if carnet.estAnniversaireCarnet}
        <p class="anniversaire">
          {carnet.anneesDeCarnet} an{carnet.anneesDeCarnet > 1 ? 's' : ''} de carnet aujourd'hui.
        </p>
      {/if}

      <ul class="jalons">
        {#each jalons as j (j.cle)}
          <li class:jalon--atteint={j.atteint}>
            <span class="jalon-puce" aria-hidden="true">{j.atteint ? '●' : '○'}</span>
            <span>{j.libelle}</span>
          </li>
        {/each}
      </ul>
    </section>
  {/if}
</div>

<style>
  .entete-bilan { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }
  .entete-bilan h1 { margin-right: auto; }

  .vide { color: var(--encre-2); }
  section h2 { margin-bottom: 0.5rem; }

  .grille-bilan {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
    gap: 0.8rem;
    margin: 0.6rem 0 0;
  }
  .grille-bilan dt { font-size: 0.82rem; color: var(--encre-2); }
  .grille-bilan dd { margin: 0.1rem 0 0; font-size: 1.05rem; font-weight: 600; }
  .grille-bilan--compacte { grid-template-columns: repeat(auto-fit, minmax(6rem, 1fr)); gap: 0.5rem; }
  .grille-bilan--compacte dd { font-size: 0.95rem; }

  .liste-mensurations { display: flex; flex-direction: column; gap: 0.9rem; }
  .mensuration { padding-top: 0.7rem; border-top: 1px solid var(--trait); }
  .mensuration:first-child { padding-top: 0; border-top: 0; }
  .mensuration-titre { font-weight: 600; margin-bottom: 0.2rem; }

  .aide { color: var(--encre-2); font-size: 0.9rem; margin-top: 0.4rem; }
  .detail { color: var(--encre-2); font-size: 0.9rem; margin-top: 0.6rem; }

  .question-mois {
    margin-top: 0.9rem;
    padding-top: 0.9rem;
    border-top: 1px solid var(--trait);
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }
  .question-mois label { font-weight: 600; }
  .question-mois textarea {
    font-family: inherit;
    padding: 0.55em 0.7em;
    border: 1px solid var(--trait);
    border-radius: var(--rayon-s);
    background: var(--carte);
    color: var(--encre);
    resize: vertical;
  }

  .jauge-activite { margin-top: 0.5rem; }
  .piste-activite { height: 0.75rem; background: var(--sauge-voile); border: 1px solid var(--sauge-trait); border-radius: 999px; overflow: hidden; }
  .remplissage-activite { height: 100%; background: var(--sauge-texte); border-radius: 999px; transition: width 0.3s ease; }

  .anniversaire {
    background: var(--sauge-voile);
    border: 1px solid var(--sauge-trait);
    border-radius: var(--rayon-s);
    padding: 0.6rem 0.8rem;
    font-weight: 600;
    margin-bottom: 0.6rem;
  }

  .jalons { list-style: none; margin: 0.5rem 0 0; padding: 0; display: flex; flex-direction: column; gap: 0.35rem; }
  .jalons li { display: flex; align-items: center; gap: 0.6rem; font-size: 0.92rem; color: var(--encre-3); }
  .jalons li.jalon--atteint { color: var(--encre); }
  .jalon-puce { color: var(--sauge-texte); width: 1em; text-align: center; }
</style>
