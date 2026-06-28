import { afterEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../db/db'
import { archiveProject, createProject } from '../projects/projectService'
import { getRunningTimer, startTimer, stopTimer } from './timerService'

describe('timerService', () => {
  afterEach(async () => {
    vi.restoreAllMocks()
    await db.runningTimer.clear()
    await db.timeEntries.clear()
    await db.projects.clear()
  })

  it('starts a running timer with a required project and task', async () => {
    const projectId = await createProject('Client')

    await startTimer(projectId, ' Implementation ', '2026-06-26T10:00:00.000Z')

    await expect(getRunningTimer()).resolves.toMatchObject({
      id: 'active',
      projectId,
      task: 'Implementation',
      startedAt: '2026-06-26T10:00:00.000Z',
    })
  })

  it('stops a running timer and creates a completed time entry', async () => {
    const projectId = await createProject('Client')
    await startTimer(projectId, 'Implementation', '2026-06-26T10:00:00.000Z')

    await stopTimer('2026-06-26T10:31:00.000Z')

    await expect(getRunningTimer()).resolves.toBeUndefined()
    await expect(db.timeEntries.toArray()).resolves.toMatchObject([
      {
        projectId,
        task: 'Implementation',
        startAt: '2026-06-26T10:00:00.000Z',
        endAt: '2026-06-26T10:31:00.000Z',
      },
    ])
  })

  it('discards a stopped timer that ran for less than one minute', async () => {
    const projectId = await createProject('Client')
    await startTimer(projectId, 'Implementation', '2026-06-26T10:00:00.000Z')

    await stopTimer('2026-06-26T10:00:59.999Z')

    await expect(getRunningTimer()).resolves.toBeUndefined()
    await expect(db.timeEntries.count()).resolves.toBe(0)
  })

  it('keeps a stopped timer that ran for exactly one minute', async () => {
    const projectId = await createProject('Client')
    await startTimer(projectId, 'Implementation', '2026-06-26T10:00:00.000Z')

    await stopTimer('2026-06-26T10:01:00.000Z')

    await expect(db.timeEntries.toArray()).resolves.toMatchObject([
      {
        projectId,
        task: 'Implementation',
      },
    ])
  })

  it('keeps a stopped timer that crosses a displayed minute boundary', async () => {
    const projectId = await createProject('Client')
    await startTimer(projectId, 'Implementation', '2026-06-26T10:00:59.000Z')

    await stopTimer('2026-06-26T10:01:01.000Z')

    await expect(db.timeEntries.toArray()).resolves.toMatchObject([
      {
        projectId,
        task: 'Implementation',
      },
    ])
  })

  it('starting a new timer saves the current timer and replaces it', async () => {
    const firstProjectId = await createProject('Client')
    const secondProjectId = await createProject('Admin')
    await startTimer(firstProjectId, 'Implementation', '2026-06-26T10:00:00.000Z')

    await startTimer(secondProjectId, 'Review', '2026-06-26T10:15:00.000Z')

    await expect(getRunningTimer()).resolves.toMatchObject({
      projectId: secondProjectId,
      task: 'Review',
      startedAt: '2026-06-26T10:15:00.000Z',
    })
    await expect(db.timeEntries.toArray()).resolves.toMatchObject([
      {
        projectId: firstProjectId,
        task: 'Implementation',
      },
    ])
  })

  it('discards the current timer when switching before one minute', async () => {
    const firstProjectId = await createProject('Client')
    const secondProjectId = await createProject('Admin')
    await startTimer(firstProjectId, 'Implementation', '2026-06-26T10:00:00.000Z')

    await startTimer(secondProjectId, 'Review', '2026-06-26T10:00:59.999Z')

    await expect(getRunningTimer()).resolves.toMatchObject({
      projectId: secondProjectId,
      task: 'Review',
      startedAt: '2026-06-26T10:00:59.999Z',
    })
    await expect(db.timeEntries.count()).resolves.toBe(0)
  })

  it('does nothing when stopping with no active timer', async () => {
    await stopTimer()

    await expect(db.timeEntries.count()).resolves.toBe(0)
  })

  it('requires a project and non-empty task', async () => {
    await expect(startTimer('', 'Task')).rejects.toThrow('Project is required')
    await expect(startTimer('   ', 'Task')).rejects.toThrow('Project is required')
    await expect(startTimer('project-id', '   ')).rejects.toThrow('Task is required')
  })

  it('requires an active project', async () => {
    const projectId = await createProject('Client')
    await archiveProject(projectId)

    await expect(startTimer('missing-project', 'Task')).rejects.toThrow('Project must be active')
    await expect(startTimer(projectId, 'Task')).rejects.toThrow('Project must be active')
    await expect(getRunningTimer()).resolves.toBeUndefined()
  })

  it('leaves the active timer unchanged when switching cannot save the current timer', async () => {
    const firstProjectId = await createProject('Client')
    const secondProjectId = await createProject('Admin')
    const duplicateId = '00000000-0000-4000-8000-000000000000'
    await startTimer(firstProjectId, 'Implementation', '2026-06-26T10:00:00.000Z')
    await db.timeEntries.add({
      id: duplicateId,
      projectId: firstProjectId,
      task: 'Existing',
      startAt: '2026-06-26T09:00:00.000Z',
      endAt: '2026-06-26T09:15:00.000Z',
      createdAt: '2026-06-26T09:15:00.000Z',
      updatedAt: '2026-06-26T09:15:00.000Z',
    })
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(duplicateId)

    await expect(
      startTimer(secondProjectId, 'Review', '2026-06-26T10:15:00.000Z'),
    ).rejects.toThrow()

    await expect(getRunningTimer()).resolves.toMatchObject({
      projectId: firstProjectId,
      task: 'Implementation',
      startedAt: '2026-06-26T10:00:00.000Z',
    })
    await expect(db.timeEntries.count()).resolves.toBe(1)
  })
})
