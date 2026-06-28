# Timetracker PWA - Implementation Plan

## 1. Goal

Build a personal time-tracking Progressive Web App that can be deployed as a static website and works fully locally on one device.

The app should support a classic timer workflow:

- Select a pre-created project.
- Enter or select a task.
- Start tracking time.
- Stop tracking time.
- Manually create and edit time entries.
- Export tracked time as CSV.

The MVP does not need accounts, backend storage, synchronization, invoices, reminders, Pomodoro, calendar integrations, or import/export backup.

## 2. Core Product Principles

1. **Local-first**
   - All application data is stored in the browser.
   - No backend is required for MVP.
   - The app must remain usable offline after the initial load.

2. **Static deployable**
   - The app should be buildable into static assets.
   - Deployment target can be GitHub Pages, Cloudflare Pages, Netlify, Vercel static hosting, or a VPS with Nginx/Caddy.

3. **Single active timer**
   - Only one timer may run at a time.
   - Starting a new timer automatically stops the currently running timer and creates a completed time entry for it.

4. **Minute precision**
   - Time entries are tracked and displayed to the minute.
   - Seconds may exist internally in timestamps but exported/reporting values should round or floor consistently to minutes.

5. **Simple, clean productivity UI**
   - Visual direction: clean, focused, similar in spirit to Timemator.
   - The MVP should prioritize clarity and low-friction tracking over feature density.

## 3. Recommended Technology Stack

### Frontend

- **React**
- **TypeScript**
- **Vite**

Rationale:

- Mature and well-established ecosystem.
- Excellent TypeScript support.
- Works well for a static PWA.
- Simple development and production build workflow.

### Local Database

- **IndexedDB via Dexie.js**

Rationale:

- Better suited than `localStorage` for structured data.
- Supports transactions.
- Handles larger data sets more safely.
- Still fully local to the browser.
- Makes future import/export or optional sync easier.

### Styling/UI

Recommended MVP option:

- **Tailwind CSS**
- Optional: **shadcn/ui** or **Radix UI** for accessible primitives

Rationale:

- Fast UI iteration.
- Easy to create a clean productivity-tool style.
- Avoids heavy component frameworks.

### Dates and Time

- **date-fns**

Rationale:

- Lightweight.
- Good enough for formatting, date grouping, and duration calculations.

### PWA

- **vite-plugin-pwa**

Rationale:

- Straightforward service worker and manifest setup for Vite.
- Suitable for caching the app shell for offline usage.

## 4. Non-Goals for MVP

The MVP should explicitly avoid:

- Backend API
- User accounts
- Authentication
- Multi-device sync
- Cloud backup
- Invoicing
- Hourly rates
- Pomodoro
- Idle detection
- Reminders
- Calendar integration
- Native desktop/mobile app wrappers
- Complex reports or charts
- Import/export backup beyond CSV export

These can be added later if needed.

## 5. Data Model

Use string IDs generated with `crypto.randomUUID()`.

### Project

```ts
export type Project = {
  id: string
  name: string
  color?: string
  archived: boolean
  createdAt: string
  updatedAt: string
}
```

Notes:

- Projects are pre-created by the user.
- Archived projects should not appear in the main timer project selector by default.
- Existing time entries must continue to reference archived projects.

### TimeEntry

```ts
export type TimeEntry = {
  id: string
  projectId: string
  task: string
  startAt: string
  endAt: string
  createdAt: string
  updatedAt: string
}
```

Notes:

- `startAt` and `endAt` should be ISO strings.
- Duration should be calculated from `startAt` and `endAt` when displayed or exported.
- Manual entries use the same model as timer-created entries.

### RunningTimer

```ts
export type RunningTimer = {
  id: 'active'
  projectId: string
  task: string
  startedAt: string
}
```

Notes:

- There is at most one row in the `runningTimer` table.
- Use the fixed ID `'active'`.
- The running timer should survive page reloads.

