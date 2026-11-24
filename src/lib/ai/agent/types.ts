import { z } from "zod";

import { SECTION_TYPES } from "@/lib/ai/sections/types";

const sectionTypeEnum = z.enum(SECTION_TYPES as unknown as [string, ...string[]]);

/**
 * One planned section for a landing page. The model proposes the type and the
 * marketing purpose it must serve; the actual copy is written later by the
 * composer (see `composeChain`).
 */
export const SectionPlanItemSchema = z.object({
  type: sectionTypeEnum,
  purpose: z.string().min(1), // Arabic: what this section must communicate
});

/**
 * Creative brief produced by the first stage of the pipeline. It captures the
 * target persona, the core promise, the brand voice, and a section plan that
 * the composer then follows.
 */
export const BriefSchema = z.object({
  persona: z.string().min(1), // target customer (Arabic)
  valueProposition: z.string().min(1), // core promise (Arabic)
  tone: z.string().min(1), // brand voice (Arabic)
  sectionPlan: z.array(SectionPlanItemSchema).min(1),
});

/**
 * A single issue the critic found in a generated landing page.
 * `sectionType` is optional so the critic can raise page-level problems too.
 */
export const CritiqueIssueSchema = z.object({
  sectionType: sectionTypeEnum.optional(),
  field: z.string().min(1),
  problem: z.string().min(1),
  suggestion: z.string().min(1),
});

/**
 * Verdict from the critic. `pass: true` means the page is ready to ship; any
 * blocking issue must set `pass: false` and be listed in `issues`.
 */
export const CritiqueSchema = z.object({
  pass: z.boolean(),
  summary: z.string().min(1),
  issues: z.array(CritiqueIssueSchema),
});

export type Brief = z.infer<typeof BriefSchema>;
export type Critique = z.infer<typeof CritiqueSchema>;
export type SectionPlanItem = z.infer<typeof SectionPlanItemSchema>;
export type CritiqueIssue = z.infer<typeof CritiqueIssueSchema>;
