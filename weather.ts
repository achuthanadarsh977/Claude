import "dotenv/config";
import { GoogleGenerativeAI, FunctionDeclaration, Tool } from "@google/generative-ai";

  const tools: Tool[] = [
    {
      functionDeclarations: [
        {
          name: "get_weather",
          description: "Get current weather for a given location",
          parameters: {
            type: "object",
            properties: {
              location: {
                type: "string",
                description: "City name, e.g. Chennai, IN"
              },
              unit: {
                type: "string",
                enum: ["celsius", "fahrenheit"],
                description: "Temperature unit"
              }
            },
            required: ["location"]
          }
        },
        {
          name: "get_time",
          description: "Get current time in a given timezone",
          parameters: {
            type: "object",
            properties: {
              timezone: {
                type: "string",
                description: "IANA timezone, e.g. Asia/Kolkata"
              }
            },
            required: ["timezone"]
          }
        }
      ]
    }
  ];

  function execute_tool(name: string, args: any): string {
    if (name === "get_weather") {
      const mock: Record<string, string> = {
        "Chennai, IN":      "34°C, sunny and humid",
        "Chennai":          "34°C, sunny and humid",
        "Mumbai, IN":       "30°C, partly cloudy",
        "Mumbai":           "30°C, partly cloudy",
        "Delhi, IN":        "28°C, hazy and windy",
        "Delhi":            "28°C, hazy and windy",
        "Bangalore, IN":    "24°C, pleasant and clear",
        "Bangalore":        "24°C, pleasant and clear",
        "Hyderabad, IN":    "32°C, hot and dry",
        "Hyderabad":        "32°C, hot and dry",
        "Kolkata, IN":      "31°C, humid with light rain",
        "Kolkata":          "31°C, humid with light rain",
        "New York, NY":     "18°C, cloudy",
        "New York":         "18°C, cloudy",
        "London, UK":       "10°C, rainy and cold",
        "London":           "10°C, rainy and cold",
        "Tokyo, JP":        "15°C, cool and clear",
        "Tokyo":            "15°C, cool and clear",
        "Sydney, AU":       "26°C, sunny and breezy",
        "Sydney":           "26°C, sunny and breezy",
        "Paris, FR":        "12°C, overcast",
        "Paris":            "12°C, overcast",
        "Dubai, UAE":       "38°C, hot and sunny",
        "Dubai":            "38°C, hot and sunny",
        "Singapore, SG":    "29°C, humid with thunderstorms",
        "Singapore":        "29°C, humid with thunderstorms",
        "Los Angeles, CA":  "22°C, sunny and clear",
        "Los Angeles":      "22°C, sunny and clear",
      };
      return mock[args.location] ?? "Weather data unavailable";
    }

    if (name === "get_time") {
      const mock: Record<string, string> = {
        "Asia/Kolkata":        "8:15 PM IST",
        "America/New_York":    "9:45 AM EST",
        "America/Los_Angeles": "6:45 AM PST",
        "Europe/London":       "2:45 PM GMT",
        "Europe/Paris":        "3:45 PM CET",
        "Asia/Tokyo":          "11:45 PM JST",
        "Asia/Dubai":          "6:45 PM GST",
        "Asia/Singapore":      "10:45 PM SGT",
        "Australia/Sydney":    "1:45 AM AEDT",
      };
      return mock[args.timezone] ?? "Time data unavailable";
    }

    return "Tool not found";
  }


  async function chat(userMessage: string) {
    const genAI  = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model  = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      tools: tools
    });

    const chatSession = model.startChat();

    console.log(`User: ${userMessage}\n`);

    let response = await chatSession.sendMessage(userMessage);

    // Agentic loop — keep handling tool calls until final text
    while (true) {
      const candidate = response.response.candidates?.[0];
      const parts      = candidate?.content?.parts ?? [];

      // Check if Gemini wants to call a function
      const functionCalls = parts.filter(p => p.functionCall);

      if (functionCalls.length === 0) break; // No more tool calls — done

      // Execute all requested tools
      const functionResponses = functionCalls.map(part => {
        const { name, args } = part.functionCall!;
        console.log(`Tool called: ${name}`, args);

        const result = execute_tool(name, args);
        console.log(`Tool result: ${result}\n`);

        return {
          functionResponse: {
            name: name,
            response: { result }
          }
        };
      });

      // Send all tool results back to Gemini
      response = await chatSession.sendMessage(functionResponses);
    }

    // Final text response
    const finalText = response.response.text();
    console.log(`Gemini: ${finalText}`);
  }

  
  chat("What's the weather in Dubai? Also what time is it in Dubai?")
    .catch(console.error);

  
