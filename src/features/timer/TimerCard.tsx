import { Play } from 'lucide-react'
import { ProjectSelect } from '../projects/ProjectSelect'
import { Button } from '../../shared/ui/Button'
import { RunningTimerDisplay } from './RunningTimerDisplay'
import { TaskInput } from './TaskInput'

export function TimerCard() {
  return (
    <section className="timer-card">
      <div className="timer-card-header">
        <div>
          <p className="eyebrow">Timer</p>
          <h1>Track focused work</h1>
        </div>
        <RunningTimerDisplay />
      </div>
      <div className="timer-form-grid">
        <ProjectSelect />
        <TaskInput />
        <Button disabled variant="primary">
          <Play size={18} aria-hidden="true" />
          Start
        </Button>
      </div>
    </section>
  )
}
