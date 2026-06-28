import Dexie, { type Table } from 'dexie'
import type { TimeEntry } from '../features/entries/entryTypes'
import type { Project } from '../features/projects/projectTypes'
import type { RunningTimer } from '../features/timer/timerTypes'

function assertMandatoryProjectAlias(alias: unknown) {
  if (typeof alias !== 'string' || !alias.trim()) {
    throw new Error('Project alias is required.')
  }
}

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

    this.version(2)
      .stores({
        projects: 'id, name, alias, archived, createdAt, updatedAt',
        timeEntries: 'id, projectId, task, startAt, endAt, createdAt, updatedAt',
        runningTimer: 'id',
      })
      .upgrade(async (transaction) => {
        await Promise.all([
          transaction.table('projects').clear(),
          transaction.table('timeEntries').clear(),
          transaction.table('runningTimer').clear(),
        ])
      })

    this.projects.hook('creating', (_primaryKey, project) => {
      assertMandatoryProjectAlias(project.alias)
    })

    this.projects.hook('updating', (modifications) => {
      if (Object.hasOwn(modifications, 'alias')) {
        assertMandatoryProjectAlias((modifications as Partial<Project>).alias)
      }
    })
  }
}

export const db = new AppDatabase()
