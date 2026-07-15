import { type CSSProperties, useEffect, useMemo, useRef, useState } from 'react'
import { Play, Square } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Button } from '../../shared/ui/Button'
import { EmptyState } from '../../shared/ui/EmptyState'
import {
  listActiveProjectsByRecentUsage,
  listAllProjects,
} from '../projects/projectService'
import type { Project } from '../projects/projectTypes'
import { listTaskSuggestions } from '../tasks/taskService'
import { RunningTimerDisplay } from './RunningTimerDisplay'
import { TaskInput } from './TaskInput'
import { getRunningTimer, startTimer, stopTimer, updateRunningTimer } from './timerService'
import type { RunningTimer } from './timerTypes'

type TimerCardProps = {
  embedded?: boolean
}

type ActiveTimerCardProps = {
  activeProjects: Project[]
  allProjects: Project[]
  disabled: boolean
  draft: { projectId: string; task: string }
  onProjectChange: (projectId: string) => void
  onStop: () => void
  onTaskChange: (task: string) => void
  runningTimer: RunningTimer
}

function projectCardStyle(project?: Project) {
  if (!project?.color) return undefined

  return { '--project-accent': project.color } as CSSProperties
}

function ActiveTimerCard({
  activeProjects,
  allProjects,
  disabled,
  draft,
  onProjectChange,
  onStop,
  onTaskChange,
  runningTimer,
}: ActiveTimerCardProps) {
  const taskSuggestions = useLiveQuery(
    () => listTaskSuggestions(draft.projectId, draft.task),
    [draft.projectId, draft.task],
  )
  const projectsById = useMemo(
    () => new Map(allProjects.map((project) => [project.id, project])),
    [allProjects],
  )
  const runningProject = projectsById.get(runningTimer.projectId)
  const displayedProject = projectsById.get(draft.projectId) ?? runningProject
  const selectableProjects = useMemo(() => {
    if (!runningProject?.archived) return activeProjects

    return [runningProject, ...activeProjects.filter((project) => project.id !== runningProject.id)]
  }, [activeProjects, runningProject])

  return (
    <article
      aria-label="Active timer"
      className="project-timer-card project-timer-card-active"
      style={projectCardStyle(displayedProject)}
    >
      <div className="project-timer-card-header">
        <div className="project-timer-identity">
          <span aria-hidden="true" className="project-color" />
          <div>
            <span className="active-label">Active</span>
            <h2>{runningProject?.alias ?? 'Unknown project'}</h2>
          </div>
        </div>
        <RunningTimerDisplay projectsById={projectsById} runningTimer={runningTimer} />
      </div>

      <div className="active-timer-form">
        <label className="field">
          <span>Project</span>
          <select
            disabled={disabled}
            onChange={(event) => onProjectChange(event.target.value)}
            required
            value={draft.projectId}
          >
            {selectableProjects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.archived ? `${project.alias} (archived)` : project.alias}
              </option>
            ))}
          </select>
        </label>
        <TaskInput
          disabled={disabled}
          hasProject={Boolean(draft.projectId)}
          onChange={onTaskChange}
          suggestions={taskSuggestions}
          value={draft.task}
        />
        <Button disabled={disabled} onClick={onStop} variant="primary">
          <Square size={18} aria-hidden="true" />
          Stop
        </Button>
      </div>

      <p className="active-timer-hint">
        Changes save automatically and apply to the entire running interval.
      </p>
    </article>
  )
}

