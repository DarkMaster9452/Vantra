// Typy TMDB odpovedí – zdieľané klientom aj serverom (tmdb.ts je server-only)
export interface TMDBMedia {
  id: number
  title?: string
  name?: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  vote_average: number
  vote_count: number
  release_date?: string
  first_air_date?: string
  media_type?: string
  genre_ids?: number[]
  images?: {
    logos: { file_path: string }[]
  }
}

export interface TMDBEpisode {
  episode_number: number
  name: string
  air_date: string | null
  overview: string
  still_path: string | null
  runtime: number | null
}

export interface TMDBTitleLogo {
  file_path: string
  width: number
  height: number
  iso_639_1: string | null
  vote_average: number
}

export interface SpotlightMedia extends TMDBMedia {
  title_logo?: TMDBTitleLogo
}
