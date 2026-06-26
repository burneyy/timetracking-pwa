# Agent Notes

## Development Server

Use the existing user systemd service for the Vite dev server. Do not start a separate server with `npm run dev` unless the user explicitly asks for it.

- Service: `timetracker-pwa.service`
- URL: `http://127.0.0.1:15173/`
- Restart after changes when a running dev server is needed: `systemctl --user restart timetracker-pwa.service`
- Check status/logs: `systemctl --user status timetracker-pwa.service` and `journalctl --user -u timetracker-pwa.service`
