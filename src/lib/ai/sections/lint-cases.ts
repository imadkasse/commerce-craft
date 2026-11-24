import { validSectionsFixture } from "./fixtures";
import type { Section } from "./schemas";

export interface BrokenCase {
  name: string;
  sections: Section[];
  /** Codes that MUST appear in `lintSections` output for this case. */
  expectedCodes: string[];
}

/** Find a section by its discriminant and narrow to that variant. */
function findSection<T extends Section["type"]>(
  sections: Section[],
  type: T,
): Extract<Section, { type: T }> {
  const found = sections.find((s) => s.type === type);
  if (!found) throw new Error(`Missing section of type "${type}"`);
  return found as Extract<Section, { type: T }>;
}

export const brokenCases: BrokenCase[] = [
  {
    name: "missing-hero",
    sections: structuredClone(validSectionsFixture).filter(
      (s) => s.type !== "hero",
    ),
    expectedCodes: ["HERO_REQUIRED"],
  },
  {
    name: "missing-checkout-form",
    sections: structuredClone(validSectionsFixture).filter(
      (s) => s.type !== "checkout_form",
    ),
    expectedCodes: ["CHECKOUT_REQUIRED"],
  },
  {
    name: "duplicate-hero",
    sections: (() => {
      const sections = structuredClone(validSectionsFixture);
      const hero = findSection(sections, "hero");
      sections.push(structuredClone(hero));
      return sections;
    })(),
    expectedCodes: ["SINGLETON_VIOLATION"],
  },
  {
    name: "english-headline",
    sections: (() => {
      const sections = structuredClone(validSectionsFixture);
      findSection(sections, "hero").headline = "Best Watch Ever";
      return sections;
    })(),
    expectedCodes: ["ARABIC_ONLY"],
  },
  {
    name: "emoji-headline",
    sections: (() => {
      const sections = structuredClone(validSectionsFixture);
      findSection(sections, "hero").headline = "ساعة فاخرة 🔥";
      return sections;
    })(),
    expectedCodes: ["EMOJI_FOUND"],
  },
  {
    name: "out-of-order",
    sections: (() => {
      const sections = structuredClone(validSectionsFixture);
      const faqIndex = sections.findIndex((s) => s.type === "faq");
      const [faq] = sections.splice(faqIndex, 1);
      sections.unshift(faq);
      return sections;
    })(),
    expectedCodes: ["SECTION_ORDER"],
  },
  {
    name: "empty-required-field",
    sections: (() => {
      const sections = structuredClone(validSectionsFixture);
      findSection(sections, "hero").headline = "";
      return sections;
    })(),
    expectedCodes: ["EMPTY_FIELD"],
  },
  {
    name: "rating-out-of-range",
    sections: (() => {
      const sections = structuredClone(validSectionsFixture);
      findSection(sections, "trust_strip").rating = 9;
      return sections;
    })(),
    expectedCodes: ["RATING_RANGE"],
  },
];
