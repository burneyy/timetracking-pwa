import { EmptyState } from '../../shared/ui/EmptyState'

export function ProjectList() {
  return (
    <section className="panel">
      <div className="section-header">
        <div>
          <p className="eyebrow">Projects</p>
          <h2>Project management</h2>
        </div>
      </div>
      <EmptyState title="No projects yet" message="Project creation arrives in the next milestone." />
    </section>
  )
}
