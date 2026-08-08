/**
 * Génère les icônes PWA à partir de la source SVG (icone-source.svg).
 *
 * Deux jeux : « any » (l'icône remplit tout le cadre, pour l'affichage normal)
 * et « maskable » (le motif est réduit à l'intérieur de la zone sûre à 40 % de
 * rayon, pour que l'OS puisse recadrer l'icône en cercle ou en goutte sans
 * couper le dessin — voir https://web.dev/maskable-icon/).
 *
 * Régénérer après toute modification de icone-source.svg :
 *   node scripts/generer-icones.mjs
 */
import sharp from 'sharp'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ICI = dirname(fileURLToPath(import.meta.url))
const SORTIE = join(ICI, '..', 'public', 'icones')
mkdirSync(SORTIE, { recursive: true })

const svgSource = readFileSync(join(ICI, 'icone-source.svg'), 'utf8')

// Fond sage plein, sans le motif — sert de base à l'icône maskable.
const FOND = '#4a6450'

function svgMaskable(tailleSource = 512) {
  // Le motif est ramené à 60 % de la taille et centré : ce qui reste hors de
  // la zone sûre (le cercle interne à 40 % de rayon) peut être coupé sans perte.
  const echelle = 0.6
  const decalage = (tailleSource * (1 - echelle)) / 2
  const motif = svgSource
    .replace(/<svg[^>]*>/, '')
    .replace('</svg>', '')
    .replace('<rect width="512" height="512" fill="#4a6450"/>', '')

  return `<svg width="${tailleSource}" height="${tailleSource}" viewBox="0 0 ${tailleSource} ${tailleSource}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${tailleSource}" height="${tailleSource}" fill="${FOND}"/>
    <g transform="translate(${decalage}, ${decalage}) scale(${echelle})">
      ${motif}
    </g>
  </svg>`
}

const TAILLES_ANY = [192, 512]
const TAILLES_MASKABLE = [192, 512]

async function generer() {
  for (const taille of TAILLES_ANY) {
    await sharp(Buffer.from(svgSource), { density: 384 })
      .resize(taille, taille)
      .png()
      .toFile(join(SORTIE, `icone-${taille}.png`))
  }

  for (const taille of TAILLES_MASKABLE) {
    await sharp(Buffer.from(svgMaskable(taille)), { density: 384 })
      .resize(taille, taille)
      .png()
      .toFile(join(SORTIE, `icone-maskable-${taille}.png`))
  }

  // Favicon : un petit format carré direct depuis la source « any ».
  await sharp(Buffer.from(svgSource), { density: 384 })
    .resize(32, 32)
    .png()
    .toFile(join(SORTIE, 'favicon-32.png'))

  // Icône source pour @capacitor/assets (lot Android) : 1024×1024, sans
  // transparence, motif centré comme la variante « any ».
  await sharp(Buffer.from(svgSource), { density: 384 })
    .resize(1024, 1024)
    .png()
    .toFile(join(SORTIE, 'icone-1024.png'))

  writeFileSync(
    join(SORTIE, 'LISEZMOI.txt'),
    'Icônes générées par scripts/generer-icones.mjs à partir de scripts/icone-source.svg.\n'
    + 'Ne pas éditer directement — modifier la source SVG puis relancer le script.\n',
  )

  console.log('Icônes générées dans public/icones/')
}

generer()
