import { Clock3, Download, FolderKanban, ListChecks } from 'lucide-react'

export type AppView = 'timer' | 'entries' | 'projects' | 'export'

export const routes: Array<{
  id: AppView
  label: string
  icon: typeof Clock3
}> = [
  { id: 'timer', label: 'Timer', icon: Clock3 },
  { id: 'entries', label: 'Entries', icon: ListChecks },
  { id: 'projects', label: 'Projects', icon: FolderKanban },
  { id: 'export', label: 'Export', icon: Download },
]
