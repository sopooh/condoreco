'use client'
import { Suspense } from 'react'
import ChatPage from '@/components/condo/ChatPage'
export default function P() {
  return <Suspense fallback={null}><ChatPage building={{ id: 'b1', address: 'Via Prova', street_number: '1' }} /></Suspense>
}
