import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({ name: "Demo Server", version: "1.0.0" });

server.tool(
  "summarize",
  { text_to_summarize: z.string() },
  async ({ text_to_summarize }) => {
    const prompt = `Please summarize the following text:\n${text_to_summarize}`;

    const result = await server.server.createMessage({
      messages: [{ role: "user", content: { type: "text", text: prompt } }],
      maxTokens: 4000,
      systemPrompt: "You are a helpful research assistant.",
    });

    if (result.content.type === "text") {
      return { content: [{ type: "text", text: result.content.text }] };
    }

    throw new Error("Sampling failed");
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
