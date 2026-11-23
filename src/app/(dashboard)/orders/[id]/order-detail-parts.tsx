import type { ComponentType } from "react";
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
  type Order,
} from "@/services/orders.service";
import type { TrackingInfo, ShippingProvider } from "@/services/shipping.service";

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

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

function formatPrice(price: number | string) {
  return priceFormatter.format(Number(price));
}

export function OrderStatusBadge({ status }: { status: string }) {
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

export function OrderHeader({ order }: { order: Order }) {
  return (
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
            <OrderStatusBadge status={order.status} />
          </div>
          <p className="mt-0.5 text-sm text-gray-500">
            Order details and management
          </p>
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  iconClassName,
  value,
  valueClassName,
  label,
}: {
  icon: ComponentType<{ className?: string }>;
  iconClassName?: string;
  value: string;
  valueClassName?: string;
  label: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className={iconClassName ?? "mt-0.5 h-4 w-4 shrink-0 text-gray-400"} />
      <div>
        <p className={valueClassName ?? "text-sm font-medium text-gray-900"}>
          {value}
        </p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  );
}

export function CustomerInfoCard({ order }: { order: Order }) {
  return (
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
        <DetailRow icon={User} value={order.customerName} label="Customer name" />
        <DetailRow icon={Phone} value={order.customerPhone} label="Phone number" />
        <DetailRow icon={MapPin} value={order.customerAddress} label="Address" />
        <DetailRow icon={MapPin} value={order.customerCity} label="City" />
      </CardContent>
    </Card>
  );
}

export function OrderSummaryCard({ order }: { order: Order }) {
  const statusInfo = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  const StatusIcon = statusIcons[statusInfo.icon];

  return (
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
        <DetailRow
          icon={Hash}
          value={`#${order.id.slice(0, 8).toUpperCase()}`}
          label="Order ID"
        />
        <DetailRow icon={Clock} value={formatDate(order.createdAt)} label="Created" />
        <DetailRow
          icon={Clock}
          value={formatDate(order.updatedAt)}
          label="Last updated"
        />
        <DetailRow
          icon={StatusIcon}
          iconClassName={`mt-0.5 h-4 w-4 shrink-0 ${statusInfo.color.split(" ")[0]}`}
          value={statusInfo.label}
          label="Current status"
        />
        <DetailRow
          icon={Package}
          value={formatPrice(order.total)}
          valueClassName="text-lg font-bold text-gray-950"
          label="Total amount"
        />
      </CardContent>
    </Card>
  );
}

function OrderItemRow({ item }: { item: Order["items"][number] }) {
  return (
    <TableRow>
      <TableCell className="px-6">
        <div className="flex items-center gap-3">
          {item.productImage ? (
            <div className="h-12 w-12 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
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
  );
}

export function OrderItemsCard({ order }: { order: Order }) {
  return (
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
              <OrderItemRow key={item.id} item={item} />
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
  );
}

function hasTrackingInfo(order: Order) {
  return Boolean(
    order.trackingCode ||
      order.shippingProvider ||
      order.status === "shipped" ||
      order.status === "delivered",
  );
}

function TrackingHistory({ trackingInfo }: { trackingInfo: TrackingInfo }) {
  return (
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
  );
}

export function TrackingCard({
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
  if (!hasTrackingInfo(order)) {
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
        {trackingInfo && <TrackingHistory trackingInfo={trackingInfo} />}
      </CardContent>
    </Card>
  );
}

export function NotesCard({ notes }: { notes: string }) {
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

function DispatchPanel({
  providers,
  selectedProvider,
  dispatchLoading,
  dispatchError,
  updating,
  onProviderChange,
  onDispatch,
  onUpdateStatus,
}: {
  providers: ShippingProvider[];
  selectedProvider: string;
  dispatchLoading: boolean;
  dispatchError: string;
  updating: boolean;
  onProviderChange: (value: string) => void;
  onDispatch: () => void;
  onUpdateStatus: (status: string) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-gray-700">Generate shipping label & dispatch order</p>
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="dispatch-provider">Shipping Provider</Label>
          <Select
            id="dispatch-provider"
            value={selectedProvider}
            onChange={(e) => onProviderChange(e.target.value)}
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
          onClick={onDispatch}
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
          onClick={() => onUpdateStatus("shipped")}
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
  );
}

function StatusTransitionList({
  status,
  updating,
  onUpdateStatus,
}: {
  status: string;
  updating: boolean;
  onUpdateStatus: (status: string) => void;
}) {
  const transitions = getStatusTransitions(status);

  if (transitions.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        This order is in its final state. No further actions available.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-3">
      {transitions.map((transition) => (
        <Button
          key={transition.status}
          variant={transition.variant}
          onClick={() => onUpdateStatus(transition.status)}
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
  );
}

export function OrderActionsCard({
  order,
  providers,
  selectedProvider,
  dispatchLoading,
  dispatchError,
  updating,
  onProviderChange,
  onDispatch,
  onUpdateStatus,
}: {
  order: Order;
  providers: ShippingProvider[];
  selectedProvider: string;
  dispatchLoading: boolean;
  dispatchError: string;
  updating: boolean;
  onProviderChange: (value: string) => void;
  onDispatch: () => void;
  onUpdateStatus: (status: string) => void;
}) {
  return (
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
          <DispatchPanel
            providers={providers}
            selectedProvider={selectedProvider}
            dispatchLoading={dispatchLoading}
            dispatchError={dispatchError}
            updating={updating}
            onProviderChange={onProviderChange}
            onDispatch={onDispatch}
            onUpdateStatus={onUpdateStatus}
          />
        ) : (
          <StatusTransitionList
            status={order.status}
            updating={updating}
            onUpdateStatus={onUpdateStatus}
          />
        )}
      </CardContent>
    </Card>
  );
}
