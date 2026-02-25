import * as readline from "node:readline";

const API_URL = "https://text.pollinations.ai/openai/chat/completions";

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

const history: Message[] = [
  {
    role: "system",
    content:
      "You are a highly knowledgeable AI assistant. Answer any question the user asks — whether it's about science, math, coding, history, philosophy, current events, creative writing, or anything else. Always provide detailed, accurate, and helpful answers. If you're unsure, say so but still give your best answer. Never refuse to answer a question.",
  },
];

async function sendMessage(message: string): Promise<void> {
  history.push({ role: "user", content: message });

  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "openai",
      messages: history,
      stream: false,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`API error: ${res.status} ${res.statusText} ${errBody}`);
  }

  const json = await res.json();
  const text: string = json.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error(`Unexpected API response structure: ${JSON.stringify(json)}`);
  }
  process.stdout.write(text);
  history.push({ role: "assistant", content: text });
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log("\n  Chat started! (Free, no API key needed)");
console.log("  Powered by Pollinations AI");
console.log('  Type your message and press Enter. Type "exit" to end.\n');

process.on("SIGINT", () => {
  console.log("\n  Goodbye!\n");
  rl.close();
  process.exit(0);
});

for await (const input of rl) {
  const trimmed = input.trim();

  if (!trimmed) continue;

  if (trimmed.toLowerCase() === "exit" || trimmed.toLowerCase() === "quit") {
    console.log("\n  Goodbye!\n");
    rl.close();
    break;
  }

  try {
    process.stdout.write("\nAI: ");
    await sendMessage(trimmed);
    console.log("\n");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`\n  Error: ${msg}\n`);
  }

  process.stdout.write("You: ");
}
