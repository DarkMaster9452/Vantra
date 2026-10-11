// Načítavanie: spinner na celú stránku a skeleton riadky kariet

export function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 rounded-full border-[3px] border-white/10 border-t-red-600 animate-spin" />
    </div>
  )
}

export function CardSkeletonRow({ count = 8 }: { count?: number }) {
  return (
    <div className="flex gap-4 overflow-hidden px-4 md:px-12 py-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex-shrink-0 w-36 md:w-44">
          <div className="aspect-[2/3] rounded-xl skeleton" />
          <div className="h-3.5 w-3/4 rounded-full skeleton mt-3" />
          <div className="h-3 w-1/3 rounded-full skeleton mt-2" />
        </div>
      ))}
    </div>
  )
}

export function GridSkeleton({ count = 14 }: { count?: number }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>
          <div className="aspect-[2/3] rounded-xl skeleton" />
          <div className="h-3.5 w-3/4 rounded-full skeleton mt-3" />
        </div>
      ))}
    </div>
  )
}
