# Modifications Guide (Re‑Implementation Checklist)

This document consolidates all custom changes made on top of the original app. Use it as a checklist when re‑implementing these behaviors in a future version of the app.

Each section is self‑contained and refers to current file paths only as examples of where the logic lives today.

---

## 1. External Message Injection into Chat

**Goal**
- Allow an external process to inject a text prompt into the *current* chat session via a localhost HTTP endpoint, and have the UI auto‑send it through the normal chat path.

**Backend Behavior (Tauri, Rust)**
- Host a lightweight Axum HTTP server bound to `127.0.0.1:6225` that lives alongside the Tauri app.
- Routes:
  - `GET /healthz` → returns `{"ok": true}` (HTTP 200). Used for simple readiness checks.
  - `POST /external-message` with JSON body: `{ "text": string, "chatId"?: number }`.
- `POST /external-message` handler responsibilities:
  - Validate `text` is non‑empty; on empty text return HTTP 400 with a JSON error.
  - Emit a Tauri app‑wide event (name: `"external_prompt"`) with payload `{ text, chatId }`.
  - Return HTTP 202 with body `{"status": "queued"}` to indicate the message has been handed off to the UI.
- Server startup:
  - On app initialization, spawn the Axum server on `127.0.0.1:6225` and log bind/serve failures with a clear prefix (e.g., `[external-server]`).

**Frontend Behavior (React)**
- Listener:
  - In the main chat component, subscribe to the `"external_prompt"` Tauri event using `@tauri-apps/api/event`.
  - On receiving a payload, parse `{ text, chatId }`, trim `text`, and ignore if empty.
  - Store `text` in a piece of state such as `externalValue` and toggle a boolean `externalSendTrigger` to signal a new external message has arrived.
- Input auto‑send:
  - In the chat input component, watch `externalSendTrigger` in a `useEffect`:
    - When it toggles, prefill the input field with `externalValue`.
    - If `isChatReady` is true, immediately send the formatted input via the existing `handleSendMessage` callback and clear the input.
    - If `isChatReady` is false, mark the message as pending and defer sending until `isChatReady` becomes true.
  - Add a separate `useEffect` that watches `isChatReady`; when it flips to true and a pending external message exists, send it and clear the pending state.
- Send path:
  - Do *not* invent a new send API; instead call the existing `sendMessage`/`call_chat` pipeline used by manual user input so all prompts obey the current formatting, history, and logging rules.

**Re‑Implementation Notes**
- Keep this flow strictly local (`127.0.0.1`) and unauthenticated unless you explicitly add security (e.g., token or origin checks).
- Use a two‑step “value + trigger” pattern (`externalValue` plus `externalSendTrigger`) to avoid subtle React race conditions where setting the same string twice might not retrigger effects.
- If the new UI uses a different event system, preserve the same high‑level contract: HTTP → backend event → UI listener → chat input auto‑send.

---

## 2. External Chat History Retrieval (Middleware Proxy)

**Goal**
- Provide a file‑free way for external tools to read chat history from the running app by proxying the middleware `get_chat_history` call over a localhost HTTP endpoint, plus a small script that calls it.

**Backend Behavior (Tauri, Rust)**
- HTTP route (on the same Axum server at `127.0.0.1:6225`):
  - `GET /chat-history` → returns all chat sessions as JSON.
  - `GET /chat-history?sid=<number>` → returns only sessions whose `sid` matches the given value.
- Handler responsibilities:
  - Access the shared gRPC client from Tauri state and call the middleware `GetChatHistoryRequest` RPC.
  - Unwrap the gRPC response, which contains a JSON string, and parse it into a JSON value.
  - If `sid` is present, filter the top‑level array to only those session objects whose `sid` matches.
  - Return HTTP 200 and the filtered or full JSON body.
  - On failures, return structured JSON errors:
    - 503 if the client is not initialized.
    - 502 for gRPC errors.
    - 500 if the returned JSON is invalid.

**External Script Behavior**
- Provide a small, standalone TypeScript script (run with `bun` or `node`) that calls the `/chat-history` endpoint and prints results:
  - Usage pattern:
    - `bun get_chat_history.ts list` → fetches `/chat-history`, parses JSON, prints the list of session IDs.
    - `bun get_chat_history.ts <sessionId>` → fetches `/chat-history?sid=<id>`, prints JSON for that session.
- Script responsibilities:
  - Parse CLI arguments (`list` vs numeric ID).
  - Call `http://127.0.0.1:6225/chat-history` with `fetch` and write either a concise list or full JSON to stdout.

**Data Shape**
- Server returns an array of session objects with at least:
  - `sid: number`
  - `name: string`
  - `date: string` (ISO‑like)
  - `messages: Array<{ timestamp, text, sender, query_type, attached_files?, references? }>`
- UI‑side helpers may normalize this into strongly typed structures (e.g., parsing `query_type` as JSON when possible) but this is optional for the external interface.


**Re‑Implementation Notes**
- Treat `/chat-history` as a pure proxy; keep filtering logic simple and stateless.
- Keep it bound to `127.0.0.1` unless you deliberately want remote access.
- Preserve clear error codes/messages to simplify debugging external tools.

