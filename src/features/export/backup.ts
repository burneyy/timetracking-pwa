import { db } from '../../db/db'
import { assertValidDateRange } from '../../shared/validation'
import type { TimeEntry } from '../entries/entryTypes'
import type { Project } from '../projects/projectTypes'
import type { ProjectTask } from '../tasks/taskTypes'

const BACKUP_FORMAT = 'timetracker-backup'
const BACKUP_VERSION = 1

export type BackupDocument = {
  exportedAt: string
  format: typeof BACKUP_FORMAT
  projects: Project[]
  tasks: ProjectTask[]
  timeEntries: TimeEntry[]
  version: typeof BACKUP_VERSION
}

export type BackupImportOptions = {
  projectsOnly?: boolean
}

export type BackupImportResult = {
  conflictedEntries: number
  conflictedProjects: number
  duplicateEntries: number
  importedEntries: number
  importedProjects: number
  matchedProjects: number
}

type BackupImportPlan = {
  entriesToImport: TimeEntry[]
  projectsToImport: Project[]
  tasksToImport: ProjectTask[]
  result: BackupImportResult
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function assertString(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new Error(`Backup ${field} must be a string.`)
  }

  return value
}

function assertBoolean(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') {
    throw new Error(`Backup ${field} must be a boolean.`)
  }

  return value
}

function assertOptionalString(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined

  return assertString(value, field)
}

function assertIsoDate(value: string, field: string) {
  if (Number.isNaN(new Date(value).getTime())) {
    throw new Error(`Backup ${field} must be a valid date.`)
  }
}

function normalizeProject(project: unknown, index: number): Project {
  if (!isRecord(project)) {
    throw new Error(`Backup projects[${index}] must be an object.`)
  }

  const normalized: Project = {
    id: assertString(project.id, `projects[${index}].id`).trim(),
    name: assertString(project.name, `projects[${index}].name`).trim(),
    alias: assertString(project.alias, `projects[${index}].alias`).trim(),
    color: assertOptionalString(project.color, `projects[${index}].color`),
    archived: assertBoolean(project.archived, `projects[${index}].archived`),
    createdAt: assertString(project.createdAt, `projects[${index}].createdAt`),
    updatedAt: assertString(project.updatedAt, `projects[${index}].updatedAt`),
  }

  if (!normalized.id) throw new Error(`Backup projects[${index}].id is required.`)
  if (!normalized.name) throw new Error(`Backup projects[${index}].name is required.`)
  if (!normalized.alias) throw new Error(`Backup projects[${index}].alias is required.`)
  if (normalized.alias.includes(' ')) {
    throw new Error(`Backup projects[${index}].alias cannot contain spaces.`)
  }

  assertIsoDate(normalized.createdAt, `projects[${index}].createdAt`)
  assertIsoDate(normalized.updatedAt, `projects[${index}].updatedAt`)

  return normalized
}

function normalizeEntry(entry: unknown, index: number): TimeEntry {
  if (!isRecord(entry)) {
    throw new Error(`Backup timeEntries[${index}] must be an object.`)
  }

  const normalized: TimeEntry = {
    id: assertString(entry.id, `timeEntries[${index}].id`).trim(),
    projectId: assertString(entry.projectId, `timeEntries[${index}].projectId`).trim(),
    task: assertString(entry.task, `timeEntries[${index}].task`).trim(),
    startAt: assertString(entry.startAt, `timeEntries[${index}].startAt`),
    endAt: assertString(entry.endAt, `timeEntries[${index}].endAt`),
    createdAt: assertString(entry.createdAt, `timeEntries[${index}].createdAt`),
    updatedAt: assertString(entry.updatedAt, `timeEntries[${index}].updatedAt`),
  }

  if (!normalized.id) throw new Error(`Backup timeEntries[${index}].id is required.`)
  if (!normalized.projectId) throw new Error(`Backup timeEntries[${index}].projectId is required.`)
  const range = assertValidDateRange(normalized.startAt, normalized.endAt)
  if (!range.valid) {
    throw new Error(`Backup timeEntries[${index}] has an invalid date range.`)
  }

  assertIsoDate(normalized.createdAt, `timeEntries[${index}].createdAt`)
  assertIsoDate(normalized.updatedAt, `timeEntries[${index}].updatedAt`)

  return normalized
}

