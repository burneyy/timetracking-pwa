import { Clock } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Project } from '../projects/projectTypes'
import type { RunningTimer } from './timerTypes'
import { formatDuration } from '../../shared/dateTime'

type RunningTimerDisplayProps = {
  projectsById?: Map<string, Project>
  runningTimer?: RunningTimer
}

export function RunningTimerDisplay({ projectsById, runningTimer }: RunningTimerDisplayProps) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!runningTimer) return undefined

    const intervalId = window.setInterval(() => setNow(Date.now()), 15_000)
    return () => window.clearInterval(intervalId)
  }, [runningTimer])

  if (!runningTimer) {
    return (
      <div className="running-display" role="status">
        <Clock size={20} aria-hidden="true" />
        <span>No timer running</span>
      </div>
    )
  }

  const elapsedMinutes = Math.round(Math.max(0, now - new Date(runningTimer.startedAt).getTime()) / 60_000)
  const projectName = projectsById?.get(runningTimer.projectId)?.name ?? 'Unknown project'
  const elapsedDuration = formatDuration(elapsedMinutes)

  return (
    <div
      aria-label={`Running timer: ${projectName}, ${runningTimer.task}, ${elapsedDuration} elapsed`}
      className="running-display active"
      role="timer"
    >
      <Clock size={20} aria-hidden="true" />
      <span>
        {projectName} · {runningTimer.task} · {elapsedDuration}
      </span>
    </div>
  )
}
