import type { ProductData } from "@/lib/ai/gemini";
import { SectionsSchema, type Section } from "@/lib/ai/sections/schemas";
import { lintSections } from "@/lib/ai/sections/lint";

import { briefChain, composeChain, criticChain } from "./chains";
import type { Brief, Critique } from "./types";

export interface GenerateSectionsInput {
  product: ProductData;
  marketingAngles?: string[];
}

export interface GenerateSectionsResult {
  brief: Brief;
  sections: Section[];
  iterations: number;
  finalCritique: Critique | null;
}

const MAX_ITERATIONS = 3;
/** Per-compose retry budget for LLM outputs that fail schema validation. */
const MAX_COMPOSE_ATTEMPTS = 3;

/**
 * Retry budget for TRANSIENT provider errors (429/500/503, quota, overload,
 * high-demand, …). Independent of the schema-validation retry above.
 */
const RETRY_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 1500;

const TRANSIENT_STATUS_CODES = new Set<number>([429, 500, 503]);
const TRANSIENT_MESSAGE_PATTERN =
  /quota|demand|overload|exhaust|unavailable|timeout|429|503|500|resource_exhausted/i;

/** Whether an error is transient (safe to retry) as opposed to fatal. */
function isTransientError(error: unknown): boolean {
  const status = (error as { status?: unknown } | null | undefined)?.status;
  if (typeof status === "number" && TRANSIENT_STATUS_CODES.has(status)) {
    return true;
  }
  const message = error instanceof Error ? error.message : String(error);
  return TRANSIENT_MESSAGE_PATTERN.test(message);
}

/**
 * Invokes `fn`, retrying TRANSIENT errors up to `RETRY_ATTEMPTS` total attempts
 * with exponential backoff (1.5s, then 3s). Non-transient errors are rethrown
 * immediately. After exhausting attempts, the last (transient) error is
 * rethrown.
 */
async function invokeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isTransientError(error)) {
        throw error; // fatal: no retry
      }
      if (attempt < RETRY_ATTEMPTS) {
        const delayMs = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
        console.warn(
          `[agent] transient LLM error (attempt ${attempt}/${RETRY_ATTEMPTS}), retrying in ${delayMs}ms:`,
          error instanceof Error ? error.message : String(error),
        );
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }
  throw lastError;
}

function formatZodError(error: unknown): string {
  if (
    error &&
    typeof error === "object" &&
    "issues" in error &&
    Array.isArray((error as { issues: unknown }).issues)
  ) {
    const issues = (error as { issues: { path: (string | number)[]; message: string }[] })
      .issues;
    return issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
  }
  return error instanceof Error ? error.message : String(error);
}

/**
 * Runs the composer with retries: the LLM occasionally emits output that does
 * not satisfy the strict `SectionsSchema` (the Gemini response schema is a
 * flattened approximation). On a parse failure we re-run the composer with a
 * short backoff; if every attempt fails we throw a clear error carrying the
 * zod issues (so the caller is never left with silently-dropped invalid data).
 */
async function composeSections(input: {
  product: ProductData;
  marketingAngles?: string[];
  brief: Brief;
  previous?: Section[];
  critique?: Critique;
}): Promise<Section[]> {
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= MAX_COMPOSE_ATTEMPTS; attempt++) {
    try {
      return await invokeWithRetry(() =>
        composeChain.invoke({
          product: input.product,
          marketingAngles: input.marketingAngles,
          brief: input.brief,
          previous: input.previous,
          critique: input.critique,
        }),
      );
    } catch (error) {
      lastError = error;
      console.warn(
        `[agent] compose attempt ${attempt}/${MAX_COMPOSE_ATTEMPTS} failed:`,
        error instanceof Error ? error.message : String(error),
      );
      if (attempt < MAX_COMPOSE_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, 500 * attempt));
      }
    }
  }
  throw new Error(
    `Failed to produce schema-valid sections after ${MAX_COMPOSE_ATTEMPTS} attempts.\nZod issues:\n${formatZodError(lastError)}`,
  );
}

/**
 * Turns a product into a validated `Section[]` landing-page spec.
 *
 * Orchestration is a plain, bounded loop (NOT LangGraph):
 *   brief → compose → (critic → recompose)*  → validate.
 */
export async function generateSections(
  input: GenerateSectionsInput,
): Promise<GenerateSectionsResult> {
  // 1. Creative brief.
  const brief = await invokeWithRetry(() =>
    briefChain.invoke({
      product: input.product,
      marketingAngles: input.marketingAngles,
    }),
  );

  // 2. First draft.
  let sections = await composeSections({
    product: input.product,
    marketingAngles: input.marketingAngles,
    brief,
  });

  // 3. Critic / revision loop.
  let finalCritique: Critique | null = null;
  let iterations = 0;
  for (let i = 1; i <= MAX_ITERATIONS; i++) {
    iterations = i;
    const critique = await invokeWithRetry(() =>
      criticChain.invoke({
        product: input.product,
        brief,
        sections,
      }),
    );
    finalCritique = critique;

    if (critique.pass) break;

    sections = await composeSections({
      product: input.product,
      marketingAngles: input.marketingAngles,
      brief,
      previous: sections,
      critique,
    });
  }

  // 4. Final validation (guards against any regression after the last pass).
  try {
    sections = SectionsSchema.parse(sections);
  } catch (error) {
    throw new Error(
      `Sections still invalid after ${iterations} revision(s).\nZod issues:\n${formatZodError(error)}`,
    );
  }

  // 5. Lint diagnostics — surfaced, never hard-failing (the critic should have
  //    already caught these; this is a final safety log).
  const lintIssues = lintSections(sections);
  if (lintIssues.length > 0) {
    console.warn(
      `[agent] lint found ${lintIssues.length} issue(s) after generation:`,
    );
    for (const issue of lintIssues) {
      console.warn(
        `  [${issue.severity}] ${issue.code}${issue.sectionType ? ` (${issue.sectionType})` : ""}${issue.path ? ` @${issue.path}` : ""}: ${issue.message}`,
      );
    }
  }

  return { brief, sections, iterations, finalCritique };
}
