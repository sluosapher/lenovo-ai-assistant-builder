Chat History Logging

- Goal: Persist each chat session’s history to the user’s home directory for auditing and traceability.

What It Does
- Creates a per-session JSONL log file under `<home>/.workflow/`.
- File name contains the session ID: `chat_session_<sessionId>.log`.
- Records both user and assistant messages with a timestamp.

Format
- One JSON object per line (JSONL):
  - {"timestamp": 1731262342, "role": "user", "text": "Hello"}
- Fields:
  - timestamp: UNIX seconds (integer)
  - role: "user" | "assistant"
  - text: message content (newlines escaped as `\n`)

Backend (Tauri, Rust)
- File: `src-tauri/src/lib.rs`
- Added commands:
  - `init_chat_log(sid: i32) -> Result<bool, String>`
    - Resolves `<home>/.workflow/`, ensures the directory exists, and creates the session log if missing.
  - `append_chat_log(sid: i32, role: String, text: String) -> Result<bool, String>`
    - Appends a JSONL record to the session’s log file with the current UNIX timestamp.
- Implementation notes:
  - Home directory is resolved via `USERPROFILE` (Windows) or `HOME` (others).
  - Files opened with `create(true)` and `append(true)` to avoid truncation.
  - Registered both commands in the Tauri `invoke_handler` so the UI can call them via `invoke`.

Frontend (React)
- File: `src/components/context/ChatContext.jsx`
- Integration points:
  - Initialize log on session creation:
    - When a new session is created (including the first auto-created session on startup), call `invoke("init_chat_log", { sid })` with the selected/new session ID.
  - Log user messages:
    - Before sending a prompt to the backend in `sendMessage`, call `invoke("append_chat_log", { sid: selectedSession, role: "user", text: input })`.
  - Log assistant messages:
    - Listen for `"stream-completed"`; when it fires, append the final assistant message using `invoke("append_chat_log", { sid: selectedSession, role: "assistant", text: lastAssistantText })`.
  - Reliability:
    - Introduced `messagesRef` and `selectedSessionRef` to read the latest state inside async listeners.

Updated Source Files
- `src-tauri/src/lib.rs`
  - Added: `init_chat_log`, `append_chat_log`, and helper functions to resolve and build file paths.
  - Registered the new Tauri commands in the `invoke_handler`.
- `src/components/context/ChatContext.jsx`
  - Added `messagesRef` and `selectedSessionRef`.
  - Invoked `init_chat_log` on new/initial session creation.
  - Appended user log on send; appended assistant log on `stream-completed`.

How To Validate
1) From `src/superbuilderclient`, run `npm install` and then `npm run tauri -- dev`.
2) In the app, start a new session or use the first session.
3) Send a prompt and wait for the assistant response to finish.
4) Check `<home>/.workflow/chat_session_<id>.log` for two JSONL entries (user and assistant).

Notes / Future Options
- Switch to ISO-8601 timestamps (requires `chrono`).
- Include additional metadata (query type, attached files, message id).
- Make directory/filename configurable; add a UI action to open the logs folder.

Additional Behavior: Hidden Session ID Note
- Purpose: provide the LLM explicit session context without affecting the visible UI or the saved logs.
- Behavior:
  - For the current prompt and each prior user message included in `conversationHistory`, the app appends a note string: `"\n\nThe current session Id: <sessionId>"` when sending to the backend.
  - The chat UI still displays the user’s original message text (no note shown).
  - The persisted JSONL logs also store the original user text (note is not included in logs).
- Implementation:
  - File: `src/components/context/ChatContext.jsx`
    - Builds `sessionNote` from the current `selectedSession`.
    - Appends the note to user entries in `contextHistory` and to the outgoing `prompt` sent to `call_chat`.
    - Leaves UI state (`messages`) and logging calls unchanged, so the user-visible text and logged text remain the same as typed.
