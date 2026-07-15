import { afterEach, describe, expect, it } from 'vitest'
import { db } from '../../db/db'
import { archiveProject, createProject } from '../projects/projectService'
import {
  createManualEntry,
  deleteEntry,
  listEntriesByDateRange,
  listTodayEntries,
  updateEntry,
} from './entryService'

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
        createdAt: '2026-06-26T00:15:00.000Z',
        updatedAt: '2026-06-26T00:15:00.000Z',
      },
      {
        id: '1',
        projectId,
        task: 'Morning',
        startAt: '2026-06-26T09:00:00.000Z',
        endAt: '2026-06-26T09:30:00.000Z',
        createdAt: '2026-06-26T09:30:00.000Z',
        updatedAt: '2026-06-26T09:30:00.000Z',
      },
      {
        id: '2',
        projectId,
        task: 'Afternoon',
        startAt: '2026-06-26T13:00:00.000Z',
        endAt: '2026-06-26T13:45:00.000Z',
        createdAt: '2026-06-26T13:45:00.000Z',
        updatedAt: '2026-06-26T13:45:00.000Z',
      },
      {
        id: '3',
        projectId,
        task: 'Yesterday',
        startAt: '2026-06-25T13:00:00.000Z',
        endAt: '2026-06-25T13:45:00.000Z',
        createdAt: '2026-06-25T13:45:00.000Z',
        updatedAt: '2026-06-25T13:45:00.000Z',
      },
      {
        id: '4',
        projectId,
        task: 'Boundary end',
        startAt: '2026-06-27T00:00:00.000Z',
        endAt: '2026-06-27T00:15:00.000Z',
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
      createdAt: '2026-06-26T10:15:00.000Z',
      updatedAt: '2026-06-26T10:15:00.000Z',
    })

    await expect(listTodayEntries(new Date('2026-06-26T12:00:00.000Z'))).resolves.toHaveLength(1)
  })

  it('creates manual entries and recalculates duration', async () => {
    const projectId = await createProject('Client')

    const entryId = await createManualEntry({
      projectId,
      task: ' Implementation ',
      startAt: '2026-06-26T10:00:00.000Z',
      endAt: '2026-06-26T10:45:00.000Z',
    })

    await expect(db.timeEntries.get(entryId)).resolves.toMatchObject({
      projectId,
      task: 'Implementation',
    })
  })

  it('allows project-only entries without a task', async () => {
    const projectId = await createProject('Client')

    const entryId = await createManualEntry({
      projectId,
      task: '   ',
      startAt: '2026-06-26T10:00:00.000Z',
      endAt: '2026-06-26T10:30:00.000Z',
    })

    await expect(db.timeEntries.get(entryId)).resolves.toMatchObject({
      projectId,
      task: '',
    })
  })

  it('updates entries and rejects invalid ranges', async () => {
    const projectId = await createProject('Client')
    const entryId = await createManualEntry({
      projectId,
      task: 'Implementation',
      startAt: '2026-06-26T10:00:00.000Z',
      endAt: '2026-06-26T10:30:00.000Z',
    })

    await updateEntry(entryId, {
      task: 'Review',
      endAt: '2026-06-26T11:00:00.000Z',
    })

    await expect(db.timeEntries.get(entryId)).resolves.toMatchObject({
      task: 'Review',
    })
    await expect(updateEntry(entryId, { endAt: '2026-06-26T09:00:00.000Z' })).rejects.toThrow(
      'End time',
    )
    await expect(updateEntry(entryId, { endAt: '2026-06-26T10:00:00.000Z' })).rejects.toThrow(
      'End time',
    )
    await expect(updateEntry(entryId, { startAt: 'not-a-date' })).rejects.toThrow('valid')
  })

  it('requires manual entries to use active projects', async () => {
    const activeProjectId = await createProject('Active Client')
    const archivedProjectId = await createProject('Archived Client')
    await archiveProject(archivedProjectId)

    await expect(
      createManualEntry({
        projectId: archivedProjectId,
        task: 'Support',
        startAt: '2026-06-26T10:00:00.000Z',
        endAt: '2026-06-26T10:30:00.000Z',
      }),
    ).rejects.toThrow('Project must be active')

    const entryId = await createManualEntry({
      projectId: activeProjectId,
      task: 'Implementation',
      startAt: '2026-06-26T10:00:00.000Z',
      endAt: '2026-06-26T10:30:00.000Z',
    })

    await expect(updateEntry(entryId, { projectId: archivedProjectId })).rejects.toThrow(
      'Project must be active',
    )
    await expect(db.timeEntries.get(entryId)).resolves.toMatchObject({
      projectId: activeProjectId,
    })
  })

  it('allows existing archived-project entries to be edited without changing projects', async () => {
    const projectId = await createProject('Archived Client')
    await archiveProject(projectId)
    await db.timeEntries.add({
      id: 'archived-entry',
      projectId,
      task: 'Support',
      startAt: '2026-06-26T10:00:00.000Z',
      endAt: '2026-06-26T10:15:00.000Z',
      createdAt: '2026-06-26T10:15:00.000Z',
      updatedAt: '2026-06-26T10:15:00.000Z',
    })

    await updateEntry('archived-entry', {
      task: ' Support review ',
      endAt: '2026-06-26T10:45:00.000Z',
    })

    await expect(db.timeEntries.get('archived-entry')).resolves.toMatchObject({
      projectId,
      task: 'Support review',
    })
  })

  it('deletes entries', async () => {
    const projectId = await createProject('Client')
    const entryId = await createManualEntry({
      projectId,
      task: 'Implementation',
      startAt: '2026-06-26T10:00:00.000Z',
      endAt: '2026-06-26T10:30:00.000Z',
    })

    await deleteEntry(entryId)

    await expect(db.timeEntries.count()).resolves.toBe(0)
  })

})
