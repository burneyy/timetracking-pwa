import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { calculateDurationMinutes, formatDate, formatDuration, formatTime } from '../../shared/dateTime'
import { Button } from '../../shared/ui/Button'
import type { Project } from '../projects/projectTypes'
import { deleteEntry, updateEntry } from './entryService'
import { EntryEditor } from './EntryEditor'
import type { TimeEntry } from './entryTypes'

type EntryRowProps = {
  entry: TimeEntry
  project?: Project
  projects?: Project[]
  showDate?: boolean
}

export function EntryRow({ entry, project, projects = [], showDate = false }: EntryRowProps) {
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string>()
  const durationMinutes = calculateDurationMinutes(entry.startAt, entry.endAt)
  const timeRange = formatEntryTimeRange(entry, showDate)
  const taskLabel = entry.task.trim() || 'No task'

  async function handleDelete() {
    if (!window.confirm(`Delete "${taskLabel}"? This entry will be permanently removed.`)) {
      return
    }

    setError(undefined)

    try {
      await deleteEntry(entry.id)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Entry could not be deleted.')
    }
  }

  if (editing) {
    return (
      <li className="entry-row editing">
        <EntryEditor
          entry={entry}
          onCancel={() => setEditing(false)}
          onSubmit={async (input) => {
            await updateEntry(entry.id, input)
            setEditing(false)
          }}
          projects={projects}
        />
      </li>
    )
  }

  return (
    <li className="entry-row">
      <div className="entry-project">
        <span
          aria-hidden="true"
          className="project-color"
          style={{ backgroundColor: project?.color ?? '#8a97a3' }}
        />
        <div>
          <strong>{project?.alias ?? 'Unknown project'}</strong>
          <span>{taskLabel}</span>
        </div>
      </div>
      <div className="entry-time">
        <span>{timeRange}</span>
        <strong>{formatDuration(durationMinutes)}</strong>
      </div>
      <div className="row-actions">
        <Button aria-label={`Edit ${taskLabel}`} onClick={() => setEditing(true)} variant="ghost">
          <Pencil size={18} aria-hidden="true" />
        </Button>
        <Button aria-label={`Delete ${taskLabel}`} onClick={handleDelete} variant="ghost">
          <Trash2 size={18} aria-hidden="true" />
        </Button>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </li>
  )
}

function formatEntryTimeRange(entry: TimeEntry, showDate: boolean): string {
  const startTime = formatTime(entry.startAt)
  const endTime = formatTime(entry.endAt)

  if (!showDate) return `${startTime} - ${endTime}`

  const startDate = formatDate(entry.startAt)
  const endDate = formatDate(entry.endAt)

  if (startDate === endDate) return `${startDate}, ${startTime} - ${endTime}`

  return `${startDate}, ${startTime} - ${endDate}, ${endTime}`
}
