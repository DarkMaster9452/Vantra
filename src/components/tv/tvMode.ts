// TV režim: Android TV appka pridáva do user-agenta "VantraTV". V prehliadači
// sa dá zapnúť aj ručne cez ?tv=1 (zapamätá sa), vypnúť cez ?tv=0.
// V TV režime sa nikdy neotvára systémová klávesnica – textové polia
// píšu cez vlastnú on-screen klávesnicu ovládanú D-padom.

const STORAGE_KEY = 'vantra_tv_mode'

let cached: boolean | null = null

export function isTVMode(): boolean {
  if (typeof window === 'undefined') return false
  if (cached !== null) return cached

  let forced: string | null = null
  try {
    const param = new URLSearchParams(window.location.search).get('tv')
    if (param === '1' || param === '0') localStorage.setItem(STORAGE_KEY, param)
    forced = localStorage.getItem(STORAGE_KEY)
  } catch {
    // bez localStorage ide len detekcia podľa user-agenta
  }

  cached = forced !== null ? forced === '1' : /VantraTV|Android TV|AFT[A-Z]|BRAVIA|GoogleTV/i.test(navigator.userAgent)
  return cached
}

/** Bridge z Android appky je vložený v stránke aj v iframoch prehrávačov. */
export function hasPlayerBridge(): boolean {
  return typeof window !== 'undefined' && !!(window as unknown as { __vantraBridge?: number }).__vantraBridge
}
