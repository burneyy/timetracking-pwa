import { db } from '../../db/db'
import { startOfLocalDay, startOfNextLocalDay } from '../../shared/dateTime'

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
