import { formatDateInput, formatTime } from '../../shared/dateTime'
import type { TimeEntry } from '../entries/entryTypes'
import type { Project } from '../projects/projectTypes'

const header = ['date', 'project', 'task', 'start', 'end', 'duration_minutes']

function escapeCsvCell(value: string | number): string {
  const stringValue = String(value)

  if (!/[",\n\r]/.test(stringValue)) return stringValue

  return `"${stringValue.replaceAll('"', '""')}"`
}

function formatLocalDate(value: string) {
  return formatDateInput(value).slice(0, 10)
}

function formatLocalTime(value: string) {
  return formatTime(value)
}

export function exportEntriesToCsv(entries: TimeEntry[], projects: Project[]): string {
  const projectsById = new Map(projects.map((project) => [project.id, project]))
  const lines = [
    header.join(','),
    ...entries.map((entry) =>
      [
        formatLocalDate(entry.startAt),
        projectsById.get(entry.projectId)?.name ?? 'Unknown project',
        entry.task,
        formatLocalTime(entry.startAt),
        formatLocalTime(entry.endAt),
        entry.durationMinutes,
      ]
        .map(escapeCsvCell)
        .join(','),
    ),
  ]

  return `${lines.join('\n')}\n`
}

export function downloadCsv(filename: string, csvContent: string) {
  const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  try {
    link.href = url
    link.download = filename
    document.body.append(link)
    link.click()
  } finally {
    link.remove()
    URL.revokeObjectURL(url)
  }
}
