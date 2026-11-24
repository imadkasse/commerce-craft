import { SECTION_ORDER, WILAYA_NAMES } from "./catalog";
import { ICON_SVGS } from "./icons";
import type { Section } from "./schemas";
import type { SectionType } from "./types";

export interface CompileTheme {
  font?: string;
  colors?: Record<string, string>; // keys like: primary, background, accent, text, border
  sectionVisibility?: Record<string, boolean>; // sectionType -> visible
}

export interface CompileOptions {
  rtl?: boolean; // default true
  theme?: CompileTheme;
  embedTailwindCdn?: boolean; // default true
}

export interface CompileResult {
  html: string;
  warnings: string[];
}

const DEFAULT_PRIMARY = "#4f46e5";
const DEFAULT_ACCENT = "#f97316";
const DEFAULT_BG = "#ffffff";
const DEFAULT_BG_ALT = "#f8fafc";
const DEFAULT_TEXT = "#1e293b";
const DEFAULT_BORDER = "#e2e8f0";
const DEFAULT_FONT = "'Cairo', 'Tajawal', sans-serif";
const FALLBACK_TITLE = "صفحة المنتج";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function lookupColor(
  colors: Record<string, string> | undefined,
  aliases: string[],
  fallback: string,
): string {
  if (colors) {
    for (const alias of aliases) {
      const value = colors[alias];
      if (typeof value === "string" && value.trim() !== "") {
        return value.trim();
      }
    }
  }
  return fallback;
}

function buildCssVariables(colors?: Record<string, string>): string {
  const primary = lookupColor(colors, ["primary"], DEFAULT_PRIMARY);
  const accent = lookupColor(colors, ["accent"], DEFAULT_ACCENT);
  const bg = lookupColor(colors, ["background", "bg"], DEFAULT_BG);
  const bgAlt = lookupColor(
    colors,
    ["bg-alt", "bgAlt", "backgroundAlt", "background-alt"],
    DEFAULT_BG_ALT,
  );
  const text = lookupColor(colors, ["text"], DEFAULT_TEXT);
  const border = lookupColor(colors, ["border"], DEFAULT_BORDER);

  return [
    `  --lp-primary: ${primary};`,
    `  --lp-accent: ${accent};`,
    `  --lp-bg: ${bg};`,
    `  --lp-bg-alt: ${bgAlt};`,
    `  --lp-text: ${text};`,
    `  --lp-border: ${border};`,
  ].join("\n");
}

/** Filled vs outline star. Kept private to the compiler; not part of ICON_SVGS. */
function starIcon(filled: boolean): string {
  const color = filled ? "#f59e0b" : "#cbd5e1";
  const fill = filled ? "currentColor" : "none";
  const stroke = filled ? "none" : "currentColor";
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="' +
    fill +
    '" stroke="' +
    stroke +
    '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ' +
    'style="width:20px;height:20px;color:' +
    color +
    ';flex:none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>'
  );
}

function renderStars(rating: number): string {
  const filled = Math.max(0, Math.min(5, Math.floor(rating)));
  let out = '<span class="star-row">';
  for (let i = 0; i < 5; i += 1) {
    out += starIcon(i < filled);
  }
  out += "</span>";
  return out;
}

function gradientPlaceholder(label: string, minHeight: string): string {
  return (
    '<div class="lp-gradient lp-placeholder" style="min-height:' +
    minHeight +
    '"><span>' +
    escapeHtml(label) +
    "</span></div>"
  );
}

function mediaBlock(
  imageUrl: string | undefined,
  alt: string,
  minHeight: string,
): string {
  if (imageUrl) {
    return (
      '<img src="' +
      escapeHtml(imageUrl) +
      '" alt="' +
      escapeHtml(alt) +
      '" loading="lazy" ' +
      'style="width:100%;height:auto;border-radius:1rem;object-fit:cover" />'
    );
  }
  return gradientPlaceholder(alt, minHeight);
}

function iconSvg(name: string): string {
  return ICON_SVGS[name as keyof typeof ICON_SVGS] ?? "";
}

function sectionTitle(title: string): string {
  return '<h2 class="section-title">' + escapeHtml(title) + "</h2>";
}

