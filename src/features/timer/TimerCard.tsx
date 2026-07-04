import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { Play, Square } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ProjectSelect } from '../projects/ProjectSelect'
import { Button } from '../../shared/ui/Button'
import { RunningTimerDisplay } from './RunningTimerDisplay'
import { TaskInput } from './TaskInput'
import { getRunningTimer, startTimer, stopTimer } from './timerService'
import { listAllProjects, listActiveProjects } from '../projects/projectService'
import { listTaskSuggestions } from '../entries/entryService'

type TimerCardProps = {
  embedded?: boolean
}

export function TimerCard({ embedded = false }: TimerCardProps) {
  const activeProjects = useLiveQuery(() => listActiveProjects(), [])
  const allProjects = useLiveQuery(() => listAllProjects(), [])
  const runningTimer = useLiveQuery(() => getRunningTimer(), [])
  const [projectId, setProjectId] = useState('')
  const [task, setTask] = useState('')
  const [error, setError] = useState<string>()
  const [saving, setSaving] = useState(false)
  const taskSuggestions = useLiveQuery(() => listTaskSuggestions(projectId), [projectId]) ?? []
  const projectsById = useMemo(() => new Map(allProjects?.map((project) => [project.id, project])), [allProjects])
  const hasProjects = (activeProjects?.length ?? 0) > 0

  useEffect(() => {
    if (projectId && activeProjects && !activeProjects.some((project) => project.id === projectId)) {
      setProjectId('')
    }
  }, [activeProjects, projectId])

  async function handleStart(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(undefined)
    setSaving(true)

    try {
      await startTimer(projectId, task)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Timer could not be started.')
    } finally {
      setSaving(false)
    }
  }

  async function handleStop() {
    setError(undefined)
    setSaving(true)

    try {
      await stopTimer()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Timer could not be stopped.')
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
        </div>
        <RunningTimerDisplay projectsById={projectsById} runningTimer={runningTimer} />
      </div>

      <form className="timer-form-grid" onSubmit={handleStart}>
        <ProjectSelect disabled={saving} onChange={setProjectId} value={projectId} />
        <TaskInput
          disabled={saving || !hasProjects}
          onChange={setTask}
          suggestions={taskSuggestions}
          value={task}
        />
        <Button disabled={saving || !hasProjects} type="submit" variant="primary">
          <Play size={18} aria-hidden="true" />
          {runningTimer ? 'Switch' : 'Start'}
        </Button>
        <Button disabled={saving || !runningTimer} onClick={handleStop} variant="secondary">
          <Square size={18} aria-hidden="true" />
          Stop
        </Button>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </form>
    </>
  )

  if (embedded) {
    return <div>{content}</div>
  }

  return (
    <section className="timer-card">
      {content}
    </section>
  )
}
