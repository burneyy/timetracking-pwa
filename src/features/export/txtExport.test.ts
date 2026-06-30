import { afterEach, describe, expect, it, vi } from 'vitest'
import type { TimeEntry } from '../entries/entryTypes'
import type { Project } from '../projects/projectTypes'
import { downloadTxt, exportEntriesToTxt } from './txtExport'

const projects: Project[] = [
  {
    id: 'project-2',
    name: 'Another Project Name',
    alias: 'ANOTHER_PROJ',
    color: '#8a97a3',
    archived: true,
    createdAt: '2026-03-31T08:00:00.000Z',
    updatedAt: '2026-03-31T08:00:00.000Z',
  },
  {
    id: 'project-1',
    name: 'Full Project Name',
    alias: 'PROJ_ALIAS',
    color: '#1c6b5d',
    archived: false,
    createdAt: '2026-03-31T08:00:00.000Z',
    updatedAt: '2026-03-31T08:00:00.000Z',
  },
  {
    id: 'project-3',
    name: 'Unused Active Project',
    alias: 'UNUSED_ACTIVE',
    color: '#315f9f',
    archived: false,
    createdAt: '2026-03-31T08:00:00.000Z',
    updatedAt: '2026-03-31T08:00:00.000Z',
  },
  {
    id: 'project-4',
    name: 'Unused Archived Project',
    alias: 'UNUSED_ARCHIVED',
    color: '#d18c3a',
    archived: true,
    createdAt: '2026-03-31T08:00:00.000Z',
    updatedAt: '2026-03-31T08:00:00.000Z',
  },
]

const entries: TimeEntry[] = [
  {
    id: 'entry-3',
    projectId: 'project-1',
    task: 'Morning session',
    startAt: '2026-04-02T08:30:00.000Z',
    endAt: '2026-04-02T11:54:00.000Z',
    createdAt: '2026-04-02T11:54:00.000Z',
    updatedAt: '2026-04-02T11:54:00.000Z',
  },
  {
    id: 'entry-1',
    projectId: 'project-1',
    task: 'Task description',
    startAt: '2026-04-01T08:28:00.000Z',
    endAt: '2026-04-01T12:16:00.000Z',
    createdAt: '2026-04-01T12:16:00.000Z',
    updatedAt: '2026-04-01T12:16:00.000Z',
  },
  {
    id: 'entry-4',
    projectId: 'project-2',
    task: 'Sprint review',
    startAt: '2026-04-02T15:55:00.000Z',
    endAt: '2026-04-02T17:34:00.000Z',
    createdAt: '2026-04-02T17:34:00.000Z',
    updatedAt: '2026-04-02T17:34:00.000Z',
  },
  {
    id: 'entry-2',
    projectId: 'project-2',
    task: 'Spring planning',
    startAt: '2026-04-01T13:20:00.000Z',
    endAt: '2026-04-01T17:29:00.000Z',
    createdAt: '2026-04-01T17:29:00.000Z',
    updatedAt: '2026-04-01T17:29:00.000Z',
  },
]

describe('txtExport', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('exports active project aliases and used archived project aliases', () => {
    const txt = exportEntriesToTxt(entries, projects, { locale: 'de-DE' })

    expect(txt).toBe(`ANOTHER_PROJ Another Project Name
PROJ_ALIAS Full Project Name
UNUSED_ACTIVE Unused Active Project

* Mi. 01.04.
08:28 - 12:16 PROJ_ALIAS Task description
13:20 - 17:29 ANOTHER_PROJ Spring planning

* Do. 02.04.
08:30 - 11:54 PROJ_ALIAS Morning session
15:55 - 17:34 ANOTHER_PROJ Sprint review
`)
    expect(txt).not.toContain('UNUSED_ARCHIVED')
  })

  it('normalizes line breaks inside task and project text', () => {
    const txt = exportEntriesToTxt(
      [
        {
          ...entries[0],
          task: 'Review\r\nsecond line',
        },
      ],
      [
        {
          ...projects[1],
          name: 'Another\r\nProject',
        },
      ],
      { locale: 'de-DE' },
    )

    expect(txt).toContain('PROJ_ALIAS Another Project')
    expect(txt).toContain('08:30 - 11:54 PROJ_ALIAS Review second line')
  })

  it('downloads TXT with a UTF-8 BOM', async () => {
    const click = vi.fn()
    const append = vi.spyOn(document.body, 'append')
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:txt')
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    const createElement = vi.spyOn(document, 'createElement')
    createElement.mockReturnValue({
      click,
      remove: vi.fn(),
      set href(value: string) {
        expect(value).toBe('blob:txt')
      },
      set download(value: string) {
        expect(value).toBe('time.txt')
      },
    } as unknown as HTMLAnchorElement)

    downloadTxt('time.txt', 'text\n')

    const blob = createObjectURL.mock.calls[0][0] as Blob
    const bytes = new Uint8Array(await blob.arrayBuffer())

    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf])
    expect(append).toHaveBeenCalled()
    expect(click).toHaveBeenCalled()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:txt')
  })
})
