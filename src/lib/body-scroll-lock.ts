let locks = 0
let previous = ''

// Dialogs can overlap briefly during exit transitions. The last one restores
// scrolling, regardless of the order in which they were opened or removed.
export function lockBodyScroll() {
  if (locks++ === 0) { previous = document.body.style.overflow; document.body.style.overflow = 'hidden' }
  let active = true
  return () => {
    if (!active) return
    active = false
    if (--locks === 0) document.body.style.overflow = previous
  }
}
