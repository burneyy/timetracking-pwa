import { Download, FileText, Upload } from 'lucide-react'
import type { ChangeEvent } from 'react'
import { useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { format } from 'date-fns'
import { Button } from '../../shared/ui/Button'
import { EmptyState } from '../../shared/ui/EmptyState'
import {
  startOfLocalDay,
  startOfLocalMonth,
  startOfLocalWeek,
  startOfNextLocalDay,
  startOfNextLocalMonth,
  startOfNextLocalWeek,
} from '../../shared/dateTime'
import { listAllEntries, listEntriesByDateRange } from '../entries/entryService'
import type { TimeEntry } from '../entries/entryTypes'
import { listAllProjects } from '../projects/projectService'
import {
  downloadJson,
  exportBackupToJson,
  importBackupJson,
  previewBackupJson,
  type BackupImportResult,
} from './backup'
import { downloadCsv, exportEntriesToCsv } from './csvExport'
import { downloadTxt, exportEntriesToTxt } from './txtExport'

type RangePreset = 'all' | 'today' | 'week' | 'month' | 'custom'

type ResolvedRange =
  | {
      kind: 'all'
      fileSlug: string
      label: string
    }
  | {
      kind: 'range'
      end: Date
      fileSlug: string
      label: string
      start: Date
    }
  | {
      error: string
      kind: 'invalid'
    }

function formatDateValue(value = new Date()) {
  return format(value, 'yyyy-MM-dd')
}

function parseDateValue(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)

  if (!match) return null

  const [, year, month, day] = match
  const date = new Date(Number(year), Number(month) - 1, Number(day))

  if (
    date.getFullYear() !== Number(year) ||
    date.getMonth() !== Number(month) - 1 ||
    date.getDate() !== Number(day)
  ) {
    return null
  }

  return date
}

function formatRangeLabel(start: Date, end: Date) {
  const inclusiveEnd = new Date(end)
  inclusiveEnd.setDate(inclusiveEnd.getDate() - 1)

  return `${format(start, 'MMM d, yyyy')} to ${format(inclusiveEnd, 'MMM d, yyyy')}`
}

function resolveRange(preset: RangePreset, customStart: string, customEnd: string): ResolvedRange {
  const now = new Date()

  if (preset === 'all') {
    return {
      kind: 'all',
      fileSlug: 'all-time',
      label: 'All time',
    }
  }

  if (preset === 'today') {
    const start = startOfLocalDay(now)
    const end = startOfNextLocalDay(now)

    return {
      kind: 'range',
      start,
      end,
      fileSlug: format(start, 'yyyy-MM-dd'),
      label: 'Today',
    }
  }

  if (preset === 'week') {
    const start = startOfLocalWeek(now)
    const end = startOfNextLocalWeek(now)

    return {
      kind: 'range',
      start,
      end,
      fileSlug: `${format(start, 'yyyy-MM-dd')}-to-${format(new Date(end.getTime() - 1), 'yyyy-MM-dd')}`,
      label: `This week, ${formatRangeLabel(start, end)}`,
    }
  }

  if (preset === 'month') {
    const start = startOfLocalMonth(now)
    const end = startOfNextLocalMonth(now)

    return {
      kind: 'range',
      start,
      end,
      fileSlug: format(start, 'yyyy-MM'),
      label: format(start, 'MMMM yyyy'),
    }
  }

  const start = parseDateValue(customStart)
  const endDate = parseDateValue(customEnd)

  if (!start || !endDate) {
    return {
      kind: 'invalid',
      error: 'Choose a valid start and end date.',
    }
  }

  const end = new Date(endDate)
  end.setDate(end.getDate() + 1)

  if (start >= end) {
    return {
      kind: 'invalid',
      error: 'End date must be on or after start date.',
    }
  }

  return {
    kind: 'range',
    start,
    end,
    fileSlug: `${format(start, 'yyyy-MM-dd')}-to-${format(endDate, 'yyyy-MM-dd')}`,
    label: formatRangeLabel(start, end),
  }
}

