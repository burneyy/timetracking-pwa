import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Archive, ArchiveRestore, Pencil } from 'lucide-react'
import { EmptyState } from '../../shared/ui/EmptyState'
import { Button } from '../../shared/ui/Button'
import {
  archiveProject,
  createProject,
  listAllProjects,
  unarchiveProject,
  updateProject,
} from './projectService'
import type { Project } from './projectTypes'
import { ProjectForm } from './ProjectForm'

function ProjectRow({ project }: { project: Project }) {
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string>()

  async function handleArchive() {
    if (
      !window.confirm(
        `Archive "${project.name}"? Archived projects are hidden from active timers but historical entries stay intact.`,
      )
    ) {
      return
    }

    setError(undefined)

    try {
      await archiveProject(project.id)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Project could not be archived.')
    }
  }

  async function handleUnarchive() {
    if (
      !window.confirm(
        `Unarchive "${project.name}"? It will be available for new timers and entries again.`,
      )
    ) {
      return
    }

    setError(undefined)

    try {
      await unarchiveProject(project.id)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Project could not be unarchived.')
    }
  }

  if (editing) {
    return (
      <li className="project-row editing">
        <ProjectForm
          initialProject={project}
          onCancel={() => setEditing(false)}
          onSubmit={async (input) => {
            await updateProject(project.id, input)
            setEditing(false)
          }}
        />
      </li>
    )
  }

  return (
    <li className="project-row">
      <div className="project-row-main">
        <span className="project-color" style={{ backgroundColor: project.color ?? '#1c6b5d' }} />
        <div>
          <strong>{project.name}</strong>
          <span>
            {project.alias} · {project.archived ? 'Archived' : 'Active'}
          </span>
        </div>
      </div>
      <div className="row-actions">
        <Button aria-label={`Edit ${project.name}`} onClick={() => setEditing(true)} variant="ghost">
          <Pencil size={18} aria-hidden="true" />
        </Button>
        {project.archived ? (
          <Button aria-label={`Unarchive ${project.name}`} onClick={handleUnarchive} variant="ghost">
            <ArchiveRestore size={18} aria-hidden="true" />
          </Button>
        ) : (
          <Button aria-label={`Archive ${project.name}`} onClick={handleArchive} variant="ghost">
            <Archive size={18} aria-hidden="true" />
          </Button>
        )}
      </div>
      {error && <p className="form-error">{error}</p>}
    </li>
  )
}

export function ProjectList() {
  const projects = useLiveQuery(() => listAllProjects(), [])
  const activeProjects = projects?.filter((project) => !project.archived) ?? []
  const archivedProjects = projects?.filter((project) => project.archived) ?? []

  return (
    <section className="panel">
      <div className="section-header">
        <div>
          <p className="eyebrow">Projects</p>
          <h2>Project management</h2>
        </div>
      </div>

      <ProjectForm
        onSubmit={async ({ name, alias, color }) => {
          await createProject(name, color, alias)
        }}
      />

      <div className="project-groups">
        <div>
          <h3>Active projects</h3>
          {activeProjects.length === 0 ? (
            <EmptyState title="No active projects" message="Create a project to make it available in the timer." />
          ) : (
            <ul className="row-list">
              {activeProjects.map((project) => (
                <ProjectRow key={project.id} project={project} />
              ))}
            </ul>
          )}
        </div>

        {archivedProjects.length > 0 && (
          <div>
            <h3>Archived projects</h3>
            <ul className="row-list">
              {archivedProjects.map((project) => (
                <ProjectRow key={project.id} project={project} />
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}
