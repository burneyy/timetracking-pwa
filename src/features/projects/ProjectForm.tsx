import { type CSSProperties, type FormEvent, useEffect, useId, useState } from 'react'
import { Save } from 'lucide-react'
import { Button } from '../../shared/ui/Button'
import type { Project } from './projectTypes'

type ProjectFormProps = {
  initialProject?: Project
  onCancel?: () => void
  onSubmit: (input: { name: string; alias?: string; color?: string }) => Promise<void>
}

const defaultColor = '#1c6b5d'
const commonProjectColors = [
  { name: 'Teal', value: '#1c6b5d' },
  { name: 'Blue', value: '#315f9f' },
  { name: 'Purple', value: '#6d4cc2' },
  { name: 'Pink', value: '#b34a7d' },
  { name: 'Red', value: '#b94646' },
  { name: 'Orange', value: '#d18c3a' },
  { name: 'Green', value: '#4f7d3a' },
  { name: 'Gray', value: '#8a97a3' },
] as const

export function ProjectForm({ initialProject, onCancel, onSubmit }: ProjectFormProps) {
  const errorId = useId()
  const colorInputId = useId()
  const [name, setName] = useState(initialProject?.name ?? '')
  const [alias, setAlias] = useState(initialProject?.alias ?? '')
  const [color, setColor] = useState(initialProject?.color ?? defaultColor)
  const [error, setError] = useState<string>()
  const [saving, setSaving] = useState(false)
  const aliasPlaceholder = name.trim().replaceAll(' ', '_') || 'Client'
  const normalizedColor = color.toLowerCase()
  const isCustomColor = !commonProjectColors.some((projectColor) => projectColor.value === normalizedColor)
  const customColorPreview = isCustomColor ? color : '#000000'

  useEffect(() => {
    setName(initialProject?.name ?? '')
    setAlias(initialProject?.alias ?? '')
    setColor(initialProject?.color ?? defaultColor)
    setError(undefined)
  }, [initialProject])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError(undefined)

    try {
      await onSubmit({ name, alias, color })
      if (!initialProject) {
        setName('')
        setAlias('')
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

      <label className="field">
        <span>Alias</span>
        <input
          aria-describedby={error ? errorId : undefined}
          aria-invalid={error ? 'true' : undefined}
          autoComplete="off"
          disabled={saving}
          onChange={(event) => setAlias(event.target.value)}
          placeholder={aliasPlaceholder}
          value={alias}
        />
      </label>

      <fieldset className="field color-field">
        <legend>Color</legend>
        <div className="color-options">
          {commonProjectColors.map((projectColor) => (
            <button
              aria-label={`${projectColor.name} project color`}
              aria-pressed={normalizedColor === projectColor.value}
              className="color-swatch-button"
              disabled={saving}
              key={projectColor.value}
              onClick={() => setColor(projectColor.value)}
              style={{ backgroundColor: projectColor.value }}
              title={projectColor.name}
              type="button"
            />
          ))}
          <label
            aria-disabled={saving}
            aria-label="Choose a custom project color"
            className="custom-color-button"
            data-selected={isCustomColor ? 'true' : undefined}
            htmlFor={colorInputId}
            style={{ '--selected-project-color': customColorPreview } as CSSProperties}
            title="Custom"
          >
            <input
              aria-label="Custom project color"
              disabled={saving}
              id={colorInputId}
              onChange={(event) => setColor(event.target.value)}
              type="color"
              value={color}
            />
          </label>
        </div>
      </fieldset>

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
