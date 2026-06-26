import { db } from '../../db/db'

export function getRunningTimer() {
  return db.runningTimer.get('active')
}
