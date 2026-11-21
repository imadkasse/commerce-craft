"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ShoppingCart,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  Package,
  Clock,
  Truck,
  CheckCircle,
  XCircle,
  Filter,
} from "lucide-react";
import { ordersService, type Order, type OrderStats } from "@/services/orders.service";

const statusVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  pending: "outline",
  confirmed: "secondary",
  shipped: "default",
  delivered: "default",
  cancelled: "destructive",
};

const tabs = [
  { label: "All", value: "", icon: Package },
  { label: "Pending", value: "pending", icon: Clock },
  { label: "Confirmed", value: "confirmed", icon: Package },
  { label: "Shipped", value: "shipped", icon: Truck },
  { label: "Delivered", value: "delivered", icon: CheckCircle },
  { label: "Cancelled", value: "cancelled", icon: XCircle },
];

const statCards = [
  { label: "Total Orders", key: "total" as const, icon: ShoppingCart, color: "text-blue-600" },
  { label: "Pending", key: "pending" as const, icon: Clock, color: "text-yellow-600" },
  { label: "Confirmed", key: "confirmed" as const, icon: Package, color: "text-indigo-600" },
  { label: "Shipped", key: "shipped" as const, icon: Truck, color: "text-cyan-600" },
  { label: "Delivered", key: "delivered" as const, icon: CheckCircle, color: "text-green-600" },
  { label: "Cancelled", key: "cancelled" as const, icon: XCircle, color: "text-red-600" },
];

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<OrderStats>({
    total: 0,
    pending: 0,
    confirmed: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
  });

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await ordersService.list({
        status: statusFilter,
        search,
        dateFrom,
        dateTo,
        page,
        limit,
      });
      setOrders(data.orders || []);
      setTotal(data.total || 0);
    } catch {
      console.error("Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, dateFrom, dateTo, page, limit]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    async function fetchStats() {
      try {
        setStats(await ordersService.getStats());
      } catch {
        console.error("Failed to fetch stats");
      }
    }
    fetchStats();
  }, []);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      setPage(1);
      fetchOrders();
    }
  };

  const totalPages = Math.ceil(total / limit);

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const formatPrice = (price: string) => {
    const num = parseFloat(price);
    return isNaN(num) ? price : `$${num.toFixed(2)}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-950">Orders</h1>
          <p className="text-gray-500">Track and manage customer orders</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/orders/sheets-config">
            <Button variant="outline" size="sm">
              <Table className="h-4 w-4" />
              Sheets Settings
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        {statCards.map((stat) => (
          <Card key={stat.key}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className={stat.color}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-xl font-bold text-gray-950">{stats[stat.key]}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-lg border bg-white p-1">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
                setStatusFilter(tab.value);
                setPage(1);
              }}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                statusFilter === tab.value
                  ? "bg-gray-950 text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-950"
              }`}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-1 items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search orders..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="w-40"
            />
            <span className="text-gray-400">-</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="w-40"
            />
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-4 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ShoppingCart className="mb-4 h-12 w-12 text-gray-300" />
              <p className="text-lg font-medium text-gray-950">No orders found</p>
              <p className="mt-1 text-sm text-gray-500">
                {search
                  ? "Try a different search term"
                  : "Orders will appear here once customers start purchasing"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order Number</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => {
                  const variant = statusVariant[order.status] || "outline";
                  return (
                    <TableRow
                      key={order.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/orders/${order.id}`)}
                    >
                      <TableCell className="font-mono text-sm font-medium text-gray-950">
                        {order.orderNumber}
                      </TableCell>
                      <TableCell className="text-gray-950">{order.customerName}</TableCell>
                      <TableCell className="text-gray-600">{order.customerPhone}</TableCell>
                      <TableCell className="font-medium text-gray-950">
                        {formatPrice(order.total)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={variant}>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-500">
                        {formatDate(order.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Link href={`/orders/${order.id}`}>
                          <Button variant="ghost" size="sm" className="h-8">
                            View
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Page {page} of {totalPages} ({total} orders)
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
