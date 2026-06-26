# Timetracker PWA

A local-first personal time-tracking Progressive Web App built with React, TypeScript, Vite, Dexie, and date-fns.

## Current Scope

The MVP follows the implementation plan in [PLAN.md](./PLAN.md):

- local browser storage through IndexedDB
- one active running timer
- project-based task tracking
- manual time entry management
- CSV export
- offline-capable static build

## Development

```bash
npm install
npm run dev
```

## Verification

```bash
npm test
npm run build
```

Production builds generate a web app manifest and service worker so the static app shell can be cached for offline use after the first load.

## Data Storage

Application data is stored in the browser in an IndexedDB database named `timetracker`.
