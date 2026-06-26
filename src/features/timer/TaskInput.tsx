import { useId } from 'react'

type TaskInputProps = {
  disabled?: boolean
  onChange?: (task: string) => void
  suggestions?: string[]
  value?: string
}

export function TaskInput({ disabled = false, onChange, suggestions = [], value = '' }: TaskInputProps) {
  const suggestionsId = useId()

  return (
    <label className="field">
      <span>Task</span>
      <input
        autoComplete="off"
        list={suggestions.length > 0 ? suggestionsId : undefined}
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder="Implementation"
        value={value}
      />
      {suggestions.length > 0 && (
        <datalist id={suggestionsId}>
          {suggestions.map((suggestion) => (
            <option key={suggestion} value={suggestion} />
          ))}
        </datalist>
      )}
    </label>
  )
}
