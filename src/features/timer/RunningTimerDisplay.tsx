import { Clock } from 'lucide-react'
import { type CSSProperties, useEffect, useState } from 'react'
import type { Project } from '../projects/projectTypes'
import type { RunningTimer } from './timerTypes'
import { calculateDurationMinutes, formatDuration } from '../../shared/dateTime'

type RunningTimerDisplayProps = {
  projectsById?: Map<string, Project>
  runningTimer?: RunningTimer
}

function getReadableTextColor(backgroundColor: string) {
  const hex = backgroundColor.match(/^#(?<red>[0-9a-f]{2})(?<green>[0-9a-f]{2})(?<blue>[0-9a-f]{2})$/i)

  if (!hex?.groups) return undefined

  const red = Number.parseInt(hex.groups.red, 16)
  const green = Number.parseInt(hex.groups.green, 16)
  const blue = Number.parseInt(hex.groups.blue, 16)
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255

  return luminance > 0.6 ? '#17202a' : '#ffffff'
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
  const project = projectsById?.get(runningTimer.projectId)
  const projectAlias = project?.alias ?? 'Unknown project'
  const elapsedDuration = formatDuration(elapsedMinutes)
  const runningTimerStyle = project?.color
    ? ({
        '--running-display-active-bg': project.color,
        '--running-display-active-border': project.color,
        '--running-display-active-text': getReadableTextColor(project.color),
      } as CSSProperties)
    : undefined

  return (
    <div
      aria-label={`Running timer: ${projectAlias}, ${runningTimer.task}, ${elapsedDuration} elapsed`}
      className="running-display active"
      role="timer"
      style={runningTimerStyle}
    >
      <Clock size={20} aria-hidden="true" />
      <span>
        {projectAlias} · {runningTimer.task} · {elapsedDuration}
      </span>
    </div>
  )
}
