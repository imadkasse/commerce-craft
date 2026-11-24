import { WILAYA_DATA } from "@/lib/data";

import type { SectionType } from "./types";

export const SECTION_ORDER: SectionType[] = [
  "announcement_bar",
  "hero",
  "trust_strip",
  "features",
  "benefits_grid",
  "social_proof",
  "faq",
  "checkout_form",
  "sticky_cta",
];

export const SINGLETON_SECTIONS: SectionType[] = [
  "announcement_bar",
  "hero",
  "trust_strip",
  "checkout_form",
  "sticky_cta",
];

export function isSingleton(type: SectionType): boolean {
  return SINGLETON_SECTIONS.includes(type);
}

export const SECTION_LABELS: Record<SectionType, string> = {
  announcement_bar: "شريط الإعلان",
  hero: "القسم الرئيسي",
  trust_strip: "شريط الثقة",
  features: "المميزات",
  benefits_grid: "شبكة المزايا",
  social_proof: "آراء العملاء",
  faq: "الأسئلة الشائعة",
  checkout_form: "نموذج الطلب",
  sticky_cta: "شريط الشراء الثابت",
};

// The source JSON mistakenly includes 11 dairas (codes 59–69) at the top
// level alongside the 58 real wilayas. Filter to code <= 58 to keep only
// the actual wilayas.
export const WILAYA_NAMES: string[] = WILAYA_DATA.filter(
  (w) => w.code <= 58,
).map((w) => w.name);

export const WILAYA_COUNT = WILAYA_NAMES.length;
