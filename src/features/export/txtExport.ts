import { formatDateInput, formatTime } from '../../shared/dateTime'
import type { TimeEntry } from '../entries/entryTypes'
import type { Project } from '../projects/projectTypes'

type TxtExportOptions = {
  locale?: Intl.LocalesArgument
}

function browserLocale(): string | undefined {
  if (typeof navigator === 'undefined') return undefined

  return navigator.language
}

function oneLine(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').replace(/[ \t]+/g, ' ').trim()
}

function formatLocalDateKey(value: string) {
  return formatDateInput(value).slice(0, 10)
}

function formatLocalDayHeading(value: string, locale: Intl.LocalesArgument) {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    weekday: 'short',
  })
    .format(new Date(value))
    .replace(',', '')
}

function sortByStartAtAsc(left: TimeEntry, right: TimeEntry) {
  return left.startAt.localeCompare(right.startAt)
}

function sortProjectsByAlias(left: Project, right: Project) {
  return left.alias.localeCompare(right.alias, undefined, { sensitivity: 'base' })
}

export function exportEntriesToTxt(
  entries: TimeEntry[],
  projects: Project[],
  options: TxtExportOptions = {},
): string {
  const locale = options.locale ?? browserLocale()
  const projectsById = new Map(projects.map((project) => [project.id, project]))
  const exportedProjectIds = new Set(entries.map((entry) => entry.projectId))
  const headerLines = projects
    .filter((project) => !project.archived || exportedProjectIds.has(project.id))
    .sort(sortProjectsByAlias)
    .map((project) => `${oneLine(project.alias)} ${oneLine(project.name)}`)
  const bodyLines: string[] = []
  let currentDateKey = ''

  for (const entry of [...entries].sort(sortByStartAtAsc)) {
    const dateKey = formatLocalDateKey(entry.startAt)
    const project = projectsById.get(entry.projectId)

    if (dateKey !== currentDateKey) {
      if (bodyLines.length > 0) bodyLines.push('')

      bodyLines.push(`* ${formatLocalDayHeading(entry.startAt, locale)}`)
      currentDateKey = dateKey
    }

    bodyLines.push([
      `${formatTime(entry.startAt)} - ${formatTime(entry.endAt)}`,
      oneLine(project?.alias ?? 'Unknown project'),
      oneLine(entry.task),
    ].filter(Boolean).join(' '))
  }

  return `${[headerLines.join('\n'), bodyLines.join('\n')].filter(Boolean).join('\n\n')}\n`
}

export function downloadTxt(filename: string, txtContent: string) {
  const blob = new Blob([`\uFEFF${txtContent}`], { type: 'text/plain;charset=utf-8' })
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
