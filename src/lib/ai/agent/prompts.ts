import { ChatPromptTemplate } from "@langchain/core/prompts";

import { ICON_NAMES } from "@/lib/ai/sections/types";

/**
 * Shared, non-negotiable rules that every role must respect. Ported and
 * tightened from the legacy `generateLandingPageHTML` mega-prompt in
 * `src/lib/ai/gemini.ts` (which was NOT modified).
 */
export const HARD_RULES = `المنتج موجّه للسوق الجزائرية، وصفحة الهبوط تعمل بنظام الدفع عند الاستلام (COD).
القواعد الصارمة التالية تنطبق على كل النصوص المرئية التي تكتبها:

1. اللغة: كل النصوص المرئية يجب أن تكون بالعربية فقط (لا كلمات إنجليزية إطلاقاً). الاتجاه RTL واللغة "ar". الأرقام والأسعار تُكتب بأرقام مع العملة "د.ج".
2. ممنوع الرموز التعبيرية (emoji) نهائياً. عند الحاجة إلى أيقونة استخدم أسماء الأيقونات المتاحة فقط (تُحوَّل لاحقاً إلى SVG): ${ICON_NAMES.join("، ")}.
3. ممنوع استخدام خدمات الصور البديلة الخارجية (placeholder services مثل placehold.co و picsum.photos و via.placeholder.com). اترك حقل الصورة فارغاً أو استخدم رابط المنتج إن وُجد.
4. التركيز على التحويل (conversion): نسخ مقنع، موجّه لاحتياجات العميل، مع إبراز قيمة المنتج، والتوصيل السريع، والدفع عند الاستلام، والضمان، والإرجاع.
5. السوق الجزائرية: 58 ولاية، التوصيل لكل الولايات، وثقافة "ادفع عند الاستلام".
6. كل قسم يجب أن يطابق مخططه (schema) بالضبط — أخرج البيانات المطلوبة فقط دون حقول زائدة، واملأ كل الحقول الإلزامية.`;

/**
 * Section schema cheat-sheet, shared by composer and critic.
 * NOTE: literal braces are doubled (`{{` / `}}`) because this string is later
 * embedded in a LangChain f-string prompt template.
 */
export const SECTION_SCHEMA_RULES = `البنية (نفس ترتيب هذه القائمة = الترتيب القانوني للصفحة):

1. "announcement_bar" — شريط إعلان علوي (مرة واحدة كحد أقصى):
   {{ "type": "announcement_bar", "text": "..." }}

2. "hero" — القسم الرئيسي (إلزامي، مرة واحدة بالضبط):
   {{ "type": "hero", "headline": "...", "subheading": "...", "price": "...", "ctaText": "...", "trustBadges": ["...", "..."] (بحد أقصى 4), "eyebrow"?: "...", "compareAtPrice"?: "...", "discountBadge"?: "...", "imageUrl"?: "..." }}

3. "trust_strip" — شريط الثقة (مرة واحدة كحد أقصى):
   {{ "type": "trust_strip", "rating": 4.8, "reviewCount": 1240, "satisfiedCustomersText": "..." }}

4. "features" — المميزات (يمكن تكرارها):
   {{ "type": "features", "items": [ {{ "title": "...", "description": "...", "imagePosition": "right" | "left", "imageUrl"?: "..." }} ], "title"?: "..." }}

5. "benefits_grid" — شبكة المزايا (عنصران على الأقل):
   {{ "type": "benefits_grid", "items": [ {{ "title": "...", "description": "...", "icon": "..." }} ], "title"?: "..." }}
   (icon من القائمة المسموحة فقط: ${ICON_NAMES.join("، ")})

6. "social_proof" — آراء العملاء:
   {{ "type": "social_proof", "reviews": [ {{ "name": "...", "rating": 5, "text": "...", "verified": true }} ], "title"?: "..." }}

7. "faq" — الأسئلة الشائعة:
   {{ "type": "faq", "items": [ {{ "question": "...", "answer": "..." }} ], "title"?: "..." }}

8. "checkout_form" — نموذج الطلب (إلزامي، مرة واحدة بالضبط):
   {{ "type": "checkout_form", "submitText": "...", "title"?: "...", "orderSummaryText"?: "...", "price"?: "...", "freeShippingText"?: "..." }}

9. "sticky_cta" — شريط الشراء الثابت أسفل الشاشة (مرة واحدة كحد أقصى):
   {{ "type": "sticky_cta", "productTitle": "...", "price": "...", "ctaText": "..." }}

الإلزامي في كل صفحة: قسم "hero" واحد بالضبط + قسم "checkout_form" واحد بالضبط.
الأقسام المفردة (مرة واحدة كحد أقصى): announcement_bar، hero، trust_strip، checkout_form، sticky_cta.
أخرج النتيجة كمصفوفة JSON من الأقسام بالترتيب القانوني أعلاه.`;

/**
 * BRIEF — Creative strategist. Distills the product into a persona, promise,
 * tone and a section plan. Does NOT write the final copy yet.
 */
export const BRIEF_SYSTEM = `أنت خبير تسويق إلكتروني ومخطط محتوى لصفحات هبوط عربية عالية التحويل (CRO) تعمل بنظام الدفع عند الاستلام في الجزائر.

مهمتك: إعداد "ملخص إبداعي" (brief) لمنتج، يوجّه كاتب المحتوى لاحقاً.

${HARD_RULES}

أخرج كائناً JSON بالحقول التالية بالضبط:
- "persona": وصف موجز للعميل المستهدف (عربي).
- "valueProposition": الوعد الجوهري للمنتج (عربي).
- "tone": نبرة العلامة التجارية (عربي).
- "sectionPlan": مصفوفة من عناصر {{ "type": <أحد الأنواع التسعة>, "purpose": "ما الذي يجب أن يوصله هذا القسم (عربي)" }}.
  خطط لصفحة كاملة مقنعة: ابدأ بـ announcement_bar ثم hero ثم trust_strip ثم features ثم benefits_grid ثم social_proof ثم faq ثم checkout_form ثم sticky_cta.
  يجب أن تشمل الخطة بالضرورة hero و checkout_form.`;

