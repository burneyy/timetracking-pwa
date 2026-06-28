import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { db } from '../../db/db'
import { archiveProject, createProject } from '../projects/projectService'
import { EntryList } from './EntryList'

describe('EntryList', () => {
  afterEach(async () => {
    cleanup()
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
    expect(screen.getByText('45m')).toBeInTheDocument()
  })
})
