import { filmWorlds } from '../data/film-worlds.ts'
import type { FilmCollection, FilmCollectionReference } from './film-collection.ts'

export type FilmWorld = { id: string; name: string; description: string }
export type RelatedFilmCollection = FilmCollectionReference & { filmCount: number; firstYear: string; lastYear: string; description: string }
export type RelatedFilmWorld = { world: FilmWorld | null; collections: RelatedFilmCollection[]; unavailable: number }

export function filmWorldForCollection(id: number) {
  if (!Number.isSafeInteger(id) || id < 1 || id > 2_147_483_647) return null
  return filmWorlds.find(world => world.collections.some(collection => collection.id === id)) || null
}

export async function loadRelatedFilmWorld(id: number, load: (id: number) => Promise<FilmCollection>): Promise<RelatedFilmWorld> {
  const world = filmWorldForCollection(id)
  if (!world) return { world: null, collections: [], unavailable: 0 }
  const members = world.collections.filter(member => member.id !== id).slice(0, 4)
  const results = await Promise.allSettled(members.map(async member => {
    const collection = await load(member.id)
    if (collection.id !== member.id) throw new Error('Invalid related collection.')
    const years = collection.parts.map(film => film.release_date.slice(0, 4)).filter(Boolean).sort()
    return {
      id: collection.id, name: collection.name, description: member.description,
      poster_path: collection.poster_path || collection.parts.find(film => film.poster_path)?.poster_path || null,
      backdrop_path: collection.backdrop_path || collection.parts.find(film => film.backdrop_path)?.backdrop_path || null,
      filmCount: collection.parts.length, firstYear: years[0] || '', lastYear: years.at(-1) || '',
    }
  }))
  return {
    world: { id: world.id, name: world.name, description: world.description },
    collections: results.flatMap(result => result.status === 'fulfilled' ? [result.value] : []),
    unavailable: results.filter(result => result.status === 'rejected').length,
  }
}
