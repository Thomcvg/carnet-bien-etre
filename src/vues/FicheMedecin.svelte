<script lang="ts">
  /**
   * Fiche pour le médecin (B1, § 10.4).
   *
   * Une page pensée pour l'impression : identité, courbe de poids, chiffres
   * clés, constantes suivies, traitements en cours, événements notables.
   * Générée par l'impression du navigateur (§ 11.3) — aucune dépendance PDF.
   */
  import Courbe from '../composants/Courbe.svelte'
  import { carnet } from '$lib/etat/carnet.svelte'
  import { formaterDate } from '$lib/domain/dates'
  import { formaterEvolution, formaterNombre, masseVersAffichage } from '$lib/domain/unites'
  import { formaterImc } from '$lib/domain/imc'
  import { formaterDosage } from '$lib/domain/traitements'
  import { CLE_TENSION } from '$lib/domain/champs'
  import { moyenneMobile } from '$lib/domain/tendance'
  import { lireTension } from '$lib/domain/types'

  interface Props { onretour: () => void }
  let { onretour }: Props = $props()

  const profil = $derived(carnet.profil)
  const unite = $derived(profil?.uniteMasse ?? 'kg')
  const formatDate = $derived(profil?.formatDate ?? 'jj/mm/aaaa')

  const tendance = $derived(moyenneMobile(carnet.poids))
  const derniereTension = $derived.by(() => {
    for (let i = carnet.mesures.length - 1; i >= 0; i--) {
      const m = carnet.mesures[i]
      if (!m) continue
      const t = lireTension(m, CLE_TENSION)
      if (t) return { date: m.date, valeur: t }
    }
    return undefined
  })

  const evenementsRecents = $derived([...carnet.evenements].sort((a, b) => b.dateDebut.localeCompare(a.dateDebut)).slice(0, 8))

  const dateGeneration = $derived(formaterDate(new Date().toISOString().slice(0, 10), formatDate))
</script>

<div class="fiche">
  <div class="barre-actions sans-impression">
    <button type="button" class="bouton" onclick={onretour}>← Retour</button>
    <button type="button" class="bouton bouton--principal" onclick={() => window.print()}>Imprimer</button>
  </div>

  <header class="entete-fiche">
    <h1>Fiche pour le médecin</h1>
    <p class="genere">Générée le {dateGeneration} — {profil?.nomCarnet ?? 'Carnet Bien-être'}</p>
  </header>

  <section class="bloc">
    <h2>Identité</h2>
    <dl class="grille">
      {#if profil?.dateNaissance}<div><dt>Année de naissance</dt><dd>{profil.dateNaissance.slice(0, 4)}</dd></div>{/if}
      {#if carnet.taille !== undefined}<div><dt>Taille</dt><dd>{formaterNombre(carnet.taille, 0)} cm</dd></div>{/if}
    </dl>
  </section>

  <section class="bloc">
    <h2>Poids</h2>
    <dl class="grille">
      {#if carnet.poidsActuel !== undefined}<div><dt>Actuel</dt><dd>{formaterNombre(masseVersAffichage(carnet.poidsActuel, unite))} {unite}</dd></div>{/if}
      <!-- `formaterEvolution` porte le signe : sur une fiche remise au médecin,
           « 3,5 kg » sans « + » ne dit pas s'il s'agit d'une prise ou d'une perte. -->
      {#if carnet.bilanPoids.evolution !== null}<div><dt>Évolution depuis le début</dt><dd>{formaterEvolution(masseVersAffichage(carnet.bilanPoids.evolution, unite), 1, unite)}</dd></div>{/if}
      {#if carnet.imc !== undefined}<div><dt>IMC</dt><dd>{formaterImc(carnet.imc)}</dd></div>{/if}
      {#if carnet.dateDerniereMesure}<div><dt>Dernière mesure</dt><dd>{formaterDate(carnet.dateDerniereMesure, formatDate)}</dd></div>{/if}
    </dl>

    {#if carnet.poids.length > 1}
      <div class="graphique-impression">
        <Courbe points={carnet.poids} {tendance} unite={unite} libelle="Poids" {formatDate} />
      </div>
    {/if}
  </section>

  {#if derniereTension}
    <section class="bloc">
      <h2>Constantes</h2>
      <dl class="grille">
        <div>
          <dt>Tension artérielle ({formaterDate(derniereTension.date, formatDate)})</dt>
          <dd>
            {derniereTension.valeur.sys}/{derniereTension.valeur.dia} mmHg
            {#if derniereTension.valeur.pouls !== undefined}, {derniereTension.valeur.pouls} bpm{/if}
          </dd>
        </div>
      </dl>
    </section>
  {/if}

  {#if carnet.traitementsEnCours.length > 0}
    <section class="bloc">
      <h2>Traitements en cours</h2>
      <ul class="liste">
        {#each carnet.traitementsEnCours as t (t.id)}
          <li>{formaterDosage(t)} — depuis le {formaterDate(t.debut, formatDate)}</li>
        {/each}
      </ul>
    </section>
  {/if}

  {#if evenementsRecents.length > 0}
    <section class="bloc">
      <h2>Événements notables</h2>
      <ul class="liste">
        {#each evenementsRecents as e (e.id)}
          <li>{formaterDate(e.dateDebut, formatDate)} — {e.libelle}</li>
        {/each}
      </ul>
    </section>
  {/if}

  <p class="mention">
    Carnet Bien-être n'est pas un dispositif médical. Cette fiche reprend les
    données saisies par la personne suivie ; elle n'établit aucun diagnostic.
  </p>
</div>

<style>
  .fiche { max-width: 42rem; margin: 0 auto; }

  .barre-actions { display: flex; justify-content: space-between; gap: 0.6rem; margin-bottom: 1.2rem; }

  .entete-fiche { margin-bottom: 1.2rem; border-bottom: 2px solid var(--sauge-texte); padding-bottom: 0.8rem; }
  .entete-fiche h1 { font-size: 1.5rem; }
  .genere { color: var(--encre-2); font-size: 0.88rem; margin-top: 0.3rem; }

  .bloc { margin-bottom: 1.3rem; break-inside: avoid; }
  .bloc h2 {
    font-size: 1rem; font-family: var(--sans); font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.04em; color: var(--sauge-texte);
    margin-bottom: 0.5rem; padding-bottom: 0.3rem; border-bottom: 1px solid var(--trait);
  }

  .grille { display: grid; grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr)); gap: 0.6rem 1.2rem; margin: 0; }
  .grille dt { font-size: 0.82rem; color: var(--encre-2); }
  .grille dd { margin: 0.1rem 0 0; font-weight: 600; }

  .graphique-impression { margin-top: 0.9rem; }

  .liste { margin: 0; padding-left: 1.2rem; }
  .liste li { margin-bottom: 0.25rem; }

  .mention { font-size: 0.82rem; color: var(--encre-3); margin-top: 1.5rem; padding-top: 0.8rem; border-top: 1px solid var(--trait); }

  @media print {
    .fiche { max-width: none; }
  }
</style>
