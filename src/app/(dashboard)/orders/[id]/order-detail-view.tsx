"use client";

import { useState } from "react";
import { CheckCircle, XCircle } from "lucide-react";
import {
  ordersService,
  type Order,
} from "@/services/orders.service";
import { shippingService, type TrackingInfo } from "@/services/shipping.service";
import type { ShippingProvider } from "@/services/shipping.service";
import {
  CustomerInfoCard,
  NotesCard,
  OrderActionsCard,
  OrderHeader,
  OrderItemsCard,
  OrderSummaryCard,
  TrackingCard,
} from "./order-detail-parts";

function getErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

export interface OrderDetailViewProps {
  order: Order;
  providers: ShippingProvider[];
}

export function OrderDetailView({ order: initialOrder, providers: initialProviders }: OrderDetailViewProps) {
  const [order, setOrder] = useState<Order>(initialOrder);
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [providers] = useState<ShippingProvider[]>(initialProviders);
  const [selectedProvider, setSelectedProvider] = useState(
    initialProviders[0]?.id ?? "",
  );
  const [dispatchLoading, setDispatchLoading] = useState(false);
  const [dispatchError, setDispatchError] = useState("");
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingInfo, setTrackingInfo] = useState<TrackingInfo | null>(null);
  const [trackingError, setTrackingError] = useState("");

  const id = order.id;

  const updateStatus = async (newStatus: string) => {
    setUpdating(true);
    setUpdateError("");
    setSuccessMessage("");
    try {
      const data = await ordersService.updateStatus(id, newStatus);
      // Merge (not replace) so a partial payload never drops `items`.
      setOrder((prev) => (prev ? { ...prev, ...data.order } : data.order));
      setSuccessMessage(`Order status updated to ${newStatus}`);
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setUpdateError(getErrorMessage(err, "Failed to update status"));
    } finally {
      setUpdating(false);
    }
  };

  const handleDispatch = async () => {
    if (!selectedProvider) return;
    setDispatchLoading(true);
    setDispatchError("");
    try {
      await shippingService.dispatch(id, selectedProvider);
      // A non-2xx refresh yields null (ignored); a network error rethrows.
      const refreshed = await ordersService.getQuietly(id);
      if (refreshed) {
        setOrder((prev) => (prev ? { ...prev, ...refreshed.order } : refreshed.order));
      }
      setSuccessMessage("Order dispatched successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setDispatchError(getErrorMessage(err, "Dispatch failed"));
    } finally {
      setDispatchLoading(false);
    }
  };

  const refreshTracking = async () => {
    setTrackingLoading(true);
    setTrackingError("");
    setTrackingInfo(null);
    try {
      const data = await shippingService.getTracking(id);
      setTrackingInfo(data.tracking);
    } catch (err) {
      setTrackingError(getErrorMessage(err, "Failed to fetch tracking"));
    } finally {
      setTrackingLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {successMessage && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          <CheckCircle className="h-4 w-4" />
          {successMessage}
        </div>
      )}
      {updateError && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <XCircle className="h-4 w-4" />
          {updateError}
        </div>
      )}

      <OrderHeader order={order} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CustomerInfoCard order={order} />
        <OrderSummaryCard order={order} />
      </div>

      <OrderItemsCard order={order} />

      <TrackingCard
        order={order}
        trackingInfo={trackingInfo}
        trackingError={trackingError}
        trackingLoading={trackingLoading}
        onRefresh={refreshTracking}
      />

      <NotesCard notes={order.notes ?? ""} />

      <OrderActionsCard
        order={order}
        providers={providers}
        selectedProvider={selectedProvider}
        dispatchLoading={dispatchLoading}
        dispatchError={dispatchError}
        updating={updating}
        onProviderChange={setSelectedProvider}
        onDispatch={handleDispatch}
        onUpdateStatus={updateStatus}
      />
    </div>
  );
}
