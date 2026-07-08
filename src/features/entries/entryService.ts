import { db } from '../../db/db'
import {
  startOfLocalDay,
  startOfNextLocalDay,
} from '../../shared/dateTime'
import { assertValidDateRange } from '../../shared/validation'
import type { TimeEntry } from './entryTypes'

export type EntryInput = {
  projectId: string
  task: string
  startAt: string
  endAt: string
}

export type EntryPatch = Partial<EntryInput>

type ValidateEntryOptions = {
  allowArchivedProjectId?: string
}

async function validateEntryInput(input: EntryInput, options: ValidateEntryOptions = {}) {
  const projectId = input.projectId.trim()
  const task = input.task.trim()

  if (!projectId) {
    throw new Error('Project is required.')
  }

  if (!task) {
    throw new Error('Task is required.')
  }

  const project = await db.projects.get(projectId)

  if (!project) {
    throw new Error('Project not found.')
  }

  if (project.archived && project.id !== options.allowArchivedProjectId) {
    throw new Error('Project must be active.')
  }

  const dateRange = assertValidDateRange(input.startAt, input.endAt)

  if (!dateRange.valid) {
    throw new Error(dateRange.message)
  }

  return {
    projectId,
    task,
    startAt: input.startAt,
    endAt: input.endAt,
  }
}

export function listAllEntries() {
  return db.timeEntries.orderBy('startAt').reverse().toArray()
}

export function listEntriesByDateRange(start: Date, end: Date) {
  return db.timeEntries
    .where('startAt')
    .between(start.toISOString(), end.toISOString(), true, false)
    .reverse()
    .toArray()
}

export function listTodayEntries(now = new Date()) {
  return listEntriesByDateRange(startOfLocalDay(now), startOfNextLocalDay(now))
}

export async function createManualEntry(input: EntryInput): Promise<string> {
  const now = new Date().toISOString()
  const validated = await validateEntryInput(input)
  const entry: TimeEntry = {
    id: crypto.randomUUID(),
    projectId: validated.projectId,
    task: validated.task,
    startAt: validated.startAt,
    endAt: validated.endAt,
    createdAt: now,
    updatedAt: now,
  }

  await db.timeEntries.add(entry)

  return entry.id
}

export async function updateEntry(entryId: string, patch: EntryPatch) {
  const existing = await db.timeEntries.get(entryId)

  if (!existing) {
    throw new Error('Entry not found.')
  }

  const validated = await validateEntryInput(
    {
      projectId: patch.projectId ?? existing.projectId,
      task: patch.task ?? existing.task,
      startAt: patch.startAt ?? existing.startAt,
      endAt: patch.endAt ?? existing.endAt,
    },
    {
      allowArchivedProjectId: existing.projectId,
    },
  )

  await db.timeEntries.update(entryId, {
    projectId: validated.projectId,
    task: validated.task,
    startAt: validated.startAt,
    endAt: validated.endAt,
    updatedAt: new Date().toISOString(),
  })
}

export function deleteEntry(entryId: string) {
  return db.timeEntries.delete(entryId)
}
