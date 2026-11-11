import { Suspense } from 'react'
import ResetPasswordClient from '@/components/auth/ResetPasswordClient'

export const metadata = {
  title: 'Reimposta la password',
  robots: { index: false, follow: false },
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordClient />
    </Suspense>
  )
}