function normalizeTask(task: unknown, index: number): ProjectTask {
  if (!isRecord(task)) {
    throw new Error(`Backup tasks[${index}] must be an object.`)
  }

  const normalized: ProjectTask = {
    id: assertString(task.id, `tasks[${index}].id`).trim(),
    projectId: assertString(task.projectId, `tasks[${index}].projectId`).trim(),
    title: assertString(task.title, `tasks[${index}].title`).trim(),
    pinned: assertBoolean(task.pinned, `tasks[${index}].pinned`),
    createdAt: assertString(task.createdAt, `tasks[${index}].createdAt`),
    updatedAt: assertString(task.updatedAt, `tasks[${index}].updatedAt`),
  }

  if (!normalized.id) throw new Error(`Backup tasks[${index}].id is required.`)
  if (!normalized.projectId) throw new Error(`Backup tasks[${index}].projectId is required.`)
  if (!normalized.title) throw new Error(`Backup tasks[${index}].title is required.`)

  assertIsoDate(normalized.createdAt, `tasks[${index}].createdAt`)
  assertIsoDate(normalized.updatedAt, `tasks[${index}].updatedAt`)

  return normalized
}

function projectAliasKey(project: Pick<Project, 'alias'>) {
  return project.alias.trim().toLowerCase()
}

function projectNameKey(project: Pick<Project, 'name'>) {
  return project.name.trim().toLowerCase()
}

function entryFingerprint(entry: Pick<TimeEntry, 'endAt' | 'projectId' | 'startAt' | 'task'>) {
  return [entry.projectId, entry.task.trim().toLowerCase(), entry.startAt, entry.endAt].join('\u001f')
}

function taskFingerprint(task: Pick<ProjectTask, 'projectId' | 'title'>) {
  return [task.projectId, task.title.trim().toLowerCase()].join('\u001f')
}

function createEmptyImportResult(): BackupImportResult {
  return {
    conflictedEntries: 0,
    conflictedProjects: 0,
    duplicateEntries: 0,
    importedEntries: 0,
    importedProjects: 0,
    matchedProjects: 0,
  }
}

function buildBackupImportPlan(
  backup: BackupDocument,
  existingProjects: Project[],
  existingEntries: TimeEntry[],
  existingTasks: ProjectTask[],
  options: BackupImportOptions,
): BackupImportPlan {
  const result = createEmptyImportResult()
  const projectIdMap = new Map<string, string>()
  const conflictedProjectIds = new Set<string>()
  const existingProjectIds = new Set(existingProjects.map((project) => project.id))
  const projectsByAlias = new Map(existingProjects.map((project) => [projectAliasKey(project), project]))
  const projectsByName = new Map(existingProjects.map((project) => [projectNameKey(project), project]))
  const projectsToImport: Project[] = []
  const entriesToImport: TimeEntry[] = []
  const tasksToImport: ProjectTask[] = []
  const existingTaskIds = new Set(existingTasks.map((task) => task.id))
  const existingTaskFingerprints = new Set(existingTasks.map(taskFingerprint))

  for (const project of backup.projects) {
    const matchingAlias = projectsByAlias.get(projectAliasKey(project))

    if (matchingAlias) {
      projectIdMap.set(project.id, matchingAlias.id)
      result.matchedProjects += 1
      continue
    }

    if (projectsByName.has(projectNameKey(project))) {
      conflictedProjectIds.add(project.id)
      result.conflictedProjects += 1
      continue
    }

    const id = existingProjectIds.has(project.id) ? crypto.randomUUID() : project.id
    const importedProject = { ...project, id }

    projectsToImport.push(importedProject)
    projectIdMap.set(project.id, id)
    existingProjectIds.add(id)
    projectsByAlias.set(projectAliasKey(importedProject), importedProject)
    projectsByName.set(projectNameKey(importedProject), importedProject)
    result.importedProjects += 1
  }

  for (const task of backup.tasks) {
    const projectId = projectIdMap.get(task.projectId)

    if (!projectId || conflictedProjectIds.has(task.projectId)) continue

    const fingerprint = taskFingerprint({ ...task, projectId })

    if (existingTaskFingerprints.has(fingerprint)) {
      continue
    }

    let id = task.id

    while (existingTaskIds.has(id)) {
      id = crypto.randomUUID()
    }

    const importedTask = { ...task, id, projectId }

    tasksToImport.push(importedTask)
    existingTaskIds.add(importedTask.id)
    existingTaskFingerprints.add(fingerprint)
  }

  if (options.projectsOnly) {
    return { entriesToImport, projectsToImport, tasksToImport, result }
  }

  const existingEntryIds = new Set(existingEntries.map((entry) => entry.id))
  const existingEntryFingerprints = new Set(existingEntries.map(entryFingerprint))

  for (const entry of backup.timeEntries) {
    const projectId = projectIdMap.get(entry.projectId)

    if (!projectId || conflictedProjectIds.has(entry.projectId)) {
      result.conflictedEntries += 1
      continue
    }

    const importedEntry = { ...entry, projectId }
    const fingerprint = entryFingerprint(importedEntry)

    if (existingEntryIds.has(importedEntry.id) || existingEntryFingerprints.has(fingerprint)) {
      result.duplicateEntries += 1
      continue
    }

    entriesToImport.push(importedEntry)
    existingEntryIds.add(importedEntry.id)
    existingEntryFingerprints.add(fingerprint)
    result.importedEntries += 1
  }

  return { entriesToImport, projectsToImport, tasksToImport, result }
}

