'use client'

import { TMDBMedia } from '@/lib/tmdb'
import MediaCard from './MediaCard'
import Row from './Row'

interface CarouselProps {
  title: string
  items: TMDBMedia[]
  /** Cieľ "View all" – kompletný zoznam kategórie (browse grid s Load More) */
  href?: string
}

export default function Carousel({ title, items, href }: CarouselProps) {
  return (
    <Row title={title} href={href}>
      {items.map((item) => (
        <MediaCard key={item.id} media={item} />
      ))}
    </Row>
  )
}
