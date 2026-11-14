'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { prepareForInstagram } from '@/lib/instagram/clientImage'
import { RECIPES, HASHTAGS } from '@/lib/instagram/recipes'
import SlideComposer from './SlideComposer.jsx'
import BoostPanel from './BoostPanel.jsx'
import { ui, StatusPill, thumbUrl } from './ui.jsx'

export default function PostEditor({ postId, account, onClose }) {
  const [post, setPost] = useState(null)
  const [slides, setSlides] = useState([])
  const [title, setTitle] = useState('')
  const [caption, setCaption] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(null)
  const [fitMode, setFitMode] = useState('fill')
  const [confirmPublish, setConfirmPublish] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [tab, setTab] = useState('recipes')
  const fileRef = useRef(null)

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data, error } = await supabase.from('ig_posts').select('*, ig_slides(*)').eq('id', postId).single()
    if (error) { console.error('[instagram] load post', error); setError(error.message); return }
    setPost(data)
    setTitle((t) => (t === '' ? data.title : t))
    setCaption((c) => (c === '' ? data.caption : c))
    setSlides([...(data.ig_slides || [])].sort((a, b) => a.position - b.position))
  }, [postId])

  useEffect(() => { load() }, [load])

  const locked = post?.status === 'published' || post?.status === 'publishing'

  async function save(fields) {
    const supabase = createClient()
    const { error } = await supabase.from('ig_posts').update(fields).eq('id', postId)
    if (error) { console.error('[instagram] save', error); setError(error.message) }
  }

  async function uploadFiles(files) {
    if (!files?.length) return
    const room = 10 - slides.length
    const list = Array.from(files).slice(0, room)
    if (list.length < files.length) setError(`Massimo 10 slide: aggiunte solo ${list.length}.`)
    const supabase = createClient()
    let position = (slides.at(-1)?.position ?? -1) + 1
    for (let i = 0; i < list.length; i++) {
      setBusy(`Carico foto ${i + 1} di ${list.length}...`)
      try {
        const blob = await prepareForInstagram(list[i], { mode: fitMode })
        const id = crypto.randomUUID()
        const path = `${postId}/${id}.jpg`
        const { error: upError } = await supabase.storage.from('instagram').upload(path, blob, { contentType: 'image/jpeg' })
        if (upError) throw new Error(upError.message)
        const { error } = await supabase.from('ig_slides').insert({ id, post_id: postId, position: position++, source: 'upload', storage_path: path })
        if (error) { await supabase.storage.from('instagram').remove([path]); throw new Error(error.message) }
      } catch (e) {
        console.error('[instagram] upload', e)
        setError(e.message)
      }
    }
    setBusy(null)
    if (fileRef.current) fileRef.current.value = ''
    load()
  }

  async function move(index, dir) {
    const j = index + dir
    if (j < 0 || j >= slides.length) return
    const a = slides[index], b = slides[j]
    const supabase = createClient()
    const r1 = await supabase.from('ig_slides').update({ position: b.position }).eq('id', a.id)
    const r2 = await supabase.from('ig_slides').update({ position: a.position }).eq('id', b.id)
    if (r1.error || r2.error) { setError((r1.error || r2.error).message); return }
    load()
  }

  async function remove(slide) {
    const supabase = createClient()
    const { error } = await supabase.from('ig_slides').delete().eq('id', slide.id)
    if (error) { setError(error.message); return }
    const { error: stError } = await supabase.storage.from('instagram').remove([slide.storage_path])
    if (stError) console.error('[instagram] remove file', stError)
    load()
  }

  async function applyRecipe(recipe) {
    if (slides.length + recipe.slides.length > 10) { setError('Troppe slide: svuota il carosello o scegli una ricetta più corta.'); return }
    setError(null)
    for (let i = 0; i < recipe.slides.length; i++) {
      setBusy(`Genero slide ${i + 1} di ${recipe.slides.length}...`)
      const res = await fetch('/api/instagram/slides', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, ...recipe.slides[i] }),
      })
      if (!res.ok) {
        const b = await res.json().catch(() => ({}))
        setError(b.error || 'Errore nella generazione')
        break
      }
    }
    const fields = {}
    if (!caption.trim()) { fields.caption = recipe.caption; setCaption(recipe.caption) }
    if (!title.trim() || title === 'Nuovo carosello') { fields.title = recipe.title; setTitle(recipe.title) }
    if (Object.keys(fields).length) await save(fields)
    setBusy(null)
    load()
  }

  async function publish() {
    setConfirmPublish(false); setError(null)
    await save({ title, caption })
    setBusy('Pubblicazione su Instagram...')
    const res = await fetch('/api/instagram/publish', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ postId }),
    })
    const body = await res.json().catch(() => ({}))
    setBusy(null)
    if (!res.ok) setError(body.error || 'Pubblicazione non riuscita')
    load()
  }

  async function deletePost() {
    const supabase = createClient()
    const paths = slides.map((s) => s.storage_path)
    if (paths.length) {
      const { error: stError } = await supabase.storage.from('instagram').remove(paths)
      if (stError) console.error('[instagram] remove files', stError)
    }
    const { error } = await supabase.from('ig_posts').delete().eq('id', postId)
    if (error) { setError(error.message); return }
    onClose()
  }

  if (!post) return <div style={ui.page}><div style={ui.muted}>{error || 'Caricamento...'}</div></div>

  const tags = (caption.match(/#\w+/g) || []).length

  return (
    <div style={ui.page}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <button type="button" style={ui.ghostBtn} onClick={async () => { if (!locked) await save({ title, caption }); onClose() }}>Indietro</button>
        <StatusPill status={post.status} />
      </div>

      <input aria-label="Titolo interno" style={{ ...ui.input, fontSize: 20, fontWeight: 800, marginTop: 14, border: 'none', padding: '6px 0', background: 'transparent' }}
        value={title} disabled={locked} onChange={(e) => setTitle(e.target.value)} onBlur={() => save({ title })} />

      {error && <div style={ui.error}>{error}</div>}
      {busy && <div style={ui.ok}>{busy}</div>}
      {post.status === 'failed' && post.error && <div style={ui.error}>Ultimo errore: {post.error}</div>}

      {/* Slide */}
      <div style={ui.card}>
        <h2 style={ui.h2}>Slide ({slides.length}/10)</h2>
        {slides.length === 0 && <p style={ui.muted}>Ancora vuoto. Parti da una ricetta o carica le tue foto.</p>}
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 6 }}>
          {slides.map((s, i) => (
            <div key={s.id} style={{ flexShrink: 0, width: 132 }}>
              <img src={thumbUrl(s.storage_path)} alt={`Slide ${i + 1}`} style={{ width: 132, height: 165, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)', display: 'block' }} />
              {!locked && (
                <div style={{ display: 'flex', gap: 4, marginTop: 6, justifyContent: 'space-between' }}>
                  <button type="button" aria-label="Sposta a sinistra" style={ui.smallBtn} onClick={() => move(i, -1)} disabled={i === 0}>‹</button>
                  <button type="button" aria-label="Elimina slide" style={{ ...ui.smallBtn, color: 'var(--red-tx)' }} onClick={() => remove(s)}>✕</button>
                  <button type="button" aria-label="Sposta a destra" style={ui.smallBtn} onClick={() => move(i, 1)} disabled={i === slides.length - 1}>›</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Aggiungi */}
      {!locked && (
        <div style={ui.card}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            {[['recipes', 'Ricette'], ['photos', 'Le mie foto'], ['generate', 'Slide grafica']].map(([k, l]) => (
              <button key={k} type="button" onClick={() => setTab(k)} style={{ ...ui.smallBtn, flex: 1, ...(tab === k ? { background: 'var(--teal)', color: '#fff', borderColor: 'var(--teal)' } : {}) }}>{l}</button>
            ))}
          </div>

          {tab === 'recipes' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {RECIPES.map((r) => (
                <button key={r.id} type="button" disabled={!!busy} onClick={() => applyRecipe(r)} style={{ ...ui.ghostBtn, textAlign: 'left' }}>
                  <b style={{ color: 'var(--text)' }}>{r.title}</b> <span style={{ color: 'var(--text-4)', fontSize: 12 }}>{r.slides.length} slide</span><br />
                  <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{r.description}</span>
                </button>
              ))}
              <p style={ui.muted}>Le slide generate restano modificabili: elimina quelle che non ti piacciono e rifalle da &quot;Slide grafica&quot;.</p>
            </div>
          )}

          {tab === 'photos' && (
            <div>
              <div style={{ display: 'flex', gap: 6 }}>
                {[['fill', 'Riempi (ritaglia)'], ['fit', 'Intera (con bordo)']].map(([k, l]) => (
                  <button key={k} type="button" onClick={() => setFitMode(k)} style={{ ...ui.smallBtn, flex: 1, ...(fitMode === k ? { background: 'var(--teal-lt)', borderColor: 'var(--teal)', color: 'var(--teal-dk)' } : {}) }}>{l}</button>
                ))}
              </div>
              <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={(e) => uploadFiles(e.target.files)} />
              <button type="button" style={{ ...ui.primaryBtn, width: '100%', marginTop: 10 }} disabled={!!busy || slides.length >= 10} onClick={() => fileRef.current?.click()}>
                Scegli foto dal telefono
              </button>
              <p style={{ ...ui.muted, marginTop: 8 }}>Formato 4:5 (1080x1350). I dati GPS delle foto vengono rimossi.</p>
            </div>
          )}

          {tab === 'generate' && <SlideComposer postId={postId} disabled={slides.length >= 10} onAdded={load} />}
        </div>
      )}

      {/* Didascalia */}
      <div style={ui.card}>
        <h2 style={ui.h2}>Didascalia</h2>
        <textarea rows={9} style={{ ...ui.input, resize: 'vertical', fontSize: 15 }} value={caption} disabled={locked}
          onChange={(e) => setCaption(e.target.value)} onBlur={() => save({ caption })} placeholder="Scrivi la didascalia..." />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: caption.length > 2200 || tags > 30 ? 'var(--red-tx)' : 'var(--text-4)' }}>
            {caption.length}/2200 caratteri · {tags}/30 hashtag
          </span>
          {!locked && !caption.includes('#condoreco') && (
            <button type="button" style={ui.smallBtn} onClick={() => setCaption((c) => `${c.trim()}\n\n${HASHTAGS}`)}>+ Hashtag</button>
          )}
        </div>
      </div>

      {/* Pubblica */}
      {!locked && (
        <div style={{ marginTop: 16 }}>
          {!account?.connected && <p style={ui.muted}>Collega l&apos;account Instagram per pubblicare (in alto nella lista).</p>}
          {confirmPublish ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" style={{ ...ui.ghostBtn, flex: 1 }} onClick={() => setConfirmPublish(false)}>Annulla</button>
              <button type="button" style={{ ...ui.orangeBtn, flex: 2 }} onClick={publish}>Conferma: pubblica ora</button>
            </div>
          ) : (
            <button type="button" style={{ ...ui.primaryBtn, width: '100%', padding: '14px 20px', fontSize: 15 }}
              disabled={!!busy || slides.length < 1 || !account?.connected || caption.length > 2200}
              onClick={() => { save({ title, caption }); setConfirmPublish(true) }}>
              Pubblica su Instagram
            </button>
          )}
        </div>
      )}

      {post.status === 'published' && (
        <>
          <div style={ui.ok}>
            Pubblicato il {new Date(post.published_at).toLocaleString('it-IT')}.{' '}
            {post.permalink && <a href={post.permalink} target="_blank" rel="noreferrer" style={{ fontWeight: 700, color: 'inherit' }}>Apri su Instagram</a>}
          </div>
          <BoostPanel post={post} adsReady={account?.ads?.ready} onBoosted={load} />
        </>
      )}

      {post.status !== 'published' && post.status !== 'publishing' && (
        <div style={{ marginTop: 28, textAlign: 'center' }}>
          {confirmDelete ? (
            <button type="button" style={{ ...ui.ghostBtn, color: 'var(--red-tx)', borderColor: 'var(--red-tx)' }} onClick={deletePost}>Conferma eliminazione bozza</button>
          ) : (
            <button type="button" style={{ ...ui.ghostBtn, color: 'var(--text-3)' }} onClick={() => setConfirmDelete(true)}>Elimina bozza</button>
          )}
        </div>
      )}
    </div>
  )
}
