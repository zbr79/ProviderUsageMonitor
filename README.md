# Provider Usage Monitor

A local desktop widget that shows how much of an AI subscription is left. It covers OpenCode Go, Cursor, Grok, Codex, and Claude.

Keys and logins stay on this machine. OpenCode uses an API key you add in settings. The other providers are read from the apps already signed in on the computer.

## What it shows

- OpenCode Go: rolling, weekly, and monthly usage, and the time until each window resets
- Cursor: first-party and API usage, the plan name, and the billing-cycle reset
- Grok: weekly usage and the time until reset
- Codex: usage, plan, and the time until reset
- Claude: signed-in state and plan

The panel stays compact until you expand it. An account that has used up its weekly or monthly allowance drops to the bottom, soonest reset first. Otherwise the account that changed most recently stays on top.

Right-click the window to expand, refresh, open settings, or quit. Settings can turn providers on or off, rename accounts, and add or remove OpenCode accounts.

## How it runs

A Next.js server and a small Electron window. The server listens on `127.0.0.1:3100`, so it can run next to other local apps. The window is frameless, always on top, and draggable. Both the widget and the settings screen use the same local API routes. Provider clients live in `lib/`.

## Requirements

- Node.js 20 or newer
- Windows for the Electron window. The server can run on its own anywhere.
- Cursor, the Codex CLI, or Claude Code if you want those rows. A missing app is skipped.

## Setup

```bash
npm install
cd desktop && npm install && cd ..
npm run build
npm run start
```

The site is at http://127.0.0.1:3100. From `desktop/`, `npm start` opens the widget.

## Local data

Nothing under `data/` is committed except the example file.

- `data/accounts.json` stores OpenCode emails and API keys. See `data/accounts.example.json` for the shape.
- `data/settings.json` stores toggles, names, and disabled accounts.
- `data/.api-secret` is a local token for account and settings writes. The desktop app sends it for you.

## Scripts

- `npm run dev` starts the development server on http://127.0.0.1:3100
- `npm run build` builds for production
- `npm run start` serves that build
- `npm test` runs the unit tests
- `npm run lint` runs ESLint
- `npm run typecheck` checks TypeScript

The tests cover ranking, reset text, settings defaults, the local write token, and account validation. They do not call provider APIs.

## Layout

```
app/        pages and API routes
desktop/    Electron window
lib/        provider clients, ranking, and settings
data/       local accounts and settings, not committed
```
