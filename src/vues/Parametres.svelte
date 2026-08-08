<script lang="ts">
  /**
   * Paramètres (§ 5.7).
   *
   * Regroupe le profil, l'affichage, les champs suivis et tout ce qui touche aux
   * données. La suppression totale y figure sans détour : le droit d'effacer ses
   * données ne doit pas être caché (§ 11.5).
   */
  import Modale from '../composants/Modale.svelte'
  import ChampPersonnaliseModale from './ChampPersonnaliseModale.svelte'
  import TraitementModale from './TraitementModale.svelte'
  import NouveauProfilModale from './NouveauProfilModale.svelte'
  import { carnet } from '$lib/etat/carnet.svelte'
  import { pwa } from '$lib/etat/pwa.svelte'
  import { sauvegardeAuto } from '$lib/etat/sauvegardeAuto.svelte'
  import { analyserNombre, formaterNombre } from '$lib/domain/unites'
  import { CLE_TAILLE, champsDeCategorie } from '$lib/domain/champs'
  import { versISO } from '$lib/domain/dates'
  import { depuisJson, lireFichier, telechargerCsv, telechargerXlsx, telechargerJson } from '$lib/io/sauvegarde'
  import { VERSION_SCHEMA } from '$lib/domain/migrations'
  import { traitementEnCours } from '$lib/domain/traitements'
  import type { Carnet, CategorieChamp, DefinitionChamp } from '$lib/domain/types'

  const profil = $derived(carnet.profil)

  let taille = $state('')
  let anneeNaissance = $state('')
  let messageImport = $state<{ ton: 'ok' | 'probleme'; texte: string } | null>(null)
  let importEnAttente = $state<{ carnet: Carnet; nomFichier: string } | null>(null)
  let confirmationEffacement = $state(false)
  let saisieEffacement = $state('')
  let champPersonnaliseOuvert = $state(false)
  let champASupprimer = $state<DefinitionChamp | null>(null)
  let traitementModaleOuverte = $state(false)
  let traitementEnEdition = $state<string | null>(null)
  let nouveauProfilOuvert = $state(false)

  const CATEGORIES: { valeur: CategorieChamp; libelle: string }[] = [
    { valeur: 'corps', libelle: 'Corps' },
    { valeur: 'sante', libelle: 'Santé' },
    { valeur: 'bienetre', libelle: 'Bien-être' },
    { valeur: 'activite', libelle: 'Activité' },
  ]

  async function confirmerSuppressionChamp() {
    const c = champASupprimer
    if (!c) return
    champASupprimer = null
    await carnet.supprimerChampPersonnalise(c.cle)
  }

  // Les deux champs sont pré-remplis une seule fois, à l'affichage de l'écran.
  // Se caler sur « la valeur est vide » relancerait le remplissage dès que la
  // personne efface le contenu, rendant le champ impossible à vider.
  let champsProfilPrepares = $state(false)
  $effect(() => {
    if (champsProfilPrepares) return
    const t = carnet.taille
    if (t !== undefined) taille = formaterNombre(t)
    const n = profil?.dateNaissance
    if (n) anneeNaissance = n.slice(0, 4)
    champsProfilPrepares = true
  })

  async function enregistrerTaille() {
    const cm = analyserNombre(taille)
    if (cm !== undefined) await carnet.enregistrerValeurDuJour(CLE_TAILLE, cm)
  }

  async function enregistrerNaissance() {
    const annee = analyserNombre(anneeNaissance)
    const valide = annee !== undefined && annee > 1900 && annee < new Date().getFullYear()
    await carnet.majProfil({ dateNaissance: valide ? `${Math.round(annee)}-01-01` : undefined })
  }

  function exporterJson() {
    telechargerJson(carnet.exporter(), profil?.nomCarnet ?? 'carnet')
  }

  function exporterCsv() {
    telechargerCsv(
      carnet.mesures, carnet.champs,
      profil?.nomCarnet ?? 'carnet',
      profil?.formatDate ?? 'jj/mm/aaaa',
    )
  }

  async function exporterXlsx() {
    await telechargerXlsx(
      carnet.mesures, carnet.champs,
      profil?.nomCarnet ?? 'carnet',
      profil?.formatDate ?? 'jj/mm/aaaa',
    )
  }

  /**
   * L'import est aussi irréversible que l'effacement : il passe donc par la même
   * exigence de confirmation. Le fichier est lu et validé d'abord, ce qui permet
   * d'annoncer précisément ce qui va remplacer quoi avant que rien ne soit écrit.
   */
  async function choisirFichierImport(e: Event) {
    const entree = e.currentTarget as HTMLInputElement
    const fichier = entree.files?.[0]
    if (!fichier) return
    messageImport = null
    try {
      const texte = await lireFichier(fichier)
      importEnAttente = { carnet: depuisJson(texte), nomFichier: fichier.name }
    } catch (erreur) {
      messageImport = {
        ton: 'probleme',
        texte: erreur instanceof Error ? erreur.message : 'Ce fichier n\'a pas pu être lu.',
      }
    } finally {
      entree.value = ''
    }
  }

  async function confirmerImport() {
    const en = importEnAttente
    if (!en) return
    importEnAttente = null
    await carnet.importer(en.carnet)
    messageImport = {
      ton: 'ok',
      texte: `Carnet restauré : ${en.carnet.mesures.length} mesure${en.carnet.mesures.length > 1 ? 's' : ''}.`,
    }
  }

  async function toutEffacer() {
    await carnet.toutSupprimer()
    confirmationEffacement = false
    saisieEffacement = ''
    location.reload()
  }
