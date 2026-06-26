import { useLiveQuery } from 'dexie-react-hooks'
import { listActiveProjects } from '../projects/projectService'
import { EntryEditor } from './EntryEditor'
import { createManualEntry } from './entryService'

export function EntryForm() {
  const projects = useLiveQuery(() => listActiveProjects(), []) ?? []

  return (
    <section className="panel">
      <div className="section-header">
        <div>
          <p className="eyebrow">Manual</p>
          <h2>Manual entries</h2>
        </div>
      </div>
      <EntryEditor
        onSubmit={async (input) => {
          await createManualEntry(input)
        }}
        projects={projects}
        submitLabel="Create"
      />
    </section>
  )
}
