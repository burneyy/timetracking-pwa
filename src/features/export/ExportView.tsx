import { Download } from 'lucide-react'
import { Button } from '../../shared/ui/Button'
import { EmptyState } from '../../shared/ui/EmptyState'

export function ExportView() {
  return (
    <section className="panel">
      <div className="section-header">
        <div>
          <p className="eyebrow">Export</p>
          <h2>CSV export</h2>
        </div>
        <Button disabled>
          <Download size={18} aria-hidden="true" />
          Download CSV
        </Button>
      </div>
      <EmptyState title="No exportable entries yet" message="CSV export is scheduled after entry editing." />
    </section>
  )
}
