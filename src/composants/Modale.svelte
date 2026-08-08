<script lang="ts">
  /**
   * Boîte de dialogue.
   *
   * Repose sur l'élément natif `<dialog>`, qui apporte gratuitement le piège de
   * focus, la fermeture par Échap et la sémantique attendue par les lecteurs
   * d'écran (J6, J7) — trois choses qu'une réimplémentation rate souvent.
   */
  import type { Snippet } from 'svelte'

  interface Props {
    ouverte: boolean
    titre: string
    onfermer: () => void
    children: Snippet
    pied?: Snippet
  }

  let { ouverte, titre, onfermer, children, pied }: Props = $props()

  let dialogue = $state<HTMLDialogElement | null>(null)

  // Le nom accessible pointe vers le titre affiché plutôt que de le recopier :
  // un `aria-label` en double diverge tôt ou tard de ce que l'on voit à l'écran.
  const idTitre = `titre-modale-${Math.random().toString(36).slice(2, 9)}`

  $effect(() => {
    const d = dialogue
    if (!d) return
    if (ouverte && !d.open) {
      d.showModal()
      // `showModal()` pose lui-même le focus sur le premier élément focalisable,
      // c'est-à-dire le bouton « Fermer » : un contenu qui tenterait de prendre
      // le focus depuis son propre effet se le ferait reprendre. La modale étant
      // seule à savoir *quand* elle s'ouvre, c'est à elle de le replacer sur le
      // point d'entrée que le contenu a désigné.
      d.querySelector<HTMLElement>('[data-focus-initial]')?.focus()
    } else if (!ouverte && d.open) {
      d.close()
    }
  })
</script>

<dialog
  bind:this={dialogue}
  aria-labelledby={idTitre}
  onclose={onfermer}
  onclick={(e) => { if (e.target === dialogue) onfermer() }}
>
  <div class="contenu">
    <header>
      <h2 id={idTitre}>{titre}</h2>
      <button type="button" class="bouton bouton--discret fermer" onclick={onfermer}>
        <span aria-hidden="true">✕</span>
        <span class="pour-lecteur">Fermer</span>
      </button>
    </header>

    <div class="corps">
      {@render children()}
    </div>

    {#if pied}
      <footer>{@render pied()}</footer>
    {/if}
  </div>
</dialog>

<style>
  dialog {
    padding: 0;
    border: 1px solid var(--trait);
    border-radius: var(--rayon);
    background: var(--carte);
    color: var(--encre);
    box-shadow: var(--ombre);
    width: min(34rem, calc(100vw - 2rem));
    max-height: calc(100dvh - 2rem);
  }
  dialog::backdrop { background: rgb(20 24 21 / 45%); }

  .contenu { display: flex; flex-direction: column; max-height: calc(100dvh - 2rem); }

  header {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.9rem 0.7rem 0.9rem 1.1rem;
    border-bottom: 1px solid var(--trait);
  }
  header h2 { margin-right: auto; font-size: 1.15rem; }

  .fermer { min-width: var(--cible-tactile); padding: 0.4em; }

  .corps { padding: 1.1rem; overflow-y: auto; }

  footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.6rem;
    flex-wrap: wrap;
    padding: 0.9rem 1.1rem;
    border-top: 1px solid var(--trait);
    background: var(--papier);
  }
</style>
