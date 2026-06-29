import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { EmptyState } from '../../shared/ui/EmptyState'
import { calculateDurationMinutes, formatDuration } from '../../shared/dateTime'
import { listAllProjects } from '../projects/projectService'
import { EntryRow } from './EntryRow'
import { listAllEntries, listTodayEntries } from './entryService'

type EntryListProps = {
  scope?: 'today' | 'all'
}

export function EntryList({ scope = 'today' }: EntryListProps) {
  const entries = useLiveQuery(() => (scope === 'today' ? listTodayEntries() : listAllEntries()), [scope])
  const projects = useLiveQuery(() => listAllProjects(), [])
  const projectsById = useMemo(() => new Map(projects?.map((project) => [project.id, project])), [projects])
  const totalMinutes =
    entries?.reduce((total, entry) => total + calculateDurationMinutes(entry.startAt, entry.endAt), 0) ?? 0
  const eyebrow = scope === 'today' ? 'Today' : 'History'
  const title = scope === 'today' ? 'Entries' : 'All entries'
  const emptyTitle = scope === 'today' ? 'No tracked time today' : 'No time entries'
  const emptyMessage =
    scope === 'today' ? 'Timer-created entries will appear here.' : 'Create a manual entry or stop a timer.'

  return (
    <section className="panel">
      <div className="section-header">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
        <strong className="total-pill">{formatDuration(totalMinutes)}</strong>
      </div>
      {entries && entries.length > 0 ? (
        <ul className="row-list" aria-label={scope === 'today' ? "Today's time entries" : 'All time entries'}>
          {entries.map((entry) => (
            <EntryRow
              entry={entry}
              key={entry.id}
              project={projectsById.get(entry.projectId)}
              projects={projects ?? []}
              showDate={scope === 'all'}
            />
          ))}
        </ul>
      ) : (
        <EmptyState title={emptyTitle} message={emptyMessage} />
      )}
    </section>
  )
}
