<script lang="ts">
  /**
   * Historique (§ 5.3).
   *
   * Une ligne par mesure, du plus récent au plus ancien, n'affichant que les
   * valeurs réellement renseignées. Aucune limite de durée : le carnet couvre
   * autant d'années qu'il le faut (§ 13 v1.0).
   *
   * Les événements de contexte (C14) figurent dans une section compacte au-dessus :
   * ce sont des repères sur la période, pas des mesures, ils ne se mélangent pas
   * à la liste.
   */
  import Modale from '../composants/Modale.svelte'
  import EvenementModale from './EvenementModale.svelte'
  import { carnet } from '$lib/etat/carnet.svelte'
  import { formaterDate } from '$lib/domain/dates'
  import { champsActifs, CLE_POIDS } from '$lib/domain/champs'
  import { comparerMesures } from '$lib/domain/tendance'
  import { libelleType } from '$lib/domain/evenements'
  import { formaterValeurChamp, libelleContextePesee } from '$lib/domain/valeurs'
  import { lireNombre } from '$lib/domain/types'
  import type { DefinitionChamp, Mesure } from '$lib/domain/types'

  interface Props { onmodifier: (id: string) => void }
  let { onmodifier }: Props = $props()

  let aSupprimer = $state<Mesure | null>(null)
  let evenementModaleOuverte = $state(false)
  let evenementEnEdition = $state<string | null>(null)

  const profil = $derived(carnet.profil)
  const formatDate = $derived(profil?.formatDate ?? 'jj/mm/aaaa')
  const unite = $derived(profil?.uniteMasse ?? 'kg')
  const sansChiffre = $derived(profil?.modeSansChiffre ?? false)

  const recentes = $derived([...carnet.mesures].sort((a, b) => comparerMesures(b, a)))
  const evenementsRecents = $derived([...carnet.evenements].sort((a, b) => b.dateDebut.localeCompare(a.dateDebut)))
  const champs = $derived(champsActifs(carnet.champs))

  interface ValeurAffichee { champ: DefinitionChamp; texte: string }

  /**
   * Poids de la mesure qui précède chronologiquement, par identifiant de mesure.
   * Sert au mode sans chiffre : sans valeur à montrer, on montre un sens.
   */
  const poidsPrecedents = $derived.by(() => {
    const table = new Map<string, number>()
    let precedent: number | undefined
    // `carnet.mesures` est trié du plus ancien au plus récent.
    for (const m of carnet.mesures) {
      const v = lireNombre(m, CLE_POIDS)
      if (v === undefined) continue
      if (precedent !== undefined) table.set(m.id, precedent)
      precedent = v
    }
    return table
  })

  function valeursDe(mesure: Mesure): ValeurAffichee[] {
    const sortie: ValeurAffichee[] = []
    for (const champ of champs) {
      const texte = formaterValeurChamp(champ, mesure, {
        uniteMasse: unite,
        sansChiffre,
        poidsPrecedent: poidsPrecedents.get(mesure.id),
      })
      if (texte !== undefined) sortie.push({ champ, texte })
    }
    return sortie
  }

  async function confirmerSuppression() {
    const m = aSupprimer
    if (!m) return
    aSupprimer = null
    await carnet.supprimerMesure(m.id)
  }

  function ouvrirNouvelEvenement() {
    evenementEnEdition = null
    evenementModaleOuverte = true
  }
  function ouvrirEvenement(id: string) {
    evenementEnEdition = id
    evenementModaleOuverte = true
  }
</script>

