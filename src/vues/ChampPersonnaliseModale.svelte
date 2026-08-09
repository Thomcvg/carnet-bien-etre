<script lang="ts">
  /**
   * Création d'un champ personnalisé (C18).
   *
   * C'est la fonctionnalité qui absorbe le besoin de vingt demandes futures :
   * un utilisateur crée son propre suivi (« raideur matinale », « moral »…) et
   * il se comporte ensuite exactement comme un champ livré (§ 3.3).
   */
  import Modale from '../composants/Modale.svelte'
  import { carnet } from '$lib/etat/carnet.svelte'
  import { genererCle, cleUnique } from '$lib/domain/champs'
  import type { CategorieChamp, TypeChamp } from '$lib/domain/types'

  interface Props { ouvert: boolean; onfermer: () => void }
  let { ouvert, onfermer }: Props = $props()

  let libelle = $state('')
  let categorie = $state<CategorieChamp>('bienetre')
  let type = $state<TypeChamp>('echelle5')
  let unite = $state('')
  let optionsTexte = $state('')
  let poleBas = $state('')
  let poleHaut = $state('')

  $effect(() => {
    if (!ouvert) return
    libelle = ''
    categorie = 'bienetre'
    type = 'echelle5'
    unite = ''
    optionsTexte = ''
    poleBas = ''
    poleHaut = ''
  })

  const CATEGORIES: { valeur: CategorieChamp; libelle: string }[] = [
    { valeur: 'corps', libelle: 'Corps' },
    { valeur: 'sante', libelle: 'Santé' },
    { valeur: 'bienetre', libelle: 'Bien-être' },
    { valeur: 'activite', libelle: 'Activité' },
  ]

  const TYPES: { valeur: TypeChamp; libelle: string; detail: string }[] = [
    { valeur: 'echelle5', libelle: 'Échelle de 1 à 5', detail: 'Pour noter un ressenti — le plus courant.' },
    { valeur: 'nombre', libelle: 'Nombre', detail: 'Avec une unité facultative (min, verres, etc.).' },
    { valeur: 'duree', libelle: 'Durée', detail: 'Un nombre de minutes ou d\'heures, traçable sur un graphique.' },
    { valeur: 'booleen', libelle: 'Oui / Non', detail: 'Pour une chose faite ou non faite.' },
    { valeur: 'choix', libelle: 'Choix dans une liste', detail: 'Vous définissez les options proposées.' },
    { valeur: 'texte', libelle: 'Texte libre', detail: 'Pour une note courte propre à ce suivi.' },
  ]

  const cleApercue = $derived(
    libelle.trim() ? cleUnique(genererCle(libelle), carnet.champs) : '',
  )

  const options = $derived(
    optionsTexte.split(',').map((o) => o.trim()).filter((o) => o.length > 0),
  )

  const peutCreer = $derived(
    libelle.trim().length > 0 && (type !== 'choix' || options.length >= 2),
  )

  async function creer() {
    if (!peutCreer) return
    await carnet.ajouterChampPersonnalise({
      libelle: libelle.trim(),
      categorie,
      type,
      unite: unite.trim() || undefined,
      options: type === 'choix' ? options : undefined,
      // Une échelle sans ses pôles ne veut rien dire : les champs préréglés
      // portent tous les leurs, celui-ci ne fait pas exception.
      echelle: type === 'echelle5' && poleBas.trim() && poleHaut.trim()
        ? { bas: poleBas.trim(), haut: poleHaut.trim() }
        : undefined,
    })
    onfermer()
  }
</script>

