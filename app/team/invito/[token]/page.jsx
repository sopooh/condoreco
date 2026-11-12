import TeamInviteClient from '@/components/team/TeamInviteClient'

export const metadata = { title: 'Invito al team', robots: { index: false } }

export default async function Page({ params }) {
  const { token } = await params
  return <TeamInviteClient token={token} />
}