</script>

{#if profil}
<div class="pile gap-l parametres">
  <h1>Paramètres</h1>

  {#if carnet.profils.length > 1}
    <section class="carte pile gap-m">
      <h2>Profils de cet appareil</h2>
      <p class="aide">
        Aucune donnée n'est partagée entre profils, aucune comparaison n'existe entre eux.
      </p>
      <ul class="liste-profils">
        {#each carnet.profils as p (p.id)}
          <li>
            <!-- Le profil actif reste focalisable (`aria-current` plutôt que `disabled`) :
                 un bouton désactivé sort de l'ordre de tabulation et son étiquette
                 « actif » échapperait aux lecteurs d'écran. -->
            <button type="button" class="profil-item" class:profil-item--actif={p.id === profil.id}
              aria-current={p.id === profil.id ? 'true' : undefined}
              onclick={() => carnet.basculerProfil(p.id)}>
              <span>{p.nomCarnet}</span>
              {#if p.id === profil.id}<span class="profil-actif-etiquette">actif</span>{/if}
            </button>
          </li>
        {/each}
      </ul>
      <button type="button" class="bouton" onclick={() => (nouveauProfilOuvert = true)}>
        + Nouveau profil
      </button>
    </section>
  {:else}
    <button type="button" class="bouton ajouter-profil-discret" onclick={() => (nouveauProfilOuvert = true)}>
      + Ajouter un profil (pour un proche partageant cet appareil)
    </button>
  {/if}

  <section class="carte pile gap-m">
    <h2>Votre carnet</h2>

    <div class="champ">
      <label for="p-nom">Nom du carnet</label>
      <input id="p-nom" type="text" maxlength="60" value={profil.nomCarnet}
        onchange={(e) => carnet.majProfil({ nomCarnet: e.currentTarget.value.trim() || 'Mon carnet' })} />
    </div>

    <div class="deux">
      <div class="champ">
        <label for="p-taille">Taille en cm</label>
        <input id="p-taille" type="text" inputmode="decimal" bind:value={taille} onblur={enregistrerTaille} />
        <p class="aide">Nécessaire au calcul de l'IMC. Son évolution est conservée.</p>
      </div>

      <div class="champ">
        <label for="p-naissance">Année de naissance</label>
        <input id="p-naissance" type="text" inputmode="numeric" bind:value={anneeNaissance} onblur={enregistrerNaissance} />
        <p class="aide">Rend les repères de santé adaptés à votre âge.</p>
      </div>
    </div>
  </section>

  <section class="carte pile gap-m">
    <h2>Affichage</h2>

    <div class="deux">
      <div class="champ">
        <label for="p-unite">Unité de poids</label>
        <select id="p-unite" value={profil.uniteMasse}
          onchange={(e) => carnet.majProfil({ uniteMasse: e.currentTarget.value as 'kg' | 'lb' })}>
          <option value="kg">Kilogrammes</option>
          <option value="lb">Livres</option>
        </select>
        <p class="aide">Changer d'unité ne modifie aucune donnée enregistrée.</p>
      </div>

      <div class="champ">
        <label for="p-date">Format de date</label>
        <select id="p-date" value={profil.formatDate}
          onchange={(e) => carnet.majProfil({ formatDate: e.currentTarget.value as 'jj/mm/aaaa' | 'aaaa-mm-jj' })}>
          <option value="jj/mm/aaaa">31/12/2026</option>
          <option value="aaaa-mm-jj">2026-12-31</option>
        </select>
      </div>
    </div>

    <div class="deux">
      <div class="champ">
        <label for="p-theme">Thème</label>
        <select id="p-theme" value={profil.theme}
          onchange={(e) => carnet.majProfil({ theme: e.currentTarget.value as typeof profil.theme })}>
          <option value="auto">Selon mon appareil</option>
          <option value="clair">Clair</option>
          <option value="sombre">Sombre</option>
          <option value="contraste">Contraste élevé</option>
        </select>
      </div>

      <div class="champ">
        <label for="p-police">Taille du texte</label>
        <select id="p-police" value={String(profil.taillePolice)}
          onchange={(e) => carnet.majProfil({ taillePolice: Number(e.currentTarget.value) as 100 | 125 | 150 | 200 })}>
          <option value="100">Normale</option>
          <option value="125">Grande</option>
          <option value="150">Très grande</option>
          <option value="200">Maximale</option>
        </select>
      </div>
    </div>

    <div class="champ">
      <label for="p-mode">Niveau de détail</label>
      <select id="p-mode" value={profil.mode}
        onchange={(e) => carnet.majProfil({ mode: e.currentTarget.value as 'essentiel' | 'complet' })}>
        <option value="essentiel">Essentiel — poids, courbe et historique</option>
        <option value="complet">Complet — tous les modules activés</option>
      </select>
    </div>

    <label class="bascule">
      <input type="checkbox" checked={profil.modeSansChiffre}
        onchange={(e) => carnet.majProfil({ modeSansChiffre: e.currentTarget.checked })} />
      <span>
        <strong>Mode sans chiffre</strong>
        <span class="aide">Masque les valeurs de poids et n'affiche que les tendances.</span>
      </span>
    </label>
  </section>

  <section class="carte pile gap-m">
    <h2>Rappel</h2>
    <p class="aide">
      Désactivé par défaut. Aucune notification n'est envoyée sans votre accord.
    </p>

    <label class="bascule">
      <input type="checkbox" checked={profil.rappelsActifs ?? false}
        onchange={(e) => carnet.majProfil({ rappelsActifs: e.currentTarget.checked })} />
      <span>
        <strong>Me rappeler de reprendre mes mesures</strong>
        <span class="aide">
          Un message discret s'affiche à l'ouverture du carnet si vous n'avez rien saisi
          depuis un moment — jamais de notification poussée hors de l'application.
        </span>
      </span>
    </label>

    {#if profil.rappelsActifs}
      <div class="champ">
        <label for="p-frequence-rappel">Après combien de jours ?</label>
        <select id="p-frequence-rappel" value={String(profil.frequenceRappelJours ?? 30)}
          onchange={(e) => carnet.majProfil({ frequenceRappelJours: Number(e.currentTarget.value) })}>
          <option value="30">30 jours (mensuel)</option>
          <option value="45">45 jours</option>
          <option value="60">60 jours</option>
          <option value="90">90 jours</option>
        </select>
      </div>
    {/if}
  </section>

  <section class="carte pile gap-m">
    <h2>Données suivies</h2>
    <p class="aide">
      Activez uniquement ce que vous voulez saisir. Désactiver une donnée ne supprime
      jamais son historique.
    </p>

    {#each CATEGORIES as cat (cat.valeur)}
      {@const champsCategorie = champsDeCategorie(carnet.champs, cat.valeur)}
      {#if champsCategorie.length > 0}
        <div class="sous-categorie">
          <h3>{cat.libelle}</h3>
          <ul class="champs">
            {#each champsCategorie as c (c.cle)}
              <li class="ligne-champ">
                <label class="bascule">
                  <input type="checkbox" checked={c.actif} disabled={c.systeme}
                    onchange={(e) => carnet.basculerChamp(c.cle, e.currentTarget.checked)} />
                  <span>
                    {c.libelle}
                    {#if c.systeme}<span class="fixe">toujours actif</span>{/if}
                    {#if c.personnalise}<span class="fixe fixe--perso">personnalisé</span>{/if}
                  </span>
                </label>
                {#if c.personnalise}
                  <button type="button" class="bouton bouton--discret retirer"
                    onclick={() => (champASupprimer = c)}>
                    Retirer<span class="pour-lecteur"> le champ {c.libelle}</span>
                  </button>
                {/if}
              </li>
            {/each}
          </ul>
        </div>
      {/if}
    {/each}

    <button type="button" class="bouton ajouter-champ" onclick={() => (champPersonnaliseOuvert = true)}>
      + Ajouter un champ personnalisé
    </button>
  </section>

  <section class="carte pile gap-m">
    <h2>Traitements</h2>
    <p class="aide">
      Facultatif. Sert à la fiche pour le médecin et aux rappels de prise.
    </p>

    {#if carnet.traitements.length === 0}
      <p class="aide">Aucun traitement enregistré.</p>
    {:else}
      <ul class="liste-traitements">
        {#each carnet.traitements as t (t.id)}
          <li>
            <button type="button" class="traitement" onclick={() => { traitementEnEdition = t.id; traitementModaleOuverte = true }}>
              <span class="traitement-nom">{t.nom}{#if t.dosage} — {t.dosage}{/if}</span>
              <!-- La règle « en cours » vit dans le domaine : la vue ne la redit pas. -->
              {#if traitementEnCours(t, versISO(new Date()))}
                <span class="traitement-etat">en cours</span>
              {:else if t.debut > versISO(new Date())}
                <span class="traitement-etat traitement-etat--termine">à venir</span>
              {:else}
                <span class="traitement-etat traitement-etat--termine">terminé</span>
              {/if}
            </button>
          </li>
        {/each}
      </ul>
    {/if}

    <button type="button" class="bouton" onclick={() => { traitementEnEdition = null; traitementModaleOuverte = true }}>
      + Ajouter un traitement
    </button>
  </section>

  <section class="carte pile gap-m">
    <h2>Vos données</h2>
    <p class="aide">
      Tout est enregistré sur cet appareil. Rien n'est envoyé nulle part.
      Le fichier JSON est la sauvegarde complète : il se réimporte à l'identique.
    </p>

    <div class="actions">
      <button type="button" class="bouton" onclick={exporterJson}>
        Exporter la sauvegarde (JSON)
      </button>
      <button type="button" class="bouton" onclick={exporterCsv}>
        Exporter pour un tableur (CSV)
      </button>
      <button type="button" class="bouton" onclick={exporterXlsx}>
        Exporter pour un tableur (Excel)
      </button>
      <button type="button" class="bouton" onclick={() => window.print()}>
        Imprimer
      </button>
    </div>

    <div class="champ">
      <label for="p-import">Restaurer une sauvegarde</label>
      <input id="p-import" type="file" accept="application/json,.json" onchange={choisirFichierImport} />
      <p class="aide">
        Remplace le contenu de ce carnet par celui du fichier.
        {#if carnet.profils.length > 1}
          Les autres profils de cet appareil ne sont pas concernés.
        {/if}
        Rien n'est écrit avant votre confirmation.
      </p>
    </div>

    {#if messageImport}
      <p class="message" class:message--probleme={messageImport.ton === 'probleme'} role="status">
        {messageImport.texte}
      </p>
    {/if}

    {#if sauvegardeAuto.disponible}
      <div class="sauvegarde-auto">
        <p class="aide">
          Sauvegarde automatique dans un fichier — disponible sur Chrome et Edge, sur
          ordinateur. Utile pour pointer vers un dossier déjà synchronisé (Nextcloud,
          Drive…) : la synchronisation se fait alors par le logiciel de synchronisation,
          pas par le carnet lui-même (§ 11.7).
        </p>
        {#if sauvegardeAuto.activee}
          <p class="detail">
            Fichier : <strong>{sauvegardeAuto.nomFichier}</strong>
            {#if sauvegardeAuto.derniereEcriture}
              — dernière écriture à {sauvegardeAuto.derniereEcriture.toLocaleTimeString('fr-FR')}
            {/if}
          </p>
          <button type="button" class="bouton" onclick={() => sauvegardeAuto.desactiver()}>
            Arrêter la sauvegarde automatique
          </button>
        {:else}
          <button type="button" class="bouton" onclick={() => sauvegardeAuto.activer(`${profil?.nomCarnet ?? 'carnet'}.json`)}>
            Choisir un fichier de sauvegarde automatique
          </button>
        {/if}
        {#if sauvegardeAuto.erreur}
          <p class="message message--probleme" role="status">{sauvegardeAuto.erreur}</p>
        {/if}
      </div>
    {/if}
  </section>

  <section class="carte pile gap-m zone-sensible">
    <h2>Effacer ce carnet</h2>
    <p class="aide">
      {#if carnet.profils.length > 1}
        Supprime définitivement le profil « {profil.nomCarnet} », ses mesures et ses
        objectifs — les autres profils de cet appareil ne sont pas concernés.
      {:else}
        Supprime définitivement le profil, les mesures et les objectifs de cet appareil.
      {/if}
      Pensez à exporter une sauvegarde avant.
    </p>

    {#if !confirmationEffacement}
      <button type="button" class="bouton" onclick={() => (confirmationEffacement = true)}>
        Effacer toutes mes données
      </button>
    {:else}
      <div class="champ">
        <label for="p-confirme">Écrivez <strong>EFFACER</strong> pour confirmer</label>
        <input id="p-confirme" type="text" bind:value={saisieEffacement} autocomplete="off" />
      </div>
      <div class="actions">
        <button type="button" class="bouton" onclick={() => { confirmationEffacement = false; saisieEffacement = '' }}>
          Annuler
        </button>
        <button type="button" class="bouton bouton--principal"
          disabled={saisieEffacement.trim().toUpperCase() !== 'EFFACER'} onclick={toutEffacer}>
          Effacer définitivement
        </button>
      </div>
    {/if}
  </section>

  <section class="carte pile gap-s">
    <h2>À propos</h2>
    <!-- § 10.4 : mention permanente et non désactivable. -->
    <p class="mention">
      <strong>Carnet Bien-être n'est pas un dispositif médical.</strong>
      Il n'établit aucun diagnostic et ne remplace aucun avis professionnel.
      Les repères affichés sont indicatifs. En cas de doute sur votre santé,
      parlez-en à un médecin.
    </p>
    <p class="aide">
      Logiciel libre sous licence AGPL-3.0-or-later. Aucun traceur, aucune publicité,
      aucune mesure d'audience. Schéma de données version {VERSION_SCHEMA}.
    </p>

    {#if pwa.peutInstaller}
      <button type="button" class="bouton installer" onclick={() => pwa.installer()}>
        Installer l'application sur cet appareil
      </button>
    {:else}
      <p class="aide">
        Sur Safari ou Firefox, l'installation se fait depuis le menu de partage
        du navigateur (« Sur l'écran d'accueil »).
      </p>
    {/if}
  </section>
</div>
{/if}

<ChampPersonnaliseModale
  ouvert={champPersonnaliseOuvert}
  onfermer={() => (champPersonnaliseOuvert = false)}
/>

<TraitementModale
  ouvert={traitementModaleOuverte}
  traitementId={traitementEnEdition}
  onfermer={() => (traitementModaleOuverte = false)}
/>

<NouveauProfilModale
  ouvert={nouveauProfilOuvert}
  onfermer={() => (nouveauProfilOuvert = false)}
/>

{#if champASupprimer}
  {@const nb = carnet.nombreMesuresAvec(champASupprimer.cle)}
  <!-- Règle 12 : la confirmation nomme explicitement le nombre de mesures concernées. -->
  <Modale
    ouverte={true}
    titre="Retirer « {champASupprimer.libelle} » ?"
    onfermer={() => (champASupprimer = null)}
  >
    {#if nb > 0}
      <p>
        {nb} mesure{nb > 1 ? 's' : ''} {nb > 1 ? 'portent' : 'porte'} une valeur pour ce champ.
        Ces mesures ne seront pas modifiées, mais ce champ n'apparaîtra plus dans le carnet.
      </p>
    {:else}
      <p>Aucune mesure n'a encore de valeur pour ce champ.</p>
    {/if}

    {#snippet pied()}
      <button type="button" class="bouton" onclick={() => (champASupprimer = null)}>Garder</button>
      <button type="button" class="bouton bouton--principal" onclick={confirmerSuppressionChamp}>
        Retirer
      </button>
    {/snippet}
  </Modale>
{/if}

{#if importEnAttente}
  <!-- Restaurer écrase : même exigence de confirmation que l'effacement. -->
  <Modale ouverte={true} titre="Restaurer cette sauvegarde ?" onfermer={() => (importEnAttente = null)}>
    <div class="pile gap-s">
      <p>
        Le fichier <strong>{importEnAttente.nomFichier}</strong> contient
        {importEnAttente.carnet.mesures.length} mesure{importEnAttente.carnet.mesures.length > 1 ? 's' : ''}.
      </p>
      <p>
        {#if carnet.nombreMesures > 0}
          Les {carnet.nombreMesures} mesure{carnet.nombreMesures > 1 ? 's' : ''} actuellement dans
          « {carnet.profil?.nomCarnet ?? 'ce carnet'} »
          {carnet.nombreMesures > 1 ? 'seront remplacées' : 'sera remplacée'},
          ainsi que les objectifs, événements et traitements de ce carnet.
        {:else}
          Ce carnet est vide : rien ne sera perdu.
        {/if}
      </p>
      {#if carnet.profils.length > 1}
        <p class="aide">Les autres profils de cet appareil ne sont pas concernés.</p>
      {/if}
      <p class="aide">Cette action ne peut pas être annulée.</p>
    </div>

    {#snippet pied()}
      <button type="button" class="bouton" onclick={() => (importEnAttente = null)}>Annuler</button>
      <button type="button" class="bouton bouton--principal" onclick={confirmerImport}>
        Restaurer
      </button>
    {/snippet}
  </Modale>
{/if}

<style>
  .parametres { max-width: 44rem; }
  section h2 { margin-bottom: 0.2rem; }

  .deux { display: grid; grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr)); gap: 1rem; }

  .bascule {
    display: flex;
    align-items: flex-start;
    gap: 0.7rem;
    min-height: var(--cible-tactile);
    cursor: pointer;
  }
  .bascule input { width: 1.2rem; height: 1.2rem; margin-top: 0.25rem; flex: none; }
  .bascule > span { display: flex; flex-direction: column; }
  .bascule .aide { margin-top: 0.1rem; }

  .fixe {
    font-size: 0.75rem; color: var(--encre-3);
    border: 1px solid var(--trait); border-radius: 999px;
    padding: 0.05em 0.5em; margin-left: 0.4em;
  }
  .fixe--perso { color: var(--sauge-texte); border-color: var(--sauge-trait); }

  .sous-categorie h3 {
    font-family: var(--sans); font-size: 0.82rem; font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.04em; color: var(--encre-3);
    margin: 0 0 0.4rem;
  }
  .sous-categorie + .sous-categorie { margin-top: 0.9rem; padding-top: 0.9rem; border-top: 1px solid var(--trait); }

  /* Une grille plutôt que `columns` : la lecture en colonnes journal désordonne
     l'ordre de tabulation d'une liste de cases à cocher. */
  .champs {
    list-style: none; margin: 0; padding: 0;
    display: grid; grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
    gap: 0.1rem 1.5rem;
  }

  .ligne-champ {
    display: flex; align-items: center; gap: 0.5rem;
    break-inside: avoid;
  }
  .ligne-champ .bascule { flex: 1; min-width: 0; }
  .retirer { font-size: 0.82rem; padding: 0.2em 0.5em; min-height: auto; flex: none; }

  .ajouter-champ { align-self: flex-start; }

  .liste-traitements { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.4rem; }
  .traitement {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    width: 100%;
    text-align: left;
    min-height: 2.8rem;
    padding: 0.5rem 0.8rem;
    border: 1px solid var(--trait);
    border-radius: var(--rayon-s);
    background: var(--carte);
    cursor: pointer;
    font: inherit;
    color: var(--encre);
  }
  .traitement:hover { border-color: var(--sauge); }
  .traitement-nom { margin-right: auto; }
  .traitement-etat {
    font-size: 0.78rem; color: var(--sauge-texte);
    border: 1px solid var(--sauge-trait); background: var(--sauge-voile);
    border-radius: 999px; padding: 0.1em 0.6em;
  }
  .traitement-etat--termine { color: var(--encre-3); border-color: var(--trait); background: transparent; }

  .liste-profils { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.4rem; }
  .profil-item {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    width: 100%;
    text-align: left;
    min-height: var(--cible-tactile);
    padding: 0.5rem 0.8rem;
    border: 1px solid var(--trait);
    border-radius: var(--rayon-s);
    background: var(--carte);
    color: var(--encre);
    cursor: pointer;
    font: inherit;
  }
  .profil-item:hover { border-color: var(--sauge); }
  .profil-item--actif { background: var(--sauge-voile); border-color: var(--sauge-trait); font-weight: 600; cursor: default; }
  .profil-actif-etiquette {
    margin-left: auto;
    font-size: 0.75rem; color: var(--sauge-texte);
    border: 1px solid var(--sauge-trait); border-radius: 999px; padding: 0.1em 0.6em;
  }

  .ajouter-profil-discret {
    align-self: flex-start;
    font-size: 0.85rem;
    color: var(--encre-2);
  }

  .actions { display: flex; gap: 0.6rem; flex-wrap: wrap; }

  .message {
    background: var(--sauge-voile);
    border: 1px solid var(--sauge-trait);
    border-radius: var(--rayon-s);
    padding: 0.6rem 0.8rem;
    font-size: 0.92rem;
  }
  .message--probleme { background: var(--attention-fond); border-color: var(--attention); color: var(--attention); }

  .sauvegarde-auto {
    margin-top: 0.6rem;
    padding-top: 0.9rem;
    border-top: 1px solid var(--trait);
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    align-items: flex-start;
  }

  .zone-sensible { border-color: var(--attention); }

  .mention { font-size: 0.9rem; color: var(--encre-2); }
  .installer { align-self: flex-start; }

  input[type='file'] {
    min-height: var(--cible-tactile);
    padding: 0.5em;
    border: 1px dashed var(--trait);
    border-radius: var(--rayon-s);
    background: var(--papier);
    width: 100%;
  }

</style>
