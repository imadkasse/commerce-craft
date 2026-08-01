import { ShippingProvider, DispatchOrder, ProviderConfig, DispatchResult, TrackingResult, registerProvider } from "./index";

const YALIDIN: ShippingProvider = {
  id: "yalidin",
  name: "Yalidin",

  async dispatch(order: DispatchOrder, config: ProviderConfig): Promise<DispatchResult> {
    const isDemo = !config.apiKey;
    if (isDemo) {
      console.log(`[Yalidin Demo] Dispatching order ${order.orderNumber}`);
      return {
        success: true,
        trackingCode: `YAL-DEMO-${Date.now().toString(36).toUpperCase()}`,
        labelUrl: "#",
      };
    }

    try {
      const response = await fetch("https://api.yalidin.com/v1/shipments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": config.apiKey as string,
          "X-API-Secret": config.apiSecret || "",
        },
        body: JSON.stringify({
          reference: order.orderNumber,
          customer: { name: order.customerName, phone: order.customerPhone },
          address: { street: order.customerAddress, city: order.customerCity || "" },
          items: order.items.map((item) => ({ description: item.productName, quantity: item.quantity })),
          cod: order.total,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error: `Yalidin API error: ${error}` };
      }

      const data = await response.json();
      return {
        success: true,
        trackingCode: data.tracking_number,
        labelUrl: data.label_url,
      };
    } catch (error: any) {
      return { success: false, error: error.message || "Yalidin dispatch failed" };
    }
  },

  async getTracking(trackingCode: string, config: ProviderConfig): Promise<TrackingResult> {
    const isDemo = !config.apiKey;
    if (isDemo) {
      return { status: "in_transit", lastUpdate: new Date().toISOString() };
    }

    try {
      const response = await fetch(`https://api.yalidin.com/v1/tracking/${trackingCode}`, {
        headers: { "X-API-Key": config.apiKey || "" },
      });

      if (!response.ok) return { status: "unknown" };
      const data = await response.json();

      return {
        status: data.status === "delivered" ? "delivered" : data.status === "in_transit" ? "in_transit" : "pending",
        location: data.location,
        estimatedDelivery: data.estimated_delivery,
        lastUpdate: data.last_update,
        events: data.events?.map((e: any) => ({ date: e.date, description: e.description, location: e.location })),
      };
    } catch {
      return { status: "unknown" };
    }
  },
};

registerProvider(YALIDIN);
export default YALIDIN;
