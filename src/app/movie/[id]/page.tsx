'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { TMDB_IMAGE_BASE } from '@/lib/tmdb'
import Navbar from '@/components/layout/Navbar'
import Image from 'next/image'
import { Play, Clock, Calendar, DollarSign } from 'lucide-react'
import WatchlistButton from '@/components/media/WatchlistButton'
import MediaCard from '@/components/media/MediaCard'

export default function MovieDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [movie, setMovie] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMovie = async () => {
      try {
        const res = await fetch(`/api/tmdb?type=movie-detail&id=${id}`)
        const data = await res.json()
        setMovie(data)
      } catch {
        console.error('Failed to fetch movie')
      } finally {
        setLoading(false)
      }
    }
    fetchMovie()
  }, [id])

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-zinc-400">Loading...</p>
      </div>
    </div>
  )

  if (!movie) return null

  const runtime = movie.runtime
    ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m`
    : 'N/A'
  const year = movie.release_date?.slice(0, 4) || 'N/A'
  const rating = movie.vote_average?.toFixed(1) || 'N/A'
  const cast = movie.credits?.cast?.slice(0, 8) || []
  const trailer = movie.videos?.results?.find(
    (v: any) => v.type === 'Trailer' && v.site === 'YouTube'
  )
  const logo = movie.images?.logos?.[0]?.file_path
  const backdrops = movie.images?.backdrops?.slice(0, 6) || []
  const similar = movie.similar?.results?.slice(0, 14) || []

  const formatMoney = (amount: number) => {
    if (!amount) return 'N/A'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(amount)
  }

  return (
    <div className="min-h-screen bg-black text-white fade-in">
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
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 -mt-32 px-4 md:px-8 pb-16">
        <div className="flex gap-8">
          {/* Poster */}
          {movie.poster_path && (
            <div className="hidden md:block flex-shrink-0 w-48 h-72 relative rounded-xl overflow-hidden shadow-2xl shadow-black/50 border border-zinc-800">
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
            {logo ? (
              <Image
                src={`${TMDB_IMAGE_BASE}/w500${logo}`}
                alt={movie.title}
                width={400}
                height={150}
                className="object-contain mb-3 drop-shadow-2xl"
                style={{ maxHeight: '120px', width: 'auto' }}
              />
            ) : (
              <h1 className="text-4xl font-bold mb-2">{movie.title}</h1>
            )}

            <div className="flex items-center gap-3 text-sm text-zinc-400 mb-4 flex-wrap">
              <span className="text-red-500 font-bold">★ {rating}</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {year}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {runtime}
              </span>
              {movie.genres?.map((g: any) => (
                <span key={g.id} className="bg-zinc-800 px-2 py-1 rounded-md text-xs border border-zinc-700">
                  {g.name}
                </span>
              ))}
            </div>

            <p className="text-zinc-300 max-w-2xl mb-4 leading-relaxed text-sm md:text-base">
              {movie.overview}
            </p>

            {/* Budget & Revenue */}
            {(movie.budget > 0 || movie.revenue > 0) && (
              <div className="flex gap-6 mb-6">
                {movie.budget > 0 && (
                  <div>
                    <p className="text-zinc-500 text-xs mb-1 flex items-center gap-1">
                      <DollarSign className="w-3 h-3" /> Budget
                    </p>
                    <p className="text-white font-semibold text-sm">{formatMoney(movie.budget)}</p>
                  </div>
                )}
                {movie.revenue > 0 && (
                  <div>
                    <p className="text-zinc-500 text-xs mb-1 flex items-center gap-1">
                      <DollarSign className="w-3 h-3" /> Revenue
                    </p>
                    <p className="text-green-400 font-semibold text-sm">{formatMoney(movie.revenue)}</p>
                  </div>
                )}
              </div>
            )}

            {/* Tlačidlá */}
            <div className="flex items-center gap-3 mb-8">
              <button
                onClick={() => router.push(`/watch/movie/${movie.id}`)}
                className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold px-8 py-3 rounded-lg transition-all duration-200 shadow-lg shadow-red-900/30"
              >
                <Play className="w-5 h-5 fill-white" />
                Play
              </button>

              <WatchlistButton
                tmdbId={movie.id}
                mediaType="movie"
                title={movie.title}
                posterPath={movie.poster_path || ''}
              />
            </div>

            {/* Cast */}
            {cast.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <span className="w-1 h-5 bg-red-500 rounded-full inline-block"></span>
                  Cast
                </h3>
                <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                  {cast.map((actor: any) => (
                    <div key={actor.id} className="flex-shrink-0 w-20 text-center">
                      <div className="relative w-20 h-20 rounded-full overflow-hidden bg-zinc-800 border-2 border-zinc-700 mb-2 mx-auto">
                        {actor.profile_path ? (
                          <Image
                            src={`${TMDB_IMAGE_BASE}/w185${actor.profile_path}`}
                            alt={actor.name}
                            fill
                            className="object-cover"
                            sizes="80px"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-500 text-xl font-bold">
                            {actor.name[0]}
                          </div>
                        )}
                      </div>
                      <p className="text-white text-xs font-medium truncate">{actor.name}</p>
                      <p className="text-zinc-500 text-xs truncate">{actor.character}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Trailer */}
        {trailer && (
          <div className="mt-8 max-w-4xl">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="w-1 h-5 bg-red-500 rounded-full inline-block"></span>
              Trailer
            </h3>
            <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-zinc-800">
              <iframe
                src={`https://www.youtube.com/embed/${trailer.key}`}
                title="Trailer"
                className="w-full h-full"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
            </div>
          </div>
        )}

        {/* Backdrops */}
        {backdrops.length > 0 && (
          <div className="mt-8 max-w-4xl">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="w-1 h-5 bg-red-500 rounded-full inline-block"></span>
              Photos
            </h3>
            <div className="relative group">
              <button
                onClick={() => document.getElementById('backdrops-scroll')?.scrollBy({ left: -500, behavior: 'smooth' })}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-black/80 hover:bg-red-600 p-2 rounded-r-lg opacity-0 group-hover:opacity-100 transition-all duration-200 border-r border-t border-b border-zinc-800"
              >
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div id="backdrops-scroll" className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                {backdrops.map((backdrop: any, index: number) => (
                  <div key={index} className="relative flex-shrink-0 w-64 h-36 rounded-lg overflow-hidden border border-zinc-800">
                    <Image
                      src={`${TMDB_IMAGE_BASE}/w500${backdrop.file_path}`}
                      alt={`Backdrop ${index + 1}`}
                      fill
                      className="object-cover hover:scale-105 transition-transform duration-300"
                      sizes="256px"
                    />
                  </div>
                ))}
              </div>
              <button
                onClick={() => document.getElementById('backdrops-scroll')?.scrollBy({ left: 500, behavior: 'smooth' })}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-black/80 hover:bg-red-600 p-2 rounded-l-lg opacity-0 group-hover:opacity-100 transition-all duration-200 border-l border-t border-b border-zinc-800"
              >
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Similar movies */}
        {similar.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="w-1 h-5 bg-red-500 rounded-full inline-block"></span>
              You May Also Like
            </h3>
            <div className="relative group">
              <button
                onClick={() => document.getElementById('similar-scroll')?.scrollBy({ left: -500, behavior: 'smooth' })}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-black/80 hover:bg-red-600 p-2 rounded-r-lg opacity-0 group-hover:opacity-100 transition-all duration-200 border-r border-t border-b border-zinc-800"
              >
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div id="similar-scroll" className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                {similar.map((item: any) => (
                  <MediaCard key={item.id} media={{ ...item, media_type: 'movie' }} />
                ))}
              </div>
              <button
                onClick={() => document.getElementById('similar-scroll')?.scrollBy({ left: 500, behavior: 'smooth' })}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-black/80 hover:bg-red-600 p-2 rounded-l-lg opacity-0 group-hover:opacity-100 transition-all duration-200 border-l border-t border-b border-zinc-800"
              >
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}