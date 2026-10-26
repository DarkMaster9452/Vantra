import type { TMDBMedia } from '@/lib/tmdb'

interface TMDBDetail extends Omit<TMDBMedia, 'images'> {
  genres: { id: number; name: string }[]
  tagline?: string
  status?: string
  original_language?: string
  credits?: { cast: { id: number; name: string; character: string; profile_path: string | null }[];crew?:{id:number;name:string;job:string;department:string;profile_path:string|null}[] }
  videos?: { results: { key: string; type: string; site: string }[] }
  images?: { logos: { file_path: string; width?: number; height?: number; iso_639_1?: string | null }[]; backdrops: { file_path: string }[] }
  similar?: { results: TMDBMedia[] }
}

export interface MovieDetail extends TMDBDetail {
  belongs_to_collection?: { id: number; name: string; poster_path: string | null; backdrop_path: string | null } | null
  title: string
  runtime: number | null
  budget: number
  revenue: number
}

export interface TVDetail extends TMDBDetail {
  created_by?: { id:number;name:string;profile_path:string|null }[]
  name: string
  seasons: { season_number: number; name: string; episode_count: number; air_date?: string | null }[]
  networks: { id: number; name: string; logo_path: string | null }[]
}

export interface LibraryItem {
  id: string
  user_id: string
  tmdb_id: number
  media_type: 'movie' | 'tv' | 'anime'
  title: string
  poster_path: string | null
  season?: number | null
  episode?: number | null
}

export interface Profile {
  id: string
  display_name: string | null
  avatar_url: string | null
}
