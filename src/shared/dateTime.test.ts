import { describe, expect, it } from 'vitest'
import { calculateDurationMinutes, formatDuration } from './dateTime'

describe('dateTime helpers', () => {
  it('rounds duration to the nearest minute', () => {
    expect(calculateDurationMinutes('2026-06-26T10:00:00.000Z', '2026-06-26T10:01:29.000Z')).toBe(1)
    expect(calculateDurationMinutes('2026-06-26T10:00:00.000Z', '2026-06-26T10:01:31.000Z')).toBe(2)
  })

  it('guards negative durations', () => {
    expect(calculateDurationMinutes('2026-06-26T10:02:00.000Z', '2026-06-26T10:01:00.000Z')).toBe(0)
  })

  it('formats minute totals compactly', () => {
    expect(formatDuration(45)).toBe('45m')
    expect(formatDuration(120)).toBe('2h')
    expect(formatDuration(135)).toBe('2h 15m')
  })
})
