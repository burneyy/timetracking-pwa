import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { db } from '../../db/db'
import { createProject } from '../projects/projectService'
import { pinProjectTask } from '../tasks/taskService'
import { startTimer } from './timerService'
import { TimerCard } from './TimerCard'

describe('TimerCard', () => {
  afterEach(async () => {
    cleanup()
    await db.runningTimer.clear()
    await db.tasks.clear()
    await db.timeEntries.clear()
    await db.projects.clear()
  })

  it('starts a project without a task and adds a pinned task while it runs', async () => {
    const projectId = await createProject('Client')
    await pinProjectTask(projectId, 'Weekly Sync')

    render(<TimerCard embedded />)

    await userEvent.click(await screen.findByRole('button', { name: 'Start Client' }))

    await waitFor(async () => {
      await expect(db.runningTimer.get('active')).resolves.toMatchObject({
        projectId,
        task: '',
      })
    })
    expect(await screen.findByRole('article', { name: 'Active timer' })).toBeInTheDocument()
    expect(screen.getByRole('timer')).toHaveAccessibleName(/Client, No task/)

    await userEvent.click(screen.getByLabelText('Task (optional)'))
    await userEvent.click(await screen.findByRole('button', { name: /Weekly Sync/ }))
    await waitFor(async () => {
      await expect(db.runningTimer.get('active')).resolves.toMatchObject({
        projectId,
        task: 'Weekly Sync',
      })
    })
  })

  it('renders project cards in recent-use order', async () => {
    const alphaId = await createProject('Alpha')
    const betaId = await createProject('Beta')
    await createProject('Gamma')
    await db.timeEntries.bulkAdd([
      {
        id: 'alpha-entry',
        projectId: alphaId,
        task: '',
        startAt: '2026-06-26T09:00:00.000Z',
        endAt: '2026-06-26T09:30:00.000Z',
        createdAt: '2026-06-26T09:30:00.000Z',
        updatedAt: '2026-06-26T09:30:00.000Z',
      },
      {
        id: 'beta-entry',
        projectId: betaId,
        task: 'Review',
        startAt: '2026-06-26T11:00:00.000Z',
        endAt: '2026-06-26T11:30:00.000Z',
        createdAt: '2026-06-26T11:30:00.000Z',
        updatedAt: '2026-06-26T11:30:00.000Z',
      },
    ])

    render(<TimerCard embedded />)

    const list = await screen.findByRole('list', { name: 'Projects by recent use' })
    const cards = within(list).getAllByRole('article')

    expect(cards.map((card) => card.getAttribute('aria-label'))).toEqual([
      'Beta project',
      'Alpha project',
      'Gamma project',
    ])
  })

  it('saves a running project change immediately', async () => {
    const clientId = await createProject('Client')
    const adminId = await createProject('Admin')
    const startedAt = '2026-06-26T10:00:00.000Z'
    await startTimer(clientId, '', startedAt)

    render(<TimerCard embedded />)

    await userEvent.selectOptions(await screen.findByLabelText('Project'), adminId)

    await waitFor(async () => {
      await expect(db.runningTimer.get('active')).resolves.toMatchObject({
        projectId: adminId,
        startedAt,
      })
    })
    expect(screen.queryByRole('button', { name: 'Save details' })).not.toBeInTheDocument()
  })

  it('applies pending task changes before stopping', async () => {
    const projectId = await createProject('Client')
    const startedAt = new Date(Date.now() - 2 * 60_000).toISOString()
    await startTimer(projectId, '', startedAt)

    render(<TimerCard embedded />)

    const taskInput = await screen.findByLabelText('Task (optional)')
    await userEvent.type(taskInput, 'Planning')
    await userEvent.click(screen.getByRole('button', { name: 'Stop' }))

    await waitFor(async () => {
      await expect(db.runningTimer.get('active')).resolves.toBeUndefined()
    })
    await expect(db.timeEntries.toArray()).resolves.toMatchObject([
      {
        projectId,
        task: 'Planning',
        startAt: startedAt,
      },
    ])
  })
})
