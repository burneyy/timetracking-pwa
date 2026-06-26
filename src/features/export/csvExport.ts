import type { TimeEntry } from '../entries/entryTypes'
import type { Project } from '../projects/projectTypes'

export function exportEntriesToCsv(_entries: TimeEntry[], _projects: Project[]): string {
  return 'date,project,task,start,end,duration_minutes\n'
}
