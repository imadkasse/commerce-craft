import { requirePageActiveStore } from "@/lib/auth/guards";
import { getSheetsConfigForStore } from "@/lib/server/sheets";
import { SheetsConfigView } from "./sheets-config-view";

export default async function SheetsConfigPage() {
  const access = await requirePageActiveStore("/orders/sheets-config");
  const config = await getSheetsConfigForStore(access.store.id);
  return <SheetsConfigView config={config} />;
}
