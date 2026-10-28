import { readFile } from 'node:fs/promises'
import path from 'node:path'

// Userscript pre PC prehliadač (Tampermonkey / Violentmonkey): vloží do embed
// prehrávačov ten istý bridge ako Android TV appka – ovládanie hlasitosti je
// skryté a hlasitosť vždy 100 %, popupy z reklám sú zablokované a Vantra vidí
// stav videa (odpočet ďalšej epizódy). UI prehrávača na PC zostáva.
// Generuje sa pri builde priamo z bridge.js, takže je vždy rovnaký ako v appke.
export const dynamic = 'force-static'

// Domény embed prehrávačov z /api/stream (aj s subdoménami)
const PLAYER_HOSTS = ['vidlink.pro', 'vidfast.pro', 'videasy.net', 'multiembed.mov', 'embed.su', 'vidsrc.xyz', 'autoembed.cc', 'vidnest.fun']

export async function GET() {
  const bridge = await readFile(path.join(process.cwd(), 'android-tv/app/src/main/assets/bridge.js'), 'utf8')
  const header = [
    '// ==UserScript==',
    '// @name         Vantra – prehrávač bez hlasitosti',
    '// @namespace    https://github.com/DarkMaster9452/Vantra',
    // Pri zmene bridge.js zvýš spolu s verziou Android TV appky
    '// @version      1.4',
    '// @description  V prehrávačoch Vantry skryje ovládanie hlasitosti (vždy 100 %) a zablokuje popupy z reklám.',
    ...PLAYER_HOSTS.flatMap((host) => [`// @match        *://${host}/*`, `// @match        *://*.${host}/*`]),
    '// @run-at       document-start',
    '// @grant        none',
    '// @inject-into  page',
    '// ==/UserScript==',
  ].join('\n')
  return new Response(`${header}\n\n${bridge}`, {
    headers: { 'content-type': 'text/javascript; charset=utf-8' },
  })
}