function renderAnnouncementBar(
  section: Extract<Section, { type: "announcement_bar" }>,
): string {
  return (
    '<div class="announcement-bar">' +
    escapeHtml(section.text) +
    "</div>"
  );
}

function renderHero(section: Extract<Section, { type: "hero" }>): string {
  const badges = section.trustBadges
    .map(
      (badge) =>
        '<span class="chip">' +
        '<span class="chip-check">' +
        iconSvg("check") +
        "</span>" +
        escapeHtml(badge) +
        "</span>",
    )
    .join("");

  const priceRow =
    '<div class="price-row">' +
    '<span class="price">' +
    escapeHtml(section.price) +
    "</span>" +
    (section.compareAtPrice
      ? '<span class="compare-price">' +
        escapeHtml(section.compareAtPrice) +
        "</span>"
      : "") +
    (section.discountBadge
      ? '<span class="discount-badge">' +
        escapeHtml(section.discountBadge) +
        "</span>"
      : "") +
    "</div>";

  const textColumn =
    '<div class="hero-text">' +
    (section.eyebrow
      ? '<span class="eyebrow">' + escapeHtml(section.eyebrow) + "</span>"
      : "") +
    "<h1>" +
    escapeHtml(section.headline) +
    "</h1>" +
    '<p class="subheading">' +
    escapeHtml(section.subheading) +
    "</p>" +
    priceRow +
    '<a href="#checkout-form" class="btn-primary">' +
    escapeHtml(section.ctaText) +
    "</a>" +
    '<div class="badges-row">' +
    badges +
    "</div>" +
    "</div>";

  const mediaColumn =
    '<div class="hero-media">' +
    mediaBlock(section.imageUrl, section.headline, "320px") +
    "</div>";

  return (
    '<section class="lp-section"><div class="lp-container hero-grid">' +
    textColumn +
    mediaColumn +
    "</div></section>"
  );
}

function renderTrustStrip(
  section: Extract<Section, { type: "trust_strip" }>,
): string {
  return (
    '<section class="lp-section trust-strip"><div class="lp-container trust-strip-inner">' +
    renderStars(section.rating) +
    '<span class="rating-number">' +
    String(section.rating) +
    "</span>" +
    '<span class="rating-meta">(' +
    String(section.reviewCount) +
    " " +
    escapeHtml(section.satisfiedCustomersText) +
    ")</span>" +
    "</div></section>"
  );
}

function renderFeatures(
  section: Extract<Section, { type: "features" }>,
): string {
  const rows = section.items
    .map((item) => {
      const textColumn =
        '<div class="feature-text">' +
        "<h3>" +
        escapeHtml(item.title) +
        "</h3>" +
        "<p>" +
        escapeHtml(item.description) +
        "</p>" +
        "</div>";
      const mediaColumn =
        '<div class="feature-media">' +
        mediaBlock(item.imageUrl, item.title, "240px") +
        "</div>";

      // In RTL, "right" means first child (right side).
      const imageFirst = item.imagePosition === "right";
      const inner = imageFirst ? mediaColumn + textColumn : textColumn + mediaColumn;
      return '<div class="feature-grid">' + inner + "</div>";
    })
    .join("");

  return (
    '<section class="lp-section"><div class="lp-container">' +
    (section.title ? sectionTitle(section.title) : "") +
    '<div class="feature-stack">' +
    rows +
    "</div></div></section>"
  );
}

function renderBenefitsGrid(
  section: Extract<Section, { type: "benefits_grid" }>,
): string {
  const cards = section.items
    .map(
      (item) =>
        '<div class="card benefit-card">' +
        '<span class="icon-chip">' +
        iconSvg(item.icon) +
        "</span>" +
        "<h3>" +
        escapeHtml(item.title) +
        "</h3>" +
        "<p>" +
        escapeHtml(item.description) +
        "</p>" +
        "</div>",
    )
    .join("");

  return (
    '<section class="lp-section"><div class="lp-container">' +
    (section.title ? sectionTitle(section.title) : "") +
    '<div class="benefits-grid">' +
    cards +
    "</div></div></section>"
  );
}

