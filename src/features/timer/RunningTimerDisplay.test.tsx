import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RunningTimerDisplay } from './RunningTimerDisplay'

const projectsById = new Map([
  [
    'project-id',
    {
      id: 'project-id',
      name: 'Client',
      alias: 'CL',
      archived: false,
      createdAt: '',
      updatedAt: '',
    },
  ],
])

describe('RunningTimerDisplay', () => {
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('shows elapsed time from displayed minute buckets', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-26T10:01:01.000Z'))

    render(
      <RunningTimerDisplay
        projectsById={projectsById}
        runningTimer={{
          id: 'active',
          projectId: 'project-id',
          task: 'Implementation',
          startedAt: '2026-06-26T10:00:59.000Z',
        }}
      />,
    )

    expect(screen.getByRole('timer')).toHaveAccessibleName('Running timer: CL, Implementation, 1m elapsed')
  })

  it('uses the current clock immediately when a timer starts after mount', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-26T10:00:01.000Z'))

    const { rerender } = render(<RunningTimerDisplay projectsById={projectsById} />)

    vi.setSystemTime(new Date('2026-06-26T10:01:01.000Z'))
    rerender(
      <RunningTimerDisplay
        projectsById={projectsById}
        runningTimer={{
          id: 'active',
          projectId: 'project-id',
          task: 'Implementation',
          startedAt: '2026-06-26T10:00:59.000Z',
        }}
      />,
    )

    expect(screen.getByRole('timer')).toHaveAccessibleName('Running timer: CL, Implementation, 1m elapsed')
  })

  it('updates when the displayed minute advances', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-26T10:00:59.000Z'))

    render(
      <RunningTimerDisplay
        projectsById={projectsById}
        runningTimer={{
          id: 'active',
          projectId: 'project-id',
          task: 'Implementation',
          startedAt: '2026-06-26T10:00:59.000Z',
        }}
      />,
    )

    expect(screen.getByRole('timer')).toHaveAccessibleName('Running timer: CL, Implementation, 0m elapsed')

    vi.setSystemTime(new Date('2026-06-26T10:01:00.000Z'))
    act(() => {
      vi.advanceTimersByTime(1_000)
    })

    expect(screen.getByRole('timer')).toHaveAccessibleName('Running timer: CL, Implementation, 1m elapsed')
  })
})
