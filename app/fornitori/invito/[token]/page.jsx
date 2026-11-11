import SupplierInvite from '@/components/suppliers/SupplierInvite'

export const metadata = { title: 'Invito Recofixer', robots: { index: false } }

export default async function Page({ params }) {
  const { token } = await params
  return <SupplierInvite token={token} />
}
