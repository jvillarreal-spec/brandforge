import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _client;
}

export async function callClaude(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 4096
): Promise<string> {
  const client = getClient();
  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });
  const block = message.content[0];
  if (block.type === "text") return block.text;
  return "";
}

export async function callClaudeWithImages(
  systemPrompt: string,
  userPrompt: string,
  images: { mediaType: string; data: string }[],
  maxTokens = 4096
): Promise<string> {
  const client = getClient();

  const content: Anthropic.MessageCreateParams["messages"][0]["content"] = [];
  for (const img of images) {
    content.push({
      type: "image",
      source: {
        type: "base64",
        media_type: img.mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
        data: img.data,
      },
    });
  }
  content.push({ type: "text", text: userPrompt });

  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content }],
  });

  const block = message.content[0];
  if (block.type === "text") return block.text;
  return "";
}
