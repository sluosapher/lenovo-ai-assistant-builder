 External Message Injection — Design Summary

  - Purpose: Accept an HTTP POST on localhost and inject the provided text into the current chat input, auto-sending it
    as if the user typed it.

  Backend (Tauri + Axum)

  - Server: Spawns a lightweight Axum server on 127.0.0.1:6225 when the app starts.
      - Spawn: src/superbuilderclient/src-tauri/src/lib.rs:339
      - Router: src/superbuilderclient/src-tauri/src/lib.rs:393
  - Endpoints:
      - GET /healthz → simple readiness check.
      - POST /external-message → accepts JSON payload:
          - { "text": "your message", "chatId": 123 } (chatId optional; currently unused by UI).
          - Handler: validates non-empty text, then emits a Tauri event.
          - Handler: src/superbuilderclient/src-tauri/src/lib.rs:368
  - Emitted event:
      - Name: external_prompt
      - Payload: { text, chatId }
      - Emit site: src/superbuilderclient/src-tauri/src/lib.rs:382
  - Responses:
      - 202 Accepted for valid requests; 400 Bad Request if text is empty.
  - Routes wiring:
      - route("/external-message", post(external_message_handler)): src/superbuilderclient/src-tauri/src/lib.rs:398

  Frontend (React)

  - Event listener:
      - Chat view listens for external_prompt, parses payload, and sets input state + trigger.
      - Listener: src/superbuilderclient/src/components/chat/Chat.jsx:174
      - State wired to input via props: externalValue, externalSendTrigger
          - Props pass: src/superbuilderclient/src/components/chat/Chat.jsx:278, :281
  - Input auto-send:
      - ChatInput watches externalSendTrigger; when toggled and chat is ready, it prefills the input and calls
        sendMessage().
      - Effect: src/superbuilderclient/src/components/chat/ChatInput.jsx:91
  - Chat message pipeline:
      - Chat.jsx → handleSendMessage() → ChatContext.sendMessage() for streaming backend.
      - Stream events handled in ChatContext:
          - first_word: src/superbuilderclient/src/components/context/ChatContext.jsx:273
          - new_message: src/superbuilderclient/src/components/context/ChatContext.jsx:292
          - stream-completed: src/superbuilderclient/src/components/context/ChatContext.jsx:316

  Usage Example

  - Send an external message:
      - curl -s -X POST http://127.0.0.1:6225/external-message -H "Content-Type: application/json" -d "{\"text\":\"Hello
        from cURL\"}"
  - Health check:
      - curl -s http://127.0.0.1:6225/healthz

  Notes & Limitations

  - Scope: Inserts into the currently active chat session; chatId is accepted by backend but not used by the UI yet.
  - Security: Binds to localhost only; ensure the app is running for the endpoint to be available.