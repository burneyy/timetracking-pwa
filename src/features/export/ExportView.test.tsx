import { cleanup, render, screen, waitFor } from '@testing-library/react'
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
    vi.restoreAllMocks()
  })

  it('keeps download disabled while live export data loads', () => {
    render(<ExportView />)

    expect(screen.getByRole('button', { name: 'Download CSV' })).toBeDisabled()
    expect(screen.getByText('Preparing export')).toBeInTheDocument()
  })

  it('downloads entries with archived project names from live data', async () => {
    const projectId = await createProject('Müller, Archived')
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
    expect(text).toContain('Review export')
    expect(click).toHaveBeenCalled()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:csv')
  })
})
