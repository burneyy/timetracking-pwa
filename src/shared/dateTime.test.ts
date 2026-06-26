import { describe, expect, it } from 'vitest'
import {
  calculateDurationMinutes,
  formatDuration,
  startOfLocalDay,
  startOfNextLocalDay,
  toIsoFromDateTimeLocal,
} from './dateTime'

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

  it('finds local day boundaries', () => {
    const date = new Date(2026, 5, 26, 13, 30, 45, 123)

    expect(startOfLocalDay(date)).toEqual(new Date(2026, 5, 26, 0, 0, 0, 0))
    expect(startOfNextLocalDay(date)).toEqual(new Date(2026, 5, 27, 0, 0, 0, 0))
  })

  it('converts datetime-local values to ISO strings', () => {
    expect(toIsoFromDateTimeLocal('2026-06-26T10:15')).toBe(
      new Date('2026-06-26T10:15').toISOString(),
    )
    expect(() => toIsoFromDateTimeLocal('not-a-date')).toThrow('valid')
  })
})
