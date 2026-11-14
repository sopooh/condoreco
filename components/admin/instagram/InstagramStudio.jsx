'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import PostEditor from './PostEditor.jsx'
import AccountPanel from './AccountPanel.jsx'
import { ui, StatusPill, thumbUrl } from './ui.jsx'

export default function InstagramStudio() {
  const [posts, setPosts] = useState(null)
  const [error, setError] = useState(null)
  const [openId, setOpenId] = useState(null)
  const [showAccount, setShowAccount] = useState(false)
  const [account, setAccount] = useState(null)

  const loadPosts = useCallback(async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('ig_posts')
      .select('id, title, status, permalink, published_at, created_at, boost, ig_slides(storage_path, position)')
      .order('created_at', { ascending: false })
    if (error) { console.error('[instagram] posts', error); setError(error.message); return }
    setPosts(data)
  }, [])

  const loadAccount = useCallback(async () => {
    const res = await fetch('/api/instagram/account', { cache: 'no-store' })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) { console.error('[instagram] account', body); return }
    setAccount(body)
  }, [])

  useEffect(() => { loadPosts(); loadAccount() }, [loadPosts, loadAccount])

  async function newPost() {
    const supabase = createClient()
    const { data, error } = await supabase.from('ig_posts')
      .insert({ title: 'Nuovo carosello' }).select('id').single()
    if (error) { console.error('[instagram] new post', error); setError(error.message); return }
    setOpenId(data.id)
  }

  if (openId) {
    return (
      <PostEditor
        postId={openId}
        account={account}
        onClose={() => { setOpenId(null); loadPosts() }}
      />
    )
  }

  return (
    <div style={ui.page}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <Link href="/admin" style={{ fontSize: 13, color: 'var(--text-3)' }}>Area admin</Link>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', margin: '4px 0 0' }}>Studio Instagram</h1>
        </div>
        <button type="button" style={ui.ghostBtn} onClick={() => setShowAccount((v) => !v)}>
          {account?.connected ? `@${account.username}` : 'Collega account'}
        </button>
      </div>

      {(showAccount || (account && !account.connected)) && (
        <AccountPanel account={account} onChange={loadAccount} />
      )}

      {error && <div style={ui.error}>{error}</div>}

      <button type="button" style={{ ...ui.primaryBtn, width: '100%', marginTop: 16, padding: '14px 20px', fontSize: 15 }} onClick={newPost}>
        + Nuovo carosello
      </button>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
        {posts === null && <div style={ui.muted}>Caricamento...</div>}
        {posts?.length === 0 && <div style={ui.muted}>Nessun post ancora. Crea il primo carosello.</div>}
        {posts?.map((p) => {
          const first = [...(p.ig_slides || [])].sort((a, b) => a.position - b.position)[0]
          return (
            <button key={p.id} type="button" onClick={() => setOpenId(p.id)} style={ui.postRow}>
              <div style={ui.postThumb}>
                {first ? <img src={thumbUrl(first.storage_path)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
              </div>
              <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title || 'Senza titolo'}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                  {(p.ig_slides?.length ?? 0)} slide · {new Date(p.published_at || p.created_at).toLocaleDateString('it-IT')}
                  {p.boost?.ad_id ? ' · sponsorizzazione creata' : ''}
                </div>
              </div>
              <StatusPill status={p.status} />
            </button>
          )
        })}
      </div>
    </div>
  )
}
