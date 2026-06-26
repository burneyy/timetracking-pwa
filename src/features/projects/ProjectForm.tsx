import { type FormEvent, useEffect, useId, useState } from 'react'
import { Save } from 'lucide-react'
import { Button } from '../../shared/ui/Button'
import type { Project } from './projectTypes'

type ProjectFormProps = {
  initialProject?: Project
  onCancel?: () => void
  onSubmit: (input: { name: string; color?: string }) => Promise<void>
}

const defaultColor = '#1c6b5d'

export function ProjectForm({ initialProject, onCancel, onSubmit }: ProjectFormProps) {
  const errorId = useId()
  const [name, setName] = useState(initialProject?.name ?? '')
  const [color, setColor] = useState(initialProject?.color ?? defaultColor)
  const [error, setError] = useState<string>()
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setName(initialProject?.name ?? '')
    setColor(initialProject?.color ?? defaultColor)
    setError(undefined)
  }, [initialProject])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError(undefined)

    try {
      await onSubmit({ name, color })
      if (!initialProject) {
        setName('')
        setColor(defaultColor)
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Project could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="project-form" onSubmit={handleSubmit}>
      <label className="field">
        <span>Name</span>
        <input
          aria-describedby={error ? errorId : undefined}
          aria-invalid={error ? 'true' : undefined}
          autoComplete="off"
          disabled={saving}
          onChange={(event) => setName(event.target.value)}
          placeholder="Client project"
          required
          value={name}
        />
      </label>

      <label className="field compact-field">
        <span>Color</span>
        <input
          aria-label="Project color"
          disabled={saving}
          onChange={(event) => setColor(event.target.value)}
          type="color"
          value={color}
        />
      </label>

      <div className="form-actions">
        {onCancel && (
          <Button disabled={saving} onClick={onCancel} variant="ghost">
            Cancel
          </Button>
        )}
        <Button disabled={saving} type="submit" variant="primary">
          <Save size={18} aria-hidden="true" />
          {saving ? 'Saving' : initialProject ? 'Save' : 'Create'}
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
