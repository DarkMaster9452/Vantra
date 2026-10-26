'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight, Layers3 } from 'lucide-react'
import { filmCollectionReference } from '@/lib/film-collection'
import c from './film-collection.module.css'

export default function FilmCollectionLink({ value }: { value: unknown }) {
  const collection = filmCollectionReference(value)
  if (!collection) return null
  return <Link href={`/collection/${collection.id}`} prefetch={false} className={c.collectionLink}>
    <div className={c.linkPoster}>{collection.poster_path ? <Image src={`https://image.tmdb.org/t/p/w185${collection.poster_path}`} alt="" fill sizes="48px" /> : <Layers3 size={20} />}</div>
    <div><span className={c.eyebrow}>PART OF A BIGGER STORY</span><h2>{collection.name}</h2><p>Explore every film in release order</p></div><ArrowUpRight size={20} className={c.linkArrow} />
  </Link>
}
