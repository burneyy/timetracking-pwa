type TaskInputProps = {
  disabled?: boolean
  onChange?: (task: string) => void
  value?: string
}

export function TaskInput({ disabled = false, onChange, value = '' }: TaskInputProps) {
  return (
    <label className="field">
      <span>Task</span>
      <input
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder="Implementation"
        value={value}
      />
    </label>
  )
}
