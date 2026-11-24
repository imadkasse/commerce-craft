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
      return await composeChain.invoke({
        product: input.product,
        marketingAngles: input.marketingAngles,
        brief: input.brief,
        previous: input.previous,
        critique: input.critique,
      });
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
  const brief = await briefChain.invoke({
    product: input.product,
    marketingAngles: input.marketingAngles,
  });

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
    const critique = await criticChain.invoke({
      product: input.product,
      brief,
      sections,
    });
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
