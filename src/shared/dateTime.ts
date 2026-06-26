import { format, isSameDay, parseISO } from 'date-fns'

export function calculateDurationMinutes(startAt: string, endAt: string): number {
  const start = new Date(startAt).getTime()
  const end = new Date(endAt).getTime()
  const diffMs = Math.max(0, end - start)

  return Math.round(diffMs / 60_000)
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60

  if (hours === 0) return `${mins}m`
  if (mins === 0) return `${hours}h`

  return `${hours}h ${mins}m`
}

export function formatDate(value: string): string {
  return format(parseISO(value), 'MMM d, yyyy')
}

export function formatTime(value: string): string {
  return format(parseISO(value), 'HH:mm')
}

export function formatDateInput(value: string): string {
  return format(parseISO(value), "yyyy-MM-dd'T'HH:mm")
}

export function isToday(value: string, now = new Date()): boolean {
  return isSameDay(parseISO(value), now)
}

export function startOfLocalDay(value = new Date()): Date {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)

  return date
}

export function startOfNextLocalDay(value = new Date()): Date {
  const date = startOfLocalDay(value)
  date.setDate(date.getDate() + 1)

  return date
}

export function toIsoFromDateTimeLocal(value: string): string {
  return new Date(value).toISOString()
}