## 6. IndexedDB Schema

Dexie database:

```ts
import Dexie, { Table } from 'dexie'

export class AppDatabase extends Dexie {
  projects!: Table<Project, string>
  timeEntries!: Table<TimeEntry, string>
  runningTimer!: Table<RunningTimer, string>

  constructor() {
    super('timetracker')

    this.version(1).stores({
      projects: 'id, name, archived, createdAt, updatedAt',
      timeEntries: 'id, projectId, task, startAt, endAt, createdAt, updatedAt',
      runningTimer: 'id'
    })
  }
}

export const db = new AppDatabase()
```

## 7. Timer Semantics

### Invariant

Only one timer can run at any time.

### Start Timer

When the user starts a timer:

1. Capture `now`.
2. Check whether a timer is currently running.
3. If yes:
   - Stop the current timer at `now`.
   - Create a completed `TimeEntry` for the previous project/task.
4. Create or replace the active `RunningTimer` with the new project/task.

This must be done in a Dexie transaction.

```ts
export async function startTimer(projectId: string, task: string) {
  const now = new Date().toISOString()

  await db.transaction('rw', db.runningTimer, db.timeEntries, async () => {
    const current = await db.runningTimer.get('active')

    if (current) {
      await db.timeEntries.add({
        id: crypto.randomUUID(),
        projectId: current.projectId,
        task: current.task,
        startAt: current.startedAt,
        endAt: now,
        createdAt: now,
        updatedAt: now
      })
    }

    await db.runningTimer.put({
      id: 'active',
      projectId,
      task,
      startedAt: now
    })
  })
}
```

### Stop Timer

When the user stops the active timer:

1. Capture `now`.
2. Read the active timer.
3. If there is no active timer, do nothing.
4. Create a completed `TimeEntry`.
5. Delete the active `RunningTimer`.

```ts
export async function stopTimer() {
  const now = new Date().toISOString()

  await db.transaction('rw', db.runningTimer, db.timeEntries, async () => {
    const current = await db.runningTimer.get('active')

    if (!current) return

    await db.timeEntries.add({
      id: crypto.randomUUID(),
      projectId: current.projectId,
      task: current.task,
      startAt: current.startedAt,
      endAt: now,
      createdAt: now,
      updatedAt: now
    })

    await db.runningTimer.delete('active')
  })
}
```

### Switching Timer

Starting another project/task is not a separate operation. It is the same as `startTimer()`.

No confirmation is needed in the MVP.

### Same Project/Task Restart Behavior

Recommended MVP behavior:

- If the user starts a timer while one is already running, always stop the current timer and start a new one.
- Even if the selected project/task is identical, create a new entry boundary.

This keeps behavior simple and predictable.

## 8. Duration Calculation

Recommended MVP rule:

```ts
export function calculateDurationMinutes(startAt: string, endAt: string): number {
  const start = new Date(startAt).getTime()
  const end = new Date(endAt).getTime()
  const diffMs = Math.max(0, end - start)
  return Math.round(diffMs / 60_000)
}
```

Important:

- Use one consistent rule everywhere.
- `Math.round` is user-friendly for minute precision.
- If exact accounting becomes important later, switch to storing raw milliseconds and deriving display values.

## 9. CSV Export

MVP export fields:

```txt
date,project,task,start,end,duration_minutes
```

Example:

```csv
date,project,task,start,end,duration_minutes
2026-06-25,Client Project,Implementation,09:00,10:30,90
```

Recommended options:

- Export all entries.
- Optionally add date range filtering after the basic export works.

CSV export should resolve `projectId` to project name.

## 10. Task Suggestions

For MVP, tasks do not need their own table.

Suggestions should be derived from previous entries:

- Extract distinct `task` strings from `timeEntries`.
- Prioritize recently used tasks.
- Optionally filter suggestions based on selected project.

Recommended behavior:

