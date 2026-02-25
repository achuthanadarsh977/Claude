import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const mcp = new McpServer(
  { name: "Demo Server", version: "1.0.0" },
  { capabilities: { logging: {} } }
);

mcp.tool(
  "add",
  { a: z.number().int(), b: z.number().int() },
  async ({ a, b }, extra) => {
    await mcp.sendLoggingMessage({ level: "info", data: "Preparing to add..." });

    const progressToken = extra._meta?.progressToken;
    if (progressToken !== undefined) {
      await extra.sendNotification({
        method: "notifications/progress",
        params: { progressToken, progress: 20, total: 100 },
      });
    }

    await new Promise<void>((resolve) => setTimeout(resolve, 2000));

    await mcp.sendLoggingMessage({ level: "info", data: "OK, adding..." });

    if (progressToken !== undefined) {
      await extra.sendNotification({
        method: "notifications/progress",
        params: { progressToken, progress: 80, total: 100 },
      });
    }

    return { content: [{ type: "text" as const, text: String(a + b) }] };
  }
);

mcp.tool(
  "multiply",
  { a: z.number(), b: z.number() },
  async ({ a, b }, extra) => {
    await mcp.sendLoggingMessage({ level: "info", data: "Preparing to multiply..." });

    const progressToken = extra._meta?.progressToken;
    if (progressToken !== undefined) {
      await extra.sendNotification({
        method: "notifications/progress",
        params: { progressToken, progress: 20, total: 100 },
      });
    }

    await new Promise<void>((resolve) => setTimeout(resolve, 2000));

    await mcp.sendLoggingMessage({ level: "info", data: "OK, multiplying..." });

    if (progressToken !== undefined) {
      await extra.sendNotification({
        method: "notifications/progress",
        params: { progressToken, progress: 80, total: 100 },
      });
    }

    return { content: [{ type: "text" as const, text: String(a * b) }] };
  }
);

mcp.tool(
  "subtract",
  { a: z.number(), b: z.number() },
  async ({ a, b }, extra) => {
    await mcp.sendLoggingMessage({ level: "info", data: "Preparing to subtract..." });

    const progressToken = extra._meta?.progressToken;
    if (progressToken !== undefined) {
      await extra.sendNotification({
        method: "notifications/progress",
        params: { progressToken, progress: 20, total: 100 },
      });
    }

    await new Promise<void>((resolve) => setTimeout(resolve, 2000));

    await mcp.sendLoggingMessage({ level: "info", data: "OK, subtracting..." });

    if (progressToken !== undefined) {
      await extra.sendNotification({
        method: "notifications/progress",
        params: { progressToken, progress: 80, total: 100 },
      });
    }

    return { content: [{ type: "text" as const, text: String(a - b) }] };
  }
);

mcp.tool(
  "divide",
  { a: z.number(), b: z.number() },
  async ({ a, b }, extra) => {
    await mcp.sendLoggingMessage({ level: "info", data: "Preparing to divide..." });

    const progressToken = extra._meta?.progressToken;
    if (progressToken !== undefined) {
      await extra.sendNotification({
        method: "notifications/progress",
        params: { progressToken, progress: 20, total: 100 },
      });
    }

    await new Promise<void>((resolve) => setTimeout(resolve, 2000));

    if (b === 0) {
      return { content: [{ type: "text" as const, text: "Error: division by zero" }], isError: true };
    }

    await mcp.sendLoggingMessage({ level: "info", data: "OK, dividing..." });

    if (progressToken !== undefined) {
      await extra.sendNotification({
        method: "notifications/progress",
        params: { progressToken, progress: 80, total: 100 },
      });
    }

    return { content: [{ type: "text" as const, text: String(a / b) }] };
  }
);

const transport = new StdioServerTransport();
await mcp.connect(transport);
