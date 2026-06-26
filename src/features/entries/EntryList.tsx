import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { EmptyState } from '../../shared/ui/EmptyState'
import { formatDuration } from '../../shared/dateTime'
import { listAllProjects } from '../projects/projectService'
import { EntryRow } from './EntryRow'
import { listTodayEntries } from './entryService'

export function EntryList() {
  const entries = useLiveQuery(() => listTodayEntries(), [])
  const projects = useLiveQuery(() => listAllProjects(), [])
  const projectsById = useMemo(() => new Map(projects?.map((project) => [project.id, project])), [projects])
  const totalMinutes = entries?.reduce((total, entry) => total + entry.durationMinutes, 0) ?? 0

  return (
    <section className="panel">
      <div className="section-header">
        <div>
          <p className="eyebrow">Today</p>
          <h2>Entries</h2>
        </div>
        <strong className="total-pill">{formatDuration(totalMinutes)}</strong>
      </div>
      {entries && entries.length > 0 ? (
        <ul className="row-list" aria-label="Today's time entries">
          {entries.map((entry) => (
            <EntryRow entry={entry} key={entry.id} project={projectsById.get(entry.projectId)} />
          ))}
        </ul>
      ) : (
        <EmptyState title="No tracked time today" message="Timer-created entries will appear here." />
      )}
    </section>
  )
}