- Task input is free text.
- Existing task suggestions appear while typing.
- Empty task should be allowed or disallowed based on UX preference.

Recommended MVP rule:

- Require a non-empty task.

## 11. Validation Rules

### Project

- Name is required.
- Name should be unique among non-archived projects.

### Time Entry

- Project is required.
- Task is required.
- `startAt` is required.
- `endAt` is required.
- `endAt` must be greater than or equal to `startAt`.
- Duration is recalculated from start/end.

### Running Timer

- Project is required.
- Task is required.
- `startedAt` is generated by the app.

## 12. UI Structure

Recommended routes/screens:

```txt
/
  Timer dashboard

/entries
  Entry list, manual entry creation, editing, deletion

/projects
  Project management

/export
  CSV export

/settings
  Optional later
```

For MVP, this can also be implemented as a single-page layout with tabs.

Recommended MVP layout:

- Left/sidebar or top navigation depending on screen size.
- Main timer card at the top.
- Today's entries below.
- Project management in a separate view.

## 13. Component Structure

```txt
src/
  app/
    App.tsx
    routes.tsx

  db/
    db.ts
    schema.ts

  features/
    projects/
      projectTypes.ts
      projectService.ts
      ProjectList.tsx
      ProjectForm.tsx
      ProjectSelect.tsx

    timer/
      timerTypes.ts
      timerService.ts
      TimerCard.tsx
      TaskInput.tsx
      RunningTimerDisplay.tsx

    entries/
      entryTypes.ts
      entryService.ts
      EntryList.tsx
      EntryForm.tsx
      EntryRow.tsx

    export/
      csvExport.ts
      ExportView.tsx

  shared/
    dateTime.ts
    validation.ts
    ui/
```

## 14. Services

Keep business logic outside React components.

Recommended services:

### `projectService.ts`

- `createProject(name, color?)`
- `updateProject(projectId, patch)`
- `archiveProject(projectId)`
- `listActiveProjects()`
- `listAllProjects()`

### `timerService.ts`

- `startTimer(projectId, task)`
- `stopTimer()`
- `getRunningTimer()`

### `entryService.ts`

- `createManualEntry(input)`
- `updateEntry(entryId, patch)`
- `deleteEntry(entryId)`
- `listEntriesByDateRange(start, end)`
- `listTodayEntries()`

### `csvExport.ts`

- `exportEntriesToCsv(entries, projects)`
- `downloadCsv(filename, csvContent)`

## 15. PWA Requirements

MVP PWA behavior:

- App shell is cached.
- App can be opened while offline after first successful load.
- Manifest contains name, short name, icons, display mode, and theme color.

Recommended manifest values:

```json
{
  "name": "Timetracker",
  "short_name": "Timer",
  "display": "standalone",
  "start_url": "/",
  "theme_color": "#111827",
  "background_color": "#ffffff"
}
```

For GitHub Pages, configure Vite `base` correctly if deploying under a repository subpath.

Example:

```ts
export default defineConfig({
  base: '/timetracker-pwa/'
})
```

If deploying to a custom domain or root path, use:

```ts
export default defineConfig({
  base: '/'
})
```

## 16. Development Workflow

### Initial Setup

```bash
npm create vite@latest timetracker-pwa -- --template react-ts
cd timetracker-pwa
npm install
```

### Dependencies

```bash
npm install dexie dexie-react-hooks date-fns
npm install -D vite-plugin-pwa
```

Optional UI dependencies:

```bash
npm install clsx tailwind-merge lucide-react
npm install -D tailwindcss postcss autoprefixer
```

### Run Locally

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

### VPS Development Preview

During development, either:

1. Run Vite dev server on the VPS for quick feedback.
2. Or build static files and serve `/dist` via Nginx/Caddy.

For mobile PWA testing, serving over HTTPS is strongly recommended.

## 17. Implementation Milestones

### Milestone 1: Project Skeleton

Deliverables:

