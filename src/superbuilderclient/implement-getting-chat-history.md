Implement: Getting Chat History From An External Application

Overview
- The desktop app exposes a local HTTP endpoint that proxies the middleware’s chat history. An external script (PowerShell via bun) uses this endpoint to list sessions or fetch one session by ID. No filesystem logs are used.

Usage (PowerShell)
- Prerequisites
  - Run the app so the local endpoint is available at `http://127.0.0.1:6225`.
    - From `src/superbuilderclient`: `npm install`
    - Dev run: `npm run tauri -- dev`
  - Install bun if needed: `iwr https://bun.sh/install.ps1 -UseBasicParsing | iex`
- Commands
  - List all session IDs: `bun get_chat_history.ts list`
  - Get a session by ID: `bun get_chat_history.ts <sessionId>`
  - Output is JSON printed to stdout.

HTTP Endpoint
- `GET /chat-history` → returns all sessions as JSON.
- `GET /chat-history?sid=<number>` → returns only sessions matching `sid`.
- Backend references:
  - Handler: `src-tauri/src/lib.rs:404`
  - Route registration: `src-tauri/src/lib.rs:469`

External Script
- File: `get_chat_history.ts:1`
- Behavior: Calls `http://127.0.0.1:6225/chat-history` and prints either IDs (`list`) or a specific session (`<sid>`).

Data Shape
- Session object fields:
  - `sid: number`, `name: string`, `date: string`, `messages: Array<{ timestamp, text, sender, query_type, attached_files?, references? }>`

Implementation Details (Source Changes)
- Added
  - `src-tauri/src/lib.rs:404` — `chat_history_handler` which:
    - Locks the shared gRPC client, calls `GetChatHistoryRequest`, parses the JSON, optionally filters by `sid`, returns JSON.
  - `src-tauri/src/lib.rs:469` — Registers `GET /chat-history` route in the Axum router.
  - `get_chat_history.ts:1` — Standalone bun script for listing sessions or fetching by `sid`.
  - Optional dev utilities (not required for PowerShell usage):
    - `src/utils/chatHistoryClient.ts:1` — Helper for fetching/normalizing sessions (used by UI/dev only).
    - `src/dev/chatHistoryTestHarness.ts:1` — DevTools helper (loaded in dev from `src/main.jsx:13`).
- Removed (legacy file-based logging)
  - Removed Tauri commands and helpers that wrote JSONL logs under the user home directory.
    - Deleted `init_chat_log` and `append_chat_log` functions and their registration from `src-tauri/src/lib.rs:1`.
    - Cleaned up unused imports originally used for file I/O.
  - Removed frontend invocations of file logging in `src/components/context/ChatContext.jsx:1`:
    - No more per-session log initialization on new sessions.
    - No more `append_chat_log` calls on user send or stream completion.

Notes
- This approach centralizes history retrieval through middleware and eliminates filesystem dependencies (`~/.workflow`).
- The endpoint binds to `127.0.0.1:6225` for local use.