type PendingImport = {
  json: string
  projectsOnly: boolean
  result: BackupImportResult
}

function formatImportSummary(result: BackupImportResult, mode: 'complete' | 'preview') {
  const importLabel = mode === 'complete' ? 'imported' : 'to import'
  const details = [
    `${result.importedProjects} projects ${importLabel}`,
    `${result.matchedProjects} projects matched`,
    `${result.importedEntries} entries ${importLabel}`,
    `${result.duplicateEntries} duplicates skipped`,
  ]

  if (result.conflictedProjects > 0) {
    details.push(`${result.conflictedProjects} project conflicts skipped`)
  }

  if (result.conflictedEntries > 0) {
    details.push(`${result.conflictedEntries} entries skipped`)
  }

  return details.join(', ')
}

export function ExportView() {
  const today = useMemo(() => formatDateValue(), [])
  const importInputRef = useRef<HTMLInputElement>(null)
  const [rangePreset, setRangePreset] = useState<RangePreset>('all')
  const [customStart, setCustomStart] = useState(today)
  const [customEnd, setCustomEnd] = useState(today)
  const [projectsOnlyImport, setProjectsOnlyImport] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importMessage, setImportMessage] = useState('')
  const [importError, setImportError] = useState('')
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null)
  const range = resolveRange(rangePreset, customStart, customEnd)
  const rangeStart = range.kind === 'range' ? range.start.toISOString() : ''
  const rangeEnd = range.kind === 'range' ? range.end.toISOString() : ''
  const entries = useLiveQuery(
    () => {
      if (range.kind === 'invalid') return Promise.resolve([] as TimeEntry[])
      if (range.kind === 'all') return listAllEntries()

      return listEntriesByDateRange(range.start, range.end)
    },
    [rangePreset, rangeStart, rangeEnd],
  )
  const backupEntries = useLiveQuery(() => listAllEntries(), [])
  const projects = useLiveQuery(() => listAllProjects(), [])
  const isRangeValid = range.kind !== 'invalid'
  const isLoading = isRangeValid && (!entries || !projects)
  const entryCount = entries?.length ?? 0
  const hasEntries = entryCount > 0
  const canDownload = isRangeValid && hasEntries && !isLoading
  const canDownloadBackup = Boolean(projects && backupEntries)

  function handleCsvDownload() {
    if (!canDownload || !entries || !projects) return

    const csv = exportEntriesToCsv(entries, projects)
    downloadCsv(`timetracker-${range.fileSlug}.csv`, csv)
  }

  function handleTxtDownload() {
    if (!canDownload || !entries || !projects) return

    const txt = exportEntriesToTxt(entries, projects)
    downloadTxt(`timetracker-${range.fileSlug}.txt`, txt)
  }

  function handleBackupDownload() {
    if (!projects || !backupEntries) return

    const json = exportBackupToJson(projects, backupEntries)
    downloadJson(`timetracker-backup-${format(new Date(), 'yyyy-MM-dd')}.json`, json)
  }

  async function handleImportFileChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget
    const file = input.files?.[0]

    if (!file) return

    setImporting(true)
    setImportMessage('')
    setImportError('')
    setPendingImport(null)

    try {
      const json = await file.text()
      const result = await previewBackupJson(json, { projectsOnly: projectsOnlyImport })
      setPendingImport({ json, projectsOnly: projectsOnlyImport, result })
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Backup import failed.')
    } finally {
      input.value = ''
      setImporting(false)
    }
  }

  async function handleApplyImport() {
    if (!pendingImport) return

    setImporting(true)
    setImportError('')

    try {
      const result = await importBackupJson(pendingImport.json, { projectsOnly: pendingImport.projectsOnly })
      setPendingImport(null)
      setImportMessage(formatImportSummary(result, 'complete'))
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Backup import failed.')
    } finally {
      setImporting(false)
    }
  }

  return (
    <section className="panel export-panel">
      <div className="export-report-section">
        <div className="section-header">
          <div>
            <p className="eyebrow">Export</p>
            <h2>Reports</h2>
          </div>
          <div className="export-actions">
            <label className="field export-range-field">
              Range
              <select
                onChange={(event) => setRangePreset(event.target.value as RangePreset)}
                value={rangePreset}
              >
                <option value="all">All time</option>
                <option value="today">Today</option>
                <option value="week">This week</option>
                <option value="month">This month</option>
                <option value="custom">Custom</option>
              </select>
            </label>
            <Button disabled={!canDownload} onClick={handleCsvDownload}>
              <Download size={18} aria-hidden="true" />
              Download CSV
            </Button>
            <Button disabled={!canDownload} onClick={handleTxtDownload}>
              <FileText size={18} aria-hidden="true" />
              Download TXT
            </Button>
          </div>
        </div>
        {rangePreset === 'custom' ? (
          <div className="export-custom-range">
            <label className="field">
              Start date
              <input
                onChange={(event) => setCustomStart(event.target.value)}
                type="date"
                value={customStart}
              />
            </label>
            <label className="field">
              End date
              <input
                onChange={(event) => setCustomEnd(event.target.value)}
                type="date"
                value={customEnd}
              />
            </label>
          </div>
        ) : null}
        {isLoading ? (
          <div className="export-summary" aria-live="polite" aria-busy="true">
            <strong>Preparing export</strong>
            <p>Loading entries and projects.</p>
          </div>
        ) : range.kind === 'invalid' ? (
          <div className="export-summary export-summary-error" role="alert">
            <strong>Check date range</strong>
            <p>{range.error}</p>
          </div>
        ) : hasEntries ? (
          <div className="export-summary">
            <strong>{entryCount} entries ready</strong>
            <p>
              {range.label}. CSV includes detailed columns; TXT lists project aliases and groups entries by local days.
            </p>
          </div>
        ) : (
          <EmptyState title="No exportable entries found" message="Change the range or create entries before downloading a file." />
        )}
      </div>

      <div className="export-backup-section">
        <div className="section-header">
          <div>
            <p className="eyebrow">Backup</p>
            <h2>Backup JSON</h2>
          </div>
          <div className="export-actions">
            <Button disabled={!canDownloadBackup} onClick={handleBackupDownload}>
              <Download size={18} aria-hidden="true" />
              Download JSON
            </Button>
            <Button disabled={importing} onClick={() => importInputRef.current?.click()}>
              <Upload size={18} aria-hidden="true" />
              Import JSON
            </Button>
          </div>
        </div>
        <div className="backup-options">
          <label className="checkbox-field">
            <input
              checked={projectsOnlyImport}
              onChange={(event) => {
                setProjectsOnlyImport(event.target.checked)
                setPendingImport(null)
              }}
              type="checkbox"
            />
            Projects only
          </label>
          <input
            accept="application/json,.json"
            aria-label="Import backup JSON file"
            hidden
            onChange={handleImportFileChange}
            ref={importInputRef}
            type="file"
          />
        </div>
        {importError ? (
          <div className="export-summary export-summary-error" role="alert">
            <strong>Import failed</strong>
            <p>{importError}</p>
          </div>
        ) : pendingImport ? (
          <div className="export-summary" role="status">
            <strong>Import preview</strong>
            <p>{formatImportSummary(pendingImport.result, 'preview')}</p>
            <div className="backup-preview-actions">
              <Button disabled={importing} onClick={handleApplyImport} variant="primary">
                <Upload size={18} aria-hidden="true" />
                Apply import
              </Button>
              <Button disabled={importing} onClick={() => setPendingImport(null)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : importMessage ? (
          <div className="export-summary" role="status">
            <strong>Import complete</strong>
            <p>{importMessage}</p>
          </div>
        ) : (
          <div className="export-summary">
            <strong>{backupEntries?.length ?? 0} entries and {projects?.length ?? 0} projects ready</strong>
            <p>JSON backup contains the full local data set.</p>
          </div>
        )}
      </div>
    </section>
  )
}
