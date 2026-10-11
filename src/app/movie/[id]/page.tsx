'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { TMDB_IMAGE_BASE } from '@/lib/tmdb'
import Navbar from '@/components/layout/Navbar'
import { Play, Star, Clock } from 'lucide-react'
import WatchlistButton from '@/components/media/WatchlistButton'
import TrailerButton from '@/components/media/TrailerButton'
import MediaCard from '@/components/media/MediaCard'
import Row from '@/components/media/Row'
import { CastRow, DetailHero, PhotosRow } from '@/components/media/DetailLayout'
import { PageLoader } from '@/components/ui/Loader'
import { ui } from '@/components/ui/styles'

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

  if (loading) return <PageLoader />
  if (!movie) return null

  const runtime = movie.runtime ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m` : null
  const year = movie.release_date?.slice(0, 4)
  const rating = movie.vote_average ? movie.vote_average.toFixed(1) : null
  const cast = movie.credits?.cast?.slice(0, 12) || []
  const trailer = movie.videos?.results?.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube')
  const backdrops: string[] = (movie.images?.backdrops || []).slice(0, 8).map((b: any) => b.file_path)
  const similar = movie.similar?.results?.slice(0, 16) || []

  const formatMoney = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(amount)

  return (
    <div className="min-h-screen text-white pb-16 fade-in">
      <Navbar />

      <DetailHero
        backdrop={movie.backdrop_path ? `${TMDB_IMAGE_BASE}/original${movie.backdrop_path}` : null}
        poster={movie.poster_path ? `${TMDB_IMAGE_BASE}/w342${movie.poster_path}` : null}
        logo={movie.images?.logos?.[0]?.file_path}
        title={movie.title}
        overview={movie.overview}
        chips={
          <>
            {rating && (
              <span className={ui.chip}>
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> {rating}
              </span>
            )}
            {year && <span className={ui.chip}>{year}</span>}
            {runtime && (
              <span className={ui.chip}>
                <Clock className="w-3.5 h-3.5" /> {runtime}
              </span>
            )}
            {movie.genres?.map((g: any) => (
              <span key={g.id} className={ui.chip}>
                {g.name}
              </span>
            ))}
          </>
        }
        extra={
          (movie.budget > 0 || movie.revenue > 0) && (
            <div className="flex gap-8 mb-6 text-sm">
              {movie.budget > 0 && (
                <div>
                  <p className="text-zinc-500 text-xs mb-0.5">Budget</p>
                  <p className="font-semibold">{formatMoney(movie.budget)}</p>
                </div>
              )}
              {movie.revenue > 0 && (
                <div>
                  <p className="text-zinc-500 text-xs mb-0.5">Box office</p>
                  <p className="font-semibold text-emerald-400">{formatMoney(movie.revenue)}</p>
                </div>
              )}
            </div>
          )
        }
        actions={
          <>
            <button data-tv-autofocus onClick={() => router.push(`/watch/movie/${movie.id}`)} className={ui.btnPrimary}>
              <Play className="w-5 h-5 fill-black" />
              Play
            </button>
            <WatchlistButton tmdbId={movie.id} mediaType="movie" title={movie.title} posterPath={movie.poster_path || ''} />
            {trailer && <TrailerButton youtubeKey={trailer.key} />}
          </>
        }
      />

      <CastRow cast={cast} />
      <PhotosRow paths={backdrops} />

      {similar.length > 0 && (
        <div className="mt-10">
          <Row title="More like this">
            {similar.map((item: any) => (
              <MediaCard key={item.id} media={{ ...item, media_type: 'movie' }} />
            ))}
          </Row>
        </div>
      )}
    </div>
  )
}