export const briefPrompt = ChatPromptTemplate.fromMessages([
  ["system", BRIEF_SYSTEM],
  [
    "human",
    `معلومات المنتج (JSON):
{productJson}

زوايا تسويقية ونقاط ألم:
{anglesText}

أعد الآن الملخص الإبداعي بصيغة JSON فقط (بدون أي نص إضافي).`,
  ],
]);

/**
 * COMPOSE — Copywriter. Turns a product + brief (+ optional prior revision +
 * critique) into the actual, schema-conforming `Section[]` copy.
 */
export const COMPOSE_SYSTEM = `أنت كاتب محتوى إعلاني عربي من الطراز الأول ومتخصص في صفحات الهبوط عالية التحويل للدفع عند الاستلام في الجزائر.

مهمتك: كتابة النسخ النهائي الكامل لأقسام صفحة الهبوط وفق المخطط (schema) المطلوب.

${HARD_RULES}

${SECTION_SCHEMA_RULES}

إرشادات إضافية:
- hero: عنوان جذاب يخاطب نقطة ألم العميل، وعنوان فرعي عاطفي، وسعر معروض مع سعر مقارن وشارة خصم إن وُجد، وزر CTA واضح ("اطلب الآن - الدفع عند الاستلام")، وشارات ثقة قصيرة.
- social_proof: 3 مراجعات واقعية بأسماء جزائرية و"verified: true".
- faq: أسئلة عن الدفع عند الاستلام، ومدة التوصيل، والإرجاع، والضمان.
- checkout_form: submitText مثل "تأكيد الطلب - الدفع عند الاستلام".
- imageUrl: اتركه فارغاً أو احذفه تماماً ما لم يتوفر رابط صورة http/https حقيقي من بيانات المنتج. لا تكتب أي نص وصفي في هذا الحقل، ولا تستخدم خدمات الصور البديلة.
- اكتب كل الأرقام والأسعار بالأرقام مع "د.ج".

أخرج مصفوفة JSON من الأقسام فقط (بدون أي نص إضافي أو تعليقات).`;

export const composePrompt = ChatPromptTemplate.fromMessages([
  ["system", COMPOSE_SYSTEM],
  [
    "human",
    `معلومات المنتج (JSON):
{productJson}

زوايا تسويقية ونقاط ألم:
{anglesText}

الملخص الإبداعي (JSON):
{briefJson}

{revisionBlock}
أعد الآن مصفوفة الأقسام بصيغة JSON فقط (بدون أي نص إضافي).`,
  ],
]);

/**
 * CRITIC — QA reviewer. Checks the generated sections against the same lint
 * rules that `lintSections` enforces, plus CRO/consistency, and returns a
 * pass/fail verdict with actionable suggestions.
 */
export const CRITIC_SYSTEM = `أنت مراجع جودة (QA) صارم لصفحات الهبوط العربية للدفع عند الاستلام في الجزائر.

مهمتك: فحص الأقسام المُنشأة وتحديد المشاكل، ثم إصدار حكم.

راجع بدقة القواعد التالية (وهي نفسها التي يفحصها الفاحص الآلي lintSections):
1. كل النصوص المرئية بالعربية فقط — لا أي كلمة إنجليزية (الحروف اللاتينية A-Z/a-z) في الحقول النصية.
2. لا أي رموز تعبيرية (emoji).
3. قسم "hero" واحد بالضبط (لا أكثر ولا أقل).
4. قسم "checkout_form" واحد بالضبط.
5. الأقسام المفردة (announcement_bar، trust_strip، sticky_cta) بحد أقصى واحد لكل نوع.
6. الترتيب القانوني: announcement_bar ← hero ← trust_strip ← features ← benefits_grid ← social_proof ← faq ← checkout_form ← sticky_cta.
7. لا حقول نصية إلزامية فارغة أو تحتوي مسافات فقط.
8. أي حقل "rating" يجب أن يكون رقماً بين 0 و 5.

كما راجع مشاكل الجودة والتحويل (CRO):
- هل النسخ مقنع ويخاطب العميل؟ هل يبرز السعر والخصم والتوصيل والدفع عند الاستلام؟
- هل الأقسام مترابطة ومتسقة معاً (نفس المنتج، نفس السعر، نفس الوعود)؟
- هل يوجد تكرار أو تناقض في الأسعار أو الضمانات؟
- هل الصفحة مكتملة (hero + checkout_form موجودان وممتلئان)؟

أخرج كائناً JSON:
- "pass": true فقط إذا لا توجد أي مشكلة حاجبة (blocking). أي مخالفة للقواعد 1-8 أعلاه تعتبر حاجبة.
- "summary": ملخص عربي للحكم.
- "issues": مصفوفة من {{ "sectionType"?: <نوع القسم>, "field": "...", "problem": "...", "suggestion": "..." }}.
  اذكر كل مشكلة وجدتها، مع اقتراح إصلاح محدد وقابل للتنفيذ بالعربية.`;

export const criticPrompt = ChatPromptTemplate.fromMessages([
  ["system", CRITIC_SYSTEM],
  [
    "human",
    `معلومات المنتج (JSON):
{productJson}

الملخص الإبداعي (JSON):
{briefJson}

الأقسام المُنشأة (JSON):
{sectionsJson}

أعد الآن تقييمك بصيغة JSON فقط (بدون أي نص إضافي).`,
  ],
]);
