import { RunnableSequence, type Runnable } from "@langchain/core/runnables";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { z } from "zod";

import { SectionsSchema, type Sections } from "@/lib/ai/sections/schemas";
import type { ProductData } from "@/lib/ai/gemini";

import {
  briefPrompt,
  composePrompt,
  criticPrompt,
} from "./prompts";
import {
  BriefSchema,
  type Brief,
  CritiqueSchema,
  type Critique,
} from "./types";

/* -------------------------------------------------------------------------- */
/* Model configuration (module-level so it's easy to tweak)                   */
/* -------------------------------------------------------------------------- */

const MODEL_NAME = "gemini-3.8-flash";
const BRIEF_TEMPERATURE = 0.7;
const COMPOSE_TEMPERATURE = 0.7;
const CRITIC_TEMPERATURE = 0.2;

const API_KEY = process.env.GEMINI_API_KEY;

function createModel(temperature: number): ChatGoogleGenerativeAI {
  return new ChatGoogleGenerativeAI({
    // NOTE: @langchain/google-genai names this field `model`, not `modelName`.
    model: MODEL_NAME,
    apiKey: API_KEY,
    temperature,
  });
}

/**
 * The "creative" model shared by the brief and compose stages.
 */
export const briefModel = createModel(BRIEF_TEMPERATURE);
export const composeModel = createModel(COMPOSE_TEMPERATURE);
/**
 * The low-temperature model used by the critic for deterministic verdicts.
 */
export const criticModel = createModel(CRITIC_TEMPERATURE);

/* -------------------------------------------------------------------------- */
/* Input formatting helpers                                                    */
/* -------------------------------------------------------------------------- */

const DEFAULT_MARKETING_ANGLES = [
  "جودة عالية وسعر مناسب مقارنة بالمنافسين",
  "توصيل سريع لجميع الولايات مع الدفع عند الاستلام",
  "ضمان الاسترجاع خلال أسبوع وضمان الجودة",
  "عرض محدود وخصم حصري لفترة قصيرة",
];

function formatAngles(angles?: string[]): string {
  const list = angles && angles.length > 0 ? angles : DEFAULT_MARKETING_ANGLES;
  return list.map((a, i) => `${i + 1}. ${a}`).join("\n");
}

function formatProduct(product: ProductData): string {
  return JSON.stringify(product, null, 2);
}

/* -------------------------------------------------------------------------- */
/* Gemini structured-output schema for the composer                            */
/* -------------------------------------------------------------------------- */

/**
 * IMPORTANT — why this transform exists (verified live):
 *
 * `SectionsSchema` is a zod v4 discriminated union (`z.discriminatedUnion`).
 * Its JSON Schema uses `const` (from `z.literal`) and `oneOf`, neither of which
 * Gemini's native `responseSchema` handles:
 *   - `const`  → rejected with a 400 "Unknown name const".
 *   - `oneOf`  → accepted syntactically but sends `gemini-2.5-flash` into a
 *                runaway output (unterminated JSON).
 *
 * The working combination (confirmed against a live `gemini-2.5-flash` call) is
 * to (a) convert `const: X` into `enum: [X]` and (b) rename `oneOf` → `anyOf`.
 * Gemini then honors each branch's `required` list, so the model emits complete
 * per-type sections. `BriefSchema` / `CritiqueSchema` have no `z.literal` or
 * union, so they are passed to `withStructuredOutput` directly as zod schemas.
 *
 * The `anyOf` output is still re-validated against the strict `SectionsSchema`
 * in the chain (see below), and the critic loop repairs any residual drift.
 */
function toGeminiSchema(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(toGeminiSchema);
  if (node && typeof node === "object") {
    const obj = node as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (key === "$schema" || key === "additionalProperties" || key === "strict") {
        continue; // not accepted / stripped by Gemini
      }
      if (key === "const") {
        out.enum = [value]; // `const: X` → `enum: [X]`
        continue;
      }
      if (key === "oneOf") {
        out.anyOf = toGeminiSchema(value); // Gemini supports `anyOf`, not `oneOf`
        continue;
      }
      out[key] = toGeminiSchema(value);
    }
    return out;
  }
  return node;
}

const GEMINI_COMPOSE_SCHEMA: Record<string, unknown> = toGeminiSchema(
  z.toJSONSchema(SectionsSchema),
) as Record<string, unknown>;

/* -------------------------------------------------------------------------- */
/* Chains                                                                      */
/* -------------------------------------------------------------------------- */

export interface BriefChainInput {
  product: ProductData;
  marketingAngles?: string[];
}

/**
 * Stage 1: product + angles → creative brief.
 * `BriefSchema` has no union/literal, so it works directly with
 * `withStructuredOutput` under zod v4.
 */
export const briefChain: Runnable<BriefChainInput, Brief> =
  RunnableSequence.from([
    (input: BriefChainInput) => ({
      productJson: formatProduct(input.product),
      anglesText: formatAngles(input.marketingAngles),
    }),
    briefPrompt,
    briefModel.withStructuredOutput(BriefSchema, { name: "brief" }),
  ]);

export interface ComposeChainInput {
  product: ProductData;
  marketingAngles?: string[];
  brief: Brief;
  /** Prior output, provided on revision passes. */
  previous?: Sections;
  /** The critique of `previous`, provided on revision passes. */
  critique?: Critique;
}

function formatRevisionBlock(previous?: Sections, critique?: Critique): string {
  if (!previous || !critique) return "";
  return `\n\nمراجعة سابقة (يجب تحسينها):
النسخة السابقة (JSON):
${JSON.stringify(previous, null, 2)}

ملاحظات المراجع (يجب معالجتها بالكامل):
${JSON.stringify(critique, null, 2)}
`;
}

/**
 * Stage 2: product + brief (+ previous + critique on revisions) → `Section[]`.
 * Uses the Gemini-compatible `anyOf` schema (see `GEMINI_COMPOSE_SCHEMA`) for
 * structured output, then re-validates against the strict `SectionsSchema` so
 * the chain's output is a real `Sections`.
 */
export const composeChain: Runnable<ComposeChainInput, Sections> =
  RunnableSequence.from([
    (input: ComposeChainInput) => ({
      productJson: formatProduct(input.product),
      anglesText: formatAngles(input.marketingAngles),
      briefJson: JSON.stringify(input.brief, null, 2),
      revisionBlock: formatRevisionBlock(input.previous, input.critique),
    }),
    composePrompt,
    composeModel.withStructuredOutput(GEMINI_COMPOSE_SCHEMA, {
      name: "sections",
    }),
    // Strict re-validation against the discriminated-union schema.
    (parsed: unknown) => SectionsSchema.parse(parsed),
  ]);

export interface CriticChainInput {
  product: ProductData;
  brief: Brief;
  sections: Sections;
}

/**
 * Stage 3: product + brief + sections → pass/fail critique.
 * `CritiqueSchema` has no union/literal, so it works directly with
 * `withStructuredOutput` under zod v4.
 */
export const criticChain: Runnable<CriticChainInput, Critique> =
  RunnableSequence.from([
    (input: CriticChainInput) => ({
      productJson: formatProduct(input.product),
      briefJson: JSON.stringify(input.brief, null, 2),
      sectionsJson: JSON.stringify(input.sections, null, 2),
    }),
    criticPrompt,
    criticModel.withStructuredOutput(CritiqueSchema, { name: "critique" }),
  ]);
