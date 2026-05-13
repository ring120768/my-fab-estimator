import type { AIProvider } from "./types";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
// Claude 3.5 Sonnet handles structured PDF extraction excellently.
// Swap to claude-3-5-haiku-latest for cheaper / faster runs.
const MODEL = "claude-3-5-sonnet-latest";

export const anthropicProvider: AIProvider = {
  name: "anthropic",
  model: MODEL,
  is_configured: () => Boolean(process.env.ANTHROPIC_API_KEY),

  async parse_schedule(pdf_bytes, filename, system_prompt) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set.");

    const base64 = Buffer.from(pdf_bytes).toString("base64");

    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 8000,
        temperature: 0,
        system: system_prompt + "\n\nIMPORTANT: respond with valid JSON only — no markdown fences, no prose.",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: {
                  type: "base64",
                  media_type: "application/pdf",
                  data: base64,
                },
              },
              {
                type: "text",
                text: `Drawing file: ${filename}. Extract the equipment schedule per the system prompt rules. Return strict JSON only.`,
              },
            ],
          },
          // Prefill assistant response with "{" so it has to continue as JSON.
          { role: "assistant", content: "{" },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Anthropic returned ${res.status}: ${errText.slice(0, 300)}`);
    }

    const json = await res.json();
    // Anthropic returns { content: [{ type: 'text', text: '...' }, ...] }
    const content = json?.content?.[0]?.text;
    if (typeof content !== "string") throw new Error("Anthropic returned no content.");
    // Because we prefilled with "{", prepend it to the response.
    return "{" + content;
  },
};
