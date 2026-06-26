import { afterEach, describe, expect, it } from 'vitest'
import { db } from '../../db/db'
import { archiveProject, createProject, listActiveProjects, listAllProjects, updateProject } from './projectService'

describe('projectService', () => {
  afterEach(async () => {
    await db.projects.clear()
  })

  it('creates and lists active projects by name', async () => {
    await createProject('Website', '#1c6b5d')
    await createProject('Admin', '#315f9f')

    await expect(listActiveProjects()).resolves.toMatchObject([
      { name: 'Admin', archived: false },
      { name: 'Website', archived: false },
    ])
  })

  it('requires unique active project names', async () => {
    await createProject('Client')

    await expect(createProject(' client ')).rejects.toThrow('already exists')
  })

  it('allows archived projects to keep historical names out of active selectors', async () => {
    const projectId = await createProject('Client')

    await archiveProject(projectId)
    await createProject('Client')

    await expect(listActiveProjects()).resolves.toHaveLength(1)
    await expect(listAllProjects()).resolves.toHaveLength(2)
  })

  it('allows duplicate names only while the duplicate project is archived', async () => {
    const archivedProjectId = await createProject('Client')

    await archiveProject(archivedProjectId)
    await createProject('Client')

    await expect(updateProject(archivedProjectId, { archived: false })).rejects.toThrow('already exists')
  })

  it('updates name and color', async () => {
    const projectId = await createProject('Old', '#000000')

    await updateProject(projectId, { name: 'New', color: '#ffffff' })

    await expect(db.projects.get(projectId)).resolves.toMatchObject({
      name: 'New',
      color: '#ffffff',
    })
  })
})
