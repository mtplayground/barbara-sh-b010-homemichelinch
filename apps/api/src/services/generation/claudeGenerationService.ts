import Anthropic from "@anthropic-ai/sdk";
import type {
  Message,
  MessageCreateParamsNonStreaming,
} from "@anthropic-ai/sdk/resources/messages";

import { loadConfig } from "../../config/env.js";
import { type GeneratedDishGuide, GeneratedDishGuideSchema } from "./schema.js";
import {
  buildDishGuidePrompt,
  DISH_GUIDE_SYSTEM_PROMPT,
  type DishGuidePromptInput,
} from "./prompt.js";

interface ClaudeMessagesClient {
  messages: {
    create: (params: MessageCreateParamsNonStreaming) => Promise<Message>;
  };
}

export interface ClaudeGenerationServiceOptions {
  apiKey?: string;
  client?: ClaudeMessagesClient;
  model?: string;
}

export class ClaudeGenerationError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "ClaudeGenerationError";
  }
}

export class ClaudeGenerationService {
  private readonly client: ClaudeMessagesClient;
  private readonly model: string;

  constructor(options: ClaudeGenerationServiceOptions = {}) {
    const needsConfig = !options.model || (!options.apiKey && !options.client);
    const appConfig = needsConfig ? loadConfig() : null;

    this.model = options.model ?? appConfig?.ai.claudeModel ?? "claude-sonnet-4-6";
    this.client =
      options.client ??
      new Anthropic({
        apiKey: options.apiKey ?? appConfig?.ai.claudeApiKey,
      });
  }

  async generateDishGuide(input: DishGuidePromptInput): Promise<GeneratedDishGuide> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      temperature: 0.2,
      system: DISH_GUIDE_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: buildDishGuidePrompt(input),
        },
      ],
    });

    const text = extractTextContent(response);
    return parseGeneratedDishGuide(text);
  }
}

export function parseGeneratedDishGuide(rawText: string): GeneratedDishGuide {
  try {
    const jsonText = extractJsonObject(rawText);
    const parsed: unknown = JSON.parse(jsonText);
    return GeneratedDishGuideSchema.parse(parsed);
  } catch (error) {
    throw new ClaudeGenerationError("Claude response did not match guide schema", error);
  }
}

function extractTextContent(response: Message) {
  const text = response.content
    .flatMap((block) => (block.type === "text" ? [block.text] : []))
    .join("\n")
    .trim();

  if (!text) {
    throw new ClaudeGenerationError("Claude response did not include text content");
  }

  return text;
}

function extractJsonObject(rawText: string) {
  const trimmed = rawText.trim();

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error("No JSON object found in Claude response");
  }

  return trimmed.slice(firstBrace, lastBrace + 1);
}
