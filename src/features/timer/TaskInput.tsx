import { useId, useMemo, useState } from 'react'
import { Clock3, Pin } from 'lucide-react'
import type { TaskSuggestion, TaskSuggestionGroups } from '../tasks/taskTypes'

type TaskInputProps = {
  disabled?: boolean
  hasProject?: boolean
  onChange?: (task: string) => void
  suggestions?: TaskSuggestionGroups
  value?: string
}

function SuggestionButton({
  onSelect,
  suggestion,
}: {
  onSelect: (title: string) => void
  suggestion: TaskSuggestion
}) {
  const Icon = suggestion.pinned ? Pin : Clock3
  const reason = suggestion.pinned && suggestion.recent
    ? 'Pinned and recent'
    : suggestion.pinned
      ? 'Pinned'
      : 'Recent'

  return (
    <button
      className="task-suggestion-option"
      onClick={() => onSelect(suggestion.title)}
      onPointerDown={(event) => {
        event.preventDefault()
      }}
      type="button"
    >
      <Icon size={16} aria-hidden="true" />
      <span>{suggestion.title}</span>
      <small>{reason}</small>
    </button>
  )
}

function SuggestionGroup({
  label,
  onSelect,
  suggestions,
}: {
  label: string
  onSelect: (title: string) => void
  suggestions: TaskSuggestion[]
}) {
  if (suggestions.length === 0) return null

  return (
    <div className="task-suggestion-group">
      <p>{label}</p>
      {suggestions.map((suggestion) => (
        <SuggestionButton
          key={`${label}-${suggestion.title.toLowerCase()}`}
          onSelect={onSelect}
          suggestion={suggestion}
        />
      ))}
    </div>
  )
}

export function TaskInput({
  disabled = false,
  hasProject = true,
  onChange,
  suggestions = { matches: [], pinned: [], recent: [] },
  value = '',
}: TaskInputProps) {
  const descriptionId = useId()
  const inputId = useId()
  const [open, setOpen] = useState(false)
  const hasQuery = value.trim().length > 0
  const hasSuggestions = hasQuery
    ? suggestions.matches.length > 0
    : suggestions.pinned.length > 0 || suggestions.recent.length > 0
  const exactMatch = useMemo(
    () =>
      suggestions.matches.some(
        (suggestion) => suggestion.title.trim().toLowerCase() === value.trim().toLowerCase(),
      ),
    [suggestions.matches, value],
  )

  function handleSelect(title: string) {
    onChange?.(title)
    setOpen(false)
  }

  const showUseTypedTask = hasQuery && !exactMatch

  return (
    <div
      className="field task-picker"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false)
        }
      }}
    >
      <label id={descriptionId} htmlFor={inputId}>
        Task
      </label>
      <input
        aria-describedby={descriptionId}
        aria-expanded={open && hasProject}
        aria-haspopup="listbox"
        autoComplete="off"
        disabled={disabled}
        id={inputId}
        onChange={(event) => {
          onChange?.(event.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        placeholder="Implementation"
        value={value}
      />
      {open && hasProject && (
        <div className="task-suggestion-menu" role="listbox">
          {hasQuery ? (
            <SuggestionGroup label="Suggestions" onSelect={handleSelect} suggestions={suggestions.matches} />
          ) : (
            <>
              <SuggestionGroup label="Pinned" onSelect={handleSelect} suggestions={suggestions.pinned} />
              <SuggestionGroup label="Recent" onSelect={handleSelect} suggestions={suggestions.recent} />
            </>
          )}
          {showUseTypedTask && (
            <button
              className="task-suggestion-option"
              onClick={() => handleSelect(value)}
              onPointerDown={(event) => {
                event.preventDefault()
              }}
              type="button"
            >
              <span>Use "{value.trim()}"</span>
              <small>New task</small>
            </button>
          )}
          {!hasSuggestions && !showUseTypedTask && (
            <p className="task-suggestion-empty">
              {hasQuery ? 'No matching tasks' : 'No pinned or recent tasks'}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
