# Project Progress

## End Goal
- Document and validate two PoC features and their code changes:
  - A localhost HTTP endpoint to inject external messages into the current chat session.
  - Per-session chat history logging to the user home directory and adding a hidden session-id note to user prompts sent to the LLM (not visible in the UI).

## Approach
- Map backend and frontend integration points and message flow (HTTP -> Tauri events -> UI -> send path).
- Keep changes minimal and localized; wire features via the existing context and event listeners.
- Author concise, developer-facing docs with concrete file paths and validation steps.

## Work Completed
- Code discovery and mapping
  - Located backend HTTP server and handlers in `src-tauri/src/lib.rs` (Axum routes, bind `127.0.0.1:6225`, emits `external_prompt`).
  - Mapped frontend listener and auto-send chain:
    - Listener: `src/components/chat/Chat.jsx` subscribes to `external_prompt` and sets `externalValue`/`externalSendTrigger`.
    - Input bridge: `src/components/chat/ChatInput.jsx` auto-sends when the chat is ready.
    - Send path: `src/components/context/ChatContext.jsx` `sendMessage` -> Tauri `call_chat`.
- External messages documentation
  - Added `implement-external-messsages.md` documenting endpoints (`/healthz`, `/external-message`), backend emit, frontend handling, and example curl usage.
- Chat history logging
  - Backend (Tauri): `src-tauri/src/lib.rs`
    - Added `init_chat_log(sid)` and `append_chat_log(sid, role, text)` Tauri commands.
    - Ensures `<home>/.workflow/` exists; logs as JSONL lines with UNIX `timestamp`, `role`, `text`.
    - Registered both commands in the Tauri `invoke_handler`.
  - Frontend (React): `src/components/context/ChatContext.jsx`
    - Initialize a new per-session log file when creating a new session and for the initial session on startup.
    - Append a log entry for user messages on send and for assistant messages on `stream-completed`.
    - Introduced `messagesRef` and `selectedSessionRef` to read the latest state inside async listeners reliably.
  - Authored `implement-chat-history-logging.md` with implementation details and validation steps.
- Hidden session-id note
  - Appends the note "The current session Id: <sessionId>" to the LLM-bound prompt and to prior user entries in `conversationHistory`.
  - The UI and the persisted logs continue to show/store the original user text (note is not shown in the GUI and not included in logs).

## Failures Encountered & Fixes
- `rg` (ripgrep) unavailable.
  - Fix: Fallback to targeted searches and direct file reads.
- Full-tree searches previously timing out.
  - Fix: Scope searches to `src/` and `src-tauri/` only.
- Read-only filesystem constraints.
  - Fix: Use `apply_patch` with escalation to add and modify files.
- Initial attempt to patch via heredoc under PowerShell failed.
  - Fix: Use the `apply_patch` tool directly for all edits.

## Currently Working On
- Verifying end-to-end behavior for logging and the hidden session-id note.
- Keeping progress up to date and aligning both implementation docs.

## Next Steps (Proposed)
- Validation
  - Run the Tauri app (`npm run tauri -- dev`), create a session, send prompts, and validate:
    - Logs at `<home>/.workflow/chat_session_<id>.log` with user and assistant entries.
    - LLM-bound prompt includes the hidden session-id note while UI shows the original text.
- Documentation
  - Optionally extend docs with configuration (port change/disable external server, log path, timestamp format).
- Hardening
  - Consider auth/token for external POST endpoint.
  - Add unit tests around Axum handlers and Rust logging helpers; optionally add a minimal UI test for append behavior.

## Source Touchpoints (for reference)
- Backend: `src-tauri/src/lib.rs` — server spawn, routes, handlers, event emission; added logging commands.
- Frontend: `src/components/chat/Chat.jsx`, `src/components/chat/ChatInput.jsx`, `src/components/context/ChatContext.jsx` — event listener, input bridge, send path; logging integration; hidden session-id note.

