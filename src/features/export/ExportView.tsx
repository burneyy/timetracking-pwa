import { Download } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { format } from 'date-fns'
import { Button } from '../../shared/ui/Button'
import { EmptyState } from '../../shared/ui/EmptyState'
import { listAllEntries } from '../entries/entryService'
import { listAllProjects } from '../projects/projectService'
import { downloadCsv, exportEntriesToCsv } from './csvExport'

export function ExportView() {
  const entries = useLiveQuery(() => listAllEntries(), [])
  const projects = useLiveQuery(() => listAllProjects(), [])
  const isLoading = !entries || !projects
  const hasEntries = (entries?.length ?? 0) > 0
  const canDownload = hasEntries && !isLoading

  function handleDownload() {
    if (!canDownload) return

    const csv = exportEntriesToCsv(entries, projects)
    downloadCsv(`timetracker-${format(new Date(), 'yyyy-MM-dd')}.csv`, csv)
  }

  return (
    <section className="panel">
      <div className="section-header">
        <div>
          <p className="eyebrow">Export</p>
          <h2>CSV export</h2>
        </div>
        <Button disabled={!canDownload} onClick={handleDownload}>
          <Download size={18} aria-hidden="true" />
          Download CSV
        </Button>
      </div>
      {isLoading ? (
        <div className="export-summary" aria-live="polite" aria-busy="true">
          <strong>Preparing export</strong>
          <p>Loading entries and projects.</p>
        </div>
      ) : hasEntries ? (
        <div className="export-summary">
          <strong>{entries.length} entries ready</strong>
          <p>Exports include local date, project, task, start, end, and duration minutes.</p>
        </div>
      ) : (
        <EmptyState title="No exportable entries yet" message="Create entries before downloading a CSV file." />
      )}
    </section>
  )
}
