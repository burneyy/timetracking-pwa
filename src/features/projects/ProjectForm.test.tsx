import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ProjectForm } from './ProjectForm'

describe('ProjectForm', () => {
  afterEach(() => {
    cleanup()
  })

  it('shows the project name as the alias placeholder while alias is empty', async () => {
    render(<ProjectForm onSubmit={vi.fn()} />)

    const nameInput = screen.getByRole('textbox', { name: 'Name' })
    const aliasInput = screen.getByRole<HTMLInputElement>('textbox', { name: 'Alias' })

    expect(aliasInput).toHaveAttribute('placeholder', 'Client')

    await userEvent.type(nameInput, 'Client Project')

    expect(aliasInput).toHaveAttribute('placeholder', 'Client Project')
    expect(aliasInput).toHaveValue('')
  })
})
