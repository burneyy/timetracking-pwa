import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { db } from '../../db/db'
import { ProjectSelect } from './ProjectSelect'
import { archiveProject, createProject } from './projectService'

describe('ProjectSelect', () => {
  afterEach(async () => {
    cleanup()
    await db.projects.clear()
  })

  it('keeps an uncontrolled active project selection', async () => {
    const projectId = await createProject('Client Project', undefined, 'Client')

    render(<ProjectSelect />)

    const select = screen.getByRole<HTMLSelectElement>('combobox', { name: 'Project' })
    await waitFor(() => expect(select).toBeEnabled())
    expect(screen.getByRole('option', { name: 'Client' })).toBeInTheDocument()

    await userEvent.selectOptions(select, projectId)

    expect(select).toHaveValue(projectId)
  })

  it('removes archived projects from the active selector and clears stale selections', async () => {
    const projectId = await createProject('Client Project', undefined, 'Client')

    render(<ProjectSelect />)

    const select = screen.getByRole<HTMLSelectElement>('combobox', { name: 'Project' })
    await waitFor(() => expect(select).toBeEnabled())
    await userEvent.selectOptions(select, projectId)

    await archiveProject(projectId)

    await waitFor(() => expect(select).toHaveValue(''))
    expect(screen.queryByRole('option', { name: 'Client' })).not.toBeInTheDocument()
    expect(select).toBeDisabled()
  })
})
