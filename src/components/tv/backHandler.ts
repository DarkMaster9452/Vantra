// Registrácia handlerov pre tlačidlo Späť (TV ovládač / Escape / Backspace).
// Android TV appka volá window.__vantraHandleBack() pred tým, než spraví
// webView.goBack() – stránka si tak môže Back spracovať sama (zavrieť overlay,
// zobraziť menu prehrávača...) a vrátiť 'handled'.

type BackHandler = () => boolean

declare global {
  interface Window {
    __vantraHandleBack?: () => 'handled' | 'unhandled'
  }
}

const handlers: BackHandler[] = []

function dispatch(): 'handled' | 'unhandled' {
  // Posledný zaregistrovaný handler má prednosť (najvrchnejší overlay)
  for (let i = handlers.length - 1; i >= 0; i--) {
    try {
      if (handlers[i]()) return 'handled'
    } catch {
      // chybný handler nesmie zablokovať Back
    }
  }
  return 'unhandled'
}

/** Zaregistruje back handler. Vráti funkciu na odregistrovanie (do useEffect cleanup). */
export function registerBackHandler(handler: BackHandler): () => void {
  handlers.push(handler)
  if (typeof window !== 'undefined') {
    window.__vantraHandleBack = dispatch
  }
  return () => {
    const index = handlers.indexOf(handler)
    if (index !== -1) handlers.splice(index, 1)
  }
}

/** Spustí back handlery manuálne (Escape/Backspace na webe). */
export function handleBack(): boolean {
  return dispatch() === 'handled'
}
