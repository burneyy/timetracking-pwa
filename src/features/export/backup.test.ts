import { afterEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../db/db'
import type { TimeEntry } from '../entries/entryTypes'
import type { Project } from '../projects/projectTypes'
import type { ProjectTask } from '../tasks/taskTypes'
import { exportBackupToJson, importBackupJson, previewBackupJson } from './backup'

function sortById<T extends { id: string }>(items: T[]) {
  return [...items].sort((left, right) => left.id.localeCompare(right.id))
}

describe('backup', () => {
  afterEach(async () => {
    vi.restoreAllMocks()
    await db.tasks.clear()
    await db.timeEntries.clear()
    await db.projects.clear()
  })

  it('round trips projects and entries through backup JSON restore', async () => {
    const projects: Project[] = [
      {
        id: 'project-active',
        name: 'Client Project',
        alias: 'CLIENT',
        color: '#1c6b5d',
        archived: false,
        createdAt: '2026-06-26T08:00:00.000Z',
        updatedAt: '2026-06-26T08:15:00.000Z',
      },
      {
        id: 'project-archived',
        name: 'Archived Work',
        alias: 'ARCHIVED',
        color: '#315f9f',
        archived: true,
        createdAt: '2026-05-20T08:00:00.000Z',
        updatedAt: '2026-06-01T08:00:00.000Z',
      },
    ]
    const entries: TimeEntry[] = [
      {
        id: 'entry-1',
        projectId: 'project-active',
        task: 'Implementation',
        startAt: '2026-06-26T09:00:00.000Z',
        endAt: '2026-06-26T10:00:00.000Z',
        createdAt: '2026-06-26T10:00:00.000Z',
        updatedAt: '2026-06-26T10:00:00.000Z',
      },
      {
        id: 'entry-2',
        projectId: 'project-archived',
        task: 'Historical support',
        startAt: '2026-05-21T12:00:00.000Z',
        endAt: '2026-05-21T12:30:00.000Z',
        createdAt: '2026-05-21T12:30:00.000Z',
        updatedAt: '2026-05-21T12:30:00.000Z',
      },
    ]
    const tasks: ProjectTask[] = [
      {
        id: 'task-weekly-sync',
        projectId: 'project-active',
        title: 'Weekly Sync',
        pinned: true,
        createdAt: '2026-06-26T08:00:00.000Z',
        updatedAt: '2026-06-26T08:00:00.000Z',
      },
    ]

    await db.projects.bulkAdd(projects)
    await db.timeEntries.bulkAdd(entries)
    await db.tasks.bulkAdd(tasks)

    const backupJson = exportBackupToJson(
      await db.projects.toArray(),
      await db.timeEntries.toArray(),
      await db.tasks.toArray(),
    )

    await db.tasks.clear()
    await db.timeEntries.clear()
    await db.projects.clear()

    await expect(importBackupJson(backupJson)).resolves.toEqual({
      conflictedEntries: 0,
      conflictedProjects: 0,
      duplicateEntries: 0,
      importedEntries: 2,
      importedProjects: 2,
      matchedProjects: 0,
    })
    await expect(db.projects.toArray().then(sortById)).resolves.toEqual(sortById(projects))
    await expect(db.timeEntries.toArray().then(sortById)).resolves.toEqual(sortById(entries))
    await expect(db.tasks.toArray().then(sortById)).resolves.toEqual(sortById(tasks))
  })

  it('previews an import without writing local data', async () => {
    const backupJson = exportBackupToJson(
      [
        {
          id: 'project-imported',
          name: 'Imported Project',
          alias: 'IMPORTED',
          color: '#1c6b5d',
          archived: false,
          createdAt: '2026-06-26T08:00:00.000Z',
          updatedAt: '2026-06-26T08:00:00.000Z',
        },
      ],
      [],
    )

    await expect(previewBackupJson(backupJson)).resolves.toEqual({
      conflictedEntries: 0,
      conflictedProjects: 0,
      duplicateEntries: 0,
      importedEntries: 0,
      importedProjects: 1,
      matchedProjects: 0,
    })
    await expect(db.projects.count()).resolves.toBe(0)
  })

  it('accepts project-only entries without a task', async () => {
    const project: Project = {
      id: 'project-client',
      name: 'Client',
      alias: 'CLIENT',
      color: '#1c6b5d',
      archived: false,
      createdAt: '2026-06-26T08:00:00.000Z',
      updatedAt: '2026-06-26T08:00:00.000Z',
    }
    const entry: TimeEntry = {
      id: 'entry-project-only',
      projectId: project.id,
      task: '',
      startAt: '2026-06-26T09:00:00.000Z',
      endAt: '2026-06-26T10:00:00.000Z',
      createdAt: '2026-06-26T10:00:00.000Z',
      updatedAt: '2026-06-26T10:00:00.000Z',
    }

    await expect(importBackupJson(exportBackupToJson([project], [entry]))).resolves.toMatchObject({
      importedEntries: 1,
    })
    await expect(db.timeEntries.get(entry.id)).resolves.toEqual(entry)
  })

  it('matches projects by alias, keeps local project details, and remaps imported entries', async () => {
    const localProject: Project = {
      id: 'local-client',
      name: 'Local Client',
      alias: 'CLIENT',
      color: '#315f9f',
      archived: false,
      createdAt: '2026-06-01T08:00:00.000Z',
      updatedAt: '2026-06-01T08:00:00.000Z',
    }
    await db.projects.add(localProject)

    const backupJson = exportBackupToJson(
      [
        {
          id: 'backup-client',
          name: 'Backup Client',
          alias: 'client',
          color: '#1c6b5d',
          archived: false,
          createdAt: '2026-06-26T08:00:00.000Z',
          updatedAt: '2026-06-26T08:00:00.000Z',
        },
      ],
      [
        {
          id: 'entry-imported',
          projectId: 'backup-client',
          task: 'Implementation',
          startAt: '2026-06-26T09:00:00.000Z',
          endAt: '2026-06-26T10:00:00.000Z',
          createdAt: '2026-06-26T10:00:00.000Z',
          updatedAt: '2026-06-26T10:00:00.000Z',
        },
      ],
    )

    await expect(importBackupJson(backupJson)).resolves.toMatchObject({
      importedEntries: 1,
      importedProjects: 0,
      matchedProjects: 1,
    })
    await expect(db.projects.toArray()).resolves.toEqual([localProject])
    await expect(db.timeEntries.get('entry-imported')).resolves.toMatchObject({
      projectId: 'local-client',
      task: 'Implementation',
    })
  })

  it('remaps imported pinned task suggestions to matched projects and new task ids', async () => {
    const localProject: Project = {
      id: 'local-client',
      name: 'Local Client',
      alias: 'CLIENT',
      color: '#315f9f',
      archived: false,
      createdAt: '2026-06-01T08:00:00.000Z',
      updatedAt: '2026-06-01T08:00:00.000Z',
    }
    const localTask: ProjectTask = {
      id: 'task-collision',
      projectId: 'local-client',
      title: 'Weekly Sync',
      pinned: true,
      createdAt: '2026-06-01T08:00:00.000Z',
      updatedAt: '2026-06-01T08:00:00.000Z',
    }
    await db.projects.add(localProject)
    await db.tasks.add(localTask)
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('00000000-0000-4000-8000-000000000001')

    const backupJson = exportBackupToJson(
      [
        {
          id: 'backup-client',
          name: 'Backup Client',
          alias: 'client',
          color: '#1c6b5d',
          archived: false,
          createdAt: '2026-06-26T08:00:00.000Z',
          updatedAt: '2026-06-26T08:00:00.000Z',
        },
      ],
      [],
      [
        {
          id: 'task-collision',
          projectId: 'backup-client',
          title: 'Roadmap Review',
          pinned: true,
          createdAt: '2026-06-26T08:00:00.000Z',
          updatedAt: '2026-06-26T08:00:00.000Z',
        },
      ],
    )

    await expect(importBackupJson(backupJson)).resolves.toMatchObject({
      importedProjects: 0,
      matchedProjects: 1,
    })
    await expect(db.tasks.toArray().then(sortById)).resolves.toEqual(sortById([
      localTask,
      {
        id: '00000000-0000-4000-8000-000000000001',
        projectId: 'local-client',
        title: 'Roadmap Review',
        pinned: true,
        createdAt: '2026-06-26T08:00:00.000Z',
        updatedAt: '2026-06-26T08:00:00.000Z',
      },
    ]))
  })

  it('skips duplicate imported entries by id or entry fingerprint', async () => {
    const project: Project = {
      id: 'project-client',
      name: 'Client',
      alias: 'CLIENT',
      color: '#1c6b5d',
      archived: false,
      createdAt: '2026-06-26T08:00:00.000Z',
      updatedAt: '2026-06-26T08:00:00.000Z',
    }
    await db.projects.add(project)
    await db.timeEntries.bulkAdd([
      {
        id: 'entry-existing-id',
        projectId: 'project-client',
        task: 'Existing id',
        startAt: '2026-06-26T09:00:00.000Z',
        endAt: '2026-06-26T10:00:00.000Z',
        createdAt: '2026-06-26T10:00:00.000Z',
        updatedAt: '2026-06-26T10:00:00.000Z',
      },
      {
        id: 'entry-existing-fingerprint',
        projectId: 'project-client',
        task: 'Same work',
        startAt: '2026-06-26T11:00:00.000Z',
        endAt: '2026-06-26T12:00:00.000Z',
        createdAt: '2026-06-26T12:00:00.000Z',
        updatedAt: '2026-06-26T12:00:00.000Z',
      },
    ])

    const backupJson = exportBackupToJson(
      [project],
      [
        {
          id: 'entry-existing-id',
          projectId: 'project-client',
          task: 'Different task',
          startAt: '2026-06-27T09:00:00.000Z',
          endAt: '2026-06-27T10:00:00.000Z',
          createdAt: '2026-06-27T10:00:00.000Z',
          updatedAt: '2026-06-27T10:00:00.000Z',
        },
        {
          id: 'entry-imported-fingerprint',
          projectId: 'project-client',
          task: ' same work ',
          startAt: '2026-06-26T11:00:00.000Z',
          endAt: '2026-06-26T12:00:00.000Z',
          createdAt: '2026-06-26T12:00:00.000Z',
          updatedAt: '2026-06-26T12:00:00.000Z',
        },
      ],
    )

    await expect(importBackupJson(backupJson)).resolves.toMatchObject({
      duplicateEntries: 2,
      importedEntries: 0,
    })
    await expect(db.timeEntries.count()).resolves.toBe(2)
  })

  it('skips project name conflicts and their entries', async () => {
    const localProject: Project = {
      id: 'local-client',
      name: 'Client',
      alias: 'LOCAL',
      color: '#315f9f',
      archived: false,
      createdAt: '2026-06-01T08:00:00.000Z',
      updatedAt: '2026-06-01T08:00:00.000Z',
    }
    await db.projects.add(localProject)

    const backupJson = exportBackupToJson(
      [
        {
          id: 'backup-client',
          name: 'client',
          alias: 'REMOTE',
          color: '#1c6b5d',
          archived: false,
          createdAt: '2026-06-26T08:00:00.000Z',
          updatedAt: '2026-06-26T08:00:00.000Z',
        },
      ],
      [
        {
          id: 'entry-skipped',
          projectId: 'backup-client',
          task: 'Implementation',
          startAt: '2026-06-26T09:00:00.000Z',
          endAt: '2026-06-26T10:00:00.000Z',
          createdAt: '2026-06-26T10:00:00.000Z',
          updatedAt: '2026-06-26T10:00:00.000Z',
        },
      ],
    )

    await expect(importBackupJson(backupJson)).resolves.toEqual({
      conflictedEntries: 1,
      conflictedProjects: 1,
      duplicateEntries: 0,
      importedEntries: 0,
      importedProjects: 0,
      matchedProjects: 0,
    })
    await expect(db.projects.toArray()).resolves.toEqual([localProject])
    await expect(db.timeEntries.count()).resolves.toBe(0)
  })
})
