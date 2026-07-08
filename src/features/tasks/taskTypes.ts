export type ProjectTask = {
  id: string
  projectId: string
  title: string
  pinned: boolean
  createdAt: string
  updatedAt: string
}

export type TaskSuggestion = {
  title: string
  pinned: boolean
  recent: boolean
  lastUsedAt?: string
  useCount: number
}

export type TaskSuggestionGroups = {
  matches: TaskSuggestion[]
  pinned: TaskSuggestion[]
  recent: TaskSuggestion[]
}
