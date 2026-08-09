import { describe, it, expect } from 'vitest'
import { evaluerDivergence, envoiSansQuestion } from '$lib/domain/synchro'
import { urlFichier } from '$lib/io/webdav'

describe('evaluerDivergence (§ 11.7)', () => {
  it('laisse passer le tout premier envoi : il n\'écrase personne', () => {
    expect(evaluerDivergence(undefined, undefined)).toBe('aucune')
    expect(evaluerDivergence(undefined, '2026-08-01T10:00:00.000Z')).toBe('aucune')
  })

  it('laisse passer quand le serveur porte exactement ce que cet appareil y a mis', () => {
    const v = '2026-08-09T10:00:00.000Z'
    expect(evaluerDivergence(v, v)).toBe('aucune')
  })

  it('demande quand un carnet existe et que cet appareil n\'a jamais synchronisé', () => {
    // On ne peut pas savoir si c'est le sien : le trancher tout seul reviendrait
    // à effacer le carnet d'un proche sans le lui dire.
    expect(evaluerDivergence('2026-08-01T10:00:00.000Z', undefined)).toBe('origine-inconnue')
  })

  it('demande quand un autre appareil est passé depuis le dernier échange', () => {
    expect(evaluerDivergence('2026-08-09T18:00:00.000Z', '2026-08-09T10:00:00.000Z'))
      .toBe('distant-modifie')
  })

  it('ne se fie pas à l\'ordre des dates mais à leur identité', () => {
    // Une version distante *plus ancienne* que la nôtre est tout autant une
    // divergence : quelqu'un a écrit par-dessus notre dépôt.
    expect(evaluerDivergence('2026-07-01T10:00:00.000Z', '2026-08-09T10:00:00.000Z'))
      .toBe('distant-modifie')
  })

  it('n\'autorise l\'envoi sans question que dans le seul cas sûr', () => {
    expect(envoiSansQuestion('aucune')).toBe(true)
    expect(envoiSansQuestion('origine-inconnue')).toBe(false)
    expect(envoiSansQuestion('distant-modifie')).toBe(false)
  })
})

describe('urlFichier', () => {
  const base = {
    identifiant: 'moi',
    motDePasse: 'secret',
    nomFichier: 'carnet-bien-etre.json',
  }

  it('assemble dossier et fichier sans double barre ni barre manquante', () => {
    expect(urlFichier({ ...base, urlDossier: 'https://nuage.fr/dav/Carnet' }))
      .toBe('https://nuage.fr/dav/Carnet/carnet-bien-etre.json')
    expect(urlFichier({ ...base, urlDossier: 'https://nuage.fr/dav/Carnet/' }))
      .toBe('https://nuage.fr/dav/Carnet/carnet-bien-etre.json')
    expect(urlFichier({ ...base, urlDossier: 'https://nuage.fr/dav/Carnet///' }))
      .toBe('https://nuage.fr/dav/Carnet/carnet-bien-etre.json')
  })

  it('échappe un nom de fichier contenant un espace ou un accent', () => {
    expect(urlFichier({
      ...base,
      urlDossier: 'https://nuage.fr/dav',
      nomFichier: 'carnet de Crystèle.json',
    })).toBe('https://nuage.fr/dav/carnet%20de%20Cryst%C3%A8le.json')
  })
})
