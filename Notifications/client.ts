import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { LoggingMessageNotificationSchema } from "@modelcontextprotocol/sdk/types.js";

const transport = new StdioClientTransport({
  command: "npx",
  args: ["tsx", "server.ts"],
});

const client = new Client({ name: "demo-client", version: "1.0.0" });

client.setNotificationHandler(LoggingMessageNotificationSchema, (notification) => {
  console.log(notification.params.data);
});

await client.connect(transport);

const result = await client.callTool(
  { name: "add", arguments: { a: 1, b: 3 } },
  undefined,
  {
    onprogress: (params) => {
      if (params.total !== undefined) {
        const percentage = (params.progress / params.total) * 100;
        console.log(`Progress: ${params.progress}/${params.total} (${percentage.toFixed(1)}%)`);
      } else {
        console.log(`Progress: ${params.progress}`);
      }
    },
  }
);

console.log("Result:", result);
await client.close();
