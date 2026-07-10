import type { AIProvider } from "./types";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = "gpt-4o";

export const openaiProvider: AIProvider = {
  name: "openai",
  model: MODEL,
  is_configured: () => Boolean(process.env.OPENAI_API_KEY),

  async parse_document(pdf_bytes, filename, system_prompt) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not set.");

    const base64 = Buffer.from(pdf_bytes).toString("base64");
    const dataUrl = `data:application/pdf;base64,${base64}`;

    // GPT-4o supports PDFs in chat completions via the "file" content type
    // (added in late 2024). Images via "image_url"; PDFs via "file".
    const res = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system_prompt },
          {
            role: "user",
            content: [
              {
                type: "file",
                file: {
                  filename,
                  file_data: dataUrl,
                },
              },
              { type: "text", text: `Drawing file: ${filename}. Return strict JSON only.` },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenAI returned ${res.status}: ${errText.slice(0, 300)}`);
    }

    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content;
    if (typeof content !== "string") throw new Error("OpenAI returned no content.");
    return content;
  },
};
