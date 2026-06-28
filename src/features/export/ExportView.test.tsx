import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../db/db'
import { archiveProject, createProject } from '../projects/projectService'
import { ExportView } from './ExportView'

describe('ExportView', () => {
  afterEach(async () => {
    cleanup()
    await db.timeEntries.clear()
    await db.projects.clear()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('keeps download disabled while live export data loads', () => {
    render(<ExportView />)

    expect(screen.getByRole('button', { name: 'Download CSV' })).toBeDisabled()
    expect(screen.getByText('Preparing export')).toBeInTheDocument()
  })

  it('downloads entries with archived project names and aliases from live data', async () => {
    const projectId = await createProject('Müller, Archived', undefined, 'MA')
    await archiveProject(projectId)
    await db.timeEntries.add({
      id: 'entry-1',
      projectId,
      task: 'Review export',
      startAt: '2026-06-26T09:00:00.000Z',
      endAt: '2026-06-26T10:00:00.000Z',
      durationMinutes: 60,
      createdAt: '2026-06-26T10:00:00.000Z',
      updatedAt: '2026-06-26T10:00:00.000Z',
    })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:csv')
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)

    render(<ExportView />)

    const button = screen.getByRole('button', { name: 'Download CSV' })
    await waitFor(() => expect(button).toBeEnabled())
    await userEvent.click(button)

    const blob = createObjectURL.mock.calls[0][0] as Blob
    const text = await blob.text()

    expect(text).toContain('"Müller, Archived"')
    expect(text).toContain(',MA,')
    expect(text).toContain('Review export')
    expect(click).toHaveBeenCalled()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:csv')
  })

  it('downloads only entries in a predefined range', async () => {
    const projectId = await createProject('Client')
    const todayStart = new Date()
    todayStart.setHours(9, 0, 0, 0)
    const todayEnd = new Date(todayStart)
    todayEnd.setHours(10, 0, 0, 0)
    const yesterdayStart = new Date(todayStart)
    yesterdayStart.setDate(yesterdayStart.getDate() - 1)
    const yesterdayEnd = new Date(todayEnd)
    yesterdayEnd.setDate(yesterdayEnd.getDate() - 1)
    await db.timeEntries.bulkAdd([
      {
        id: 'entry-today',
        projectId,
        task: 'Today export',
        startAt: todayStart.toISOString(),
        endAt: todayEnd.toISOString(),
        durationMinutes: 60,
        createdAt: todayEnd.toISOString(),
        updatedAt: todayEnd.toISOString(),
      },
      {
        id: 'entry-yesterday',
        projectId,
        task: 'Yesterday export',
        startAt: yesterdayStart.toISOString(),
        endAt: yesterdayEnd.toISOString(),
        durationMinutes: 60,
        createdAt: yesterdayEnd.toISOString(),
        updatedAt: yesterdayEnd.toISOString(),
      },
    ])
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:csv')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)

    render(<ExportView />)

    await userEvent.selectOptions(screen.getByLabelText('Range'), 'today')
    const button = screen.getByRole('button', { name: 'Download CSV' })
    await waitFor(() => expect(screen.getByText('1 entries ready')).toBeInTheDocument())
    await userEvent.click(button)

    const blob = createObjectURL.mock.calls[0][0] as Blob
    const text = await blob.text()

    expect(text).toContain('Today export')
    expect(text).not.toContain('Yesterday export')
    expect(click).toHaveBeenCalled()
  })

  it('downloads only entries in a custom inclusive date range', async () => {
    const projectId = await createProject('Client')
    const beforeStart = new Date(2026, 4, 31, 23, 0)
    const beforeEnd = new Date(2026, 4, 31, 23, 30)
    const startBoundaryStart = new Date(2026, 5, 1, 0, 0)
    const startBoundaryEnd = new Date(2026, 5, 1, 0, 30)
    const endBoundaryStart = new Date(2026, 5, 30, 23, 30)
    const endBoundaryEnd = new Date(2026, 6, 1, 0, 0)
    const afterStart = new Date(2026, 6, 1, 0, 0)
    const afterEnd = new Date(2026, 6, 1, 0, 30)
    await db.timeEntries.bulkAdd([
      {
        id: 'entry-before',
        projectId,
        task: 'Before range',
        startAt: beforeStart.toISOString(),
        endAt: beforeEnd.toISOString(),
        durationMinutes: 30,
        createdAt: beforeEnd.toISOString(),
        updatedAt: beforeEnd.toISOString(),
      },
      {
        id: 'entry-start',
        projectId,
        task: 'Start boundary',
        startAt: startBoundaryStart.toISOString(),
        endAt: startBoundaryEnd.toISOString(),
        durationMinutes: 30,
        createdAt: startBoundaryEnd.toISOString(),
        updatedAt: startBoundaryEnd.toISOString(),
      },
      {
        id: 'entry-end',
        projectId,
        task: 'End boundary',
        startAt: endBoundaryStart.toISOString(),
        endAt: endBoundaryEnd.toISOString(),
        durationMinutes: 30,
        createdAt: endBoundaryEnd.toISOString(),
        updatedAt: endBoundaryEnd.toISOString(),
      },
      {
        id: 'entry-after',
        projectId,
        task: 'After range',
        startAt: afterStart.toISOString(),
        endAt: afterEnd.toISOString(),
        durationMinutes: 30,
        createdAt: afterEnd.toISOString(),
        updatedAt: afterEnd.toISOString(),
      },
    ])
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:csv')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)

    render(<ExportView />)

    await userEvent.selectOptions(screen.getByLabelText('Range'), 'custom')
    fireEvent.change(screen.getByLabelText('Start date'), { target: { value: '2026-06-01' } })
    fireEvent.change(screen.getByLabelText('End date'), { target: { value: '2026-06-30' } })
    await waitFor(() => expect(screen.getByText('2 entries ready')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: 'Download CSV' }))

    const blob = createObjectURL.mock.calls[0][0] as Blob
    const text = await blob.text()

    expect(text).toContain('Start boundary')
    expect(text).toContain('End boundary')
    expect(text).not.toContain('Before range')
    expect(text).not.toContain('After range')
  })
})
