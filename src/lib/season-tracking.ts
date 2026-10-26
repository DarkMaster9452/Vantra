// Only caller-provided, already released episode numbers can enter a bulk write.
export function pendingSeasonEpisodes(released: readonly number[], seen: ReadonlySet<number>) {
  const valid = [...new Set(released)]
  if (valid.length > 1000 || valid.some(value => !Number.isSafeInteger(value) || value < 1 || value > 100000)) throw new Error('Invalid season episodes')
  return valid.filter(value => !seen.has(value)).sort((a,b) => a-b)
}
