<script lang="ts">
  /**
   * Création d'un profil supplémentaire (O1, § 12.3).
   *
   * Volontairement plus courte que l'écran de bienvenue : la taille, la date
   * de naissance et l'unité se règlent ensuite dans les paramètres de ce
   * nouveau profil. Ce qui compte ici, c'est de le nommer et de partir sur
   * une configuration adaptée à son usage.
   */
  import Modale from '../composants/Modale.svelte'
  import { carnet } from '$lib/etat/carnet.svelte'
  import type { UsageDeclare } from '$lib/domain/types'

  interface Props { ouvert: boolean; onfermer: () => void }
  let { ouvert, onfermer }: Props = $props()

  let nom = $state('')
  let usage = $state<UsageDeclare>('indecis')
  let enCours = $state(false)

  $effect(() => {
    if (!ouvert) return
    nom = ''
    usage = 'indecis'
    enCours = false
  })

  const USAGES: { valeur: UsageDeclare; titre: string }[] = [
    { valeur: 'suivre', titre: 'Suivre mon poids' },
    { valeur: 'stabiliser', titre: 'Me stabiliser' },
    { valeur: 'reprendre', titre: 'Reprendre du poids' },
    { valeur: 'constantes', titre: 'Suivre des constantes' },
    { valeur: 'sport', titre: 'Accompagner une pratique sportive' },
    { valeur: 'indecis', titre: 'Je verrai plus tard' },
  ]

  const peutCreer = $derived(nom.trim().length > 0 && !enCours)

  async function creer() {
    if (!peutCreer) return
    enCours = true
    await carnet.creerProfil(nom.trim(), usage)
    onfermer()
  }
</script>

<Modale ouverte={ouvert} titre="Nouveau profil" {onfermer}>
  <div class="pile gap-m">
    <p class="aide">
      Un profil distinct pour une autre personne partageant cet appareil.
      Aucune donnée n'est partagée entre profils, aucune comparaison n'existe entre eux.
    </p>

    <div class="champ">
      <label for="np-nom">Nom du carnet</label>
      <input id="np-nom" type="text" bind:value={nom} maxlength="60" placeholder="Par exemple un prénom" />
    </div>

    <fieldset class="usages">
      <legend>Qu'est-ce qui vous amène ?</legend>
      {#each USAGES as u (u.valeur)}
        <label class="option" class:option--actif={usage === u.valeur}>
          <input type="radio" bind:group={usage} value={u.valeur} />
          <span>{u.titre}</span>
        </label>
      {/each}
    </fieldset>
  </div>

  {#snippet pied()}
    <button type="button" class="bouton" onclick={onfermer}>Annuler</button>
    <button type="button" class="bouton bouton--principal" disabled={!peutCreer} onclick={creer}>
      Créer ce profil
    </button>
  {/snippet}
</Modale>

<style>
  .usages { border: 0; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.4rem; }
  .usages legend { font-size: 0.9rem; color: var(--encre-2); padding: 0 0 0.3rem; }

  .option {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    min-height: var(--cible-tactile);
    padding: 0.5rem 0.8rem;
    border: 1px solid var(--trait);
    border-radius: var(--rayon-s);
    background: var(--carte);
    cursor: pointer;
  }
  .option--actif { border-color: var(--accent-trait); background: var(--accent-voile); }
  .option:has(input:focus-visible) { outline: 3px solid var(--second); outline-offset: 2px; }
  .option input { width: 1.15rem; height: 1.15rem; }
</style>
