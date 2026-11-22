import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getSheetsConfigForStore } from "@/lib/server/sheets";
import { SheetsConfigView } from "./sheets-config-view";

export default async function SheetsConfigPage() {
  const session = await getSession();
  if (!session?.storeId) redirect("/login");
  const config = await getSheetsConfigForStore(session.storeId);
  return <SheetsConfigView config={config} />;
}
