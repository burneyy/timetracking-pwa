import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ProjectForm } from './ProjectForm'

describe('ProjectForm', () => {
  afterEach(() => {
    cleanup()
  })

  it('shows the project name with underscores as the alias placeholder while alias is empty', async () => {
    render(<ProjectForm onSubmit={vi.fn()} />)

    const nameInput = screen.getByRole('textbox', { name: 'Name' })
    const aliasInput = screen.getByRole<HTMLInputElement>('textbox', { name: 'Alias' })

    expect(aliasInput).toHaveAttribute('placeholder', 'Client')

    await userEvent.type(nameInput, 'Client Project')

    expect(aliasInput).toHaveAttribute('placeholder', 'Client_Project')
    expect(aliasInput).toHaveValue('')
  })

  it('submits a selected common project color', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)

    render(<ProjectForm onSubmit={onSubmit} />)

    await userEvent.type(screen.getByRole('textbox', { name: 'Name' }), 'Client')
    await userEvent.click(screen.getByRole('button', { name: 'Blue project color' }))
    await userEvent.click(screen.getByRole('button', { name: 'Create' }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({ name: 'Client', alias: '', color: '#315f9f' })
    })
  })

  it('submits a custom project color from the native picker', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)

    render(<ProjectForm onSubmit={onSubmit} />)

    await userEvent.type(screen.getByRole('textbox', { name: 'Name' }), 'Client')
    const customColorInput = screen.getByLabelText('Custom project color')

    fireEvent.change(customColorInput, {
      target: { value: '#bada55' },
    })
    expect(customColorInput.closest('.custom-color-button')).toHaveAttribute('data-selected', 'true')
    await userEvent.click(screen.getByRole('button', { name: 'Create' }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({ name: 'Client', alias: '', color: '#bada55' })
    })
  })
})