export function createBackupDocument(
  projects: Project[],
  timeEntries: TimeEntry[],
  tasks: ProjectTask[] = [],
  exportedAt = new Date().toISOString(),
): BackupDocument {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt,
    projects,
    tasks,
    timeEntries,
  }
}

export function exportBackupToJson(projects: Project[], timeEntries: TimeEntry[], tasks: ProjectTask[] = []): string {
  return `${JSON.stringify(createBackupDocument(projects, timeEntries, tasks), null, 2)}\n`
}

export function parseBackupJson(json: string): BackupDocument {
  let parsed: unknown

  try {
    parsed = JSON.parse(json)
  } catch {
    throw new Error('Choose a valid Timetracker backup JSON file.')
  }

  if (!isRecord(parsed)) {
    throw new Error('Backup file must contain a JSON object.')
  }

  if (parsed.format !== BACKUP_FORMAT || parsed.version !== BACKUP_VERSION) {
    throw new Error('Backup file format is not supported.')
  }

  const exportedAt = assertString(parsed.exportedAt, 'exportedAt')
  assertIsoDate(exportedAt, 'exportedAt')

  if (!Array.isArray(parsed.projects)) {
    throw new Error('Backup projects must be an array.')
  }

  if (!Array.isArray(parsed.timeEntries)) {
    throw new Error('Backup timeEntries must be an array.')
  }

  if (parsed.tasks !== undefined && !Array.isArray(parsed.tasks)) {
    throw new Error('Backup tasks must be an array.')
  }

  const projects = parsed.projects.map(normalizeProject)
  const projectIds = new Set(projects.map((project) => project.id))
  const tasks = (parsed.tasks ?? []).map((task, index) => {
    const normalized = normalizeTask(task, index)

    if (!projectIds.has(normalized.projectId)) {
      throw new Error(`Backup tasks[${index}].projectId does not match a backup project.`)
    }

    return normalized
  })
  const timeEntries = parsed.timeEntries.map((entry, index) => {
    const normalized = normalizeEntry(entry, index)

    if (!projectIds.has(normalized.projectId)) {
      throw new Error(`Backup timeEntries[${index}].projectId does not match a backup project.`)
    }

    return normalized
  })

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt,
    projects,
    tasks,
    timeEntries,
  }
}

export async function previewBackupDocument(
  backup: BackupDocument,
  options: BackupImportOptions = {},
): Promise<BackupImportResult> {
  return db.transaction('r', db.projects, db.tasks, db.timeEntries, async () => {
    const existingProjects = await db.projects.toArray()
    const existingEntries = options.projectsOnly ? [] : await db.timeEntries.toArray()
    const existingTasks = await db.tasks.toArray()

    return buildBackupImportPlan(backup, existingProjects, existingEntries, existingTasks, options).result
  })
}

export function previewBackupJson(
  json: string,
  options: BackupImportOptions = {},
): Promise<BackupImportResult> {
  return previewBackupDocument(parseBackupJson(json), options)
}

export async function importBackupDocument(
  backup: BackupDocument,
  options: BackupImportOptions = {},
): Promise<BackupImportResult> {
  return db.transaction('rw', db.projects, db.tasks, db.timeEntries, async () => {
    const existingProjects = await db.projects.toArray()
    const existingEntries = options.projectsOnly ? [] : await db.timeEntries.toArray()
    const existingTasks = await db.tasks.toArray()
    const plan = buildBackupImportPlan(backup, existingProjects, existingEntries, existingTasks, options)

    if (plan.projectsToImport.length > 0) {
      await db.projects.bulkAdd(plan.projectsToImport)
    }

    if (plan.entriesToImport.length > 0) {
      await db.timeEntries.bulkAdd(plan.entriesToImport)
    }

    if (plan.tasksToImport.length > 0) {
      await db.tasks.bulkAdd(plan.tasksToImport)
    }

    return plan.result
  })
}

export function importBackupJson(
  json: string,
  options: BackupImportOptions = {},
): Promise<BackupImportResult> {
  return importBackupDocument(parseBackupJson(json), options)
}

export type RestoreBackupOptions = BackupImportOptions
export type RestoreBackupResult = BackupImportResult

export async function restoreBackupJson(
  json: string,
  options: RestoreBackupOptions = {},
): Promise<RestoreBackupResult> {
  return importBackupJson(json, options)
}

export function downloadJson(filename: string, jsonContent: string) {
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  try {
    link.href = url
    link.download = filename
    document.body.append(link)
    link.click()
  } finally {
    link.remove()
    URL.revokeObjectURL(url)
  }
}
