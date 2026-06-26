export type ValidationResult = {
  valid: boolean
  message?: string
}

export function required(value: string, label: string): ValidationResult {
  if (value.trim().length > 0) return { valid: true }

  return { valid: false, message: `${label} is required.` }
}

export function assertValidDateRange(startAt: string, endAt: string): ValidationResult {
  if (!startAt || !endAt) {
    return { valid: false, message: 'Start and end times are required.' }
  }

  const startTime = new Date(startAt).getTime()
  const endTime = new Date(endAt).getTime()

  if (Number.isNaN(startTime) || Number.isNaN(endTime)) {
    return { valid: false, message: 'Start and end times must be valid.' }
  }

  if (endTime <= startTime) {
    return { valid: false, message: 'End time must be after the start time.' }
  }

  return { valid: true }
}
