// Common interface for AI providers (OpenAI, Anthropic).
// Provider takes a PDF + a system prompt, returns a JSON-string response.
// The route then parses + validates the JSON.

export interface AIProvider {
  name: "openai" | "anthropic";
  model: string;
  is_configured(): boolean;

  /**
   * Send a PDF to the AI with the given system prompt.
   * Returns the model's raw response text (expected to be valid JSON).
   * Throws on transport/auth/rate-limit errors with a descriptive message.
   *
   * Named parse_document rather than parse_schedule because both the
   * schedule parser and the drawing dimension parser use it — the method
   * is genuinely generic (PDF in, prompt in, JSON out).
   */
  parse_document(
    pdf_bytes: ArrayBuffer,
    filename: string,
    system_prompt: string
  ): Promise<string>;
}