export function TimerCard({ embedded = false }: TimerCardProps) {
  const activeProjects = useLiveQuery(() => listActiveProjectsByRecentUsage(), []) ?? []
  const allProjects = useLiveQuery(() => listAllProjects(), []) ?? []
  const runningTimer = useLiveQuery(() => getRunningTimer(), [])
  const [error, setError] = useState<string>()
  const [saving, setSaving] = useState(false)
  const [activeDraft, setActiveDraft] = useState<{ projectId: string; task: string }>()
  const activeTimerStartedAtRef = useRef<string | undefined>(undefined)
  const updateQueueRef = useRef<Promise<void>>(Promise.resolve())
  const inactiveProjects = activeProjects.filter((project) => project.id !== runningTimer?.projectId)

  useEffect(() => {
    if (activeTimerStartedAtRef.current === runningTimer?.startedAt) return

    activeTimerStartedAtRef.current = runningTimer?.startedAt
    setActiveDraft(
      runningTimer ? { projectId: runningTimer.projectId, task: runningTimer.task } : undefined,
    )
  }, [runningTimer])

  function persistActiveDraft(draft: { projectId: string; task: string }) {
    setActiveDraft(draft)
    setError(undefined)

    const update = updateQueueRef.current
      .catch(() => undefined)
      .then(() => updateRunningTimer(draft.projectId, draft.task))

    updateQueueRef.current = update
    void update.catch((error) => {
      setError(error instanceof Error ? error.message : 'Timer details could not be saved.')
    })
  }

  async function handleStop() {
    setError(undefined)
    setSaving(true)

    try {
      await updateQueueRef.current
      await stopTimer()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Timer could not be stopped.')
    } finally {
      setSaving(false)
    }
  }

  async function handleStart(projectId: string) {
    setError(undefined)
    setSaving(true)

    try {
      await updateQueueRef.current
      await startTimer(projectId)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Timer could not be started.')
    } finally {
      setSaving(false)
    }
  }

  const content = (
    <>
      <div className="timer-card-header">
        <div>
          <p className="eyebrow">Timer</p>
          <h1>Track focused work</h1>
          <p className="timer-intro">Start a project in one tap, then add a task while it runs.</p>
        </div>
        {!runningTimer && <RunningTimerDisplay />}
      </div>

      <div className="project-timer-stack">
        {runningTimer && activeDraft && (
          <ActiveTimerCard
            activeProjects={activeProjects}
            allProjects={allProjects}
            disabled={saving}
            draft={activeDraft}
            onProjectChange={(projectId) => persistActiveDraft({ ...activeDraft, projectId })}
            onStop={handleStop}
            onTaskChange={(task) => persistActiveDraft({ ...activeDraft, task })}
            runningTimer={runningTimer}
          />
        )}

        {inactiveProjects.length > 0 ? (
          <section aria-labelledby="project-timer-list-title">
            <div className="project-timer-list-header">
              <h2 id="project-timer-list-title">{runningTimer ? 'Recent projects' : 'Projects'}</h2>
              <span>Most recently used first</span>
            </div>
            <ol aria-label="Projects by recent use" className="project-timer-list">
              {inactiveProjects.map((project) => (
                <li key={project.id}>
                  <article
                    aria-label={`${project.alias} project`}
                    className="project-timer-card"
                    style={projectCardStyle(project)}
                  >
                    <div className="project-timer-identity">
                      <span aria-hidden="true" className="project-color" />
                      <div>
                        <h3>{project.alias}</h3>
                        {project.name !== project.alias && <span>{project.name}</span>}
                      </div>
                    </div>
                    <Button
                      aria-label={`Start ${project.alias}`}
                      disabled={saving}
                      onClick={() => handleStart(project.id)}
                      variant="primary"
                    >
                      <Play size={18} aria-hidden="true" />
                      Start
                    </Button>
                  </article>
                </li>
              ))}
            </ol>
          </section>
        ) : activeProjects.length === 0 && !runningTimer ? (
          <EmptyState
            message="Create an active project before starting a timer."
            title="No projects yet"
          />
        ) : null}
      </div>

      {error && (
        <p className="form-error timer-error" role="alert">
          {error}
        </p>
      )}
    </>
  )

  if (embedded) {
    return <div>{content}</div>
  }

  return <section className="timer-card">{content}</section>
}
