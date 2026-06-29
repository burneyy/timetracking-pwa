import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../db/db'
import { ProjectList } from './ProjectList'
import { archiveProject, createProject } from './projectService'

describe('ProjectList', () => {
  afterEach(async () => {
    cleanup()
    vi.restoreAllMocks()
    await db.projects.clear()
  })

  it('archives an active project after confirmation', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const projectId = await createProject('Client')

    render(<ProjectList />)

    await userEvent.click(await screen.findByRole('button', { name: 'Archive Client' }))

    expect(confirm).toHaveBeenCalledWith(
      'Archive "Client"? Archived projects are hidden from active timers but historical entries stay intact.',
    )
    await waitFor(async () => {
      await expect(db.projects.get(projectId)).resolves.toMatchObject({ archived: true })
    })
    expect(screen.getByText('Client · Archived')).toBeInTheDocument()
  })

  it('keeps an active project active when archive confirmation is canceled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const projectId = await createProject('Client')

    render(<ProjectList />)

    await userEvent.click(await screen.findByRole('button', { name: 'Archive Client' }))

    await expect(db.projects.get(projectId)).resolves.toMatchObject({ archived: false })
    expect(screen.getByText('Client · Active')).toBeInTheDocument()
  })

  it('unarchives an archived project from the project list', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const projectId = await createProject('Client')
    await archiveProject(projectId)

    render(<ProjectList />)

    await userEvent.click(await screen.findByRole('button', { name: 'Unarchive Client' }))

    expect(confirm).toHaveBeenCalledWith(
      'Unarchive "Client"? It will be available for new timers and entries again.',
    )
    await waitFor(async () => {
      await expect(db.projects.get(projectId)).resolves.toMatchObject({ archived: false })
    })
    expect(screen.getByText('Client · Active')).toBeInTheDocument()
  })

  it('keeps an archived project archived when unarchive confirmation is canceled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const projectId = await createProject('Client')
    await archiveProject(projectId)

    render(<ProjectList />)

    await userEvent.click(await screen.findByRole('button', { name: 'Unarchive Client' }))

    await expect(db.projects.get(projectId)).resolves.toMatchObject({ archived: true })
    expect(screen.getByText('Client · Archived')).toBeInTheDocument()
  })

  it('shows the active-name conflict when an archived project cannot be unarchived', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const archivedProjectId = await createProject('Client')
    await archiveProject(archivedProjectId)
    await createProject('Client')

    render(<ProjectList />)

    await userEvent.click(await screen.findByRole('button', { name: 'Unarchive Client' }))

    expect(await screen.findByText('An active project with this name already exists.')).toBeInTheDocument()
    await expect(db.projects.get(archivedProjectId)).resolves.toMatchObject({ archived: true })
  })
})
