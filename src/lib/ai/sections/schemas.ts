import { z } from "zod";

import { ICON_NAMES, type IconName } from "./types";

const iconEnum = z.enum(ICON_NAMES as unknown as [IconName, ...IconName[]]);

export const AnnouncementBarSchema = z.object({
  type: z.literal("announcement_bar"),
  text: z.string().min(1),
});

export const HeroSchema = z.object({
  type: z.literal("hero"),
  eyebrow: z.string().optional(),
  headline: z.string().min(1),
  subheading: z.string().min(1),
  price: z.string().min(1),
  compareAtPrice: z.string().optional(),
  discountBadge: z.string().optional(),
  ctaText: z.string().min(1),
  imageUrl: z.string().url().optional(),
  trustBadges: z.array(z.string().min(1)).max(4),
});

export const TrustStripSchema = z.object({
  type: z.literal("trust_strip"),
  rating: z.number().min(0).max(5),
  reviewCount: z.number().int().min(0),
  satisfiedCustomersText: z.string().min(1),
});

export const FeaturesSchema = z.object({
  type: z.literal("features"),
  title: z.string().optional(),
  items: z
    .array(
      z.object({
        title: z.string().min(1),
        description: z.string().min(1),
        imageUrl: z.string().url().optional(),
        imagePosition: z.enum(["right", "left"]),
      }),
    )
    .min(1),
});

export const BenefitsGridSchema = z.object({
  type: z.literal("benefits_grid"),
  title: z.string().optional(),
  items: z
    .array(
      z.object({
        title: z.string().min(1),
        description: z.string().min(1),
        icon: iconEnum,
      }),
    )
    .min(2),
});

export const SocialProofSchema = z.object({
  type: z.literal("social_proof"),
  title: z.string().optional(),
  reviews: z
    .array(
      z.object({
        name: z.string().min(1),
        rating: z.number().min(0).max(5),
        text: z.string().min(1),
        verified: z.boolean(),
      }),
    )
    .min(1),
});

export const FaqSchema = z.object({
  type: z.literal("faq"),
  title: z.string().optional(),
  items: z
    .array(
      z.object({
        question: z.string().min(1),
        answer: z.string().min(1),
      }),
    )
    .min(1),
});

export const CheckoutFormSchema = z.object({
  type: z.literal("checkout_form"),
  title: z.string().optional(),
  submitText: z.string().min(1),
  orderSummaryText: z.string().optional(),
  price: z.string().optional(),
  freeShippingText: z.string().optional(),
});

export const StickyCtaSchema = z.object({
  type: z.literal("sticky_cta"),
  productTitle: z.string().min(1),
  price: z.string().min(1),
  ctaText: z.string().min(1),
});

export const SectionSchema = z.discriminatedUnion("type", [
  AnnouncementBarSchema,
  HeroSchema,
  TrustStripSchema,
  FeaturesSchema,
  BenefitsGridSchema,
  SocialProofSchema,
  FaqSchema,
  CheckoutFormSchema,
  StickyCtaSchema,
]);

export const SectionsSchema = z.array(SectionSchema);

export type Section = z.infer<typeof SectionSchema>;
export type Sections = z.infer<typeof SectionsSchema>;
