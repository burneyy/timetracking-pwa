import { db } from '../../db/db'
import type { TimeEntry } from '../entries/entryTypes'
import type { ProjectTask, TaskSuggestion, TaskSuggestionGroups } from './taskTypes'

const RECENT_WINDOW_DAYS = 14
const DEFAULT_GROUP_LIMIT = 8

function normalizeTaskTitle(title: string) {
  const trimmedTitle = title.trim()

  if (!trimmedTitle) {
    throw new Error('Task is required.')
  }

  return trimmedTitle
}

function taskKey(title: string) {
  return title.trim().toLowerCase()
}

async function assertProjectExists(projectId: string) {
  const trimmedProjectId = projectId.trim()

  if (!trimmedProjectId) {
    throw new Error('Project is required.')
  }

  const project = await db.projects.get(trimmedProjectId)

  if (!project) {
    throw new Error('Project not found.')
  }

  return trimmedProjectId
}

async function findProjectTask(projectId: string, title: string) {
  const key = taskKey(title)

  return db.tasks
    .where('projectId')
    .equals(projectId)
    .filter((task) => taskKey(task.title) === key)
    .first()
}

export async function pinProjectTask(projectId: string, title: string): Promise<string> {
  const validatedProjectId = await assertProjectExists(projectId)
  const normalizedTitle = normalizeTaskTitle(title)
  const existing = await findProjectTask(validatedProjectId, normalizedTitle)
  const now = new Date().toISOString()

  if (existing) {
    await db.tasks.update(existing.id, {
      title: normalizedTitle,
      pinned: true,
      updatedAt: now,
    })

    return existing.id
  }

  const task: ProjectTask = {
    id: crypto.randomUUID(),
    projectId: validatedProjectId,
    title: normalizedTitle,
    pinned: true,
    createdAt: now,
    updatedAt: now,
  }

  await db.tasks.add(task)

  return task.id
}

export async function unpinProjectTask(taskId: string) {
  const existing = await db.tasks.get(taskId)

  if (!existing) {
    throw new Error('Task not found.')
  }

  await db.tasks.delete(taskId)
}

export function listPinnedProjectTasks(projectId: string) {
  if (!projectId) return Promise.resolve([] as ProjectTask[])

  return db.tasks
    .where('projectId')
    .equals(projectId)
    .filter((task) => task.pinned)
    .sortBy('title')
}

export function listAllProjectTasks() {
  return db.tasks.orderBy('title').toArray()
}

function updateRecentSuggestion(
  suggestions: Map<string, TaskSuggestion>,
  entry: TimeEntry,
  cutoffTime: number,
) {
  const startTime = new Date(entry.startAt).getTime()

  if (Number.isNaN(startTime) || startTime < cutoffTime) return

  const title = entry.task.trim()
  if (!title) return

  const key = taskKey(title)
  const existing = suggestions.get(key)

  if (!existing) {
    suggestions.set(key, {
      title,
      pinned: false,
      recent: true,
      lastUsedAt: entry.startAt,
      useCount: 1,
    })
    return
  }

  existing.recent = true
  existing.useCount += 1

  if (!existing.lastUsedAt || entry.startAt > existing.lastUsedAt) {
    existing.lastUsedAt = entry.startAt
    existing.title = title
  }
}

function scoreSuggestion(suggestion: TaskSuggestion, nowTime: number) {
  const lastUsedTime = suggestion.lastUsedAt ? new Date(suggestion.lastUsedAt).getTime() : 0
  const ageDays = lastUsedTime ? Math.max(0, (nowTime - lastUsedTime) / 86_400_000) : RECENT_WINDOW_DAYS
  const recencyScore = suggestion.recent ? Math.max(0, RECENT_WINDOW_DAYS - ageDays) * 8 : 0
  const frequencyScore = Math.min(suggestion.useCount, 8) * 4
  const pinnedScore = suggestion.pinned ? 18 : 0

  return pinnedScore + recencyScore + frequencyScore
}

function sortSuggestions(left: TaskSuggestion, right: TaskSuggestion, nowTime: number) {
  const scoreDelta = scoreSuggestion(right, nowTime) - scoreSuggestion(left, nowTime)
  if (scoreDelta !== 0) return scoreDelta

  const lastUsedDelta =
    new Date(right.lastUsedAt ?? 0).getTime() - new Date(left.lastUsedAt ?? 0).getTime()
  if (lastUsedDelta !== 0) return lastUsedDelta

  return left.title.localeCompare(right.title)
}

export async function listTaskSuggestions(
  projectId: string,
  query = '',
  options: {
    limit?: number
    now?: Date
    recentWindowDays?: number
  } = {},
): Promise<TaskSuggestionGroups> {
  if (!projectId) {
    return { matches: [], pinned: [], recent: [] }
  }

  const limit = options.limit ?? DEFAULT_GROUP_LIMIT
  const now = options.now ?? new Date()
  const nowTime = now.getTime()
  const recentWindowDays = options.recentWindowDays ?? RECENT_WINDOW_DAYS
  const cutoffTime = nowTime - recentWindowDays * 86_400_000
  const normalizedQuery = query.trim().toLowerCase()
  const suggestions = new Map<string, TaskSuggestion>()
  const [pinnedTasks, entries] = await Promise.all([
    listPinnedProjectTasks(projectId),
    db.timeEntries.where('projectId').equals(projectId).toArray(),
  ])

  for (const task of pinnedTasks) {
    suggestions.set(taskKey(task.title), {
      title: task.title,
      pinned: true,
      recent: false,
      useCount: 0,
    })
  }

  for (const entry of entries) {
    updateRecentSuggestion(suggestions, entry, cutoffTime)
  }

  const allSuggestions = [...suggestions.values()]
  const matchesQuery = (suggestion: TaskSuggestion) =>
    !normalizedQuery || suggestion.title.toLowerCase().includes(normalizedQuery)
  const sortedSuggestions = allSuggestions
    .filter(matchesQuery)
    .sort((left, right) => sortSuggestions(left, right, nowTime))

  return {
    matches: sortedSuggestions.slice(0, limit),
    pinned: sortedSuggestions.filter((suggestion) => suggestion.pinned).slice(0, limit),
    recent: sortedSuggestions
      .filter((suggestion) => suggestion.recent && !suggestion.pinned)
      .slice(0, limit),
  }
}
