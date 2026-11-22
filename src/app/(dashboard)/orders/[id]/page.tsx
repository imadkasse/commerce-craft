"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Package,
  Clock,
  Truck,
  CheckCircle,
  XCircle,
  MapPin,
  Phone,
  User,
  FileText,
  Hash,
  ShoppingCart,
  RefreshCw,
  Loader2,
} from "lucide-react";
import {
  STATUS_CONFIG,
  getStatusTransitions,
  ordersService,
  type Order,
} from "@/services/orders.service";
import { shippingService, type TrackingInfo } from "@/services/shipping.service";

const statusIcons = {
  clock: Clock,
  package: Package,
  truck: Truck,
  "check-circle": CheckCircle,
  "x-circle": XCircle,
};

const priceFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function OrderSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
      <Skeleton className="h-64 rounded-xl" />
      <Skeleton className="h-32 rounded-xl" />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = statusIcons[config.icon];
  return (
    <Badge
      variant={config.variant}
      className={`gap-1.5 px-3 py-1.5 text-sm ${config.color}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </Badge>
  );
}

function TrackingCard({
  order,
  trackingInfo,
  trackingError,
  trackingLoading,
  onRefresh,
}: {
  order: Order;
  trackingInfo: TrackingInfo | null;
  trackingError: string;
  trackingLoading: boolean;
  onRefresh: () => void;
}) {
  if (
    !order.trackingCode &&
    !order.shippingProvider &&
    order.status !== "shipped" &&
    order.status !== "delivered"
  ) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50">
            <Truck className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <CardTitle className="text-base">Tracking Information</CardTitle>
            <CardDescription>Shipping and delivery details</CardDescription>
          </div>
        </div>
        {(order.trackingCode || order.shippingProvider) && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={trackingLoading}
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${trackingLoading ? "animate-spin" : ""}`} />
            {trackingLoading ? "Loading..." : "Refresh"}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {order.trackingCode && (
            <div>
              <p className="text-xs text-gray-500">Tracking Code</p>
              <p className="text-sm font-medium text-gray-900">{order.trackingCode}</p>
            </div>
          )}
          {order.shippingProvider && (
            <div>
              <p className="text-xs text-gray-500">Shipping Provider</p>
              <p className="text-sm font-medium text-gray-900">{order.shippingProvider}</p>
            </div>
          )}
        </div>
        {trackingError && (
          <p className="mt-3 text-sm text-amber-600">{trackingError}</p>
        )}
        {trackingInfo && (
          <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Status:</span>
              <Badge variant={trackingInfo.status === "delivered" ? "default" : "secondary"}>
                {trackingInfo.status}
              </Badge>
            </div>
            {trackingInfo.estimatedDelivery && (
              <p className="text-sm text-gray-600">
                Estimated delivery: {trackingInfo.estimatedDelivery}
              </p>
            )}
            {trackingInfo.events && trackingInfo.events.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500">Tracking History</p>
                {trackingInfo.events.map((event) => (
                  <div key={`${event.date}-${event.description}`} className="flex items-start gap-3 text-sm">
                    <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-400" />
                    <div>
                      <p className="text-gray-900">{event.description}</p>
                      <p className="text-xs text-gray-500">{event.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function NotesCard({ notes }: { notes: string }) {
  if (!notes) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3 pb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50">
          <FileText className="h-5 w-5 text-indigo-600" />
        </div>
        <div>
          <CardTitle className="text-base">Notes</CardTitle>
          <CardDescription>Additional order information</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <p className="whitespace-pre-wrap text-sm text-gray-700">{notes}</p>
      </CardContent>
    </Card>
  );
}

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [providers, setProviders] = useState<Array<{ id: string; name: string; isDemo: boolean }>>([]);
  const [selectedProvider, setSelectedProvider] = useState("");
  const [dispatchLoading, setDispatchLoading] = useState(false);
  const [dispatchError, setDispatchError] = useState("");
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingInfo, setTrackingInfo] = useState<TrackingInfo | null>(null);
  const [trackingError, setTrackingError] = useState("");

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError("");
    ordersService
      .get(id)
      .then((data) => {
        setOrder(data.order);
      })
      .catch(() => {
        setError("Failed to fetch order");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    shippingService
      .getProviderList()
      .then((list) => {
        setProviders(list);
        if (list.length > 0) setSelectedProvider(list[0].id);
      })
      .catch(() => {});
  }, [order?.id]);

  const updateStatus = async (newStatus: string) => {
    setUpdating(true);
    setUpdateError("");
    setSuccessMessage("");
    try {
      const data = await ordersService.updateStatus(id, newStatus);
      setOrder(data.order);
      setSuccessMessage(`Order status updated to ${newStatus}`);
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err: any) {
      setUpdateError(err.message);
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
        setOrder(refreshed.order);
      }
      setSuccessMessage("Order dispatched successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err: any) {
      setDispatchError(err.message);
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
    } catch (err: any) {
      setTrackingError(err.message);
    } finally {
      setTrackingLoading(false);
    }
  };

  if (loading) return <OrderSkeleton />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <XCircle className="mb-4 h-12 w-12 text-red-400" />
        <h2 className="mb-2 text-lg font-semibold text-gray-900">
          Failed to load order
        </h2>
        <p className="mb-6 text-sm text-gray-500">{error}</p>
        <Button variant="outline" onClick={() => router.push("/orders")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Orders
        </Button>
      </div>
    );
  }

  if (!order) return null;

  const transitions = getStatusTransitions(order.status);
  const statusInfo = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  const StatusIcon = statusIcons[statusInfo.icon];

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatPrice = (price: number | string) => {
    return priceFormatter.format(Number(price));
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

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/orders"
            className="inline-flex items-center justify-center h-9 w-9 rounded-md border border-gray-300 bg-white shadow-sm hover:bg-gray-50 text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-950">
                {order.orderNumber}
              </h1>
              <StatusBadge status={order.status} />
            </div>
            <p className="mt-0.5 text-sm text-gray-500">
              Order details and management
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center gap-3 pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50">
              <User className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <CardTitle className="text-base">Customer Information</CardTitle>
              <CardDescription>Contact and shipping details</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <User className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {order.customerName}
                </p>
                <p className="text-xs text-gray-500">Customer name</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {order.customerPhone}
                </p>
                <p className="text-xs text-gray-500">Phone number</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {order.customerAddress}
                </p>
                <p className="text-xs text-gray-500">Address</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {order.customerCity}
                </p>
                <p className="text-xs text-gray-500">City</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-3 pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50">
              <ShoppingCart className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <CardTitle className="text-base">Order Summary</CardTitle>
              <CardDescription>Pricing and timeline</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Hash className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  #{order.id.slice(0, 8).toUpperCase()}
                </p>
                <p className="text-xs text-gray-500">Order ID</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {formatDate(order.createdAt)}
                </p>
                <p className="text-xs text-gray-500">Created</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {formatDate(order.updatedAt)}
                </p>
                <p className="text-xs text-gray-500">Last updated</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <StatusIcon
                className={`mt-0.5 h-4 w-4 shrink-0 ${statusInfo.color.split(" ")[0]}`}
              />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {statusInfo.label}
                </p>
                <p className="text-xs text-gray-500">Current status</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Package className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
              <div>
                <p className="text-lg font-bold text-gray-950">
                  {formatPrice(order.total)}
                </p>
                <p className="text-xs text-gray-500">Total amount</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Order Items</CardTitle>
          <CardDescription>
            {order.items.length} item{order.items.length !== 1 ? "s" : ""} in
            this order
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-6">Product</TableHead>
                <TableHead>Color</TableHead>
                <TableHead>Size</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="px-6">
                    <div className="flex items-center gap-3">
                      {item.productImage ? (
                        <div className="h-12 w-12 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                          <img
                            src={item.productImage}
                            alt={item.productName}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-gray-200 bg-gray-50">
                          <Package className="h-5 w-5 text-gray-400" />
                        </div>
                      )}
                      <span className="font-medium text-gray-900">
                        {item.productName}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-600">
                    {item.color || "—"}
                  </TableCell>
                  <TableCell className="text-gray-600">
                    {item.size || "—"}
                  </TableCell>
                  <TableCell className="text-right text-gray-900">
                    {item.quantity}
                  </TableCell>
                  <TableCell className="text-right text-gray-600">
                    {formatPrice(item.unitPrice)}
                  </TableCell>
                  <TableCell className="text-right font-medium text-gray-900">
                    {formatPrice(item.totalPrice)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex items-center justify-end border-t border-gray-200 px-6 py-4">
            <div className="flex items-center gap-8">
              <span className="text-sm text-gray-500">Subtotal</span>
              <span className="text-base font-semibold text-gray-950">
                {formatPrice(order.total)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <TrackingCard
        order={order}
        trackingInfo={trackingInfo}
        trackingError={trackingError}
        trackingLoading={trackingLoading}
        onRefresh={refreshTracking}
      />

      <NotesCard notes={order.notes ?? ""} />

      <Card>
        <CardHeader className="flex flex-row items-center gap-3 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50">
            <Package className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <CardTitle className="text-base">Order Actions</CardTitle>
            <CardDescription>Update order status</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {order.status === "confirmed" ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700">Generate shipping label & dispatch order</p>
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="dispatch-provider">Shipping Provider</Label>
                  <Select
                    id="dispatch-provider"
                    value={selectedProvider}
                    onChange={(e) => setSelectedProvider(e.target.value)}
                    className="w-56"
                  >
                    {providers.length === 0 && <option value="">No providers configured</option>}
                    {providers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}{p.isDemo ? " (Demo)" : ""}
                      </option>
                    ))}
                  </Select>
                </div>
                <Button
                  onClick={handleDispatch}
                  disabled={dispatchLoading || providers.length === 0 || !selectedProvider}
                >
                  {dispatchLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Dispatching...
                    </>
                  ) : (
                    <>
                      <Truck className="mr-2 h-4 w-4" />
                      Generate Label & Dispatch
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => updateStatus("shipped")}
                  disabled={updating}
                >
                  {updating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Mark as Shipped (without label)"
                  )}
                </Button>
              </div>
              {dispatchError && (
                <p className="text-sm text-red-600">{dispatchError}</p>
              )}
            </div>
          ) : transitions.length === 0 ? (
            <p className="text-sm text-gray-500">
              This order is in its final state. No further actions available.
            </p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {transitions.map((transition) => (
                <Button
                  key={transition.status}
                  variant={transition.variant}
                  onClick={() => updateStatus(transition.status)}
                  disabled={updating}
                >
                  {updating ? (
                    <>
                      <svg
                        className="-ml-1 mr-2 h-4 w-4 animate-spin"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      Updating...
                    </>
                  ) : (
                    transition.label
                  )}
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
