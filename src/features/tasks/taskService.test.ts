import { afterEach, describe, expect, it } from 'vitest'
import { db } from '../../db/db'
import { createProject } from '../projects/projectService'
import { listTaskSuggestions, pinProjectTask, unpinProjectTask } from './taskService'

function titles(items: { title: string }[]) {
  return items.map((item) => item.title)
}

describe('taskService', () => {
  afterEach(async () => {
    await db.tasks.clear()
    await db.timeEntries.clear()
    await db.projects.clear()
  })

  it('pins and unpins project tasks', async () => {
    const projectId = await createProject('Client')
    const taskId = await pinProjectTask(projectId, ' Weekly Sync ')

    await expect(db.tasks.get(taskId)).resolves.toMatchObject({
      projectId,
      title: 'Weekly Sync',
      pinned: true,
    })

    await unpinProjectTask(taskId)

    await expect(db.tasks.get(taskId)).resolves.toBeUndefined()
  })

  it('suggests only pinned and recent tasks for the selected project', async () => {
    const clientProjectId = await createProject('Client')
    const adminProjectId = await createProject('Admin')
    await pinProjectTask(clientProjectId, 'Weekly Sync')
    await pinProjectTask(adminProjectId, 'Admin Planning')
    await db.timeEntries.bulkAdd([
      {
        id: 'client-recent',
        projectId: clientProjectId,
        task: 'TASK-123 Fix export',
        startAt: '2026-06-26T12:00:00.000Z',
        endAt: '2026-06-26T12:30:00.000Z',
        createdAt: '2026-06-26T12:30:00.000Z',
        updatedAt: '2026-06-26T12:30:00.000Z',
      },
      {
        id: 'client-old',
        projectId: clientProjectId,
        task: 'Old task',
        startAt: '2026-05-01T12:00:00.000Z',
        endAt: '2026-05-01T12:30:00.000Z',
        createdAt: '2026-05-01T12:30:00.000Z',
        updatedAt: '2026-05-01T12:30:00.000Z',
      },
      {
        id: 'admin-recent',
        projectId: adminProjectId,
        task: 'Admin Review',
        startAt: '2026-06-26T13:00:00.000Z',
        endAt: '2026-06-26T13:15:00.000Z',
        createdAt: '2026-06-26T13:15:00.000Z',
        updatedAt: '2026-06-26T13:15:00.000Z',
      },
    ])

    const suggestions = await listTaskSuggestions(clientProjectId, '', {
      now: new Date('2026-06-27T00:00:00.000Z'),
    })

    expect(titles(suggestions.pinned)).toEqual(['Weekly Sync'])
    expect(titles(suggestions.recent)).toEqual(['TASK-123 Fix export'])
    expect(titles(suggestions.matches)).toEqual(['TASK-123 Fix export', 'Weekly Sync'])
  })

  it('filters suggestions by query', async () => {
    const projectId = await createProject('Client')
    await pinProjectTask(projectId, 'Weekly Sync')
    await db.timeEntries.add({
      id: 'client-recent',
      projectId,
      task: 'TASK-123 Fix export',
      startAt: '2026-06-26T12:00:00.000Z',
      endAt: '2026-06-26T12:30:00.000Z',
      createdAt: '2026-06-26T12:30:00.000Z',
      updatedAt: '2026-06-26T12:30:00.000Z',
    })

    const suggestions = await listTaskSuggestions(projectId, 'task-', {
      now: new Date('2026-06-27T00:00:00.000Z'),
    })

    expect(titles(suggestions.matches)).toEqual(['TASK-123 Fix export'])
  })
})