function renderSocialProof(
  section: Extract<Section, { type: "social_proof" }>,
): string {
  const cards = section.reviews
    .map(
      (review) =>
        '<div class="card review-card">' +
        '<div class="review-head">' +
        '<span class="review-name">' +
        escapeHtml(review.name) +
        "</span>" +
        (review.verified
          ? '<span class="verified-chip">' +
            iconSvg("badge-check") +
            '<span>مشتري محقق</span>' +
            "</span>"
          : "") +
        "</div>" +
        renderStars(review.rating) +
        '<p class="review-text">' +
        escapeHtml(review.text) +
        "</p>" +
        "</div>",
    )
    .join("");

  return (
    '<section class="lp-section"><div class="lp-container">' +
    (section.title ? sectionTitle(section.title) : "") +
    '<div class="reviews-grid">' +
    cards +
    "</div></div></section>"
  );
}

function renderFaq(section: Extract<Section, { type: "faq" }>): string {
  const items = section.items
    .map(
      (item) =>
        '<details class="faq-item">' +
        "<summary>" +
        escapeHtml(item.question) +
        "</summary>" +
        '<div class="faq-answer">' +
        escapeHtml(item.answer) +
        "</div>" +
        "</details>",
    )
    .join("");

  return (
    '<section class="lp-section"><div class="lp-container lp-narrow">' +
    (section.title ? sectionTitle(section.title) : "") +
    '<div class="faq-list">' +
    items +
    "</div></div></section>"
  );
}

function renderCheckoutForm(
  section: Extract<Section, { type: "checkout_form" }>,
): string {
  const wilayaOptions =
    '<option value="">اختر الولاية</option>' +
    WILAYA_NAMES.map(
      (name) =>
        '<option value="' + escapeHtml(name) + '">' + escapeHtml(name) + "</option>",
    ).join("");

  const summaryRows =
    (section.price
      ? '<div class="summary-row"><span>السعر</span><span class="summary-price">' +
        escapeHtml(section.price) +
        "</span></div>"
      : "") +
    (section.freeShippingText
      ? '<div class="summary-row"><span class="summary-shipping">' +
        escapeHtml(section.freeShippingText) +
        "</span></div>"
      : "");

  const summaryBox = summaryRows
    ? '<div class="order-summary">' +
      '<div class="order-summary-title">' +
      escapeHtml(section.orderSummaryText ?? "ملخص الطلب") +
      "</div>" +
      summaryRows +
      "</div>"
    : "";

  return (
    '<section class="lp-section"><div class="lp-container lp-narrow">' +
    '<form id="checkout-form" class="checkout-form">' +
    (section.title ? sectionTitle(section.title) : "") +
    '<label class="field">' +
    "<span>الاسم الكامل</span>" +
    '<input type="text" name="fullName" placeholder="أدخل اسمك الكامل" required />' +
    "</label>" +
    '<label class="field">' +
    "<span>رقم الهاتف</span>" +
    '<input type="tel" name="phone" inputmode="tel" placeholder="مثال: 0550 00 00 00" required />' +
    "</label>" +
    '<label class="field">' +
    "<span>العنوان</span>" +
    '<input type="text" name="address" placeholder="العنوان الكامل للتوصيل" required />' +
    "</label>" +
    '<label class="field">' +
    "<span>الولاية</span>" +
    '<select name="wilaya" required>' +
    wilayaOptions +
    "</select>" +
    "</label>" +
    '<label class="field">' +
    "<span>البلدية / الدائرة</span>" +
    '<input type="text" name="commune" placeholder="البلدية أو الدائرة" />' +
    "</label>" +
    summaryBox +
    '<button type="submit" class="btn-primary btn-submit">' +
    escapeHtml(section.submitText) +
    "</button>" +
    "</form></div></section>"
  );
}

function renderStickyCta(
  section: Extract<Section, { type: "sticky_cta" }>,
): string {
  return (
    '<div class="sticky-cta md:hidden fixed bottom-0 inset-x-0 z-50">' +
    '<div class="sticky-cta-info">' +
    '<span class="sticky-cta-title">' +
    escapeHtml(section.productTitle) +
    "</span>" +
    '<span class="sticky-cta-price">' +
    escapeHtml(section.price) +
    "</span>" +
    "</div>" +
    '<a href="#checkout-form" class="btn-primary">' +
    escapeHtml(section.ctaText) +
    "</a>" +
    "</div>"
  );
}

