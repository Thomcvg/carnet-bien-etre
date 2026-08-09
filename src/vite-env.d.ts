/// <reference types="svelte" />
/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

/** Version lisible, reprise de `package.json` à la compilation (voir `vite.config.ts`). */
declare const __VERSION_APP__: string
/** Empreinte courte du dépôt, ou chaîne vide si la compilation n'a pas eu accès à git. */
declare const __EMPREINTE_APP__: string
