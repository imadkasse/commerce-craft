"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
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
  useDialogContext,
} from "@/components/ui/dialog";
import {
  FileText,
  Search,
  Globe,
  GlobeOff,
  Trash2,
  ExternalLink,
  Loader2,
  Sparkles,
  Layout,
} from "lucide-react";
import {
  landingPagesService,
  type LandingPageListItem as LandingPage,
  type Product,
} from "@/services/landing-pages.service";

// ── Inner component that can close the dialog after generation ──
function GenerateButton({
  selectedProductId,
  generating,
  onGenerate,
}: {
  selectedProductId: string;
  generating: boolean;
  onGenerate: () => Promise<void>;
}) {
  const { setOpen } = useDialogContext();

  const handleClick = async () => {
    if (!selectedProductId || generating) return;
    await onGenerate();
    setOpen(false);
  };

  return (
    <Button onClick={handleClick} disabled={!selectedProductId || generating}>
      {generating ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <Sparkles className="h-4 w-4" />
          Generate with AI
        </>
      )}
    </Button>
  );
}

// ── Shared dialog content for the "Generate" flow ──
function GenerateDialogContent({
  products,
  productsLoading,
  selectedProductId,
  marketingAnglesInput,
  generating,
  onSelectProduct,
  onMarketingAnglesChange,
  onGenerate,
}: {
  products: Product[];
  productsLoading: boolean;
  selectedProductId: string;
  marketingAnglesInput: string;
  generating: boolean;
  onSelectProduct: (id: string) => void;
  onMarketingAnglesChange: (val: string) => void;
  onGenerate: () => Promise<void>;
}) {
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Generate Landing Page</DialogTitle>
        <DialogDescription>
          Select a product and add your marketing angles to generate an AI-powered landing page.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        {productsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : products.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-500">
            No products available. Create a product first.
          </p>
        ) : (
          <div className="space-y-2">
            {products.map((product) => (
              <button
                key={product.id}
                onClick={() => onSelectProduct(product.id)}
                className={`w-full rounded-lg border p-3 text-left transition-colors hover:bg-gray-50 ${
                  selectedProductId === product.id
                    ? "border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500"
                    : "border-gray-200"
                }`}
              >
                <p className="font-medium text-gray-950">{product.name}</p>
                <p className="text-sm text-gray-500">
                  ${product.price} — {product.type}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedProductId && (
        <div>
          <label
            htmlFor="marketing-angles"
            className="mb-1.5 block text-sm font-medium text-gray-700"
          >
            Marketing Angles / Highlights
          </label>
          <textarea
            id="marketing-angles"
            value={marketingAnglesInput}
            onChange={(e) => onMarketingAnglesChange(e.target.value)}
            placeholder={"Highlight key selling points, one per line..."}
            className="min-h-[120px] w-full resize-y rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <p className="mt-1 text-xs text-gray-400">
            Each line becomes a marketing angle the AI uses. Leave empty for defaults.
          </p>
        </div>
      )}

      <DialogFooter>
        <DialogClose className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 shadow-sm hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2">
          Cancel
        </DialogClose>
        <GenerateButton
          selectedProductId={selectedProductId}
          generating={generating}
          onGenerate={onGenerate}
        />
      </DialogFooter>
    </DialogContent>
  );
}

function StatsCard({
  icon,
  iconClassName,
  label,
  value,
}: {
  icon: React.ReactNode;
  iconClassName: string;
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={iconClassName}>{icon}</div>
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-xl font-bold text-gray-950">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function LandingPagesPage() {
  const [pages, setPages] = useState<LandingPage[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [marketingAnglesInput, setMarketingAnglesInput] = useState<string>("");
  const [generating, setGenerating] = useState(false);

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [search]);

  const fetchLandingPages = useCallback(async () => {
    setLoading(true);
    try {
      const data = await landingPagesService.list({
        page,
        limit,
        search: debouncedSearch,
      });
      setPages(data.landingPages);
      setTotal(data.total);
    } catch {
      toast.error("Failed to load landing pages");
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch]);

  useEffect(() => {
    fetchLandingPages();
  }, [fetchLandingPages]);

  const fetchProducts = useCallback(async () => {
    setSelectedProductId("");
    setMarketingAnglesInput("");
    setProductsLoading(true);
    try {
      const available = await landingPagesService.listAvailableProducts(pages);
      setProducts(available);
    } catch {
      toast.error("Failed to load products");
    } finally {
      setProductsLoading(false);
    }
  }, [pages]);

  const handleGenerate = async () => {
    if (!selectedProductId) return;
    setGenerating(true);
    const toastId = toast.loading("Generating landing page...");

    try {
      await landingPagesService.generate({
        productId: selectedProductId,
        marketingAngles: marketingAnglesInput,
      });
      toast.success("Landing page generated successfully!", { id: toastId });
      fetchLandingPages();
    } catch (err: any) {
      toast.error(err.message || "Failed to generate landing page", {
        id: toastId,
      });
      return Promise.reject(err);
    } finally {
      setGenerating(false);
    }
  };

  const handlePublishToggle = async (lp: LandingPage) => {
    setPublishingId(lp.id);
    const newStatus = lp.status === "published" ? "draft" : "published";
    try {
      if (newStatus === "published") {
        await landingPagesService.publish(lp.id);
      } else {
        await landingPagesService.unpublish(lp.id);
      }
      setPages((prev) =>
        prev.map((p) => (p.id === lp.id ? { ...p, status: newStatus } : p))
      );
      toast.success(
        newStatus === "published"
          ? "Landing page published!"
          : "Landing page unpublished."
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    } finally {
      setPublishingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await landingPagesService.remove(id);
      toast.success("Landing page deleted");
      fetchLandingPages();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  const totalPages = Math.ceil(total / limit);
  const publishedCount = pages.filter((p) => p.status === "published").length;
  const draftCount = pages.filter((p) => p.status === "draft").length;

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-950">Landing Pages</h1>
          <p className="text-gray-500">
            AI-generated landing pages for your products
          </p>
        </div>
        <Dialog>
          <DialogTrigger
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            onClick={fetchProducts}
          >
            <Sparkles className="h-4 w-4" />
            Generate New Page
          </DialogTrigger>
          <GenerateDialogContent
            products={products}
            productsLoading={productsLoading}
            selectedProductId={selectedProductId}
            marketingAnglesInput={marketingAnglesInput}
            generating={generating}
            onSelectProduct={setSelectedProductId}
            onMarketingAnglesChange={setMarketingAnglesInput}
            onGenerate={handleGenerate}
          />
        </Dialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatsCard
          icon={<Layout className="h-5 w-5" />}
          iconClassName="text-indigo-600"
          label="Total Pages"
          value={total}
        />
        <StatsCard
          icon={<Globe className="h-5 w-5" />}
          iconClassName="text-green-600"
          label="Published"
          value={publishedCount}
        />
        <StatsCard
          icon={<FileText className="h-5 w-5" />}
          iconClassName="text-gray-400"
          label="Drafts"
          value={draftCount}
        />
      </div>

      <div className="relative w-72">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Search landing pages..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-4 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-24" />
                </div>
              ))}
            </div>
          ) : pages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Layout className="mb-4 h-12 w-12 text-gray-300" />
              <p className="text-lg font-medium text-gray-950">
                {debouncedSearch
                  ? "No landing pages found"
                  : "No landing pages yet"}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {debouncedSearch
                  ? "Try a different search term"
                  : "Generate your first AI-powered landing page to get started"}
              </p>
              {!debouncedSearch && (
                <Dialog>
                  <DialogTrigger
                    className="mt-4 inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                    onClick={fetchProducts}
                  >
                    <Sparkles className="h-4 w-4" />
                    Generate New Page
                  </DialogTrigger>
                  <GenerateDialogContent
                    products={products}
                    productsLoading={productsLoading}
                    selectedProductId={selectedProductId}
                    marketingAnglesInput={marketingAnglesInput}
                    generating={generating}
                    onSelectProduct={setSelectedProductId}
                    onMarketingAnglesChange={setMarketingAnglesInput}
                    onGenerate={handleGenerate}
                  />
                </Dialog>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-48">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pages.map((lp) => (
                  <TableRow key={lp.id}>
                    <TableCell className="font-medium text-gray-950">
                      {lp.title}
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {lp.productName || "\u2014"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          lp.status === "published" ? "default" : "secondary"
                        }
                      >
                        {lp.status === "published" ? "Published" : "Draft"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {formatDate(lp.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Link
                          href={`/landing-pages/${lp.slug}?id=${lp.id}`}
                        >
                          <Button variant="ghost" size="sm" className="h-8">
                            <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                            Edit
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8"
                          disabled={publishingId === lp.id}
                          onClick={() => handlePublishToggle(lp)}
                        >
                          {publishingId === lp.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : lp.status === "published" ? (
                            <GlobeOff className="h-3.5 w-3.5" />
                          ) : (
                            <Globe className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <Dialog>
                          <DialogTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium text-red-500 transition-colors hover:bg-gray-100 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2">
                            <Trash2 className="h-3.5 w-3.5" />
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Delete Landing Page</DialogTitle>
                              <DialogDescription>
                                Are you sure you want to delete &quot;
                                {lp.title}&quot;? This action cannot be undone.
                              </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                              <DialogClose className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 shadow-sm hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2">
                                Cancel
                              </DialogClose>
                              <DialogClose>
                                <Button
                                  variant="destructive"
                                  disabled={deletingId === lp.id}
                                  onClick={() => handleDelete(lp.id)}
                                >
                                  {deletingId === lp.id
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
            Page {page} of {totalPages} ({total} pages)
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
