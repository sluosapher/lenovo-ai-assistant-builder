External Chat History Tool (Middleware-Based)

Goal
- Provide a simple, external way to list sessions and fetch chat history for a specific session while the main app is running, without using any filesystem logs.

Approach
- Add a local HTTP endpoint to the running app that proxies the middleware `get_chat_history` call and optionally filters by `sid`.
- Provide a standalone TypeScript script runnable with `bun` that hits this endpoint to list sessions or fetch a specific session.

Prerequisites
- Run the desktop app so the local HTTP endpoint is available at `http://127.0.0.1:6225`.
  - From `src/superbuilderclient`: `npm install`
  - Start (dev): `npm run tauri -- dev`
  - Or run a packaged build — the endpoint is started in both dev and prod.

Commands (PowerShell with bun)
- List all session IDs:
  - `bun get_chat_history.ts list`
- Get chat history for a specific session ID:
  - `bun get_chat_history.ts 123`

Implementation Details
- Backend route: `GET /chat-history[?sid=<id>]`
  - File: `src-tauri/src/lib.rs`
  - Proxies to middleware gRPC `GetChatHistoryRequest` and returns JSON. When `sid` is provided, returns only matching sessions.
- External script: `get_chat_history.ts`
  - Uses `fetch` to call `http://127.0.0.1:6225/chat-history` and prints results.
  - Commands: `list` or a numeric session id.

Optional (Dev convenience)
- Dev harness: `src/dev/chatHistoryTestHarness.ts` exposes `window.ChatHistoryTest` helpers in dev builds. This is optional and not required for PowerShell usage.

Notes
- No external files under `~/.workflow` are used. The legacy file-based logging and its Tauri commands have been removed.
