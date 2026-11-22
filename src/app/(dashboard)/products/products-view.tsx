"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  useDialogContext,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductForm } from "@/components/products/product-form";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  PackageOpen,
} from "lucide-react";
import { productsService } from "@/services/products.service";
import type {
  Product,
  ProductPayload,
  ColorWithSizes,
} from "@/services/products.service";

function AddProductDialog({ onCreated }: { onCreated: () => void }) {
  const { setOpen } = useDialogContext();
  const [dialogKey, setDialogKey] = useState(0);

  const handleCreate = async (data: {
    product: ProductPayload;
    colors: ColorWithSizes[];
  }) => {
    await productsService.createProductWithVariants(data);
  };

  const handleCreated = () => {
    setOpen(false);
    setDialogKey((key) => key + 1);
    toast.success("Product created");
    onCreated();
  };

  return (
    <>
      <DialogTrigger className={buttonVariants()}>
        <Plus className="h-4 w-4" />
        Add Product
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Add Product</DialogTitle>
        </DialogHeader>
        <ProductForm
          key={dialogKey}
          onSubmit={handleCreate}
          onSuccess={handleCreated}
        />
      </DialogContent>
    </>
  );
}

export interface ProductsViewProps {
  initial: {
    items: Product[];
    total: number;
    page: number;
    limit: number;
  };
}

export function ProductsView({ initial }: ProductsViewProps) {
  const [products, setProducts] = useState<Product[]>(initial.items);
  const [total, setTotal] = useState(initial.total);
  const [page, setPage] = useState(initial.page);
  const [limit] = useState(initial.limit);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const didMount = useRef(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await productsService.list({
        page,
        limit,
        type: typeFilter !== "all" ? typeFilter : undefined,
        search: search || undefined,
      });
      setProducts(data.items);
      setTotal(data.total);
    } catch {
      console.error("Failed to fetch products");
    } finally {
      setLoading(false);
    }
  }, [page, limit, typeFilter, search]);

  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    fetchProducts();
  }, [fetchProducts]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await productsService.remove(id);
      fetchProducts();
    } catch {
      console.error("Failed to delete product");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      setPage(1);
      fetchProducts();
    }
  };

  const totalPages = Math.ceil(total / limit);
  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-950">Products</h1>
          <p className="text-gray-500">Manage your product catalog</p>
        </div>
        <Dialog>
          <AddProductDialog onCreated={fetchProducts} />
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <Tabs defaultValue="all" value={typeFilter} onValueChange={setTypeFilter}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="CLOTHING">Clothing</TabsTrigger>
            <TabsTrigger value="GENERAL">General</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative ml-auto w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search products..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearchKeyDown}
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-4 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <PackageOpen className="mb-4 h-12 w-12 text-gray-300" />
              <p className="text-lg font-medium text-gray-950">
                No products found
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {search
                  ? "Try a different search term"
                  : "Get started by creating your first product"}
              </p>
              {!search && (
                <div className="mt-4">
                  <Dialog>
                    <AddProductDialog onCreated={fetchProducts} />
                  </Dialog>
                </div>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Image</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      {product.images?.[0] ? (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="h-10 w-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                          <PackageOpen className="h-5 w-5 text-gray-400" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium text-gray-950">
                      {product.name}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          product.type === "CLOTHING" ? "default" : "secondary"
                        }
                      >
                        {product.type === "CLOTHING" ? "Clothing" : "General"}
                      </Badge>
                    </TableCell>
                    <TableCell>${product.price}</TableCell>
                    <TableCell>
                      {product.type === "CLOTHING"
                        ? `${product.stockQuantity} (varied)`
                        : product.stockQuantity}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={product.isActive ? "default" : "destructive"}
                      >
                        {product.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {formatDate(product.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Link href={`/products/${product.id}/edit`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Dialog>
                          <DialogTrigger>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Delete Product</DialogTitle>
                              <DialogDescription>
                                Are you sure you want to delete &quot;{product.name}&quot;?
                                This action cannot be undone.
                              </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                              <DialogClose>
                                <Button variant="outline">Cancel</Button>
                              </DialogClose>
                              <DialogClose>
                                <Button
                                  variant="destructive"
                                  disabled={deletingId === product.id}
                                  onClick={() => handleDelete(product.id)}
                                >
                                  {deletingId === product.id
                                    ? "Deleting..."
                                    : "Delete"}
                                </Button>
                              </DialogClose>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Page {page} of {totalPages} ({total} products)
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
