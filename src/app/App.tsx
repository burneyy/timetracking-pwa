import { type KeyboardEvent, type TouchEvent, useRef, useState } from 'react'
import { EntryForm } from '../features/entries/EntryForm'
import { EntryList } from '../features/entries/EntryList'
import { ExportView } from '../features/export/ExportView'
import { ProjectList } from '../features/projects/ProjectList'
import { TimerCard } from '../features/timer/TimerCard'
import { routes, type AppView } from './routes'

type TransitionDirection = 'neutral' | 'next' | 'previous'

function App() {
  const [activeView, setActiveView] = useState<AppView>('timer')
  const [transitionDirection, setTransitionDirection] = useState<TransitionDirection>('neutral')
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null)
  const activePanelId = `${activeView}-panel`

  const selectView = (view: AppView, direction: TransitionDirection = 'neutral') => {
    setTransitionDirection(direction)
    setActiveView(view)
    requestAnimationFrame(() => {
      document.getElementById(`${view}-tab`)?.focus()
    })
  }

  const selectRelativeView = (offset: number) => {
    const currentIndex = routes.findIndex((route) => route.id === activeView)
    const nextIndex = (currentIndex + offset + routes.length) % routes.length

    selectView(routes[nextIndex].id, offset > 0 ? 'next' : 'previous')
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

  const handleTouchStart = (event: TouchEvent<HTMLElement>) => {
    if (event.touches.length !== 1) {
      swipeStartRef.current = null
      return
    }

    const touch = event.touches[0]
    swipeStartRef.current = { x: touch.clientX, y: touch.clientY }
  }

  const handleTouchEnd = (event: TouchEvent<HTMLElement>) => {
    const swipeStart = swipeStartRef.current
    swipeStartRef.current = null

    if (!swipeStart || event.changedTouches.length === 0) return

    const touch = event.changedTouches[0]
    const deltaX = touch.clientX - swipeStart.x
    const deltaY = touch.clientY - swipeStart.y
    const absDeltaX = Math.abs(deltaX)
    const absDeltaY = Math.abs(deltaY)
    const isHorizontalSwipe = absDeltaX >= 60 && absDeltaX > absDeltaY * 1.4

    if (!isHorizontalSwipe) return

    selectRelativeView(deltaX < 0 ? 1 : -1)
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

      <main
        className="main-content"
        onTouchCancel={() => {
          swipeStartRef.current = null
        }}
        onTouchEnd={handleTouchEnd}
        onTouchStart={handleTouchStart}
      >
        <div
          aria-labelledby={`${activeView}-tab`}
          className={`view-panel view-panel-${transitionDirection}`}
          key={activeView}
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
