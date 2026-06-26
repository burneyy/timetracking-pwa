import { afterEach, describe, expect, it } from 'vitest'
import { db } from '../../db/db'
import { createProject } from '../projects/projectService'
import { listEntriesByDateRange, listTodayEntries } from './entryService'

describe('entryService', () => {
  afterEach(async () => {
    await db.timeEntries.clear()
    await db.projects.clear()
  })

  it('lists entries in a date range newest first with an exclusive end boundary', async () => {
    const projectId = await createProject('Client')
    await db.timeEntries.bulkAdd([
      {
        id: '0',
        projectId,
        task: 'Boundary start',
        startAt: '2026-06-26T00:00:00.000Z',
        endAt: '2026-06-26T00:15:00.000Z',
        durationMinutes: 15,
        createdAt: '2026-06-26T00:15:00.000Z',
        updatedAt: '2026-06-26T00:15:00.000Z',
      },
      {
        id: '1',
        projectId,
        task: 'Morning',
        startAt: '2026-06-26T09:00:00.000Z',
        endAt: '2026-06-26T09:30:00.000Z',
        durationMinutes: 30,
        createdAt: '2026-06-26T09:30:00.000Z',
        updatedAt: '2026-06-26T09:30:00.000Z',
      },
      {
        id: '2',
        projectId,
        task: 'Afternoon',
        startAt: '2026-06-26T13:00:00.000Z',
        endAt: '2026-06-26T13:45:00.000Z',
        durationMinutes: 45,
        createdAt: '2026-06-26T13:45:00.000Z',
        updatedAt: '2026-06-26T13:45:00.000Z',
      },
      {
        id: '3',
        projectId,
        task: 'Yesterday',
        startAt: '2026-06-25T13:00:00.000Z',
        endAt: '2026-06-25T13:45:00.000Z',
        durationMinutes: 45,
        createdAt: '2026-06-25T13:45:00.000Z',
        updatedAt: '2026-06-25T13:45:00.000Z',
      },
      {
        id: '4',
        projectId,
        task: 'Boundary end',
        startAt: '2026-06-27T00:00:00.000Z',
        endAt: '2026-06-27T00:15:00.000Z',
        durationMinutes: 15,
        createdAt: '2026-06-27T00:15:00.000Z',
        updatedAt: '2026-06-27T00:15:00.000Z',
      },
    ])

    await expect(
      listEntriesByDateRange(new Date('2026-06-26T00:00:00.000Z'), new Date('2026-06-27T00:00:00.000Z')),
    ).resolves.toMatchObject([{ task: 'Afternoon' }, { task: 'Morning' }, { task: 'Boundary start' }])
  })

  it('lists entries for the local day containing now', async () => {
    const projectId = await createProject('Client')
    await db.timeEntries.add({
      id: '1',
      projectId,
      task: 'Today',
      startAt: '2026-06-26T10:00:00.000Z',
      endAt: '2026-06-26T10:15:00.000Z',
      durationMinutes: 15,
      createdAt: '2026-06-26T10:15:00.000Z',
      updatedAt: '2026-06-26T10:15:00.000Z',
    })

    await expect(listTodayEntries(new Date('2026-06-26T12:00:00.000Z'))).resolves.toHaveLength(1)
  })
})
