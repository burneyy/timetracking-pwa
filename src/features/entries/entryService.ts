import { db } from '../../db/db'

export function listAllEntries() {
  return db.timeEntries.orderBy('startAt').reverse().toArray()
}
