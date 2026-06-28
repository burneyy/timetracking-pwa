# Agent Notes

## Development Server

Use the existing user systemd service for the Vite dev server. Do not start a separate server with `npm run dev` unless the user explicitly asks for it.

- Service: `timetracker-pwa.service`
- URL: `http://127.0.0.1:15173/`
- Restart after changes when a running dev server is needed: `systemctl --user restart timetracker-pwa.service`
- Check status/logs: `systemctl --user status timetracker-pwa.service` and `journalctl --user -u timetracker-pwa.service`

## Database Schema Changes

This project is still under development. When changing the IndexedDB/Dexie schema, wipe existing local data instead of writing production-style migrations or migration correctness tests.

Notify the user when a schema change will clear existing data so the reset is transparent.
