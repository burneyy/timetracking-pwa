import { formatDuration, formatTime } from '../../shared/dateTime'
import type { Project } from '../projects/projectTypes'
import type { TimeEntry } from './entryTypes'

type EntryRowProps = {
  entry: TimeEntry
  project?: Project
}

export function EntryRow({ entry, project }: EntryRowProps) {
  return (
    <li className="entry-row">
      <div className="entry-project">
        <span
          aria-hidden="true"
          className="project-color"
          style={{ backgroundColor: project?.color ?? '#8a97a3' }}
        />
        <div>
          <strong>{project?.name ?? 'Unknown project'}</strong>
          <span>{entry.task}</span>
        </div>
      </div>
      <div className="entry-time">
        <span>
          {formatTime(entry.startAt)} - {formatTime(entry.endAt)}
        </span>
        <strong>{formatDuration(entry.durationMinutes)}</strong>
      </div>
    </li>
  )
}
