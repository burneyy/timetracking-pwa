import { type KeyboardEvent, useState } from 'react'
import { EntryForm } from '../features/entries/EntryForm'
import { EntryList } from '../features/entries/EntryList'
import { ExportView } from '../features/export/ExportView'
import { ProjectList } from '../features/projects/ProjectList'
import { TimerCard } from '../features/timer/TimerCard'
import { routes, type AppView } from './routes'

function App() {
  const [activeView, setActiveView] = useState<AppView>('timer')
  const activePanelId = `${activeView}-panel`

  const selectView = (view: AppView) => {
    setActiveView(view)
    requestAnimationFrame(() => {
      document.getElementById(`${view}-tab`)?.focus()
    })
  }

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, view: AppView) => {
    const currentIndex = routes.findIndex((route) => route.id === view)
    let nextIndex = currentIndex

    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % routes.length
    else if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + routes.length) % routes.length
    else if (event.key === 'Home') nextIndex = 0
    else if (event.key === 'End') nextIndex = routes.length - 1
    else return

    event.preventDefault()
    selectView(routes[nextIndex].id)
  }

  const renderActiveView = () => {
    if (activeView === 'timer') {
      return (
        <>
          <TimerCard />
          <EntryList />
        </>
      )
    }

    if (activeView === 'entries') {
      return (
        <>
          <EntryForm />
          <EntryList scope="all" />
        </>
      )
    }

    if (activeView === 'projects') return <ProjectList />

    return <ExportView />
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">T</span>
          <div>
            <strong>Timetracker</strong>
            <span>Local PWA</span>
          </div>
        </div>

        <div className="nav-list" role="tablist" aria-label="Application sections">
          {routes.map((route) => {
            const Icon = route.icon
            const selected = activeView === route.id

            return (
              <button
                aria-controls={`${route.id}-panel`}
                aria-selected={selected}
                className="nav-item"
                id={`${route.id}-tab`}
                key={route.id}
                onClick={() => selectView(route.id)}
                onKeyDown={(event) => handleTabKeyDown(event, route.id)}
                role="tab"
                tabIndex={selected ? 0 : -1}
                type="button"
              >
                <Icon size={18} aria-hidden="true" />
                {route.label}
              </button>
            )
          })}
        </div>
      </aside>

      <main className="main-content">
        <div
          aria-labelledby={`${activeView}-tab`}
          id={activePanelId}
          role="tabpanel"
          tabIndex={0}
        >
          {renderActiveView()}
        </div>
      </main>
    </div>
  )
}

export default App
