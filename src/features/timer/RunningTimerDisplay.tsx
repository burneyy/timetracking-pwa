import { Clock } from 'lucide-react'

export function RunningTimerDisplay() {
  return (
    <div className="running-display">
      <Clock size={20} aria-hidden="true" />
      <span>No timer running</span>
    </div>
  )
}
