import { afterEach, describe, expect, it } from 'vitest'
import { db } from '../../db/db'
import type { TimeEntry } from '../entries/entryTypes'
import type { Project } from '../projects/projectTypes'
import { exportBackupToJson, importBackupJson, previewBackupJson } from './backup'

function sortById<T extends { id: string }>(items: T[]) {
  return [...items].sort((left, right) => left.id.localeCompare(right.id))
}

describe('backup', () => {
  afterEach(async () => {
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

    await db.projects.bulkAdd(projects)
    await db.timeEntries.bulkAdd(entries)

    const backupJson = exportBackupToJson(await db.projects.toArray(), await db.timeEntries.toArray())

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
