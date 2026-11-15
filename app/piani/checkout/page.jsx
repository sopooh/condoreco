import { Suspense } from 'react'
import CheckoutClient from '@/components/plans/CheckoutClient'

export const metadata = { title: 'Abbonamento', robots: { index: false } }

export default function Page() {
  return <Suspense fallback={null}><CheckoutClient /></Suspense>
}
