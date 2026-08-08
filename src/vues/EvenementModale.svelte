<script lang="ts">
  /**
   * Création ou modification d'un événement de contexte (C14, § 4).
   *
   * Sans date de fin, l'événement ne couvre que son jour de départ (voir le
   * commentaire de `evenementCouvre`) — pour un événement réellement continu
   * (une retraite, un arrêt de sport), on renseigne une date de fin lointaine.
   */
  import Modale from '../composants/Modale.svelte'
  import { carnet } from '$lib/etat/carnet.svelte'
  import { versISO } from '$lib/domain/dates'
  import { libelleType } from '$lib/domain/evenements'
  import type { Evenement } from '$lib/domain/types'

  interface Props { ouvert: boolean; evenementId?: string | null; onfermer: () => void }
  let { ouvert, evenementId = null, onfermer }: Props = $props()

  let libelle = $state('')
  let dateDebut = $state(versISO(new Date()))
  let dateFin = $state('')
  let type = $state<Evenement['type']>('personnel')

  const modification = $derived(evenementId !== null)

  $effect(() => {
    if (!ouvert) return
    const existant = evenementId ? carnet.evenements.find((e) => e.id === evenementId) : undefined
    if (existant) {
      libelle = existant.libelle
      dateDebut = existant.dateDebut
      dateFin = existant.dateFin ?? ''
      type = existant.type
    } else {
      libelle = ''
      dateDebut = versISO(new Date())
      dateFin = ''
      type = 'personnel'
    }
  })

  const TYPES: Evenement['type'][] = ['personnel', 'sante', 'activite', 'autre']
  const peutEnregistrer = $derived(libelle.trim().length > 0 && dateDebut.length > 0)

  async function enregistrer() {
    if (!peutEnregistrer) return
    const donnees = {
      libelle: libelle.trim(),
      dateDebut,
      dateFin: dateFin || undefined,
      type,
    }
    if (evenementId) await carnet.modifierEvenement(evenementId, donnees)
    else await carnet.ajouterEvenement(donnees)
    onfermer()
  }

  async function supprimer() {
    if (!evenementId) return
    await carnet.supprimerEvenement(evenementId)
    onfermer()
  }
</script>

<Modale ouverte={ouvert} titre={modification ? 'Modifier l\'événement' : 'Nouvel événement'} {onfermer}>
  <div class="pile gap-m">
    <div class="champ">
      <label for="ev-libelle">Ce qui se passe</label>
      <input id="ev-libelle" type="text" bind:value={libelle} maxlength="60"
        placeholder="Vacances, retraite, arrêt du sport…" />
    </div>

    <div class="deux">
      <div class="champ">
        <label for="ev-debut">Début</label>
        <input id="ev-debut" type="date" bind:value={dateDebut} required />
      </div>
      <div class="champ">
        <label for="ev-fin">Fin <span class="facultatif">facultatif</span></label>
        <input id="ev-fin" type="date" bind:value={dateFin} />
      </div>
    </div>

    <div class="champ">
      <label for="ev-type">Type</label>
      <select id="ev-type" bind:value={type}>
        {#each TYPES as t (t)}
          <option value={t}>{libelleType(t)}</option>
        {/each}
      </select>
    </div>

    <p class="aide">
      Les événements servent à donner du contexte à votre historique — ils apparaîtront
      sur les graphiques dans une prochaine version.
    </p>
  </div>

  {#snippet pied()}
    {#if modification}
      <button type="button" class="bouton" onclick={supprimer}>Supprimer</button>
    {/if}
    <button type="button" class="bouton" onclick={onfermer}>Annuler</button>
    <button type="button" class="bouton bouton--principal" disabled={!peutEnregistrer} onclick={enregistrer}>
      Enregistrer
    </button>
  {/snippet}
</Modale>

<style>
  .facultatif {
    font-size: 0.78rem; color: var(--encre-3);
    border: 1px solid var(--trait); border-radius: 999px; padding: 0.05em 0.55em;
  }
  .deux { display: grid; grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr)); gap: 0.9rem; }
</style>
