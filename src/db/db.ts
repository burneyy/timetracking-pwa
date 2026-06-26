import Dexie, { type Table } from 'dexie'
import type { TimeEntry } from '../features/entries/entryTypes'
import type { Project } from '../features/projects/projectTypes'
import type { RunningTimer } from '../features/timer/timerTypes'

export class AppDatabase extends Dexie {
  projects!: Table<Project, string>
  timeEntries!: Table<TimeEntry, string>
  runningTimer!: Table<RunningTimer, string>

  constructor() {
    super('timetracker')

    this.version(1).stores({
      projects: 'id, name, archived, createdAt, updatedAt',
      timeEntries: 'id, projectId, task, startAt, endAt, createdAt, updatedAt',
      runningTimer: 'id',
    })
  }
}

export const db = new AppDatabase()
