import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { listActiveProjects } from './projectService'

type ProjectSelectProps = {
  disabled?: boolean
  onChange?: (projectId: string) => void
  value?: string
}

export function ProjectSelect({ disabled = false, onChange, value }: ProjectSelectProps) {
  const projects = useLiveQuery(() => listActiveProjects(), [])
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const hasProjects = (projects?.length ?? 0) > 0
  const currentValue = value ?? selectedProjectId
  const activeValue = projects?.some((project) => project.id === currentValue) ? currentValue : ''

  useEffect(() => {
    if (value === undefined && currentValue !== activeValue) {
      setSelectedProjectId(activeValue)
    }
  }, [activeValue, currentValue, value])

  const handleChange = (projectId: string) => {
    if (value === undefined) {
      setSelectedProjectId(projectId)
    }

    onChange?.(projectId)
  }

  return (
    <label className="field">
      <span>Project</span>
      <select
        disabled={disabled || !hasProjects}
        onChange={(event) => handleChange(event.target.value)}
        value={activeValue}
      >
        <option value="">{hasProjects ? 'Choose a project' : 'No projects yet'}</option>
        {projects?.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </select>
    </label>
  )
}
