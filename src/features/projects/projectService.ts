import { db } from '../../db/db'
import type { Project } from './projectTypes'

export async function createProject(name: string, color?: string): Promise<string> {
  const now = new Date().toISOString()
  const project: Project = {
    id: crypto.randomUUID(),
    name: name.trim(),
    color,
    archived: false,
    createdAt: now,
    updatedAt: now,
  }

  await db.projects.add(project)

  return project.id
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
