"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
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
  Globe,
  GlobeOff,
  Trash2,
  ExternalLink,
  Loader2,
  Sparkles,
  Layout,
} from "lucide-react";
import type {
  LandingPageListItem as LandingPage,
  Product,
} from "@/services/landing-pages.service";

const GENERATE_TRIGGER_CLASS =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2";

const GENERATE_EMPTY_TRIGGER_CLASS =
  "mt-4 inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2";

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

export function GenerateLandingPageDialog({
  variant = "default",
  onOpen,
  products,
  productsLoading,
  selectedProductId,
  marketingAnglesInput,
  generating,
  onSelectProduct,
  onMarketingAnglesChange,
  onGenerate,
}: {
  variant?: "default" | "empty";
  onOpen: () => void;
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
    <Dialog>
      <DialogTrigger
        className={
          variant === "empty"
            ? GENERATE_EMPTY_TRIGGER_CLASS
            : GENERATE_TRIGGER_CLASS
        }
        onClick={onOpen}
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
        onSelectProduct={onSelectProduct}
        onMarketingAnglesChange={onMarketingAnglesChange}
        onGenerate={onGenerate}
      />
    </Dialog>
  );
}

export function StatsCard({
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

function LandingPageRowActions({
  landingPage,
  deletingId,
  publishingId,
  onPublishToggle,
  onDelete,
}: {
  landingPage: LandingPage;
  deletingId: string | null;
  publishingId: string | null;
  onPublishToggle: (lp: LandingPage) => void;
  onDelete: (id: string) => void;
}) {
  const lp = landingPage;

  return (
    <div className="flex items-center gap-1">
      <Link href={`/landing-pages/${lp.slug}?id=${lp.id}`}>
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
        onClick={() => onPublishToggle(lp)}
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
                onClick={() => onDelete(lp.id)}
              >
                {deletingId === lp.id ? "Deleting..." : "Delete"}
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LandingPagesTableSkeleton() {
  return (
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
  );
}

function LandingPagesEmptyState({
  debouncedSearch,
  action,
}: {
  debouncedSearch: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Layout className="mb-4 h-12 w-12 text-gray-300" />
      <p className="text-lg font-medium text-gray-950">
        {debouncedSearch ? "No landing pages found" : "No landing pages yet"}
      </p>
      <p className="mt-1 text-sm text-gray-500">
        {debouncedSearch
          ? "Try a different search term"
          : "Generate your first AI-powered landing page to get started"}
      </p>
      {action}
    </div>
  );
}

export function LandingPagesTable({
  pages,
  loading,
  debouncedSearch,
  deletingId,
  publishingId,
  onPublishToggle,
  onDelete,
  emptyStateAction,
  formatDate,
}: {
  pages: LandingPage[];
  loading: boolean;
  debouncedSearch: string;
  deletingId: string | null;
  publishingId: string | null;
  onPublishToggle: (lp: LandingPage) => void;
  onDelete: (id: string) => void;
  emptyStateAction?: React.ReactNode;
  formatDate: (date: string) => string;
}) {
  return (
    <Card>
      <CardContent className="p-0">
        {loading ? (
          <LandingPagesTableSkeleton />
        ) : pages.length === 0 ? (
          <LandingPagesEmptyState
            debouncedSearch={debouncedSearch}
            action={emptyStateAction}
          />
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
                    <LandingPageRowActions
                      landingPage={lp}
                      deletingId={deletingId}
                      publishingId={publishingId}
                      onPublishToggle={onPublishToggle}
                      onDelete={onDelete}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export function LandingPagesPagination({
  page,
  totalPages,
  total,
  onPrevious,
  onNext,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-gray-500">
        Page {page} of {totalPages} ({total} pages)
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={onPrevious}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={onNext}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
