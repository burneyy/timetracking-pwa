import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { formatDuration, formatTime } from '../../shared/dateTime'
import { Button } from '../../shared/ui/Button'
import type { Project } from '../projects/projectTypes'
import { deleteEntry, updateEntry } from './entryService'
import { EntryEditor } from './EntryEditor'
import type { TimeEntry } from './entryTypes'

type EntryRowProps = {
  entry: TimeEntry
  project?: Project
  projects?: Project[]
}

export function EntryRow({ entry, project, projects = [] }: EntryRowProps) {
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string>()

  async function handleDelete() {
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
      <div className="row-actions">
        <Button aria-label={`Edit ${entry.task}`} onClick={() => setEditing(true)} variant="ghost">
          <Pencil size={18} aria-hidden="true" />
        </Button>
        <Button aria-label={`Delete ${entry.task}`} onClick={handleDelete} variant="ghost">
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
