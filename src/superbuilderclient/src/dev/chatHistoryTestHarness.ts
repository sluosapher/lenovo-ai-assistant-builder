/*
  Dev-only test harness to interact with chat history from the browser DevTools
  while the Tauri app is running. It exposes a global `ChatHistoryTest` object
  with simple helpers:

    - ChatHistoryTest.listSessionIds()
    - ChatHistoryTest.getBySessionId(<number>)

  Usage:
    1) Run the app in dev mode.
    2) Open DevTools console.
    3) Call ChatHistoryTest.listSessionIds() or ChatHistoryTest.getBySessionId(1)
*/

import {
  listSessionIds,
  getChatSessionById,
  type ChatSession,
} from "../utils/chatHistoryClient";

async function listIds(): Promise<number[]> {
  const ids = await listSessionIds();
  console.log("Session IDs:", ids);
  return ids;
}

async function getBySessionId(sessionId: number): Promise<ChatSession | null> {
  const session = await getChatSessionById(sessionId);
  if (!session) {
    console.warn(`No session found for id: ${sessionId}`);
    return null;
  }
  console.log(
    `Session ${session.id} (${session.name}) has ${session.messages.length} messages`,
    session
  );
  return session;
}

// Attach to window for easy access in DevTools
declare global {
  interface Window {
    ChatHistoryTest?: {
      listSessionIds: typeof listIds;
      getBySessionId: typeof getBySessionId;
    };
  }
}

if (typeof window !== "undefined") {
  window.ChatHistoryTest = {
    listSessionIds: listIds,
    getBySessionId,
  };
}

