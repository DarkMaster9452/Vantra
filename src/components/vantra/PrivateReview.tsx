'use client'

import { useState, type FormEvent } from 'react'
import Image from 'next/image'
import { ArrowRight, BookmarkMinus, Check, LockKeyhole, MessageSquareText, Star, X } from 'lucide-react'
import { PRIVATE_NOTE_LIMIT, hasPrivateReview, parsePrivateReview, type PrivateReview } from '@/lib/private-review'
import type { LibraryItem } from '@/types/media'
import Modal from './Modal'
import s from './private-review.module.css'

type ReviewItem = LibraryItem & Partial<PrivateReview>
const reactions = ['Not for me', 'A miss', 'Underwhelming', 'Had its moments', 'Somewhere in the middle', 'A good watch', 'Really enjoyed it', 'A favourite', 'Something special', 'Unforgettable']

export function PrivateReviewEditor({ item, onClose, onSaved }: { item: ReviewItem; onClose: () => void; onSaved: (value: PrivateReview) => void }) {
  const [rating, setRating] = useState<number | null>(item.personal_rating ?? null)
  const [hovered, setHovered] = useState<number | null>(null)
  const [note, setNote] = useState(item.personal_note ?? '')
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  const score = hovered ?? rating
  const changed = rating !== (item.personal_rating ?? null) || note.trim() !== (item.personal_note ?? '').trim()
  const poster = item.poster_path ? item.poster_path.startsWith('https://') ? item.poster_path : `https://image.tmdb.org/t/p/w342${item.poster_path}` : null

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy || !changed) return
    setBusy(true); setError('')
    try {
      const response = await fetch(`/api/library/${item.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ personal_rating: rating, personal_note: note }) })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error || 'Could not save your review. Please try again.')
      onSaved(parsePrivateReview(data)); onClose()
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not save your review. Please try again.') }
    finally { setBusy(false) }
  }
  return <Modal onClose={onClose} closable={!busy} labelledBy="private-review-title" className={s.dialog}>
    <form onSubmit={submit}><div className={s.dialogTop}><span className={s.privateBadge}><LockKeyhole size={12} /> JUST FOR YOU</span><button type="button" className={s.closeButton} onClick={onClose} disabled={busy} aria-label="Close private review"><X size={19} /></button></div>
      <div className={s.titleRow}>{poster && <div className={s.miniPoster}><Image src={poster} alt="" fill sizes="64px" /></div>}<div><p className={s.eyebrow}>YOUR TAKE ON THE STORY</p><h2 id="private-review-title">{item.title}</h2><p className={s.kind}>{item.media_type === 'tv' ? 'Series' : item.media_type === 'anime' ? 'Anime' : 'Movie'}<span>·</span>My Library</p></div></div>
      <fieldset className={s.ratingField} disabled={busy}><legend>Your rating<span> / 10</span></legend><div className={s.ratingChoices} onMouseLeave={() => setHovered(null)}>{Array.from({ length: 10 }, (_, i) => i + 1).map(value => <label key={value} className={s.ratingOption} data-active={score != null && value <= score} data-selected={rating === value} onMouseEnter={() => setHovered(value)}><input type="radio" name="private-rating" value={value} checked={rating === value} onChange={() => setRating(value)} aria-label={`${value} out of 10`} data-autofocus={(rating ?? 1) === value ? '' : undefined} /><Star size={18} fill={score != null && value <= score ? 'currentColor' : 'none'} /><span>{value}</span></label>)}</div><div className={s.ratingFeedback}><span aria-live="polite">{score == null ? 'No rating yet. A note is enough, too.' : <><strong>{score}<small>/10</small></strong>{reactions[score - 1]}</>}</span>{rating != null && <button type="button" onClick={() => { setRating(null); setHovered(null) }} disabled={busy}>Clear rating</button>}</div></fieldset>
      <div className={s.noteField}><label htmlFor="private-review-note"><MessageSquareText size={16} /> Your thoughts</label><textarea id="private-review-note" placeholder="What did you think? Would you watch it again?" value={note} onChange={event => setNote(event.target.value)} maxLength={PRIVATE_NOTE_LIMIT} disabled={busy} rows={4} /><div className={s.noteMeta}><span id="private-review-privacy"><LockKeyhole size={11} /> Only visible to you in My Library</span><span>{note.length.toLocaleString('en-GB')} / {PRIVATE_NOTE_LIMIT.toLocaleString('en-GB')}</span></div></div>
      <p className={s.officialNote}>Your personal rating stays separate from the official score.</p>
      {error && <p role="alert" className={s.error}>{error}</p>}<div className={s.dialogFoot}><button type="button" className={s.cancel} onClick={onClose} disabled={busy}>Cancel</button><button className={s.save} disabled={busy || !changed}>{busy ? 'Saving your thoughts…' : hasPrivateReview(item) ? 'Save changes' : 'Save your review'}{busy ? <span className={s.spinner} /> : changed ? <ArrowRight size={15} /> : <Check size={15} />}</button></div>
    </form>
  </Modal>
}

export function RemoveReviewedTitleDialog({ title, busy, error, onCancel, onConfirm }: { title: string; busy: boolean; error?: string | null; onCancel: () => void; onConfirm: () => void }) {
  return <Modal onClose={onCancel} closable={!busy} labelledBy="remove-reviewed-title" className={`${s.dialog} ${s.removeDialog}`}><span className={s.removeIcon}><BookmarkMinus size={26} strokeWidth={1.5} /></span><h2 id="remove-reviewed-title">Let this story go?</h2><p>Removing <strong>{title}</strong> from your watchlist also deletes its private rating, note, watching status, watched episode marks and collection links. This cannot be undone.</p>{error && <p role="alert" className={s.error}>{error}</p>}<div className={s.dialogFoot}><button data-autofocus className={s.cancel} disabled={busy} onClick={onCancel}>Keep this title</button><button className={s.save} disabled={busy} onClick={onConfirm}>{busy ? 'Removing…' : 'Remove title & review'}</button></div></Modal>
}
