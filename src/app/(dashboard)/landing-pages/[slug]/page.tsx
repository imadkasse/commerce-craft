import { requirePageActiveStore } from "@/lib/auth/guards";
import LandingPageEditorPageClient from "./landing-page-editor-client";

type LandingPageEditorPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getReturnPath(
  slug: string,
  searchParams: Record<string, string | string[] | undefined>,
) {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) {
      for (const item of value) query.append(key, item);
    } else if (value !== undefined) {
      query.append(key, value);
    }
  }

  const serializedQuery = query.toString();
  const pathname = `/landing-pages/${encodeURIComponent(slug)}`;
  return serializedQuery ? `${pathname}?${serializedQuery}` : pathname;
}

export default async function LandingPageEditorPage({
  params,
  searchParams,
}: LandingPageEditorPageProps) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  await requirePageActiveStore(getReturnPath(slug, query));

  return <LandingPageEditorPageClient />;
}
