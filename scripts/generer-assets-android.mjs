/**
 * Génère les sources pour l'icône et l'écran de démarrage Android, à partir
 * de la même icône source que la PWA (icone-source.svg). `@capacitor/assets`
 * lit ensuite ces fichiers pour produire toutes les résolutions natives —
 * voir docs/03-build-android.md.
 *
 *   node scripts/generer-assets-android.mjs
 *   npx @capacitor/assets generate --android
 */
import sharp from 'sharp'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ICI = dirname(fileURLToPath(import.meta.url))
const RACINE = join(ICI, '..')
const SORTIE = join(RACINE, 'assets')
mkdirSync(SORTIE, { recursive: true })

const svgSource = readFileSync(join(RACINE, 'scripts', 'icone-source.svg'), 'utf8')
const motifSansFond = svgSource
  .replace(/<svg[^>]*>/, '')
  .replace('</svg>', '')
  .replace('<rect width="512" height="512" fill="#4a6450"/>', '')

const SAUGE = '#4a6450'
const PAPIER = '#f7f6f2'

async function icone() {
  // icon.png : plein cadre, comme l'icône PWA « any » — sert de source de secours.
  await sharp(Buffer.from(svgSource), { density: 384 })
    .resize(1024, 1024).png().toFile(join(SORTIE, 'icon.png'))

  // icon-foreground.png : motif réduit et centré, fond transparent — c'est
  // l'icône adaptative Android, combinée au moment de l'affichage avec le fond.
  const echelleAvantPlan = 0.45
  const decalageAvantPlan = (1024 * (1 - echelleAvantPlan)) / 2
  const svgAvantPlan = `<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
    <g transform="translate(${decalageAvantPlan}, ${decalageAvantPlan}) scale(${echelleAvantPlan * 2})">${motifSansFond}</g>
  </svg>`
  await sharp(Buffer.from(svgAvantPlan), { density: 384 })
    .resize(1024, 1024).png().toFile(join(SORTIE, 'icon-foreground.png'))

  // icon-background.png : le fond sauge uni, séparé pour l'icône adaptative.
  await sharp({ create: { width: 1024, height: 1024, channels: 3, background: SAUGE } })
    .png().toFile(join(SORTIE, 'icon-background.png'))
}

async function splash() {
  // Le motif est clair sur fond sauge dans l'icône ; l'écran de démarrage est
  // sur fond papier clair, donc le motif y est recoloré en sauge foncé pour
  // rester visible — sans quoi il se fondrait dans le fond (bug déjà rencontré).
  const motifFonce = motifSansFond.replace(/#f7f6f2/g, SAUGE)

  const echelle = 0.32
  const taille = 2732 * echelle
  const decalage = (2732 - taille) / 2
  const svgSplash = `<svg width="2732" height="2732" viewBox="0 0 2732 2732" xmlns="http://www.w3.org/2000/svg">
    <rect width="2732" height="2732" fill="${PAPIER}"/>
    <g transform="translate(${decalage}, ${decalage}) scale(${taille / 512})">${motifFonce}</g>
  </svg>`
  await sharp(Buffer.from(svgSplash), { density: 384 })
    .resize(2732, 2732).png().toFile(join(SORTIE, 'splash.png'))
}

await icone()
await splash()
writeFileSync(
  join(SORTIE, 'LISEZMOI.txt'),
  "Sources pour @capacitor/assets, générées par scripts/generer-assets-android.mjs.\n"
  + "Ne pas éditer directement — modifier scripts/icone-source.svg puis relancer.\n",
)
console.log('Sources Android générées dans assets/')
