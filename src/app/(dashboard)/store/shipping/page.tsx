import { requirePageActiveStore } from "@/lib/auth/guards";
import ShippingPageClient from "./shipping-client";

export default async function ShippingPage() {
  await requirePageActiveStore("/store/shipping");

  return <ShippingPageClient />;
}
