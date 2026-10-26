export const PRIVATE_NOTE_LIMIT = 2000
export type PrivateReview = { personal_rating: number | null; personal_note: string }
export function hasPrivateReview(value: Partial<PrivateReview>) {
  return value.personal_rating != null || !!value.personal_note?.trim()
}
export function parsePrivateReview(value: unknown): PrivateReview {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid private review.')
  const input = value as Record<string, unknown>
  const rating = input.personal_rating
  if (rating !== null && (typeof rating !== 'number' || !Number.isInteger(rating) || rating < 1 || rating > 10)) throw new Error('Choose a rating from 1 to 10, or leave it unrated.')
  if (typeof input.personal_note !== 'string' || input.personal_note.length > PRIVATE_NOTE_LIMIT) throw new Error(`Keep your note within ${PRIVATE_NOTE_LIMIT} characters.`)
  return { personal_rating: rating as number | null, personal_note: input.personal_note.trim() }
}
