import { requirePageAuth } from "@/lib/auth/guards";
import StoresPageClient from "./stores-client";

export default async function StoresPage() {
  await requirePageAuth("/stores");

  return <StoresPageClient />;
}
