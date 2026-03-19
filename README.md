# Worktree Stats

A local dashboard to monitor and manage git worktrees across multiple repositories. Built for developers who work with many worktrees simultaneously and need visibility into branches, ports, dev servers, and Claude Code sessions.

![Stack](https://img.shields.io/badge/Hono-TypeScript-blue) ![Stack](https://img.shields.io/badge/React-Tailwind-cyan) ![Platform](https://img.shields.io/badge/macOS-local-black)

## What it does

- **Workspace scanning** — Point to a directory, auto-detect all git repos inside, register them all at once
- **Worktree overview** — See every worktree per repo: branch name, parsed objective, commit hash
- **Port monitoring** — Detect which ports are in use via `lsof`, correlate with worktrees
- **Claude Code detection** — Detect active Claude Code sessions and which worktree they're working in
- **Dev server management** — Start/stop dev servers per worktree with auto port assignment
- **Live updates** — WebSocket connection with 3s polling, broadcasts only on changes
- **Folder browser** — Navigate your filesystem visually to select repos/workspaces (no manual path typing)
- **Create/delete worktrees** — Manage worktrees directly from the UI

## Screenshot

```
┌─────────────────────────────────────────────────┐
│  Worktree Stats                        ● LIVE   │
│  1 Workspaces  3 Repos  5 Worktrees  1 Running  │
│                                                  │
│  📁 my-workspace                                 │
│  ├── my-backend          [main] [wt-1] [wt-2]   │
│  ├── my-frontend         [main] [wt-1]           │
│  └── my-app              [main]                  │
└─────────────────────────────────────────────────┘
```

## Quick start

```bash
git clone https://github.com/fvenegasp/worktree-stats.git
cd worktree-stats

# Install dependencies
npm install
cd client && npm install && cd ..

# Build the frontend
npm run build

# Run in production mode (single server on :4000)
npm start

# Or run in dev mode (hot reload on :5173, API on :4000)
npm run dev
```

Open `http://localhost:4000` (production) or `http://localhost:5173` (dev mode).

## Setup

1. Open the dashboard
2. Click **"Add Workspace"**
3. Browse to a directory that contains your git repos
4. Click **SELECT WORKSPACE** — all repos inside are auto-detected
5. Adjust dev commands and ports if needed
6. Click **Register N Repos**

Configuration is saved to `config.json` (gitignored). See `config.example.json` for the format.

## Run as a service (macOS)

To keep it running permanently and auto-start on login:

```bash
# Build first
npm run build

# Create a launchd agent
cat > ~/Library/LaunchAgents/com.worktree-stats.plist << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.worktree-stats</string>
    <key>ProgramArguments</key>
    <array>
        <string>$(which npx)</string>
        <string>tsx</string>
        <string>server/index.ts</string>
    </array>
    <key>WorkingDirectory</key>
    <string>$(pwd)</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>$(dirname $(which node)):/usr/local/bin:/usr/bin:/bin</string>
    </dict>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>$(pwd)/logs/stdout.log</string>
    <key>StandardErrorPath</key>
    <string>$(pwd)/logs/stderr.log</string>
</dict>
</plist>
EOF

mkdir -p logs

# Load the service
launchctl load ~/Library/LaunchAgents/com.worktree-stats.plist
```

Manage the service:

```bash
# Stop
launchctl unload ~/Library/LaunchAgents/com.worktree-stats.plist

# Restart
launchctl unload ~/Library/LaunchAgents/com.worktree-stats.plist && launchctl load ~/Library/LaunchAgents/com.worktree-stats.plist

# Logs
tail -f logs/stderr.log
```

## Stack

| Layer | Tech |
|-------|------|
| Backend | [Hono](https://hono.dev) + `@hono/node-server` + `@hono/node-ws` |
| Frontend | React 19 + Tailwind CSS + Vite |
| Language | TypeScript everywhere |
| Runtime | Node.js 20+ |
| Port | `4000` (fixed) |

## API

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/repos` | List registered repos |
| POST | `/api/repos` | Register a repo |
| PUT | `/api/repos/:id` | Update repo config |
| DELETE | `/api/repos/:id` | Remove a repo |
| GET | `/api/repos/:id/worktrees` | List worktrees for a repo |
| POST | `/api/repos/:id/worktrees` | Create a worktree |
| DELETE | `/api/repos/:id/worktrees` | Remove a worktree |
| GET | `/api/status` | Full snapshot (all repos, worktrees, ports, claude) |
| POST | `/api/worktrees/start` | Start dev server |
| POST | `/api/worktrees/stop` | Stop dev server |
| GET | `/api/browse?path=` | Browse filesystem directories |
| POST | `/api/workspace/scan` | Scan directory for git repos |
| POST | `/api/workspace/register-all` | Register all repos in a workspace |
| WS | `/ws` | Live updates (status:update, process:output) |

## Project structure

```
worktree-stats/
├── server/
│   ├── index.ts              # Hono app, routes, WS, static files
│   ├── types.ts              # Shared TypeScript interfaces
│   ├── routes/
│   │   ├── repos.ts          # CRUD repos
│   │   ├── worktrees.ts      # Start/stop dev servers
│   │   ├── workspace.ts      # Scan + register workspace
│   │   ├── browse.ts         # Filesystem browser API
│   │   ├── ports.ts          # Port scanning
│   │   └── processes.ts      # Running processes
│   ├── services/
│   │   ├── git.service.ts    # git worktree list/add/remove
│   │   ├── port.service.ts   # lsof scan, port assignment
│   │   ├── process.service.ts # spawn/kill dev servers
│   │   ├── claude.service.ts # Detect Claude Code sessions
│   │   └── config.service.ts # Read/write config.json
│   └── ws/
│       ├── handler.ts        # WebSocket connection management
│       └── poller.ts         # 3s polling + diff broadcast
└── client/
    ├── src/
    │   ├── App.tsx
    │   ├── pages/Dashboard.tsx
    │   ├── components/
    │   │   ├── WorktreeCard.tsx
    │   │   ├── PathBrowser.tsx
    │   │   ├── RepoRegistration.tsx
    │   │   ├── CreateWorktreeModal.tsx
    │   │   ├── PortBadge.tsx
    │   │   ├── ClaudeIndicator.tsx
    │   │   └── ProcessControls.tsx
    │   ├── hooks/
    │   │   ├── useWebSocket.ts
    │   │   └── useRepos.ts
    │   └── lib/api.ts
    └── vite.config.ts        # Proxy /api → :4000
```

## Contributing

PRs welcome. Some ideas:

- **Linux support** — Replace `lsof` with `/proc` filesystem reads
- **Process log viewer** — Show stdout/stderr in the UI (WebSocket infra already exists)
- **Worktree templates** — Pre-configured branch naming + port assignment
- **Multi-machine** — Sync config across machines
- **Dark/light theme toggle**

## License

MIT
