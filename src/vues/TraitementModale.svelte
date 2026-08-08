<script lang="ts">
  /**
   * Création ou modification d'un traitement (B4, § 10.2).
   *
   * Les rappels (B6) s'appuient sur cette fiche — sans traitement enregistré,
   * aucun rappel n'est possible. La programmation d'un rappel exact reste
   * hors de portée d'une PWA (§ 15.1) : ce que l'app peut faire, c'est afficher
   * un rappel à l'ouverture les jours où une prise est prévue (K12, repli PWA).
   */
  import Modale from '../composants/Modale.svelte'
  import { carnet } from '$lib/etat/carnet.svelte'
  import { versISO } from '$lib/domain/dates'

  interface Props { ouvert: boolean; traitementId?: string | null; onfermer: () => void }
  let { ouvert, traitementId = null, onfermer }: Props = $props()

  let nom = $state('')
  let dosage = $state('')
  let debut = $state(versISO(new Date()))
  let fin = $state('')
  let rappelActif = $state(false)
  let heureRappel = $state('08:00')

  const modification = $derived(traitementId !== null)

  $effect(() => {
    if (!ouvert) return
    const existant = traitementId ? carnet.traitements.find((t) => t.id === traitementId) : undefined
    if (existant) {
      nom = existant.nom
      dosage = existant.dosage ?? ''
      debut = existant.debut
      fin = existant.fin ?? ''
      rappelActif = existant.rappelActif
      heureRappel = existant.heuresRappel[0] ?? '08:00'
    } else {
      nom = ''
      dosage = ''
      debut = versISO(new Date())
      fin = ''
      rappelActif = false
      heureRappel = '08:00'
    }
    confirmationSuppression = false
  })

  const peutEnregistrer = $derived(nom.trim().length > 0 && debut.length > 0)

  async function enregistrer() {
    if (!peutEnregistrer) return
    const donnees = {
      nom: nom.trim(),
      dosage: dosage.trim() || undefined,
      debut,
      fin: fin || undefined,
      rappelActif,
      heuresRappel: rappelActif ? [heureRappel] : [],
    }
    if (traitementId) await carnet.modifierTraitement(traitementId, donnees)
    else await carnet.ajouterTraitement(donnees)
    onfermer()
  }

  /** Règle 5 de la charte : une suppression sans annulation possible se confirme. */
  let confirmationSuppression = $state(false)

  async function supprimer() {
    if (!traitementId) return
    await carnet.supprimerTraitement(traitementId)
    confirmationSuppression = false
    onfermer()
  }
</script>

<Modale ouverte={ouvert} titre={modification ? 'Modifier le traitement' : 'Nouveau traitement'} {onfermer}>
  <div class="pile gap-m">
    <div class="champ">
      <label for="tr-nom">Nom du traitement</label>
      <input id="tr-nom" type="text" bind:value={nom} maxlength="60" />
    </div>

    <div class="champ">
      <label for="tr-dosage">Dosage <span class="facultatif">facultatif</span></label>
      <input id="tr-dosage" type="text" bind:value={dosage} maxlength="40" placeholder="Par exemple 50 mg, 1 comprimé…" />
    </div>

    <div class="deux">
      <div class="champ">
        <label for="tr-debut">Début</label>
        <input id="tr-debut" type="date" bind:value={debut} required />
      </div>
      <div class="champ">
        <label for="tr-fin">Fin <span class="facultatif">facultatif</span></label>
        <input id="tr-fin" type="date" bind:value={fin} />
      </div>
    </div>

    <label class="bascule">
      <input type="checkbox" bind:checked={rappelActif} />
      <span>
        <strong>Rappel de prise</strong>
        <span class="aide">Un rappel s'affichera à l'ouverture de l'app les jours concernés.</span>
      </span>
    </label>

    {#if rappelActif}
      <div class="champ">
        <label for="tr-heure">Heure habituelle</label>
        <input id="tr-heure" type="time" bind:value={heureRappel} />
      </div>
    {/if}
  </div>

  {#snippet pied()}
    {#if modification && !confirmationSuppression}
      <button type="button" class="bouton retirer" onclick={() => (confirmationSuppression = true)}>
        Supprimer
      </button>
    {/if}
    {#if confirmationSuppression}
      <span class="demande">Supprimer « {nom} » ?</span>
      <button type="button" class="bouton" onclick={() => (confirmationSuppression = false)}>Garder</button>
      <button type="button" class="bouton bouton--principal" onclick={supprimer}>Confirmer</button>
    {:else}
      <button type="button" class="bouton" onclick={onfermer}>Annuler</button>
      <button type="button" class="bouton bouton--principal" disabled={!peutEnregistrer} onclick={enregistrer}>
        Enregistrer
      </button>
    {/if}
  {/snippet}
</Modale>

<style>
  .facultatif {
    font-size: 0.78rem; color: var(--encre-3);
    border: 1px solid var(--trait); border-radius: 999px; padding: 0.05em 0.55em;
  }
  .deux { display: grid; grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr)); gap: 0.9rem; }
  .demande { margin-right: auto; font-size: 0.92rem; align-self: center; }
  .retirer { margin-right: auto; }

  .bascule {
    display: flex;
    align-items: flex-start;
    gap: 0.7rem;
    min-height: var(--cible-tactile);
    cursor: pointer;
  }
  .bascule input { width: 1.2rem; height: 1.2rem; margin-top: 0.25rem; flex: none; }
  .bascule > span { display: flex; flex-direction: column; }
  .bascule .aide { margin-top: 0.1rem; font-size: 0.85rem; color: var(--encre-2); }
</style>
