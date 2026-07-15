import { afterEach, describe, expect, it } from 'vitest'
import { db } from '../../db/db'
import {
  archiveProject,
  createProject,
  listActiveProjects,
  listActiveProjectsByRecentUsage,
  listAllProjects,
  unarchiveProject,
  updateProject,
} from './projectService'

describe('projectService', () => {
  afterEach(async () => {
    await db.timeEntries.clear()
    await db.projects.clear()
  })

  it('creates projects with a default alias and lists active projects by alias', async () => {
    await createProject('Website', '#1c6b5d')
    await createProject('Admin', '#315f9f', 'Backoffice')

    await expect(listActiveProjects()).resolves.toMatchObject([
      { name: 'Admin', alias: 'Backoffice', archived: false },
      { name: 'Website', alias: 'Website', archived: false },
    ])
  })

  it('lists used projects by most recent entry before unused projects', async () => {
    const alphaId = await createProject('Alpha')
    const betaId = await createProject('Beta')
    await createProject('Gamma')

    await db.timeEntries.bulkAdd([
      {
        id: 'alpha-entry',
        projectId: alphaId,
        task: '',
        startAt: '2026-06-26T09:00:00.000Z',
        endAt: '2026-06-26T09:30:00.000Z',
        createdAt: '2026-06-26T09:30:00.000Z',
        updatedAt: '2026-06-26T09:30:00.000Z',
      },
      {
        id: 'beta-entry',
        projectId: betaId,
        task: 'Review',
        startAt: '2026-06-26T11:00:00.000Z',
        endAt: '2026-06-26T11:30:00.000Z',
        createdAt: '2026-06-26T11:30:00.000Z',
        updatedAt: '2026-06-26T11:30:00.000Z',
      },
    ])

    await expect(listActiveProjectsByRecentUsage()).resolves.toMatchObject([
      { name: 'Beta' },
      { name: 'Alpha' },
      { name: 'Gamma' },
    ])
  })

  it('falls back to the project name with spaces replaced when the alias is omitted or blank', async () => {
    const omittedAliasId = await createProject('Client Project')
    const blankAliasId = await createProject('Admin Project', undefined, '   ')

    await expect(db.projects.get(omittedAliasId)).resolves.toMatchObject({
      name: 'Client Project',
      alias: 'Client_Project',
    })
    await expect(db.projects.get(blankAliasId)).resolves.toMatchObject({
      name: 'Admin Project',
      alias: 'Admin_Project',
    })
  })

  it('requires an alias at the database boundary', async () => {
    await expect(
      db.projects.add({
        id: 'missing-alias',
        name: 'Client',
        alias: '',
        archived: false,
        createdAt: '2026-06-26T08:00:00.000Z',
        updatedAt: '2026-06-26T08:00:00.000Z',
      }),
    ).rejects.toThrow('Project alias is required.')
  })

  it('prevents project aliases with spaces at the database boundary', async () => {
    await expect(
      db.projects.add({
        id: 'spaced-alias',
        name: 'Client Project',
        alias: 'Client Project',
        archived: false,
        createdAt: '2026-06-26T08:00:00.000Z',
        updatedAt: '2026-06-26T08:00:00.000Z',
      }),
    ).rejects.toThrow('Project alias cannot contain spaces.')
  })

  it('prevents project aliases with spaces', async () => {
    await expect(createProject('Client Project', undefined, 'Client Project')).rejects.toThrow(
      'Project alias cannot contain spaces.',
    )
  })

  it('requires unique active project names', async () => {
    await createProject('Client')

    await expect(createProject(' client ')).rejects.toThrow('already exists')
  })

  it('requires unique active project aliases', async () => {
    await createProject('Client A', undefined, 'Client')

    await expect(createProject('Client B', undefined, ' client ')).rejects.toThrow(
      'An active project with this alias already exists.',
    )
  })

  it('allows archived projects to keep historical names out of active selectors', async () => {
    const projectId = await createProject('Client')

    await archiveProject(projectId)
    await createProject('Client')

    await expect(listActiveProjects()).resolves.toHaveLength(1)
    await expect(listAllProjects()).resolves.toHaveLength(2)
  })

  it('allows archived projects to keep historical aliases out of active selectors', async () => {
    const projectId = await createProject('Client A', undefined, 'Client')

    await archiveProject(projectId)
    await createProject('Client B', undefined, 'Client')

    await expect(listActiveProjects()).resolves.toMatchObject([
      { name: 'Client B', alias: 'Client', archived: false },
    ])
    await expect(listAllProjects()).resolves.toHaveLength(2)
  })

  it('allows duplicate names only while the duplicate project is archived', async () => {
    const archivedProjectId = await createProject('Client')

    await archiveProject(archivedProjectId)
    await createProject('Client')

    await expect(unarchiveProject(archivedProjectId)).rejects.toThrow('already exists')
  })

  it('allows duplicate aliases only while the duplicate project is archived', async () => {
    const archivedProjectId = await createProject('Client A', undefined, 'Client')

    await archiveProject(archivedProjectId)
    await createProject('Client B', undefined, 'Client')

    await expect(unarchiveProject(archivedProjectId)).rejects.toThrow(
      'An active project with this alias already exists.',
    )
  })

  it('unarchives projects when their names do not conflict with active projects', async () => {
    const projectId = await createProject('Client')

    await archiveProject(projectId)
    await unarchiveProject(projectId)

    await expect(db.projects.get(projectId)).resolves.toMatchObject({ archived: false })
    await expect(listActiveProjects()).resolves.toMatchObject([{ name: 'Client', archived: false }])
  })

  it('updates name, alias, and color', async () => {
    const projectId = await createProject('Old', '#000000')

    await updateProject(projectId, { name: 'New', alias: 'N', color: '#ffffff' })

    await expect(db.projects.get(projectId)).resolves.toMatchObject({
      name: 'New',
      alias: 'N',
      color: '#ffffff',
    })
  })

  it('prevents updates from reusing an active project alias', async () => {
    await createProject('Client A', undefined, 'Client')
    const projectId = await createProject('Admin', undefined, 'Backoffice')

    await expect(updateProject(projectId, { alias: ' client ' })).rejects.toThrow(
      'An active project with this alias already exists.',
    )
  })

  it('keeps aliases mandatory when they are cleared during updates', async () => {
    const projectId = await createProject('Client', undefined, 'C')

    await updateProject(projectId, { name: 'Client Project', alias: ' ' })

    await expect(db.projects.get(projectId)).resolves.toMatchObject({
      name: 'Client Project',
      alias: 'Client_Project',
    })
  })
})
