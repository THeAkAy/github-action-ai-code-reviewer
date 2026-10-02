import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";

export async function askModel(apiKey: string, system: string, user: string): Promise<string> {
  const openrouter = createOpenRouter({ apiKey });
  const result = await generateText({
    model: openrouter("deepseek/deepseek-v4-pro-0813"),
    instructions: system,
    prompt: user,
  });
  return result.text;
}
