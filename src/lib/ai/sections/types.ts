export const SECTION_TYPES = [
  "announcement_bar",
  "hero",
  "trust_strip",
  "features",
  "benefits_grid",
  "social_proof",
  "faq",
  "checkout_form",
  "sticky_cta",
] as const;

export type SectionType = (typeof SECTION_TYPES)[number];

export const ICON_NAMES = [
  "truck",
  "shield",
  "star",
  "refresh",
  "lock",
  "check",
  "gift",
  "clock",
  "headphones",
  "tag",
  "flame",
  "badge-check",
] as const;

export type IconName = (typeof ICON_NAMES)[number];
