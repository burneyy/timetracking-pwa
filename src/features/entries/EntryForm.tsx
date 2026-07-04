import { useLiveQuery } from 'dexie-react-hooks'
import { listActiveProjects } from '../projects/projectService'
import { EntryEditor } from './EntryEditor'
import { createManualEntry } from './entryService'

type EntryFormProps = {
  embedded?: boolean
}

export function EntryForm({ embedded = false }: EntryFormProps) {
  const projects = useLiveQuery(() => listActiveProjects(), []) ?? []

  const content = (
    <>
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
    </>
  )

  if (embedded) {
    return <div>{content}</div>
  }

  return (
    <section className="panel">
      {content}
    </section>
  )
}
