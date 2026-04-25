import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { getMovieDetail, TMDB_IMAGE_BASE } from '@/lib/tmdb'
import Navbar from '@/components/layout/Navbar'
import Image from 'next/image'
import { Play } from 'lucide-react'
import Link from 'next/link'

interface Props {
  params: Promise<{ id: string }>
}

export default async function MovieDetailPage({ params }: Props) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { id } = await params
  const movie = await getMovieDetail(parseInt(id))

  const runtime = movie.runtime
    ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m`
    : 'N/A'

  const year = movie.release_date?.slice(0, 4) || 'N/A'
  const rating = movie.vote_average?.toFixed(1) || 'N/A'

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      {/* Backdrop */}
      <div className="relative w-full h-[50vw] max-h-[600px] min-h-[300px]">
        {movie.backdrop_path && (
          <Image
            src={`${TMDB_IMAGE_BASE}/original${movie.backdrop_path}`}
            alt={movie.title}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 -mt-32 px-4 md:px-8 pb-16">
        <div className="flex gap-8">
          {/* Poster */}
          {movie.poster_path && (
            <div className="hidden md:block flex-shrink-0 w-48 h-72 relative rounded-lg overflow-hidden">
              <Image
                src={`${TMDB_IMAGE_BASE}/w342${movie.poster_path}`}
                alt={movie.title}
                fill
                className="object-cover"
                sizes="192px"
              />
            </div>
          )}

          {/* Info */}
          <div className="flex-1">
            <h1 className="text-4xl font-bold mb-2">{movie.title}</h1>

            <div className="flex items-center gap-4 text-sm text-zinc-400 mb-4">
              <span className="text-yellow-400 font-semibold">★ {rating}</span>
              <span>{year}</span>
              <span>{runtime}</span>
              {movie.genres?.map((g: { id: number, name: string }) => (
                <span key={g.id} className="bg-zinc-800 px-2 py-1 rounded text-xs">
                  {g.name}
                </span>
              ))}
            </div>

            <p className="text-zinc-300 max-w-2xl mb-6 leading-relaxed">
              {movie.overview}
            </p>

            {/* Play tlačidlo */}
            <Link
              href={`/watch/movie/${movie.id}`}
              className="inline-flex items-center gap-2 bg-white text-black font-bold px-8 py-3 rounded hover:bg-zinc-200 transition"
            >
              <Play className="w-5 h-5 fill-black" />
              Play
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}