import { afterEach, describe, expect, it, vi } from 'vitest'
import type { TimeEntry } from '../entries/entryTypes'
import type { Project } from '../projects/projectTypes'
import { downloadCsv, exportEntriesToCsv } from './csvExport'

const projects: Project[] = [
  {
    id: 'project-1',
    name: 'Client, GmbH',
    alias: 'CG',
    color: '#1c6b5d',
    archived: false,
    createdAt: '2026-06-26T08:00:00.000Z',
    updatedAt: '2026-06-26T08:00:00.000Z',
  },
  {
    id: 'project-2',
    name: 'Archivierte Prüfung',
    alias: 'AP',
    color: '#8a97a3',
    archived: true,
    createdAt: '2026-06-25T08:00:00.000Z',
    updatedAt: '2026-06-26T08:00:00.000Z',
  },
]

const entries: TimeEntry[] = [
  {
    id: 'entry-1',
    projectId: 'project-1',
    task: 'Fix "CSV" export\nwith umlauts äöü',
    startAt: '2026-06-26T09:00:00.000Z',
    endAt: '2026-06-26T10:30:00.000Z',
    createdAt: '2026-06-26T10:30:00.000Z',
    updatedAt: '2026-06-26T10:30:00.000Z',
  },
  {
    id: 'entry-2',
    projectId: 'project-2',
    task: 'Review\r\nsecond line',
    startAt: '2026-06-25T08:15:00.000Z',
    endAt: '2026-06-25T08:45:00.000Z',
    createdAt: '2026-06-25T08:45:00.000Z',
    updatedAt: '2026-06-25T08:45:00.000Z',
  },
]

describe('csvExport', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('exports entries with escaped project and task values', () => {
    const csv = exportEntriesToCsv(entries, projects)

    expect(csv).toContain('date,project_name,project_alias,task,start,end,duration_minutes')
    expect(csv).toContain('"Client, GmbH"')
    expect(csv).toContain(',CG,')
    expect(csv).toContain('"Fix ""CSV"" export\nwith umlauts äöü"')
    expect(csv).toContain('Archivierte Prüfung')
    expect(csv).toContain(',AP,')
    expect(csv).toContain('"Review\r\nsecond line"')
    expect(csv).toContain(',90')
    expect(csv.endsWith('\n')).toBe(true)
  })

  it('downloads CSV with a UTF-8 BOM', async () => {
    const click = vi.fn()
    const append = vi.spyOn(document.body, 'append')
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:csv')
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    const createElement = vi.spyOn(document, 'createElement')
    createElement.mockReturnValue({
      click,
      remove: vi.fn(),
      set href(value: string) {
        expect(value).toBe('blob:csv')
      },
      set download(value: string) {
        expect(value).toBe('time.csv')
      },
    } as unknown as HTMLAnchorElement)

    downloadCsv('time.csv', 'date\n')

    const blob = createObjectURL.mock.calls[0][0] as Blob
    const bytes = new Uint8Array(await blob.arrayBuffer())

    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf])
    expect(append).toHaveBeenCalled()
    expect(click).toHaveBeenCalled()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:csv')
  })

  it('cleans up the download link and object URL if clicking fails', () => {
    const remove = vi.fn()
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:csv')
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    const createElement = vi.spyOn(document, 'createElement')
    createElement.mockReturnValue({
      click: vi.fn(() => {
        throw new Error('click failed')
      }),
      remove,
      set href(_value: string) {},
      set download(_value: string) {},
    } as unknown as HTMLAnchorElement)

    expect(() => downloadCsv('time.csv', 'date\n')).toThrow('click failed')
    expect(remove).toHaveBeenCalled()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:csv')
    expect(createObjectURL).toHaveBeenCalled()
  })
})
