import type { Metadata } from 'next'
import PersonalStats from '@/components/vantra/PersonalStats'
export const metadata: Metadata = { title: 'Your statistics' }
export default function PersonalStatsPage() { return <PersonalStats /> }
