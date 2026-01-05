// Standalone script to request a new chat session from the running Tauri app.
// Usage (with bun):
//   bun new_chat.ts regular
//   bun new_chat.ts superagent
//
// The script calls:
//   POST http://127.0.0.1:6225/new_chat
// with JSON body: { "chatType": "regular" | "superagent" }
// and prints the response or a helpful error.

type ChatKind = "regular" | "superagent";

function parseArg(arg: string | undefined): ChatKind {
  const raw = (arg || "").toLowerCase().trim();
  if (raw === "superagent" || raw === "super-agent" || raw === "super_agent") {
    return "superagent";
  }
  // Default to regular if missing or anything else
  return "regular";
}

async function main() {
  const arg = process.argv[2];
  const kind = parseArg(arg);

  const payload = {
    chatType: kind, // backend accepts "regular" or any super-agent alias
  };

  const url = "http://127.0.0.1:6225/new_chat";

  console.log(`Requesting new "${kind}" chat session via ${url} ...`);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text();

    console.log(`HTTP ${res.status} ${res.statusText}`);
    if (text) {
      try {
        const json = JSON.parse(text);
        console.log("Response JSON:", JSON.stringify(json, null, 2));
      } catch {
        console.log("Response body:", text);
      }
    } else {
      console.log("No response body.");
    }
  } catch (err) {
    console.error("Failed to call /new_chat endpoint:", err);
    console.error(
      'Ensure the Tauri app is running and listening on http://127.0.0.1:6225.'
    );
  }
}

main();

