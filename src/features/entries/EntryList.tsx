import { EmptyState } from '../../shared/ui/EmptyState'

export function EntryList() {
  return (
    <section className="panel">
      <div className="section-header">
        <div>
          <p className="eyebrow">Today</p>
          <h2>Entries</h2>
        </div>
        <strong className="total-pill">0m</strong>
      </div>
      <EmptyState title="No tracked time today" message="Timer-created entries will appear here." />
    </section>
  )
}