---

## 3. New Chat Session Creation via HTTP (`/new_chat`)

**Goal**
- Allow an external application to create a new chat session of a specific type—either a regular chat or a “super‑agent” chat that can use MCP tools—via a localhost HTTP endpoint. The UI should switch to the requested mode and start from a clean, attachment‑free session.

**Backend Behavior (Tauri, Rust)**
- New HTTP route on the existing Axum server at `127.0.0.1:6225`:
  - `POST /new_chat` with JSON body:
    - `{"chatType": "regular"}` → standard chat session.
    - `{"chatType": "superagent"}` or `"super-agent"` or `"super_agent"` → super‑agent session (MCP tools enabled).
- Request handling:
  - Define a payload type with an optional `chatType` string; default to `"regular"` if missing.
  - Normalize `chatType` to lower case and map to two canonical values: `"regular"` or `"super-agent"`.
  - Emit a Tauri event named `"external_new_chat"` with payload `{ "type": "regular" | "super-agent" }`.
  - Respond with HTTP 202 and JSON: `{"status": "queued","type":"<resolved-type>"}`.
- No session ID is returned from this endpoint; session creation is reflected in the UI state, which is the source of truth for active session IDs.

**Frontend Behavior (React)**
- Event listener in chat context:
  - Subscribe to `"external_new_chat"` via `@tauri-apps/api/event`.
  - For each event:
    - Parse payload from either a stringified JSON or direct object.
    - Read `payload.type` or `payload.chatType`, defaulting to `"regular"` if not present.
    - Normalize to one of two workflow types:
      - `"SuperAgent"` when the type is any super‑agent alias.
      - `"Generic"` otherwise.
    - Call the workflow selector (e.g., `setWorkflow("SuperAgent" | "Generic")`) so the UI switches to the correct mode (super‑agent mode uses MCP tools; generic uses standard chat).
- Session creation logic:
  - On receiving the event, update session state as follows:
    - Determine the maximum existing session ID.
    - Check for a currently selected session with no messages; if found, reuse that session by re‑selecting it (no new ID).
    - Otherwise, create a new session object:
      - `id = maxExistingId + 1`
      - `name` set to the localized “new session” label.
      - `date` set to current time.
      - `messages = []`
      - `selected = true`
    - Clear selection on all other sessions and mark the new/reused session as selected.
    - Update `selectedSession` to the chosen ID.
    - Clear in‑memory `messages` and toggle the `sessionSwitched` flag so other components (e.g., file views) react to the new session.
- Attachments:
  - Do not attach any files or RAG context when the session is created; the new session should start empty with respect to files and other attachments.

**Re‑Implementation Notes**
- Keep the mapping between `"SuperAgent"` workflow and the MCP‑enabled prompt type (e.g., mapping to `SuperAgentPrompt` in the prompt options builder).
- Ensure the default workflow for unspecified or unknown `chatType` values is the regular chat workflow.
- If the future app has a different session model, preserve the semantics: reuse an empty current session when possible; otherwise create a fresh one and make it active.

---

## 4. Dev‑Time UI Stability Fixes (CSS & Imports)

**Goal**
- Prevent “white screen” failures in development caused by empty CSS modules and fragile style imports when running the Tauri + Vite app, without changing user‑visible UI behavior.

**Symptoms in Original Code**
- Tauri dev window opens blank/white; DevTools shows syntax errors associated with CSS module URLs.
- Errors originate from empty or nearly empty CSS files that cause Vite’s CSS injection modules to be malformed in this environment.
- Separately, opening the Vite dev URL in a normal browser (without Tauri) throws errors because Tauri APIs like `getCurrentWindow()` are unavailable; this is expected and distinct from the CSS issue.

**Fixes Applied**
1. Stabilize empty CSS modules:
   - For CSS files that are empty or effectively empty, add a harmless placeholder instead of leaving them completely blank.
     - Example pattern:
       - Add `:root { /* placeholder to avoid empty CSS module */ }` to otherwise empty CSS files (such as tooltip, model link, or other small components).
   - This ensures Vite can generate valid CSS injector modules and prevents dev‑time syntax errors.

2. Remove fragile CSS import and inline minimal styles:
   - For components that import a tiny CSS file solely to apply a trivial style, remove the CSS import and inline the style using component props (e.g., MUI `sx` prop).
     - Example: replace `import "./SimpleAlert.css"` with an inline `sx={{ display: 'flex', alignSelf: 'center' }}` on the relevant MUI element.
   - This eliminates unnecessary CSS modules that can break dev builds while keeping the rendered UI identical.

**Re‑Implementation Notes**
- Avoid shipping empty CSS files; if a stylesheet may be temporarily unused, keep a comment or a neutral rule inside it or delete the import entirely.
- When debugging dev‑only white screens in a new version:
  - First check DevTools console for syntax errors at CSS URLs.
  - Confirm Vite dev server is reachable and that WebView caches are not stale.
  - Remember that Tauri APIs will only be available inside the Tauri WebView, not in a plain browser tab.

