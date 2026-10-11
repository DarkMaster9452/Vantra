// Spoločné štýly moderného Vantra UI (sklenené panely, pill tlačidlá).
// Každý interaktívny prvok má výrazný focus stav pre TV ovládač.

const focusLift = 'outline-none transition-[transform,background-color,color,border-color,box-shadow] duration-150 focus-visible:scale-105'

export const ui = {
  /** Hlavná akcia (Play) – biele pill tlačidlo */
  btnPrimary:
    `inline-flex items-center justify-center gap-2 rounded-full bg-white text-black font-semibold h-12 px-8 text-base shadow-lg shadow-black/30 hover:bg-zinc-200 ${focusLift} ` +
    'focus-visible:ring-4 focus-visible:ring-red-600 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:opacity-40 disabled:pointer-events-none',
  /** Vedľajšia akcia – sklenené pill tlačidlo */
  btnSecondary:
    `inline-flex items-center justify-center gap-2 rounded-full bg-white/10 text-white font-semibold h-12 px-6 text-base border border-white/15 backdrop-blur-md hover:bg-white/20 ${focusLift} ` +
    'focus-visible:bg-white focus-visible:text-black focus-visible:border-white disabled:opacity-40 disabled:pointer-events-none',
  /** Menšie tlačidlo (formuláre, admin) */
  btnSmall:
    `inline-flex items-center justify-center gap-1.5 rounded-full bg-white/[0.07] text-zinc-200 text-sm font-medium h-9 px-4 border border-white/10 hover:bg-white/15 hover:text-white ${focusLift} ` +
    'focus-visible:bg-white focus-visible:text-black disabled:opacity-40 disabled:pointer-events-none',
  btnDanger:
    `inline-flex items-center justify-center gap-1.5 rounded-full bg-red-500/10 text-red-300 text-sm font-medium h-9 px-4 border border-red-500/25 hover:bg-red-500/20 ${focusLift} ` +
    'focus-visible:bg-red-600 focus-visible:text-white disabled:opacity-40',
  btnAccent:
    `inline-flex items-center justify-center gap-2 rounded-full bg-red-600 text-white font-semibold h-11 px-6 hover:bg-red-500 ${focusLift} ` +
    'focus-visible:ring-4 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:opacity-40 disabled:pointer-events-none',
  /** Okrúhle ikonové tlačidlo */
  iconButton:
    `inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/10 text-white border border-white/15 backdrop-blur-md hover:bg-white/20 ${focusLift} ` +
    'focus-visible:scale-110 focus-visible:bg-white focus-visible:text-black focus-visible:border-white',
  /** Info štítok (žáner, rok, typ) */
  chip: 'inline-flex items-center gap-1 rounded-full bg-white/10 border border-white/10 px-3 py-1 text-xs font-medium text-zinc-200 backdrop-blur-md',
  /** Sklenený panel */
  panel: 'rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-xl',
  input:
    'w-full rounded-xl bg-white/[0.06] border border-white/10 px-4 h-11 text-white placeholder-zinc-500 outline-none transition-colors ' +
    'focus:border-white/50 focus:bg-white/[0.09]',
  pageTitle: 'text-3xl md:text-4xl font-bold tracking-tight text-white',
  sectionTitle: 'text-lg md:text-xl font-semibold tracking-tight text-white',
  /** Prepínač (tab / filter) */
  pill: (active: boolean) =>
    `inline-flex items-center gap-2 rounded-full h-10 px-5 text-sm font-semibold border ${focusLift} ` +
    (active
      ? 'bg-white text-black border-white focus-visible:ring-4 focus-visible:ring-red-600 focus-visible:ring-offset-2 focus-visible:ring-offset-black'
      : 'bg-white/[0.06] text-zinc-300 border-white/10 hover:bg-white/15 hover:text-white focus-visible:bg-white focus-visible:text-black'),
}
