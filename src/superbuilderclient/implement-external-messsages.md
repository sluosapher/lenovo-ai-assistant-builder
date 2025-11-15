# External Messages (PoC) — Implementation Overview

This document explains how the app exposes a lightweight localhost HTTP endpoint to inject external messages into the current chat session, and how those messages flow through the Tauri backend into the React UI where they are auto-sent using the existing chat path.

## Summary

- Bind address: `127.0.0.1:6225`
- Endpoints:
  - `GET /healthz` → `{ "ok": true }`
  - `POST /external-message` with JSON body `{ "text": string, "chatId"?: number }`
- Flow: HTTP → Tauri (Axum) → emit `external_prompt` → React listens → ChatInput pre-fills and auto-sends via existing `sendMessage`.

## Backend (Tauri, Rust)

The backend hosts a minimal HTTP server using Axum and emits an app-wide Tauri event that the frontend subscribes to.

Key locations:

- Spawn the server on app startup: `src-tauri/src/lib.rs:337`
  - `tokio::spawn(start_external_server(app_handle.clone()));`
- HTTP server routes and bind address: `src-tauri/src/lib.rs:393`
  - Routes: `GET /healthz`, `POST /external-message`
  - Bind address: `127.0.0.1:6225`
- Health check handler: `src-tauri/src/lib.rs:364`
  - Returns `{ "ok": true }` with 200 OK.
- POST handler and event emission: `src-tauri/src/lib.rs:368`
  - Validates payload (non-empty `text`).
  - Emits a Tauri event named `external_prompt` with `{ text, chatId }`.
  - Responds with 202 Accepted `{ "status": "queued" }`.

Notes:

- Security is intentionally relaxed for this PoC and bound to localhost only.
- Bind failures or serve errors are logged to stderr with `[external-server]` prefix.

## Frontend (React)

The UI listens for the `external_prompt` event and bridges it into the existing chat send path.

Key locations:

- Event subscription, state bridge: `src/components/chat/Chat.jsx:171`
  - Subscribes to `external_prompt` via `@tauri-apps/api/event` `listen`.
  - Extracts `text` and updates two state values:
    - `externalValue`: the text to pre-fill ChatInput
    - `externalSendTrigger`: a boolean toggle used to trigger an effect in ChatInput
- Auto-send logic on the input: `src/components/chat/ChatInput.jsx:93`
  - An effect watches `externalSendTrigger`. When toggled, it:
    - Prefills the input with `externalValue`
    - If `isChatReady`, immediately calls `handleSendMessage(formatted)` and clears the input
    - If not ready, defers sending until chat becomes ready
- Deferred send when chat becomes ready: `src/components/chat/ChatInput.jsx:118`
  - If a message is pending and `isChatReady` flips to true, sends then clears state.
- Actual message dispatch path: `src/components/context/ChatContext.jsx:426`
  - `sendMessage(prompt, ...)` formats history and calls the Tauri command `call_chat`.

Why two-step (value + trigger)?

- The `externalSendTrigger` boolean lets the input effect react to any new external message without depending on string equality/identity, avoiding race conditions with React state updates.

## End-to-End Flow

1. External app sends an HTTP request to the running desktop app:
   - `GET http://127.0.0.1:6225/healthz`
   - `POST http://127.0.0.1:6225/external-message` with `{ "text": "...", "chatId": 123? }`
2. Axum handler validates `text` and emits Tauri event `external_prompt` with the payload.
3. React `Chat.jsx` listens for `external_prompt`, stores the text in `externalValue`, and toggles `externalSendTrigger`.
4. `ChatInput.jsx` sees the trigger, pre-fills the input, and auto-sends via `handleSendMessage` if `isChatReady`; otherwise it defers until ready.
5. `ChatContext.sendMessage` performs the normal chat submission to the Tauri backend (`call_chat`).

## Request Examples

```bash
curl -s http://127.0.0.1:6225/healthz

curl -s -X POST http://127.0.0.1:6225/external-message \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello from external app"}'
```

## Files Involved

- Backend
  - `src-tauri/src/lib.rs:337` — spawn of the external server.
  - `src-tauri/src/lib.rs:393` — Axum router and bind address.
  - `src-tauri/src/lib.rs:364` — `GET /healthz` handler.
  - `src-tauri/src/lib.rs:368` — `POST /external-message` handler; emits `external_prompt`.
- Frontend
  - `src/components/chat/Chat.jsx:171` — subscribes to `external_prompt`; sets `externalValue` and toggles `externalSendTrigger`.
  - `src/components/chat/ChatInput.jsx:93` — reacts to trigger, pre-fills and auto-sends when ready.
  - `src/components/chat/ChatInput.jsx:118` — deferred send when chat becomes ready.
  - `src/components/context/ChatContext.jsx:426` — `sendMessage` path to backend (`call_chat`).

## Implementation Notes

- The PoC intentionally binds to `127.0.0.1` and lacks auth; do not expose publicly.
- The UI path uses existing input formatting and history rules to keep behavior consistent.
- Errors in the HTTP server are logged; invalid requests (empty `text`) receive HTTP 400.

