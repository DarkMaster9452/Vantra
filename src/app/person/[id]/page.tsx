import { notFound } from 'next/navigation'
import { parseInteger } from '@/lib/watch-metadata'
import PersonDetail from '@/components/vantra/PersonDetail'
export const metadata={title:'People behind the stories'}
export default async function PersonPage({params}:{params:Promise<{id:string}>}) {
  const {id}=await params,identifier=parseInteger(id)
  if(identifier===null)notFound()
  return <PersonDetail key={identifier} id={identifier}/>
}
