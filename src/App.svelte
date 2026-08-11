<script lang="ts">
  /**
   * Coque de l'application.
   *
   * Navigation par ancre (`#/accueil`) : cela donne gratuitement le bouton
   * « retour » du navigateur et du téléphone, ce qui compte pour J9 — aucun
   * geste complexe ne doit être nécessaire pour revenir en arrière.
   */
  import { onMount } from 'svelte'
  import { carnet } from '$lib/etat/carnet.svelte'
  import { pwa } from '$lib/etat/pwa.svelte'
  import { sauvegardeAuto } from '$lib/etat/sauvegardeAuto.svelte'
  import { webdav } from '$lib/etat/webdav.svelte'
  import Bienvenue from './vues/Bienvenue.svelte'
  import Accueil from './vues/Accueil.svelte'
  import Historique from './vues/Historique.svelte'
  import Graphiques from './vues/Graphiques.svelte'
  import Bilan from './vues/Bilan.svelte'
  import FicheMedecin from './vues/FicheMedecin.svelte'
  import Parametres from './vues/Parametres.svelte'
  import FormulaireMesure from './vues/FormulaireMesure.svelte'
  import ObjectifModale from './vues/ObjectifModale.svelte'
  import VisiteGuidee from './vues/VisiteGuidee.svelte'
  import type { TypeObjectif } from '$lib/domain/types'

  type Vue = 'accueil' | 'historique' | 'graphiques' | 'bilan' | 'fiche-medecin' | 'parametres'

  const LIBELLES: Record<Vue, string> = {
    accueil: 'Accueil',
    historique: 'Historique',
    graphiques: 'Graphiques',
    bilan: 'Bilan',
    'fiche-medecin': 'Fiche médecin',
    parametres: 'Paramètres',
  }
  // « Fiche médecin » n'a volontairement pas de place dans la barre de
  // navigation (peu utilisée au quotidien) mais reste une route ouverte,
  // atteinte par un bouton depuis le Bilan — § 2.3 : le mode simplifie
  // l'affichage, il ne restreint jamais l'accès.
  const VUES_VALIDES: Vue[] = ['accueil', 'historique', 'graphiques', 'bilan', 'fiche-medecin', 'parametres']

  let vue = $state<Vue>('accueil')
  let formulaireOuvert = $state(false)
  let mesureEnEdition = $state<string | null>(null)
  let objectifOuvert = $state(false)
  let objectifTypeInitial = $state<TypeObjectif | undefined>(undefined)
  let objectifChampInitial = $state<string | undefined>(undefined)
  let visiteOuverte = $state(false)

  function ouvrirObjectif(type?: TypeObjectif, champCle?: string) {
    objectifTypeInitial = type
    objectifChampInitial = champCle
    objectifOuvert = true
  }

  /**
   * Le mode (§ 2.3) simplifie l'affichage, il ne restreint pas l'accès : une route
   * connue reste ouverte même repliée hors de la barre de navigation en mode
   * essentiel — « essentiel » choisit ce qui se montre, pas ce qui existe.
   */
  function lireAncre(): Vue {
    const cle = location.hash.replace(/^#\/?/, '') as Vue
    return VUES_VALIDES.includes(cle) ? cle : 'accueil'
  }

  const onglets = $derived.by(() => {
    const cles: Vue[] = carnet.profil?.mode === 'complet'
      ? ['accueil', 'historique', 'graphiques', 'bilan', 'parametres']
      : ['accueil', 'historique', 'graphiques', 'parametres']
    return cles.map((v) => ({ vue: v, libelle: LIBELLES[v] }))
  })

  /**
   * Une vue hors de la barre de navigation reste atteignable (§ 2.3), mais elle
   * ne doit pas laisser la barre sans onglet actif : sur une route repliée, on
   * signale l'onglet dont elle relève. « Fiche médecin » relève du bilan, et le
   * bilan lui-même relève de l'accueil quand le mode essentiel le replie.
   */
  const ongletActif = $derived.by(() => {
    if (onglets.some((o) => o.vue === vue)) return vue
    if (vue === 'fiche-medecin') return onglets.some((o) => o.vue === 'bilan') ? 'bilan' : 'accueil'
    return 'accueil'
  })

  function aller(cible: Vue) {
    location.hash = `#/${cible}`
  }

  function ouvrirModification(id: string) {
    mesureEnEdition = id
    formulaireOuvert = true
  }

  function fermerFormulaire() {
    formulaireOuvert = false
    mesureEnEdition = null
  }

  onMount(() => {
    carnet.charger()
    pwa.initialiser()
    sauvegardeAuto.charger()
    webdav.charger()
    vue = lireAncre()

    const surAncre = () => { vue = lireAncre() }
    const surModification = (e: Event) => ouvrirModification((e as CustomEvent<string>).detail)

    window.addEventListener('hashchange', surAncre)
    window.addEventListener('modifier-mesure', surModification)
    return () => {
      window.removeEventListener('hashchange', surAncre)
      window.removeEventListener('modifier-mesure', surModification)
    }
  })

  // Le thème et l'échelle typographique s'appliquent à la racine du document (J1, J2).
  $effect(() => {
    const p = carnet.profil
    const racine = document.documentElement
    if (!p) return
    if (p.theme === 'auto') racine.removeAttribute('data-theme')
    else racine.setAttribute('data-theme', p.theme)
    // M9 : la teinte est un réglage à part, qui ne dépend pas de la clarté.
    racine.setAttribute('data-palette', p.palette ?? 'sauge')
    racine.setAttribute('data-echelle', String(p.taillePolice))
  })

  // L7 : écrit dans le fichier choisi après toute modification du carnet, avec
  // un court délai pour regrouper les changements rapprochés plutôt que
  // ré-écrire à chaque frappe.
  let minuteurSauvegardeAuto: ReturnType<typeof setTimeout> | null = null
  $effect(() => {
    // La sauvegarde désactivée est écartée d'abord : recopier tout le carnet à
    // chaque frappe pour n'en rien faire serait du travail pur perte.
    if (!sauvegardeAuto.activee) return
    if (carnet.chargement || carnet.premierLancement) return

    const donnees = carnet.exporter() // lit l'ensemble de l'état réactif du carnet
    if (minuteurSauvegardeAuto) clearTimeout(minuteurSauvegardeAuto)
    minuteurSauvegardeAuto = setTimeout(() => { sauvegardeAuto.ecrire(donnees) }, 1500)

    return () => {
      if (minuteurSauvegardeAuto) clearTimeout(minuteurSauvegardeAuto)
    }
  })

  $effect(() => {
    const nom = carnet.profil?.nomCarnet
    document.title = nom && nom !== 'Mon carnet' ? `${nom} — Carnet Bien-être` : 'Carnet Bien-être'
  })
</script>

{#if carnet.chargement}
  <p class="chargement" role="status">Ouverture du carnet…</p>
{:else if carnet.premierLancement}
  <Bienvenue ontermine={() => { aller('accueil'); visiteOuverte = true }} />
{:else if visiteOuverte}
  <!--
    J11 : la visite suit la première configuration, et n'est jamais reproposée
    d'elle-même. Elle reste accessible depuis les paramètres — « passable à tout
    moment » suppose de pouvoir y revenir, sans quoi la passer serait irréversible.
  -->
  <VisiteGuidee onterminer={() => (visiteOuverte = false)} />
{:else}
  <a class="saut" href="#contenu">Aller au contenu</a>

  <div class="coque">
    <header class="entete sans-impression">
      <p class="marque">{carnet.profil?.nomCarnet ?? 'Carnet Bien-être'}</p>
      <button type="button" class="bouton bouton--principal ajout"
        onclick={() => { mesureEnEdition = null; formulaireOuvert = true }}>
        + Nouvelle mesure
      </button>
    </header>

    {#if pwa.miseAJourDisponible}
      <!-- M1 : mise à jour discrète, jamais forcée — l'utilisateur choisit le moment. -->
      <div class="bandeau-maj sans-impression" role="status">
        <span>Une nouvelle version du carnet est prête.</span>
        <button type="button" class="bouton" onclick={() => pwa.appliquerMiseAJourMaintenant()}>
          Mettre à jour
        </button>
      </div>
    {/if}

    <main id="contenu" class="contenu" tabindex="-1">
      {#if vue === 'accueil'}
        <Accueil
          onnouvelleMesure={() => { mesureEnEdition = null; formulaireOuvert = true }}
          ondefinirObjectif={ouvrirObjectif}
        />
      {:else if vue === 'historique'}
        <Historique onmodifier={ouvrirModification} />
      {:else if vue === 'graphiques'}
        <Graphiques />
      {:else if vue === 'bilan'}
        <Bilan />
      {:else if vue === 'fiche-medecin'}
        <FicheMedecin onretour={() => aller('bilan')} />
      {:else}
        <Parametres onrevoirVisite={() => (visiteOuverte = true)} />
      {/if}
    </main>

    <nav class="navigation sans-impression" aria-label="Sections du carnet">
      <ul>
        {#each onglets as onglet (onglet.vue)}
          <li>
            <a
              href="#/{onglet.vue}"
              class="onglet"
              class:onglet--actif={ongletActif === onglet.vue}
              aria-current={vue === onglet.vue ? 'page' : undefined}
            >
              {onglet.libelle}
            </a>
          </li>
        {/each}
      </ul>
    </nav>
  </div>

  <FormulaireMesure ouvert={formulaireOuvert} mesureId={mesureEnEdition} onfermer={fermerFormulaire} />
  <ObjectifModale
    ouvert={objectifOuvert}
    typeInitial={objectifTypeInitial}
    champInitial={objectifChampInitial}
    onfermer={() => (objectifOuvert = false)}
  />
{/if}

<style>
  .chargement { padding: 2rem 1rem; color: var(--encre-2); }

  /* J7 : premier élément focalisable de la page. */
  .saut {
    position: absolute;
    left: -9999px;
    top: 0;
    background: var(--carte);
    color: var(--encre);
    padding: 0.7rem 1rem;
    border: 2px solid var(--second);
    border-radius: var(--rayon-s);
    z-index: 100;
  }
  .saut:focus { left: 0.5rem; top: 0.5rem; }

  .coque {
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
  }

  .entete {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
    /* Android 15 dessine l'application sous la barre d'état : sans cette marge,
       le nom du carnet passait sous l'horloge. Le repli à `0px` couvre le
       navigateur de bureau, qui n'a pas d'encoche. */
    padding: calc(0.8rem + env(safe-area-inset-top, 0px)) 1rem 0.8rem;
    border-bottom: 1px solid var(--trait);
    background: var(--carte);
    position: sticky;
    top: 0;
    z-index: 20;
  }
  .marque {
    font-family: var(--serif);
    font-size: 1.1rem;
    margin-right: auto;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .ajout { flex: 0 0 auto; }

  .bandeau-maj {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    flex-wrap: wrap;
    padding: 0.6rem 1rem;
    background: var(--second-voile);
    border-bottom: 1px solid var(--second-trait);
    font-size: 0.9rem;
  }
  .bandeau-maj .bouton { min-height: 2.4rem; padding: 0.3em 0.9em; }

  .contenu {
    flex: 1;
    width: 100%;
    max-width: 52rem;
    margin: 0 auto;
    padding: 1.2rem 1rem 6rem;
  }
  .contenu:focus { outline: none; }

  .navigation {
    position: sticky;
    bottom: 0;
    background: var(--carte);
    border-top: 1px solid var(--trait);
    padding-bottom: env(safe-area-inset-bottom);
  }
  .navigation ul {
    display: flex;
    list-style: none;
    margin: 0 auto;
    padding: 0;
    max-width: 52rem;
  }
  .navigation li { flex: 1; }

  .onglet {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: var(--cible-tactile);
    padding: 0.6rem 0.3rem;
    text-decoration: none;
    color: var(--encre-2);
    font-size: 0.92rem;
    border-top: 3px solid transparent;
  }
  .onglet:hover { background: var(--accent-voile); color: var(--encre); }
  /* L'onglet actif se signale par la couleur ET par le trait ET par aria-current (§ 13). */
  .onglet--actif {
    color: var(--accent-texte);
    font-weight: 600;
    border-top-color: var(--accent-texte);
    background: var(--accent-voile);
  }

  @media (min-width: 40rem) {
    .contenu { padding-bottom: 2rem; }
  }
</style>