function renderSection(section: Section): string {
  switch (section.type) {
    case "announcement_bar":
      return renderAnnouncementBar(section);
    case "hero":
      return renderHero(section);
    case "trust_strip":
      return renderTrustStrip(section);
    case "features":
      return renderFeatures(section);
    case "benefits_grid":
      return renderBenefitsGrid(section);
    case "social_proof":
      return renderSocialProof(section);
    case "faq":
      return renderFaq(section);
    case "checkout_form":
      return renderCheckoutForm(section);
    case "sticky_cta":
      return renderStickyCta(section);
    default: {
      const exhaustive: never = section;
      return exhaustive;
    }
  }
}

function deriveTitle(sections: Section[]): string {
  const sticky = sections.find(
    (s): s is Extract<Section, { type: "sticky_cta" }> =>
      s.type === "sticky_cta",
  );
  if (sticky && sticky.productTitle.trim() !== "") {
    return sticky.productTitle.trim();
  }
  const hero = sections.find(
    (s): s is Extract<Section, { type: "hero" }> => s.type === "hero",
  );
  if (hero && hero.headline.trim() !== "") {
    return hero.headline.trim();
  }
  return FALLBACK_TITLE;
}

function buildStyleBlock(
  vars: string,
  font: string,
  rtl: boolean,
): string {
  return `<style>
:root {
${vars}
  --lp-font: ${font};
}
html { scroll-behavior: smooth; }
body {
  font-family: var(--lp-font);
  background: var(--lp-bg);
  color: var(--lp-text);
  direction: ${rtl ? "rtl" : "ltr"};
  margin: 0;
  -webkit-font-smoothing: antialiased;
}
*, *::before, *::after { box-sizing: border-box; }
img { display: block; max-width: 100%; }

.lp-section { padding: 3rem 1rem; }
.lp-container { max-width: 72rem; margin: 0 auto; }
.lp-narrow { max-width: 40rem; }

.announcement-bar {
  background: var(--lp-accent);
  color: #ffffff;
  text-align: center;
  padding: 0.75rem 1rem;
  font-weight: 700;
  font-size: 0.9rem;
}

.hero-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2.5rem; align-items: center; }
.hero-text h1 { font-size: 2.25rem; line-height: 1.3; font-weight: 800; margin: 0.75rem 0 1rem; }
.eyebrow { display: inline-block; color: var(--lp-accent); font-weight: 700; font-size: 0.85rem; letter-spacing: 0.02em; }
.subheading { color: var(--lp-text); opacity: 0.75; font-size: 1.05rem; line-height: 1.8; margin: 0 0 1.5rem; }
.price-row { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 1.5rem; }
.price { font-size: 1.9rem; font-weight: 800; color: var(--lp-primary); }
.compare-price { text-decoration: line-through; opacity: 0.5; font-size: 1.1rem; }
.discount-badge { background: var(--lp-accent); color: #ffffff; font-weight: 700; font-size: 0.8rem; padding: 0.25rem 0.6rem; border-radius: 999px; }
.badges-row { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 1.5rem; }
.chip { display: inline-flex; align-items: center; gap: 0.4rem; border: 1px solid var(--lp-border); border-radius: 999px; padding: 0.35rem 0.75rem; font-size: 0.85rem; font-weight: 600; }
.chip-check { display: inline-flex; color: var(--lp-primary); }
.chip-check svg { width: 16px; height: 16px; }

.btn-primary {
  display: inline-block;
  background: var(--lp-primary);
  color: #ffffff;
  font-weight: 700;
  font-size: 1.05rem;
  padding: 0.85rem 1.75rem;
  border-radius: 0.75rem;
  text-decoration: none;
  border: none;
  cursor: pointer;
  text-align: center;
  transition: filter 0.15s ease;
}
.btn-primary:hover { filter: brightness(1.08); }

.trust-strip { padding: 1.25rem 1rem; background: var(--lp-bg-alt); border-top: 1px solid var(--lp-border); border-bottom: 1px solid var(--lp-border); }
.trust-strip-inner { display: flex; align-items: center; justify-content: center; gap: 0.6rem; flex-wrap: wrap; }
.star-row { display: inline-flex; gap: 2px; align-items: center; }
.rating-number { font-weight: 800; font-size: 1.15rem; }
.rating-meta { opacity: 0.7; }

.feature-stack { display: flex; flex-direction: column; gap: 3rem; }
.feature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; align-items: center; }
.feature-text h3 { font-size: 1.4rem; font-weight: 800; margin: 0 0 0.75rem; }
.feature-text p { line-height: 1.8; opacity: 0.8; margin: 0; }

.benefits-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.card { border: 1px solid var(--lp-border); border-radius: 1rem; padding: 1.5rem; background: var(--lp-bg); }
.benefit-card h3 { margin: 1rem 0 0.5rem; font-size: 1.1rem; font-weight: 800; }
.benefit-card p { margin: 0; line-height: 1.7; opacity: 0.8; }
.icon-chip {
  display: inline-flex; align-items: center; justify-content: center;
  width: 48px; height: 48px; border-radius: 12px;
  background: color-mix(in srgb, var(--lp-accent) 12%, var(--lp-bg));
  color: var(--lp-accent);
}
.icon-chip svg { width: 24px; height: 24px; }

.reviews-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; }
.review-card { display: flex; flex-direction: column; gap: 0.75rem; }
.review-head { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
.review-name { font-weight: 700; }
.verified-chip {
  display: inline-flex; align-items: center; gap: 4px;
  color: var(--lp-primary);
  background: color-mix(in srgb, var(--lp-primary) 10%, var(--lp-bg));
  padding: 0.2rem 0.5rem; border-radius: 999px; font-size: 0.72rem; font-weight: 700;
}
.verified-chip svg { width: 14px; height: 14px; }
.review-text { margin: 0; line-height: 1.8; opacity: 0.85; }

.faq-list { display: flex; flex-direction: column; gap: 0.6rem; }
.faq-item { border: 1px solid var(--lp-border); border-radius: 0.75rem; overflow: hidden; background: var(--lp-bg); }
.faq-item summary { cursor: pointer; padding: 1rem 1.25rem; font-weight: 700; list-style: none; }
.faq-item summary::-webkit-details-marker { display: none; }
.faq-answer { padding: 0 1.25rem 1.25rem; line-height: 1.8; opacity: 0.85; }

.checkout-form { display: flex; flex-direction: column; gap: 1rem; background: var(--lp-bg); border: 1px solid var(--lp-border); border-radius: 1rem; padding: 1.75rem; }
.field { display: flex; flex-direction: column; gap: 0.4rem; font-weight: 600; font-size: 0.95rem; }
.field input, .field select {
  border: 1px solid var(--lp-border); border-radius: 0.6rem; padding: 0.8rem 0.9rem;
  font-family: inherit; font-size: 1rem; background: var(--lp-bg); color: var(--lp-text);
}
.field input:focus, .field select:focus { outline: none; border-color: var(--lp-primary); box-shadow: 0 0 0 3px color-mix(in srgb, var(--lp-primary) 15%, transparent); }
.order-summary { background: var(--lp-bg-alt); border-radius: 0.75rem; padding: 1rem 1.25rem; }
.order-summary-title { font-weight: 800; margin-bottom: 0.6rem; }
.summary-row { display: flex; align-items: center; justify-content: space-between; font-weight: 600; }
.summary-price { color: var(--lp-primary); font-weight: 800; font-size: 1.1rem; }
.summary-shipping { color: #16a34a; font-weight: 700; }
.btn-submit { width: 100%; padding: 1rem; font-size: 1.1rem; }

.section-title { font-size: 1.6rem; font-weight: 800; text-align: center; margin: 0 0 1.75rem; }

.lp-gradient {
  background: linear-gradient(135deg,
    color-mix(in srgb, var(--lp-primary) 15%, var(--lp-bg)),
    color-mix(in srgb, var(--lp-accent) 15%, var(--lp-bg)));
}
.lp-placeholder {
  display: flex; align-items: center; justify-content: center; text-align: center;
  border-radius: 1rem; padding: 2rem; color: var(--lp-text); opacity: 0.8; font-weight: 700;
}

.sticky-cta {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 50;
  display: flex; align-items: center; justify-content: space-between; gap: 1rem;
  background: var(--lp-bg); border-top: 1px solid var(--lp-border);
  padding: 0.75rem 1rem; box-shadow: 0 -4px 20px rgba(0,0,0,0.06);
}
.sticky-cta-info { display: flex; flex-direction: column; }
.sticky-cta-title { font-weight: 700; font-size: 0.95rem; }
.sticky-cta-price { color: var(--lp-primary); font-weight: 800; }
.sticky-cta .btn-primary { padding: 0.6rem 1.1rem; font-size: 0.95rem; }

@media (min-width: 768px) { .sticky-cta { display: none; } }
@media (max-width: 767px) {
  body.has-sticky-cta { padding-bottom: 88px; }
  .hero-grid, .feature-grid { grid-template-columns: 1fr; }
  .reviews-grid { grid-template-columns: 1fr; }
  .benefits-grid { grid-template-columns: 1fr; }
  .hero-text h1 { font-size: 1.75rem; }
}
</style>`;
}

