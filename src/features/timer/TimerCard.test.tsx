import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { db } from '../../db/db'
import { createProject } from '../projects/projectService'
import { pinProjectTask } from '../tasks/taskService'
import { TimerCard } from './TimerCard'

describe('TimerCard', () => {
  afterEach(async () => {
    cleanup()
    await db.runningTimer.clear()
    await db.tasks.clear()
    await db.timeEntries.clear()
    await db.projects.clear()
  })

  it('starts a timer after selecting a pinned task suggestion', async () => {
    const projectId = await createProject('Client')
    await pinProjectTask(projectId, 'Weekly Sync')

    render(<TimerCard embedded />)

    await screen.findByRole('option', { name: 'Client' })
    await userEvent.selectOptions(screen.getByLabelText('Project'), projectId)
    await userEvent.click(screen.getByLabelText('Task'))
    await userEvent.click(await screen.findByRole('button', { name: /Weekly Sync/ }))

    expect(screen.getByLabelText('Task')).toHaveValue('Weekly Sync')
    await expect(db.runningTimer.get('active')).resolves.toBeUndefined()

    await userEvent.click(screen.getByRole('button', { name: 'Start' }))

    await waitFor(async () => {
      await expect(db.runningTimer.get('active')).resolves.toMatchObject({
        projectId,
        task: 'Weekly Sync',
      })
    })
  })
})
