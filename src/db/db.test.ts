import Dexie from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'
import { AppDatabase } from './db'

describe('AppDatabase migrations', () => {
  let databaseName: string | undefined

  afterEach(async () => {
    if (!databaseName) return

    await Dexie.delete(databaseName)
    databaseName = undefined
  })

  it('recalculates stored entry durations when upgrading to version 3', async () => {
    databaseName = `timetracker-test-${crypto.randomUUID()}`
    const legacyDb = new Dexie(databaseName)
    legacyDb.version(2).stores({
      projects: 'id, name, alias, archived, createdAt, updatedAt',
      timeEntries: 'id, projectId, task, startAt, endAt, createdAt, updatedAt',
      runningTimer: 'id',
    })

    await legacyDb.open()
    await legacyDb.table('timeEntries').add({
      id: 'entry-id',
      projectId: 'project-id',
      task: 'Implementation',
      startAt: '2026-06-26T21:49:45.000Z',
      endAt: '2026-06-26T21:51:14.000Z',
      durationMinutes: 1,
      createdAt: '2026-06-26T21:51:14.000Z',
      updatedAt: '2026-06-26T21:51:14.000Z',
    })
    legacyDb.close()

    const upgradedDb = new AppDatabase(databaseName)
    await upgradedDb.open()

    await expect(upgradedDb.timeEntries.get('entry-id')).resolves.toMatchObject({
      durationMinutes: 2,
    })

    upgradedDb.close()
  })
})
