import { db } from '../../db/db'
import type { Project } from './projectTypes'

export type ProjectPatch = Partial<Pick<Project, 'name' | 'alias' | 'color' | 'archived'>>

function normalizeProjectName(name: string) {
  const trimmedName = name.trim()

  if (!trimmedName) {
    throw new Error('Project name is required.')
  }

  return trimmedName
}

function normalizeProjectAlias(alias: string | undefined, fallbackName: string) {
  const trimmedAlias = alias?.trim()

  return trimmedAlias || fallbackName
}

async function assertUniqueActiveProjectIdentity(name: string, alias: string, projectId?: string) {
  const activeProjects = await listActiveProjects()
  const duplicate = activeProjects.some(
    (project) =>
      project.id !== projectId && project.name.trim().toLowerCase() === name.toLowerCase(),
  )

  if (duplicate) {
    throw new Error('An active project with this name already exists.')
  }

  const duplicateAlias = activeProjects.some(
    (project) =>
      project.id !== projectId && project.alias.trim().toLowerCase() === alias.toLowerCase(),
  )

  if (duplicateAlias) {
    throw new Error('An active project with this alias already exists.')
  }
}

export async function createProject(name: string, color?: string, alias?: string): Promise<string> {
  const now = new Date().toISOString()
  const trimmedName = normalizeProjectName(name)
  const trimmedAlias = normalizeProjectAlias(alias, trimmedName)

  await assertUniqueActiveProjectIdentity(trimmedName, trimmedAlias)

  const project: Project = {
    id: crypto.randomUUID(),
    name: trimmedName,
    alias: trimmedAlias,
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
  const nextAlias =
    patch.alias === undefined
      ? normalizeProjectAlias(existing.alias, nextName)
      : normalizeProjectAlias(patch.alias, nextName)
  const nextArchived = patch.archived ?? existing.archived

  if (!nextArchived) {
    await assertUniqueActiveProjectIdentity(nextName, nextAlias, projectId)
  }

  await db.projects.update(projectId, {
    ...patch,
    name: nextName,
    alias: nextAlias,
    updatedAt: new Date().toISOString(),
  })
}

export async function archiveProject(projectId: string) {
  await updateProject(projectId, { archived: true })
}

export async function unarchiveProject(projectId: string) {
  await updateProject(projectId, { archived: false })
}

export function listActiveProjects() {
  return db.projects
    .orderBy('alias')
    .filter((project) => !project.archived)
    .toArray()
}

export function listAllProjects() {
  return db.projects.orderBy('name').toArray()
}
