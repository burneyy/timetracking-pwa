import { Clock } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Project } from '../projects/projectTypes'
import type { RunningTimer } from './timerTypes'
import { calculateDurationMinutes, formatDuration } from '../../shared/dateTime'

type RunningTimerDisplayProps = {
  projectsById?: Map<string, Project>
  runningTimer?: RunningTimer
}

export function RunningTimerDisplay({ projectsById, runningTimer }: RunningTimerDisplayProps) {
  const [now, setNow] = useState(Date.now)

  useEffect(() => {
    if (!runningTimer) return undefined

    const intervalId = window.setInterval(() => setNow(Date.now()), 1_000)
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

  const displayNow = runningTimer ? Date.now() : now
  const elapsedMinutes = calculateDurationMinutes(runningTimer.startedAt, new Date(displayNow).toISOString())
  const projectAlias = projectsById?.get(runningTimer.projectId)?.alias ?? 'Unknown project'
  const elapsedDuration = formatDuration(elapsedMinutes)

  return (
    <div
      aria-label={`Running timer: ${projectAlias}, ${runningTimer.task}, ${elapsedDuration} elapsed`}
      className="running-display active"
      role="timer"
    >
      <Clock size={20} aria-hidden="true" />
      <span>
        {projectAlias} · {runningTimer.task} · {elapsedDuration}
      </span>
    </div>
  )
}
