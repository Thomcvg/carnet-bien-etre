<script lang="ts">
  /**
   * Première configuration (§ 2.3, J5).
   *
   * Critère d'acceptation 15 : moins d'une minute. Tout est donc sur un seul
   * écran, et tout est facultatif sauf le nom du carnet — qui a même une valeur
   * par défaut. On peut valider sans rien remplir.
   */
  import { carnet } from '$lib/etat/carnet.svelte'
  import { analyserNombre } from '$lib/domain/unites'
  import { CLE_TAILLE } from '$lib/domain/champs'
  import type { UsageDeclare } from '$lib/domain/types'

  interface Props { ontermine: () => void }
  let { ontermine }: Props = $props()

  let nomCarnet = $state('Mon carnet')
  let usage = $state<UsageDeclare>('indecis')
  let taille = $state('')
  let anneeNaissance = $state('')
  let uniteMasse = $state<'kg' | 'lb'>('kg')

  const USAGES: { valeur: UsageDeclare; titre: string; detail: string }[] = [
    { valeur: 'suivre', titre: 'Suivre mon poids', detail: 'Le carnet classique : poids et courbe.' },
    { valeur: 'stabiliser', titre: 'Me stabiliser', detail: 'Rester dans une fourchette confortable.' },
    { valeur: 'reprendre', titre: 'Reprendre du poids', detail: 'Après une maladie, une convalescence.' },
    { valeur: 'constantes', titre: 'Suivre des constantes', detail: 'Poids, mensurations et repères de santé.' },
    { valeur: 'sport', titre: 'Accompagner une pratique sportive', detail: 'Mensurations et activité.' },
    { valeur: 'indecis', titre: 'Je verrai plus tard', detail: 'Vous pourrez tout ajuster ensuite.' },
  ]

  async function commencer() {
    const p = carnet.profil
    if (!p) return

    const annee = analyserNombre(anneeNaissance)
    const dateNaissance =
      annee !== undefined && annee > 1900 && annee < new Date().getFullYear()
        ? `${Math.round(annee)}-01-01`
        : undefined

    await carnet.initialiser({
      ...p,
      nomCarnet: nomCarnet.trim() || 'Mon carnet',
      usage,
      uniteMasse,
      dateNaissance,
    })

    const cm = analyserNombre(taille)
    if (cm !== undefined) {
      await carnet.enregistrerValeurDuJour(CLE_TAILLE, cm)
    }

    ontermine()
  }
</script>

