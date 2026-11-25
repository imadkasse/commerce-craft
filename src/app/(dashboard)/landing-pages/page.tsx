import { requirePageActiveStore } from "@/lib/auth/guards";
import LandingPagesPageClient from "./landing-pages-client";

export default async function LandingPagesPage() {
  await requirePageActiveStore("/landing-pages");

  return <LandingPagesPageClient />;
}
