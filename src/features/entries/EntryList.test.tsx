import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../db/db'
import { formatDate } from '../../shared/dateTime'
import { archiveProject, createProject } from '../projects/projectService'
import { EntryList } from './EntryList'

describe('EntryList', () => {
  afterEach(async () => {
    cleanup()
    vi.restoreAllMocks()
    await db.timeEntries.clear()
    await db.projects.clear()
  })

  it('renders today entries newest first with a duration total', async () => {
    const projectId = await createProject('Client')
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const morning = new Date(today)
    morning.setHours(9, 0, 0, 0)
    const afternoon = new Date(today)
    afternoon.setHours(13, 0, 0, 0)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(13, 0, 0, 0)

    await db.timeEntries.bulkAdd([
      {
        id: '1',
        projectId,
        task: 'Morning',
        startAt: morning.toISOString(),
        endAt: new Date(morning.getTime() + 30 * 60_000).toISOString(),
        createdAt: morning.toISOString(),
        updatedAt: morning.toISOString(),
      },
      {
        id: '2',
        projectId,
        task: 'Afternoon',
        startAt: afternoon.toISOString(),
        endAt: new Date(afternoon.getTime() + 45 * 60_000).toISOString(),
        createdAt: afternoon.toISOString(),
        updatedAt: afternoon.toISOString(),
      },
      {
        id: '3',
        projectId,
        task: 'Yesterday',
        startAt: yesterday.toISOString(),
        endAt: new Date(yesterday.getTime() + 45 * 60_000).toISOString(),
        createdAt: yesterday.toISOString(),
        updatedAt: yesterday.toISOString(),
      },
    ])

    render(<EntryList />)

    const list = await screen.findByRole('list', { name: "Today's time entries" })
    const rows = within(list).getAllByRole('listitem')

    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent('Afternoon')
    expect(rows[1]).toHaveTextContent('Morning')
    expect(screen.getByText('1h 15m')).toBeInTheDocument()
    expect(screen.queryByText('Yesterday')).not.toBeInTheDocument()
  })

  it('resolves archived project aliases for historical entries', async () => {
    const projectId = await createProject('Archived Client', undefined, 'AC')
    await archiveProject(projectId)

    await db.timeEntries.add({
      id: '1',
      projectId,
      task: 'Support',
      startAt: new Date().toISOString(),
      endAt: new Date(Date.now() + 15 * 60_000).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    render(<EntryList />)

    await waitFor(() => expect(screen.getByText('AC')).toBeInTheDocument())
    expect(screen.queryByText('Archived Client')).not.toBeInTheDocument()
    expect(screen.queryByText('Unknown project')).not.toBeInTheDocument()
  })

  it('labels project-only entries without a task', async () => {
    const projectId = await createProject('Client')
    const now = new Date()

    await db.timeEntries.add({
      id: 'project-only',
      projectId,
      task: '',
      startAt: now.toISOString(),
      endAt: new Date(now.getTime() + 15 * 60_000).toISOString(),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    })

    render(<EntryList />)

    expect(await screen.findByText('No task')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit No task' })).toBeInTheDocument()
  })

  it('can render all entries instead of only today', async () => {
    const projectId = await createProject('Client')
    const today = new Date()
    today.setHours(9, 0, 0, 0)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    await db.timeEntries.bulkAdd([
      {
        id: 'today',
        projectId,
        task: 'Today',
        startAt: today.toISOString(),
        endAt: new Date(today.getTime() + 30 * 60_000).toISOString(),
        createdAt: today.toISOString(),
        updatedAt: today.toISOString(),
      },
      {
        id: 'yesterday',
        projectId,
        task: 'Yesterday',
        startAt: yesterday.toISOString(),
        endAt: new Date(yesterday.getTime() + 15 * 60_000).toISOString(),
        createdAt: yesterday.toISOString(),
        updatedAt: yesterday.toISOString(),
      },
    ])

    render(<EntryList scope="all" />)

    const list = await screen.findByRole('list', { name: 'All time entries' })

    expect(within(list).getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByText('Today')).toBeInTheDocument()
    expect(screen.getByText('Yesterday')).toBeInTheDocument()
    expect(screen.getByText(`${formatDate(today.toISOString())}, 09:00 - 09:30`)).toBeInTheDocument()
    expect(screen.getByText('45m')).toBeInTheDocument()
  })

  it('shows both dates for all-entry ranges that cross days', async () => {
    const projectId = await createProject('Client')
    const start = new Date(2026, 5, 29, 23, 30, 0, 0)
    const end = new Date(2026, 5, 30, 0, 15, 0, 0)

    await db.timeEntries.add({
      id: 'overnight',
      projectId,
      task: 'Overnight support',
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      createdAt: start.toISOString(),
      updatedAt: start.toISOString(),
    })

    render(<EntryList scope="all" />)

    expect(
      await screen.findByText(`${formatDate(start.toISOString())}, 23:30 - ${formatDate(end.toISOString())}, 00:15`),
    ).toBeInTheDocument()
  })

  it('deletes an entry after confirmation', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const projectId = await createProject('Client')
    const now = new Date()

    await db.timeEntries.add({
      id: 'entry-to-delete',
      projectId,
      task: 'Planning',
      startAt: now.toISOString(),
      endAt: new Date(now.getTime() + 30 * 60_000).toISOString(),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    })

    render(<EntryList />)

    await userEvent.click(await screen.findByRole('button', { name: 'Delete Planning' }))

    expect(confirm).toHaveBeenCalledWith('Delete "Planning"? This entry will be permanently removed.')
    await waitFor(async () => {
      await expect(db.timeEntries.get('entry-to-delete')).resolves.toBeUndefined()
    })
    expect(screen.queryByText('Planning')).not.toBeInTheDocument()
  })

  it('keeps an entry when delete confirmation is canceled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const projectId = await createProject('Client')
    const now = new Date()

    await db.timeEntries.add({
      id: 'entry-to-keep',
      projectId,
      task: 'Planning',
      startAt: now.toISOString(),
      endAt: new Date(now.getTime() + 30 * 60_000).toISOString(),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    })

    render(<EntryList />)

    await userEvent.click(await screen.findByRole('button', { name: 'Delete Planning' }))

    await expect(db.timeEntries.get('entry-to-keep')).resolves.toMatchObject({ task: 'Planning' })
    expect(screen.getByText('Planning')).toBeInTheDocument()
  })
})