<div class="accueil">
  <header class="entete">
    <h1>Carnet Bien-être</h1>
    <p class="intro">
      Un carnet personnel pour suivre votre évolution, à votre rythme.
      Vos données restent sur cet appareil : aucun compte, aucun envoi.
    </p>
  </header>

  <form class="pile gap-l" onsubmit={(e) => { e.preventDefault(); commencer() }}>
    <div class="champ">
      <label for="nom-carnet">Nom du carnet</label>
      <input id="nom-carnet" type="text" bind:value={nomCarnet} maxlength="60" />
      <p class="aide">Par exemple « Le carnet de Crystèle ».</p>
    </div>

    <fieldset class="usages">
      <legend>Qu'est-ce qui vous amène ?</legend>
      <p class="aide-legend">
        Cette réponse configure l'application. Rien n'est définitif : tout se modifie
        dans les paramètres.
      </p>
      {#each USAGES as u (u.valeur)}
        <label class="option" class:option--actif={usage === u.valeur}>
          <input type="radio" bind:group={usage} value={u.valeur} />
          <span class="titre">{u.titre}</span>
          <span class="explication">{u.detail}</span>
        </label>
      {/each}
    </fieldset>

    <div class="deux">
      <div class="champ">
        <label for="taille">Taille en cm <span class="facultatif">facultatif</span></label>
        <input id="taille" type="text" inputmode="decimal" bind:value={taille} placeholder="165" />
        <p class="aide">Permet de calculer l'IMC. Sans elle, le carnet fonctionne quand même.</p>
      </div>

      <div class="champ">
        <label for="naissance">Année de naissance <span class="facultatif">facultatif</span></label>
        <input id="naissance" type="text" inputmode="numeric" bind:value={anneeNaissance} placeholder="1966" />
        <p class="aide">Les repères de santé varient avec l'âge : cela les rend plus justes.</p>
      </div>
    </div>

    <div class="champ unite-choix">
      <span id="label-unite">Unité de poids</span>
      <div class="segments" role="radiogroup" aria-labelledby="label-unite">
        {#each [['kg', 'Kilogrammes'], ['lb', 'Livres']] as [valeur, libelle]}
          <label class="segment" class:segment--actif={uniteMasse === valeur}>
            <input type="radio" bind:group={uniteMasse} value={valeur} />
            <span>{libelle}</span>
          </label>
        {/each}
      </div>
    </div>

    <!-- § 10.4 : mention obligatoire, présentée dès l'installation. -->
    <aside class="mention">
      <p>
        <strong>Carnet Bien-être n'est pas un dispositif médical.</strong>
        Il n'établit aucun diagnostic et ne remplace aucun avis professionnel.
        Les repères affichés sont indicatifs. En cas de doute sur votre santé,
        parlez-en à un médecin.
      </p>
    </aside>

    <button type="submit" class="bouton bouton--principal commencer">
      Ouvrir mon carnet
    </button>
  </form>
</div>

<style>
  .accueil {
    max-width: 42rem;
    margin: 0 auto;
    padding: 2rem 1rem 4rem;
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .entete h1 { font-size: 2rem; }
  .intro { color: var(--encre-2); margin-top: 0.6rem; max-width: 38ch; }

  .usages { border: 0; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.45rem; }
  .usages legend { font-family: var(--serif); font-size: 1.2rem; padding: 0; }
  .aide-legend { font-size: 0.88rem; color: var(--encre-2); margin: 0.3rem 0 0.6rem; }

  .option {
    display: grid;
    grid-template-columns: auto 1fr;
    grid-template-areas: 'radio titre' 'radio explication';
    gap: 0 0.7rem;
    align-items: center;
    min-height: var(--cible-tactile);
    padding: 0.6rem 0.85rem;
    border: 1px solid var(--trait);
    border-radius: var(--rayon-s);
    background: var(--carte);
    cursor: pointer;
  }
  .option--actif { border-color: var(--accent-trait); background: var(--accent-voile); }
  .option:has(input:focus-visible) { outline: 3px solid var(--second); outline-offset: 2px; }
  .option input { grid-area: radio; width: 1.15rem; height: 1.15rem; }
  .titre { grid-area: titre; font-weight: 600; }
  .explication { grid-area: explication; font-size: 0.87rem; color: var(--encre-2); }

  .deux { display: grid; grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr)); gap: 1rem; }

  .facultatif {
    font-size: 0.78rem; color: var(--encre-3);
    border: 1px solid var(--trait); border-radius: 999px; padding: 0.05em 0.55em;
  }

  .unite-choix > span { font-size: 0.9rem; color: var(--encre-2); }
  .segments { display: flex; gap: 0.4rem; flex-wrap: wrap; }
  .segment {
    display: inline-flex; align-items: center;
    min-height: var(--cible-tactile); padding: 0.4em 1em;
    border: 1px solid var(--trait); border-radius: var(--rayon-s);
    background: var(--carte); cursor: pointer;
  }
  .segment input { position: absolute; opacity: 0; width: 0; height: 0; }
  .segment--actif { background: var(--accent-voile); border-color: var(--accent-trait); font-weight: 600; }
  .segment:has(input:focus-visible) { outline: 3px solid var(--second); outline-offset: 2px; }

  .mention {
    background: var(--beige);
    border: 1px solid var(--trait);
    border-radius: var(--rayon);
    padding: 0.9rem 1rem;
    font-size: 0.88rem;
    color: var(--encre-2);
  }

  .commencer { align-self: flex-start; font-size: 1.05rem; padding: 0.7em 1.6em; }
</style>
