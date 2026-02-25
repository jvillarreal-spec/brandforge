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

export interface FileAttachment {
  mediaType: string;
  data: string;
}

export async function callClaudeWithFiles(
  systemPrompt: string,
  userPrompt: string,
  files: FileAttachment[],
  maxTokens = 4096
): Promise<string> {
  const client = getClient();

  const content: any[] = [];
  for (const file of files) {
    if (file.mediaType === "application/pdf") {
      // PDF as document type
      content.push({
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: file.data,
        },
      });
    } else if (file.mediaType.startsWith("image/")) {
      // Images
      content.push({
        type: "image",
        source: {
          type: "base64",
          media_type: file.mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
          data: file.data,
        },
      });
    }
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

// Keep old name for backward compatibility
export const callClaudeWithImages = callClaudeWithFiles;
