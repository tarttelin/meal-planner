export function formatDistance(meters: number | null): string {
  if (meters == null) return '-'
  return `${(meters / 1000).toFixed(meters >= 10000 ? 1 : 2)} km`
}

export function formatDuration(seconds: number | null): string {
  if (seconds == null) return '-'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export function formatPace(distanceM: number | null, movingTimeS: number | null): string {
  if (!distanceM || !movingTimeS) return '-'
  const secondsPerKm = movingTimeS / (distanceM / 1000)
  const mins = Math.floor(secondsPerKm / 60)
  const secs = Math.round(secondsPerKm % 60)
  return `${mins}:${String(secs).padStart(2, '0')} /km`
}

export function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}
