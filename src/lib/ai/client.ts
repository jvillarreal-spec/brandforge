import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _client;
}

// Helper to wait for a given number of milliseconds
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Retry wrapper for rate limit errors (429)
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 15000 // 15 seconds base delay for rate limits
): Promise<T> {
  let lastError: any;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const status = err?.status || err?.statusCode || 0;
      const message = err?.message || "";

      // Only retry on rate limit (429) or server errors (500, 502, 503)
      const isRetryable = status === 429 || status >= 500 || message.includes("rate_limit");

      if (!isRetryable || attempt === maxRetries) {
        throw err;
      }

      // Exponential backoff: 15s, 30s, 60s
      const delay = baseDelayMs * Math.pow(2, attempt);
      console.log(`[ai-client] Rate limited (attempt ${attempt + 1}/${maxRetries + 1}). Waiting ${delay / 1000}s before retry...`);
      await sleep(delay);
    }
  }
  throw lastError;
}

export async function callClaude(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 4096
): Promise<string> {
  const client = getClient();

  const message = await withRetry(() =>
    client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    })
  );

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
      content.push({
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: file.data,
        },
      });
    } else if (file.mediaType.startsWith("image/")) {
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

  const message = await withRetry(() =>
    client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content }],
    })
  );

  const block = message.content[0];
  if (block.type === "text") return block.text;
  return "";
}

// Keep old name for backward compatibility
export const callClaudeWithImages = callClaudeWithFiles;
