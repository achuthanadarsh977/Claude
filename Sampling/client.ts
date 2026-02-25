import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { CreateMessageRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const transport = new StdioClientTransport({
  command: "npx",
  args: ["tsx", "server.ts"],
});

const client = new Client(
  { name: "Demo Client", version: "1.0.0" },
  { capabilities: { sampling: {} } }
);

// Ollama sampling handler — runs fully locally, no API key needed
client.setRequestHandler(CreateMessageRequestSchema, async (request) => {
  const messages = request.params.messages.map((m) => {
    if (m.content.type !== "text") {
      console.warn(`Unsupported content type "${m.content.type}" — skipping`);
    }
    return {
      role: m.role,
      content: m.content.type === "text" ? m.content.text : "",
    };
  });

  const response = await fetch("http://localhost:11434/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama3.2",
      messages,
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as { message?: { content?: string } };
  if (!data.message?.content) {
    throw new Error("Ollama returned an unexpected response structure");
  }
  const text = data.message.content;

  return {
    role: "assistant",
    content: { type: "text", text },
    model: "llama3.2",
    stopReason: "end_turn",
  };
});

await client.connect(transport);

const result = await client.callTool({
  name: "summarize",
  arguments: {
    text_to_summarize: `Climate change refers to long-term shifts in global temperatures and weather patterns.
    While some climate change is natural, since the mid-20th century human activities have been
    the main driver of climate change, primarily due to the burning of fossil fuels like coal,
    oil, and natural gas. Burning fossil fuels generates greenhouse gas emissions that act like
    a blanket wrapped around the Earth, trapping the sun's heat and raising temperatures.
    The consequences of climate change include intense droughts, water scarcity, severe fires,
    rising sea levels, flooding, melting polar ice, catastrophic storms and declining biodiversity.
    People are experiencing climate change in diverse ways. Climate change can affect our health,
    ability to grow food, housing, safety and work. Some of us are already more vulnerable to
    climate impacts, such as people living in small island nations and other developing countries.
    Conditions like sea-level rise and saltwater intrusion have advanced to the point where whole
    communities have had to relocate, and protracted droughts are putting people at risk of famine.`,
  },
});

console.log(result.content);

await client.close();
