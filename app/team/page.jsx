import { Suspense } from 'react'
import TeamPageClient from '@/components/team/TeamPageClient'

export const metadata = { title: 'Team e attività', robots: { index: false } }

export default function Page() {
  return <Suspense fallback={null}><TeamPageClient /></Suspense>
}