export function compileSections(
  sections: Section[],
  opts?: CompileOptions,
): CompileResult {
  const warnings: string[] = [];
  const rtl = opts?.rtl !== false;
  const theme = opts?.theme;
  const embedTailwindCdn = opts?.embedTailwindCdn !== false;
  const visibility = theme?.sectionVisibility ?? {};

  // Reorder to canonical order (stable for repeated non-singleton types).
  const inputOrder = sections.map((s) => s.type);
  const ordered = sections
    .slice()
    .sort(
      (a, b) =>
        SECTION_ORDER.indexOf(a.type as SectionType) -
        SECTION_ORDER.indexOf(b.type as SectionType),
    );
  const canonicalOrder = ordered.map((s) => s.type);
  if (
    inputOrder.length !== canonicalOrder.length ||
    inputOrder.some((type, i) => type !== canonicalOrder[i])
  ) {
    warnings.push("sections reordered to canonical order");
  }

  const visible = ordered.filter(
    (s) => visibility[s.type] !== false,
  );

  const checkoutVisible = visible.some((s) => s.type === "checkout_form");
  const hadCheckout = sections.some((s) => s.type === "checkout_form");
  if (hadCheckout && !checkoutVisible) {
    warnings.push("checkout_form is hidden by sectionVisibility");
  }

  const hasStickyCta = visible.some((s) => s.type === "sticky_cta");

  const bodyParts = visible.map(renderSection).join("\n");

  const title = escapeHtml(deriveTitle(sections));
  const dir = rtl ? "rtl" : "ltr";
  const lang = rtl ? "ar" : "en";

  const fontsLink =
    '<link rel="preconnect" href="https://fonts.googleapis.com" />\n' +
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />\n' +
    '<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet" />';

  const tailwindScript = embedTailwindCdn
    ? '<script src="https://cdn.tailwindcss.com"></script>\n  '
    : "";

  const cssVars = buildCssVariables(theme?.colors);
  const font = theme?.font?.trim() || DEFAULT_FONT;
  const styleBlock = buildStyleBlock(cssVars, font, rtl);

  const bodyClass = hasStickyCta ? ' class="has-sticky-cta"' : "";

  const html =
    "<!doctype html>\n" +
    '<html lang="' +
    lang +
    '" dir="' +
    dir +
    '">\n' +
    "<head>\n" +
    '  <meta charset="utf-8" />\n' +
    '  <meta name="viewport" content="width=device-width, initial-scale=1" />\n' +
    "  <title>" +
    title +
    "</title>\n" +
    "  " +
    fontsLink +
    "\n  " +
    tailwindScript +
    styleBlock +
    "</head>\n" +
    "<body" +
    bodyClass +
    ">\n" +
    bodyParts +
    "\n</body>\n" +
    "</html>";

  return { html, warnings };
}
