import { db } from '../../db/db'
import type { Project } from './projectTypes'

export type ProjectPatch = Partial<Pick<Project, 'name' | 'color' | 'archived'>>

function normalizeProjectName(name: string) {
  const trimmedName = name.trim()

  if (!trimmedName) {
    throw new Error('Project name is required.')
  }

  return trimmedName
}

async function assertUniqueActiveProjectName(name: string, projectId?: string) {
  const activeProjects = await listActiveProjects()
  const duplicate = activeProjects.some(
    (project) =>
      project.id !== projectId && project.name.trim().toLowerCase() === name.toLowerCase(),
  )

  if (duplicate) {
    throw new Error('An active project with this name already exists.')
  }
}

export async function createProject(name: string, color?: string): Promise<string> {
  const now = new Date().toISOString()
  const trimmedName = normalizeProjectName(name)

  await assertUniqueActiveProjectName(trimmedName)

  const project: Project = {
    id: crypto.randomUUID(),
    name: trimmedName,
    color,
    archived: false,
    createdAt: now,
    updatedAt: now,
  }

  await db.projects.add(project)

  return project.id
}

export async function updateProject(projectId: string, patch: ProjectPatch) {
  const existing = await db.projects.get(projectId)

  if (!existing) {
    throw new Error('Project not found.')
  }

  const nextName = patch.name === undefined ? existing.name : normalizeProjectName(patch.name)
  const nextArchived = patch.archived ?? existing.archived

  if (!nextArchived) {
    await assertUniqueActiveProjectName(nextName, projectId)
  }

  await db.projects.update(projectId, {
    ...patch,
    name: nextName,
    updatedAt: new Date().toISOString(),
  })
}

export async function archiveProject(projectId: string) {
  await updateProject(projectId, { archived: true })
}

export function listActiveProjects() {
  return db.projects
    .orderBy('name')
    .filter((project) => !project.archived)
    .toArray()
}

export function listAllProjects() {
  return db.projects.orderBy('name').toArray()
}
