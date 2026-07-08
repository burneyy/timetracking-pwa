import { type FormEvent, useId, useState } from 'react'
import { Save } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { formatDateInput, toIsoFromDateTimeLocal } from '../../shared/dateTime'
import { Button } from '../../shared/ui/Button'
import type { Project } from '../projects/projectTypes'
import { TaskInput } from '../timer/TaskInput'
import { listTaskSuggestions } from '../tasks/taskService'
import type { TimeEntry } from './entryTypes'

type EntryEditorProps = {
  entry?: TimeEntry
  onCancel?: () => void
  onSubmit: (input: {
    projectId: string
    task: string
    startAt: string
    endAt: string
  }) => Promise<void>
  projects: Project[]
  submitLabel?: string
}

function defaultTimes() {
  const end = new Date()
  end.setSeconds(0, 0)
  const start = new Date(end.getTime() - 30 * 60_000)

  return {
    startAt: formatDateInput(start.toISOString()),
    endAt: formatDateInput(end.toISOString()),
  }
}

export function EntryEditor({ entry, onCancel, onSubmit, projects, submitLabel }: EntryEditorProps) {
  const defaults = defaultTimes()
  const errorId = useId()
  const [projectId, setProjectId] = useState(entry?.projectId ?? projects[0]?.id ?? '')
  const [task, setTask] = useState(entry?.task ?? '')
  const [startAt, setStartAt] = useState(entry ? formatDateInput(entry.startAt) : defaults.startAt)
  const [endAt, setEndAt] = useState(entry ? formatDateInput(entry.endAt) : defaults.endAt)
  const [error, setError] = useState<string>()
  const [saving, setSaving] = useState(false)
  const taskSuggestions = useLiveQuery(() => listTaskSuggestions(projectId, task), [projectId, task])
  const hasProjects = projects.length > 0
  const errorDescription = error ? errorId : undefined

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError(undefined)

    try {
      await onSubmit({
        projectId,
        task,
        startAt: toIsoFromDateTimeLocal(startAt),
        endAt: toIsoFromDateTimeLocal(endAt),
      })

      if (!entry) {
        const nextDefaults = defaultTimes()
        setProjectId(projects[0]?.id ?? '')
        setTask('')
        setStartAt(nextDefaults.startAt)
        setEndAt(nextDefaults.endAt)
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Entry could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="entry-editor" onSubmit={handleSubmit}>
      <label className="field">
        <span>Project</span>
        <select
          aria-describedby={errorDescription}
          disabled={saving || !hasProjects}
          onChange={(event) => setProjectId(event.target.value)}
          required
          value={projectId}
        >
          <option value="">{hasProjects ? 'Choose a project' : 'No projects yet'}</option>
          {projects.map((project) => (
            <option
              disabled={project.archived && project.id !== entry?.projectId}
              key={project.id}
              value={project.id}
            >
              {project.archived ? `${project.alias} (archived)` : project.alias}
            </option>
          ))}
        </select>
      </label>

      <TaskInput
        disabled={saving || !hasProjects}
        hasProject={Boolean(projectId)}
        onChange={setTask}
        suggestions={taskSuggestions}
        value={task}
      />

      <label className="field">
        <span>Start</span>
        <input
          aria-describedby={errorDescription}
          aria-invalid={error ? 'true' : undefined}
          disabled={saving}
          onChange={(event) => setStartAt(event.target.value)}
          required
          type="datetime-local"
          value={startAt}
        />
      </label>

      <label className="field">
        <span>End</span>
        <input
          aria-describedby={errorDescription}
          aria-invalid={error ? 'true' : undefined}
          disabled={saving}
          onChange={(event) => setEndAt(event.target.value)}
          required
          type="datetime-local"
          value={endAt}
        />
      </label>

      <div className="form-actions">
        {onCancel && (
          <Button disabled={saving} onClick={onCancel} variant="ghost">
            Cancel
          </Button>
        )}
        <Button disabled={saving || !hasProjects} type="submit" variant="primary">
          <Save size={18} aria-hidden="true" />
          {saving ? 'Saving' : submitLabel ?? 'Save'}
        </Button>
      </div>

      {error && (
        <p className="form-error" id={errorId} role="alert">
          {error}
        </p>
      )}
    </form>
  )
}
