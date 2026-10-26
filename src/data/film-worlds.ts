// Verified connections between film collections, not inferred from similar
// titles, genres or cast. Keep each group at five collections or fewer.
export const filmWorlds = [
  {
    id: 'wizarding-world', name: 'Wizarding World',
    description: 'More magic, different chapters. Explore the connected stories of Harry Potter and Fantastic Beasts.',
    sources: ['https://www.harrypotter.com/discover/films'],
    collections: [
      { id: 1241, description: 'The Hogwarts years and Harry Potter’s story.' },
      { id: 435259, description: 'An earlier era of the wizarding world, with Newt Scamander.' },
    ],
  },
  {
    id: 'middle-earth', name: 'Middle-earth',
    description: 'Another journey through Middle-earth, from Bilbo’s adventure to the Fellowship of the Ring.',
    sources: ['https://www.middleearth.com/films', 'https://www.middleearth.com/history'],
    collections: [
      { id: 119, description: 'Follow the Fellowship on the journey to destroy the One Ring.' },
      { id: 121938, description: 'Bilbo Baggins’ earlier adventure with Gandalf and the dwarves.' },
    ],
  },
  {
    id: 'rocky-creed', name: 'Rocky & Creed',
    description: 'A shared legacy in the ring. Follow Rocky Balboa and the next generation with Adonis Creed.',
    sources: ['https://www.mgm.com/movies/creed', 'https://www.mgm.com/movies/creed-ii'],
    collections: [
      { id: 1575, description: 'The story and legacy of Rocky Balboa.' },
      { id: 553717, description: 'Adonis Creed carries the legacy into a new generation.' },
    ],
  },
  {
    id: 'conjuring-universe', name: 'The Conjuring Universe',
    description: 'Connected hauntings, different nightmares. Explore the Warrens’ cases and the stories surrounding them.',
    sources: ['https://press.wbd.com/na/media-release/hbo-max/max-announces-development-drama-series-set-conjuring-universe'],
    collections: [
      { id: 313086, description: 'The paranormal investigations of Ed and Lorraine Warren.' },
      { id: 402074, description: 'The haunted doll’s story beyond the Warrens’ main cases.' },
      { id: 968052, description: 'The haunting of Valak and the demonic nun.' },
    ],
  },
] as const
