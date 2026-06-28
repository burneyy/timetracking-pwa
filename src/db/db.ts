import Dexie, { type Table } from 'dexie'
import type { TimeEntry } from '../features/entries/entryTypes'
import type { Project } from '../features/projects/projectTypes'
import type { RunningTimer } from '../features/timer/timerTypes'

const DATABASE_NAME = 'timetracker'
const DEVELOPMENT_SCHEMA_RESET_KEY = 'timetracker.schemaReset'
const DEVELOPMENT_SCHEMA_RESET_ID = 'remove-duration-minutes'

function assertMandatoryProjectAlias(alias: unknown) {
  if (typeof alias !== 'string' || !alias.trim()) {
    throw new Error('Project alias is required.')
  }
}

export class AppDatabase extends Dexie {
  projects!: Table<Project, string>
  timeEntries!: Table<TimeEntry, string>
  runningTimer!: Table<RunningTimer, string>

  constructor(databaseName = DATABASE_NAME) {
    super(databaseName)

    this.version(1).stores({
      projects: 'id, name, alias, archived, createdAt, updatedAt',
      timeEntries: 'id, projectId, task, startAt, endAt, createdAt, updatedAt',
      runningTimer: 'id',
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

export async function resetDevelopmentDatabaseForSchemaChange() {
  if (globalThis.localStorage?.getItem(DEVELOPMENT_SCHEMA_RESET_KEY) === DEVELOPMENT_SCHEMA_RESET_ID) {
    return
  }

  await Dexie.delete(DATABASE_NAME)
  globalThis.localStorage?.setItem(DEVELOPMENT_SCHEMA_RESET_KEY, DEVELOPMENT_SCHEMA_RESET_ID)
}

export const db = new AppDatabase()