<Modale ouverte={ouvert} titre="Nouveau champ personnalisé" {onfermer}>
  <div class="pile gap-m">
    <div class="champ">
      <label for="cp-libelle">Nom du suivi</label>
      <input id="cp-libelle" type="text" bind:value={libelle} maxlength="40" placeholder="Raideur matinale" />
      {#if cleApercue}
        <p class="aide">Identifiant interne : <code>{cleApercue}</code></p>
      {/if}
    </div>

    <div class="champ">
      <label for="cp-categorie">Catégorie</label>
      <select id="cp-categorie" bind:value={categorie}>
        {#each CATEGORIES as c (c.valeur)}
          <option value={c.valeur}>{c.libelle}</option>
        {/each}
      </select>
      <p class="aide">Détermine dans quelle section repliable ce champ apparaîtra à la saisie.</p>
    </div>

    <fieldset class="types">
      <legend>Type de donnée</legend>
      {#each TYPES as t (t.valeur)}
        <label class="option" class:option--actif={type === t.valeur}>
          <input type="radio" bind:group={type} value={t.valeur} />
          <span class="titre">{t.libelle}</span>
          <span class="explication">{t.detail}</span>
        </label>
      {/each}
    </fieldset>

    {#if type === 'echelle5'}
      <div class="poles">
        <div class="champ">
          <label for="cp-pole-bas">Que veut dire 1 ? <span class="facultatif">facultatif</span></label>
          <input id="cp-pole-bas" type="text" bind:value={poleBas} maxlength="30" placeholder="aucune" />
        </div>
        <div class="champ">
          <label for="cp-pole-haut">Que veut dire 5 ?</label>
          <input id="cp-pole-haut" type="text" bind:value={poleHaut} maxlength="30" placeholder="très forte" />
        </div>
      </div>
      <p class="aide">
        Ces deux repères s'affichent sous l'échelle au moment de la saisie. Sans eux,
        « 3 » ne voudra plus dire grand-chose dans quelques mois.
      </p>
    {/if}

    {#if type === 'nombre' || type === 'duree'}
      <div class="champ">
        <label for="cp-unite">Unité <span class="facultatif">facultatif</span></label>
        <input id="cp-unite" type="text" bind:value={unite} maxlength="10" placeholder="min, verres…" />
      </div>
    {/if}

    {#if type === 'choix'}
      <div class="champ">
        <label for="cp-options">Options proposées</label>
        <input id="cp-options" type="text" bind:value={optionsTexte} placeholder="Option A, Option B, Option C" />
        <p class="aide">Séparez chaque option par une virgule. Au moins deux options.</p>
      </div>
    {/if}
  </div>

  {#snippet pied()}
    <button type="button" class="bouton" onclick={onfermer}>Annuler</button>
    <button type="button" class="bouton bouton--principal" disabled={!peutCreer} onclick={creer}>
      Créer ce champ
    </button>
  {/snippet}
</Modale>

<style>
  .facultatif {
    font-size: 0.78rem; color: var(--encre-3);
    border: 1px solid var(--trait); border-radius: 999px; padding: 0.05em 0.55em;
  }

  .poles { display: grid; grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr)); gap: 0.9rem; }

  .types { border: 0; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.4rem; }
  .types legend { font-size: 0.9rem; color: var(--encre-2); padding: 0 0 0.3rem; }

  .option {
    display: grid;
    grid-template-columns: auto 1fr;
    grid-template-areas: 'radio titre' 'radio explication';
    gap: 0 0.7rem;
    align-items: center;
    min-height: var(--cible-tactile);
    padding: 0.55rem 0.8rem;
    border: 1px solid var(--trait);
    border-radius: var(--rayon-s);
    background: var(--carte);
    cursor: pointer;
  }
  .option--actif { border-color: var(--accent-trait); background: var(--accent-voile); }
  .option:has(input:focus-visible) { outline: 3px solid var(--second); outline-offset: 2px; }
  .option input { grid-area: radio; width: 1.15rem; height: 1.15rem; }
  .titre { grid-area: titre; font-weight: 600; }
  .explication { grid-area: explication; font-size: 0.85rem; color: var(--encre-2); }

  code {
    font-family: var(--mono);
    font-size: 0.85em;
    background: var(--papier);
    padding: 0.05em 0.4em;
    border-radius: 4px;
  }
</style>
