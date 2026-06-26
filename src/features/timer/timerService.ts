import { db } from '../../db/db'
import { calculateDurationMinutes } from '../../shared/dateTime'
import type { RunningTimer } from './timerTypes'

function assertTimerInput(projectId: string, task: string) {
  const trimmedProjectId = projectId.trim()

  if (!trimmedProjectId) {
    throw new Error('Project is required.')
  }

  const trimmedTask = task.trim()

  if (!trimmedTask) {
    throw new Error('Task is required.')
  }

  return { projectId: trimmedProjectId, task: trimmedTask }
}

async function assertActiveProject(projectId: string) {
  const project = await db.projects.get(projectId)

  if (!project || project.archived) {
    throw new Error('Project must be active.')
  }
}

function createEntryFromTimer(timer: RunningTimer, endAt: string) {
  return {
    id: crypto.randomUUID(),
    projectId: timer.projectId,
    task: timer.task,
    startAt: timer.startedAt,
    endAt,
    durationMinutes: calculateDurationMinutes(timer.startedAt, endAt),
    createdAt: endAt,
    updatedAt: endAt,
  }
}

export async function startTimer(projectId: string, task: string, now = new Date().toISOString()) {
  const timerInput = assertTimerInput(projectId, task)

  await db.transaction('rw', db.projects, db.runningTimer, db.timeEntries, async () => {
    await assertActiveProject(timerInput.projectId)
    const current = await db.runningTimer.get('active')

    if (current) {
      await db.timeEntries.add(createEntryFromTimer(current, now))
    }

    await db.runningTimer.put({
      id: 'active',
      projectId: timerInput.projectId,
      task: timerInput.task,
      startedAt: now,
    })
  })
}

export async function stopTimer(now = new Date().toISOString()) {
  await db.transaction('rw', db.runningTimer, db.timeEntries, async () => {
    const current = await db.runningTimer.get('active')

    if (!current) return

    await db.timeEntries.add(createEntryFromTimer(current, now))
    await db.runningTimer.delete('active')
  })
}

export function getRunningTimer() {
  return db.runningTimer.get('active')
}
