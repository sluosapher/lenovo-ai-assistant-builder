import { invoke } from "@tauri-apps/api/core";

// Raw types as returned by middleware (via get_chat_history)
type RawChatMessage = {
  timestamp: number;
  text: string;
  sender: "user" | "assistant";
  query_type: string; // may be a JSON string or a plain string
  attached_files?: string; // JSON string or undefined
  references?: unknown[]; // optional
};

type RawChatSession = {
  sid: number;
  name: string;
  date: string; // parseable by Date
  messages: RawChatMessage[];
};

export type ChatMessage = {
  id: number; // timestamp
  text: string;
  sender: "user" | "assistant";
  queryType: unknown; // parsed from query_type, or { name: string } fallback
  attachedFiles: unknown[]; // parsed from attached_files, or []
  references: unknown[]; // [] if not present
};

export type ChatSession = {
  id: number; // sid
  name: string;
  date: Date;
  messages: ChatMessage[];
};

function tryParseJson<T = unknown>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function normalizeMessage(m: RawChatMessage): ChatMessage {
  const queryType = tryParseJson(m.query_type, { name: m.query_type });
  const attachedFiles = m.attached_files
    ? tryParseJson<unknown[]>(m.attached_files, [])
    : [];
  const references = Array.isArray(m.references) ? m.references : [];

  return {
    id: m.timestamp,
    text: m.text,
    sender: m.sender,
    queryType,
    attachedFiles,
    references,
  };
}

function normalizeSession(raw: RawChatSession): ChatSession {
  return {
    id: raw.sid,
    name: raw.name,
    date: new Date(raw.date),
    messages: raw.messages.map(normalizeMessage),
  };
}

/** Fetches all sessions from middleware as raw JSON. */
export async function getAllRawSessions(): Promise<RawChatSession[]> {
  const raw = await invoke<string>("get_chat_history", {});
  return JSON.parse(raw) as RawChatSession[];
}

/** Fetches all sessions from middleware, normalized. */
export async function getAllSessions(): Promise<ChatSession[]> {
  const sessions = await getAllRawSessions();
  return sessions.map(normalizeSession);
}

/** Returns the list of all session IDs. */
export async function listSessionIds(): Promise<number[]> {
  const sessions = await getAllRawSessions();
  return sessions.map((s) => s.sid);
}

/**
 * Fetches the chat session that matches `sessionId`, normalized.
 * Returns null if not found.
 */
export async function getChatSessionById(sessionId: number): Promise<ChatSession | null> {
  const sessions = await getAllRawSessions();
  const match = sessions.find((s) => s.sid === sessionId);
  return match ? normalizeSession(match) : null;
}

/** Convenience: fetch only messages for the given session ID. */
export async function getChatMessagesBySessionId(sessionId: number): Promise<ChatMessage[]> {
  const session = await getChatSessionById(sessionId);
  return session ? session.messages : [];
}

