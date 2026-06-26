import { EmptyState } from '../../shared/ui/EmptyState'

export function EntryForm() {
  return (
    <section className="panel">
      <div className="section-header">
        <div>
          <p className="eyebrow">Manual</p>
          <h2>Manual entries</h2>
        </div>
      </div>
      <EmptyState title="Manual entry editing pending" message="This view is scheduled for milestone 5." />
    </section>
  )
}
