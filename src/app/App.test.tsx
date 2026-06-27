import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { db } from '../db/db'
import App from './App'

function swipeMainContent(startX: number, endX: number, startY = 100, endY = 100) {
  const main = screen.getByRole('main')

  fireEvent.touchStart(main, {
    touches: [{ clientX: startX, clientY: startY }],
  })
  fireEvent.touchEnd(main, {
    changedTouches: [{ clientX: endX, clientY: endY }],
  })
}

describe('App navigation gestures', () => {
  afterEach(async () => {
    cleanup()
    await db.runningTimer.clear()
    await db.timeEntries.clear()
    await db.projects.clear()
  })

  it('switches between views with horizontal swipes', () => {
    render(<App />)

    expect(screen.getByRole('tab', { name: 'Timer' })).toHaveAttribute('aria-selected', 'true')

    swipeMainContent(300, 200)
    expect(screen.getByRole('tab', { name: 'Entries' })).toHaveAttribute('aria-selected', 'true')

    swipeMainContent(200, 300)
    expect(screen.getByRole('tab', { name: 'Timer' })).toHaveAttribute('aria-selected', 'true')
  })

  it('ignores vertical scroll gestures', () => {
    render(<App />)

    swipeMainContent(300, 230, 100, 230)

    expect(screen.getByRole('tab', { name: 'Timer' })).toHaveAttribute('aria-selected', 'true')
  })
})
