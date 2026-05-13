// Dispatch to the configured AI provider.
//
// Selection precedence:
//   1. AI_PROVIDER env var if set ("openai" | "anthropic")
//   2. Falls back to whichever provider has its API key configured
//   3. If neither, pickProvider() returns null

import { openaiProvider } from "./openai";
import { anthropicProvider } from "./anthropic";
import type { AIProvider } from "./types";

export type { AIProvider } from "./types";

export function pickProvider(): AIProvider | null {
  const preferred = (process.env.AI_PROVIDER ?? "").toLowerCase();

  if (preferred === "anthropic" && anthropicProvider.is_configured()) return anthropicProvider;
  if (preferred === "openai" && openaiProvider.is_configured()) return openaiProvider;

  // Auto-fallback: try OpenAI first (default historical choice), then Anthropic.
  if (openaiProvider.is_configured()) return openaiProvider;
  if (anthropicProvider.is_configured()) return anthropicProvider;
  return null;
}

/** For status / readiness — what would be used if pickProvider() were called now? */
export function describeProvider(): {
  configured: boolean;
  selected: "openai" | "anthropic" | null;
  model: string | null;
  fallback_available: boolean;
} {
  const picked = pickProvider();
  const openai = openaiProvider.is_configured();
  const anthropic = anthropicProvider.is_configured();
  return {
    configured: Boolean(picked),
    selected: picked?.name ?? null,
    model: picked?.model ?? null,
    fallback_available: openai && anthropic,
  };
}
