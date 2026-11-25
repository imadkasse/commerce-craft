import { requirePageActiveStore } from "@/lib/auth/guards";
import TeamPageClient from "./team-client";

export default async function TeamPage() {
  await requirePageActiveStore("/team");

  return <TeamPageClient />;
}
