<script lang="ts">
  /**
   * Visite guidée (J11, § 6).
   *
   * Trois écrans, pas quatre : au-delà, personne ne lit. Ils ne décrivent pas
   * des fonctionnalités mais répondent aux trois questions qu'on se pose devant
   * un carnet vide — où vont mes données, que dois-je remplir, et où retrouver
   * ce que j'ai noté.
   *
   * Passable à chaque étape, et jamais reproposée : elle suit la première
   * configuration, et ne revient ensuite que si on la redemande depuis les
   * paramètres. Rien n'est donc stocké — sortir de la visite suffit à en sortir
   * pour de bon.
   */

  interface Props {
    onterminer: () => void
  }
  let { onterminer }: Props = $props()

  interface Etape {
    titre: string
    paragraphes: string[]
  }

  const ETAPES: Etape[] = [
    {
      titre: 'Vos données restent sur cet appareil',
      paragraphes: [
        'Il n’y a ni compte à créer, ni inscription. Ce que vous notez est enregistré ici, et n’en part pas tout seul.',
        'Rien ne sort de ce téléphone sans que vous le demandiez : exporter une sauvegarde, la déposer sur votre Nextcloud ou relever la météo se font par un geste, et se laissent de côté sans rien perdre.',
        'La contrepartie est qu’un téléphone perdu emporte le carnet avec lui. Les paramètres permettent d’exporter une sauvegarde quand vous le souhaitez — c’est le seul geste à ne pas oublier.',
      ],
    },
    {
      titre: 'Notez ce que vous voulez, quand vous voulez',
      paragraphes: [
        'Le bouton « + Nouvelle mesure » est toujours à portée. Une date et une seule valeur suffisent : rien d’autre n’est obligatoire.',
        'Sauter une semaine ou un mois ne casse rien. Le carnet reprend là où vous l’avez laissé, sans rien vous reprocher.',
        'Une valeur mal saisie se corrige, et une mesure supprimée par erreur se récupère.',
      ],
    },
    {
      titre: 'Retrouver ce que vous avez noté',
      paragraphes: [
        'Les onglets du bas mènent à l’essentiel : l’accueil pour la situation du jour, l’historique pour tout relire, les graphiques pour voir l’évolution.',
        'Les paramètres décident du reste — ce que vous souhaitez suivre, la taille du texte, les couleurs. Tout y est modifiable à tout moment, et rien n’y est définitif.',
      ],
    },
  ]

  let index = $state(0)

  const etape = $derived(ETAPES[index]!)
  const derniere = $derived(index === ETAPES.length - 1)

  function suivante() {
    if (derniere) onterminer()
    else index += 1
  }

  function precedente() {
    if (index > 0) index -= 1
  }

  // J7 : les flèches font ce qu'on attend d'elles, sans être le seul moyen (J9).
  function auClavier(e: KeyboardEvent) {
    if (e.key === 'Escape') onterminer()
    else if (e.key === 'ArrowRight') suivante()
    else if (e.key === 'ArrowLeft') precedente()
  }
</script>

<svelte:window onkeydown={auClavier} />

<div class="visite">
  <section class="carte contenu" aria-labelledby="titre-visite">
    <p class="compteur" aria-hidden="true">Étape {index + 1} sur {ETAPES.length}</p>

    <!--
      Le titre et le texte changent sans que la page change : sans région
      annoncée, un lecteur d'écran ne dirait rien du passage à l'étape suivante.
    -->
    <div aria-live="polite">
      <h1 id="titre-visite">{etape.titre}</h1>
      {#each etape.paragraphes as p (p)}
        <p class="texte">{p}</p>
      {/each}
      <p class="pour-lecteur">Étape {index + 1} sur {ETAPES.length}.</p>
    </div>

    <ol class="jalons">
      {#each ETAPES as e, i (e.titre)}
        <li class:jalons__actif={i === index}>
          <span class="pour-lecteur">{e.titre}{i === index ? ' (étape affichée)' : ''}</span>
        </li>
      {/each}
    </ol>

    <div class="commandes">
      <button type="button" class="bouton bouton--discret" onclick={onterminer}>
        Passer la visite
      </button>

      <div class="avancer">
        {#if index > 0}
          <button type="button" class="bouton" onclick={precedente}>Précédent</button>
        {/if}
        <button type="button" class="bouton bouton--principal" onclick={suivante}>
          {derniere ? 'Ouvrir mon carnet' : 'Suivant'}
        </button>
      </div>
    </div>
  </section>
</div>

<style>
  .visite {
    max-width: 40rem;
    margin: 0 auto;
    /* Comme l'écran de bienvenue : aucune en-tête ne protège de la barre d'état. */
    padding: calc(2rem + env(safe-area-inset-top, 0px)) 1rem 4rem;
  }

  .contenu { display: flex; flex-direction: column; gap: 1.1rem; }

  .compteur { font-size: 0.85rem; color: var(--encre-3); }

  h1 { font-size: 1.6rem; line-height: 1.2; text-wrap: balance; }
  .texte { color: var(--encre-2); margin-top: 0.8rem; max-width: 46ch; }

  /* Les jalons doublent le compteur écrit : l'information n'est jamais portée
     par la seule position, ni par la seule couleur (§ 13). */
  .jalons {
    list-style: none;
    display: flex;
    gap: 0.45rem;
    margin: 0;
    padding: 0;
  }
  .jalons li {
    width: 2.2rem;
    height: 0.35rem;
    border-radius: 999px;
    background: var(--trait);
  }
  .jalons__actif { background: var(--accent-texte); }

  .commandes {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
    margin-top: 0.4rem;
  }
  .avancer { display: flex; gap: 0.6rem; margin-left: auto; }
</style>
