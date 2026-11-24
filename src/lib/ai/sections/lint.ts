import { SECTION_ORDER, SINGLETON_SECTIONS, WILAYA_COUNT } from "./catalog";
import type { Section } from "./schemas";
import type { SectionType } from "./types";

export type LintSeverity = "error" | "warning";

export interface LintIssue {
  /** Stable UPPER_SNAKE machine-readable code. */
  code: string;
  severity: LintSeverity;
  /** Human-readable explanation. */
  message: string;
  /** Offending section type, when applicable. */
  sectionType?: SectionType;
  /** Index of the offending section in the input array. */
  index?: number;
  /** Dot-path to the offending field, when applicable. */
  path?: string;
}

const LATIN = /[\u0041-\u005A\u0061-\u007A]/;
const EMOJI = /\p{Extended_Pictographic}/u;

/**
 * Structural / non-copy keys that must never be treated as visible copy.
 * - `type`      → section discriminator (always English)
 * - `icon`      → IconName enum ("truck", "shield", ...)
 * - `imagePosition` → "right" | "left"
 * - `imageUrl`  → URL field (explicitly skipped per spec)
 */
const SKIP_KEYS = new Set<string>(["type", "icon", "imagePosition", "imageUrl"]);

interface Leaf {
  value: unknown;
  key: string;
  path: string;
  index: number;
  sectionType: SectionType;
}

type LeafCb = (leaf: Leaf) => void;

/**
 * Recursively visits every primitive leaf (string or number) of a section
 * tree, skipping structural/URL keys. Booleans and nulls are ignored.
 */
function walkLeaves(
  value: unknown,
  key: string,
  path: string,
  index: number,
  sectionType: SectionType,
  cb: LeafCb,
): void {
  if (value === null || value === undefined) return;

  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      walkLeaves(value[i], key, `${path}[${i}]`, index, sectionType, cb);
    }
    return;
  }

  if (typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      if (SKIP_KEYS.has(k)) continue;
      const childPath = path ? `${path}.${k}` : k;
      walkLeaves(v, k, childPath, index, sectionType, cb);
    }
    return;
  }

  cb({ value, key, path, index, sectionType });
}

type WalkStringCb = (
  value: string,
  path: string,
  index: number,
  sectionType: SectionType,
) => void;

/**
 * Walks every string leaf in a section (skipping URL/structural fields) and
 * invokes `cb` for each. Shared by the ARABIC_ONLY / EMOJI_FOUND / EMPTY_FIELD
 * rules.
 */
function walkStrings(
  value: unknown,
  path: string,
  index: number,
  sectionType: SectionType,
  cb: WalkStringCb,
): void {
  walkLeaves(value, "", path, index, sectionType, (leaf) => {
    if (typeof leaf.value === "string") {
      cb(leaf.value, leaf.path, index, sectionType);
    }
  });
}

export function lintSections(sections: Section[]): LintIssue[] {
  const issues: LintIssue[] = [];
  const list = Array.isArray(sections) ? sections : [];

  // 1. Exactly one hero.
  const heroCount = list.filter((s) => s.type === "hero").length;
  if (heroCount !== 1) {
    issues.push({
      code: "HERO_REQUIRED",
      severity: "error",
      message: `Expected exactly one "hero" section, found ${heroCount}.`,
      sectionType: "hero",
    });
  }

  // 2. Exactly one checkout_form.
  const checkoutCount = list.filter((s) => s.type === "checkout_form").length;
  if (checkoutCount !== 1) {
    issues.push({
      code: "CHECKOUT_REQUIRED",
      severity: "error",
      message: `Expected exactly one "checkout_form" section, found ${checkoutCount}.`,
      sectionType: "checkout_form",
    });
  }

  // 3. Singleton violations (one issue per offending type).
  for (const type of SINGLETON_SECTIONS) {
    const count = list.filter((s) => s.type === type).length;
    if (count > 1) {
      issues.push({
        code: "SINGLETON_VIOLATION",
        severity: "error",
        message: `Section type "${type}" is a singleton and may appear at most once, found ${count}.`,
        sectionType: type,
      });
    }
  }

  // 4. Section order (compare present types, ignoring duplicates).
  const presentTypes = list.map((s) => s.type);
  const presentUnique = presentTypes.filter(
    (t, i) => presentTypes.indexOf(t) === i,
  );
  const orderMap = new Map<SectionType, number>(
    SECTION_ORDER.map((t, i) => [t, i]),
  );
  let ordered = true;
  let prev = -1;
  for (const t of presentUnique) {
    const pos = orderMap.get(t);
    if (pos === undefined || pos < prev) {
      ordered = false;
      break;
    }
    prev = pos;
  }
  if (!ordered) {
    issues.push({
      code: "SECTION_ORDER",
      severity: "warning",
      message: "Sections are not in the expected order.",
    });
  }

  // 5/6/7/8. Per-section field walk.
  list.forEach((section, index) => {
    const sectionType = section.type;

    walkStrings(section, sectionType, index, sectionType, (value, path) => {
      // 5. Arabic-only visible copy.
      if (LATIN.test(value)) {
        issues.push({
          code: "ARABIC_ONLY",
          severity: "error",
          message: "Visible copy must be Arabic-only and contains Latin letters.",
          sectionType,
          index,
          path,
        });
      }

      // 6. No emoji.
      if (EMOJI.test(value)) {
        issues.push({
          code: "EMOJI_FOUND",
          severity: "error",
          message: "Text must not contain emoji.",
          sectionType,
          index,
          path,
        });
      }

      // 7. No empty required fields.
      if (value.trim() === "") {
        issues.push({
          code: "EMPTY_FIELD",
          severity: "error",
          message: "Required string field is empty or whitespace-only.",
          sectionType,
          index,
          path,
        });
      }
    });

    // 8. Rating range (number leaves keyed "rating").
    walkLeaves(section, "", sectionType, index, sectionType, (leaf) => {
      if (
        leaf.key === "rating" &&
        typeof leaf.value === "number" &&
        (leaf.value < 0 || leaf.value > 5)
      ) {
        issues.push({
          code: "RATING_RANGE",
          severity: "error",
          message: `Rating must be between 0 and 5, found ${leaf.value}.`,
          sectionType,
          index,
          path: leaf.path,
        });
      }
    });
  });

  // 9. Wilaya data integrity (independent of the sections array).
  if (WILAYA_COUNT !== 58) {
    issues.push({
      code: "WILAYAS_COMPLETE",
      severity: "error",
      message: `Expected 58 wilayas, found ${WILAYA_COUNT}.`,
    });
  }

  return issues;
}

export function lintIsClean(sections: Section[]): boolean {
  return lintSections(sections).every((issue) => issue.severity !== "error");
}