- Vite React TypeScript app
- Basic layout
- Routing or tab-based navigation
- Dexie database initialized
- Empty states

Acceptance criteria:

- App runs locally.
- App builds successfully.
- Database can be opened in browser devtools.

### Milestone 2: Project Management

Deliverables:

- Create project
- List active projects
- Edit project name/color
- Archive project

Acceptance criteria:

- User can create at least one project.
- Archived projects disappear from timer selector.
- Existing entries can still display archived project names.

### Milestone 3: Core Timer

Deliverables:

- Select project
- Enter task
- Start timer
- Stop timer
- Running timer persists across reload
- Starting a new timer automatically stops the old one

Acceptance criteria:

- Only one timer can run.
- Stopping creates a time entry.
- Starting another timer creates a completed entry for the previous timer and starts the new one.
- Reloading the page shows the still-running timer.

### Milestone 4: Entry List

Deliverables:

- Show today's entries
- Show duration per entry
- Show total tracked time for today
- Resolve project names

Acceptance criteria:

- Timer-created entries appear immediately after stopping/switching.
- Today's total updates correctly.

### Milestone 5: Manual Entries and Editing

Deliverables:

- Create manual entry
- Edit existing entry
- Delete entry
- Recalculate duration on edit

Acceptance criteria:

- Manual and timer-created entries use the same data model.
- Invalid entries cannot be saved.
- Editing an entry updates the list and daily total.

### Milestone 6: CSV Export

Deliverables:

- Export all entries as CSV
- Resolve project names
- Include date, project, task, start, end, duration minutes

Acceptance criteria:

- CSV file downloads successfully.
- CSV opens correctly in spreadsheet software.
- Umlauts and special characters are preserved.

### Milestone 7: PWA Polish

Deliverables:

- App manifest
- Service worker
- Offline app shell
- Icons
- Installable behavior

Acceptance criteria:

- App can be installed on supported devices.
- App loads offline after first visit.
- Static build can be deployed.

### Milestone 8: UI Polish

Deliverables:

- Clean productivity-tool look
- Responsive layout
- Nice timer card
- Better empty states
- Keyboard-friendly input flow

Acceptance criteria:

- App is pleasant to use on desktop.
- App is usable on mobile.
- Starting/stopping timers requires minimal clicks.

## 18. Suggested First Implementation Slice

Build the first vertical slice before adding polish:

1. Create project.
2. Select project.
3. Enter task.
4. Start timer.
5. Stop timer.
6. Show today's entries.
7. Start a second timer while the first is running and verify the first is automatically saved.

This proves the core app loop.

## 19. Important Edge Cases

Handle these from the beginning:

- User reloads while timer is running.
- User starts new timer while another timer is running.
- User starts and stops within less than one minute.
- User edits entry so end time is before start time.
- User archives a project that has historical entries.
- User deletes a project that has entries.

Recommended MVP decision:

- Do not allow deleting projects with entries.
- Allow archiving instead.

## 20. Future Enhancements

Potential later additions:

- JSON import/export backup
- Optional sync backend
- Hourly rates
- Billable/non-billable flag
- Tags as first-class entities
- Date range reports
- Charts
- Calendar view
- Keyboard shortcuts
- Idle detection
- Desktop wrapper via Tauri
- Browser extension or menu bar helper
- GitHub/issue tracker integration

## 21. Open Decisions

These can be decided during implementation:

1. Should an empty task be allowed?
   - Recommendation: no, require a task.

2. Should duration round, floor, or ceil to minutes?
   - Recommendation: round to nearest minute for MVP.

3. Should users be able to delete projects?
   - Recommendation: only allow archiving in MVP.

4. Should task suggestions be global or project-specific?
   - Recommendation: project-specific first, then global fallback.

5. Should CSV export include ISO timestamps or local formatted times?
   - Recommendation: include local date/time columns plus raw ISO columns later if needed.

