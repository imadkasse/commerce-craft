import { requirePageAuth } from "@/lib/auth/guards";
import StoresSettingsPageClient from "./stores-settings-client";

export default async function StoresSettingsPage() {
  await requirePageAuth("/stores/settings");

  return <StoresSettingsPageClient />;
}
