import { describe, expect, it } from 'vitest'
import {
  calculateDurationMinutes,
  formatDuration,
  startOfLocalDay,
  startOfLocalMonth,
  startOfLocalWeek,
  startOfNextLocalDay,
  startOfNextLocalMonth,
  startOfNextLocalWeek,
  toIsoFromDateTimeLocal,
} from './dateTime'

describe('dateTime helpers', () => {
  it('calculates duration from displayed minute buckets', () => {
    expect(calculateDurationMinutes('2026-06-26T21:49:45.000Z', '2026-06-26T21:51:14.000Z')).toBe(2)
    expect(calculateDurationMinutes('2026-06-26T10:00:59.000Z', '2026-06-26T10:01:01.000Z')).toBe(1)
    expect(calculateDurationMinutes('2026-06-26T10:00:00.000Z', '2026-06-26T10:01:59.000Z')).toBe(1)
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

  it('finds local week boundaries starting on Monday', () => {
    const date = new Date(2026, 5, 26, 13, 30, 45, 123)

    expect(startOfLocalWeek(date)).toEqual(new Date(2026, 5, 22, 0, 0, 0, 0))
    expect(startOfNextLocalWeek(date)).toEqual(new Date(2026, 5, 29, 0, 0, 0, 0))
  })

  it('finds local month boundaries', () => {
    const date = new Date(2026, 5, 26, 13, 30, 45, 123)

    expect(startOfLocalMonth(date)).toEqual(new Date(2026, 5, 1, 0, 0, 0, 0))
    expect(startOfNextLocalMonth(date)).toEqual(new Date(2026, 6, 1, 0, 0, 0, 0))
  })

  it('converts datetime-local values to ISO strings', () => {
    expect(toIsoFromDateTimeLocal('2026-06-26T10:15')).toBe(
      new Date('2026-06-26T10:15').toISOString(),
    )
    expect(() => toIsoFromDateTimeLocal('not-a-date')).toThrow('valid')
  })
})