<div class="pile gap-l">
  <h1>Historique</h1>

  {#if carnet.suppressionAnnulable}
    <!-- K8 : l'annulation rassure plus qu'une confirmation supplémentaire. -->
    <div class="annulation" role="status">
      <span>Mesure supprimée.</span>
      <button type="button" class="bouton" onclick={() => carnet.annulerSuppression()}>
        Annuler la suppression
      </button>
    </div>
  {/if}

  <section class="pile gap-s">
    <div class="entete-section">
      <h2>Événements</h2>
      <button type="button" class="bouton" onclick={ouvrirNouvelEvenement}>+ Événement</button>
    </div>

    {#if evenementsRecents.length === 0}
      <p class="vide">
        Aucun événement noté. Un événement marque une période — vacances, retraite,
        changement d'habitude — pour donner du contexte à votre historique.
      </p>
    {:else}
      <ul class="puces">
        {#each evenementsRecents as e (e.id)}
          <li>
            <button type="button" class="puce" onclick={() => ouvrirEvenement(e.id)}>
              <span class="puce-date">
                {formaterDate(e.dateDebut, formatDate)}{e.dateFin ? ` – ${formaterDate(e.dateFin, formatDate)}` : ''}
              </span>
              <span class="puce-libelle">{e.libelle}</span>
              <span class="puce-type">{libelleType(e.type)}</span>
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  <section class="pile gap-s">
    <h2>Mesures</h2>

    {#if recentes.length === 0}
      <p class="vide">Aucune mesure enregistrée pour l'instant.</p>
    {:else}
      <p class="compte">{recentes.length} mesure{recentes.length > 1 ? 's' : ''} enregistrée{recentes.length > 1 ? 's' : ''}.</p>

      <ul class="liste">
        {#each recentes as mesure (mesure.id)}
          <li class="ligne">
            <div class="infos">
              <p class="date">
                {formaterDate(mesure.date, formatDate)}
                {#if mesure.moment}<span class="moment">à {mesure.moment}</span>{/if}
                {#if mesure.contextePesee}
                  <span class="moment">— {libelleContextePesee(mesure.contextePesee)}</span>
                {/if}
              </p>
              <ul class="valeurs">
                {#each valeursDe(mesure) as v (v.champ.cle)}
                  <li>
                    <span class="libelle">{v.champ.libelle}</span>
                    <span class="nombre">{v.texte}</span>
                  </li>
                {/each}
              </ul>
              {#if mesure.etiquettes?.length}
                <ul class="etiquettes">
                  {#each mesure.etiquettes as etq (etq)}
                    <li class="etiquette">{etq}</li>
                  {/each}
                </ul>
              {/if}
              {#if mesure.notes}
                <p class="note">{mesure.notes}</p>
              {/if}
            </div>

            <div class="actions">
              <button type="button" class="bouton" onclick={() => onmodifier(mesure.id)}>
                Modifier<span class="pour-lecteur"> la mesure du {formaterDate(mesure.date, formatDate)}</span>
              </button>
              <button type="button" class="bouton" onclick={() => (aSupprimer = mesure)}>
                Supprimer<span class="pour-lecteur"> la mesure du {formaterDate(mesure.date, formatDate)}</span>
              </button>
            </div>
          </li>
        {/each}
      </ul>
    {/if}
  </section>
</div>

{#if aSupprimer}
  <!-- Règle 9 v1.0 : la suppression demande confirmation. -->
  <Modale ouverte={true} titre="Supprimer cette mesure ?" onfermer={() => (aSupprimer = null)}>
    <p>
      Mesure du {formaterDate(aSupprimer.date, formatDate)}{aSupprimer.moment ? ` à ${aSupprimer.moment}` : ''}.
      Vous pourrez annuler juste après.
    </p>

    {#snippet pied()}
      <button type="button" class="bouton" onclick={() => (aSupprimer = null)}>Garder</button>
      <button type="button" class="bouton bouton--principal" onclick={confirmerSuppression}>
        Supprimer
      </button>
    {/snippet}
  </Modale>
{/if}

<EvenementModale
  ouvert={evenementModaleOuverte}
  evenementId={evenementEnEdition}
  onfermer={() => (evenementModaleOuverte = false)}
/>

<style>
  .entete-section { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }
  .entete-section h2 { margin-right: auto; }
  .entete-section .bouton { min-height: 2.6rem; padding: 0.35em 0.9em; font-size: 0.92rem; }

  .compte { color: var(--encre-2); font-size: 0.9rem; }
  .vide { color: var(--encre-2); }

  .puces { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.35rem; }
  .puce {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    flex-wrap: wrap;
    width: 100%;
    text-align: left;
    min-height: 2.6rem;
    padding: 0.5rem 0.8rem;
    border: 1px solid var(--trait);
    border-radius: var(--rayon-s);
    background: var(--carte);
    cursor: pointer;
    font: inherit;
    color: var(--encre);
  }
  .puce:hover { border-color: var(--sauge); }
  .puce-date { font-size: 0.85rem; color: var(--encre-2); font-variant-numeric: tabular-nums; flex: 0 0 auto; }
  .puce-libelle { font-weight: 600; margin-right: auto; }
  .puce-type {
    font-size: 0.78rem; color: var(--encre-3);
    border: 1px solid var(--trait); border-radius: 999px; padding: 0.1em 0.6em;
  }

  .liste { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.6rem; }

  .ligne {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    align-items: flex-start;
    background: var(--carte);
    border: 1px solid var(--trait);
    border-radius: var(--rayon);
    padding: 0.85rem 1rem;
  }
  .infos { flex: 1 1 16rem; }
  .date { font-weight: 600; }
  /* A29 : distingue deux pesées d'une même journée sans alourdir les autres lignes. */
  .moment { font-weight: 400; color: var(--encre-2); font-size: 0.88rem; margin-left: 0.35em; }

  .valeurs {
    list-style: none;
    margin: 0.35rem 0 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem 1.1rem;
    font-size: 0.92rem;
  }
  .valeurs li { display: flex; gap: 0.4em; }
  .libelle { color: var(--encre-2); }

  .etiquettes {
    list-style: none;
    margin: 0.45rem 0 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }
  .etiquette {
    font-size: 0.78rem;
    color: var(--bleu-texte);
    background: var(--bleu-voile);
    border: 1px solid var(--bleu-trait);
    border-radius: 999px;
    padding: 0.1em 0.6em;
  }

  .note {
    margin-top: 0.45rem;
    font-size: 0.9rem;
    color: var(--encre-2);
    border-left: 3px solid var(--sauge-trait);
    padding-left: 0.6rem;
  }

  .actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
  .actions .bouton { min-height: 2.6rem; padding: 0.35em 0.85em; font-size: 0.92rem; }

  .annulation {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
    background: var(--bleu-voile);
    border: 1px solid var(--bleu-trait);
    border-radius: var(--rayon);
    padding: 0.7rem 0.9rem;
  }
  .annulation .bouton { min-height: 2.6rem; padding: 0.35em 0.85em; }

</style>
