"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Check, Truck, Package, Loader2, Home, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { WILAYA_DATA } from "@/lib/data";
import {
  computeTotals,
  getAvailableSizes,
  submitCheckout,
  validateCheckout,
  type CheckoutValidationMessages,
} from "@/services/checkout.service";

const CHECKOUT_MESSAGES: CheckoutValidationMessages = {
  required: "يرجى ملء جميع الحقول الإلزامية.",
  wilaya: "يرجى اختيار الولاية.",
  daira: "يرجى اختيار البلدية.",
  productUnavailable: "المنتج غير متوفر.",
  color: "يرجى اختيار لون.",
  size: "يرجى اختيار مقاس.",
  outOfStock: "هذا المقاس غير متوفر.",
};

interface OrderFormProps {
  product: {
    id: string;
    name: string;
    price: string;
    images: string[];
    type: "CLOTHING" | "GENERAL";
  } | null;
  landingPageSlug: string;
  colors?: { id: string; name: string; hexCode: string }[];
  sizes?: { id: string; colorId: string; sizeLabel: string; stockQuantity: number }[];
}



export function OrderForm({
  product,
  landingPageSlug,
  colors = [],
  sizes = [],
}: OrderFormProps) {
  const [selectedColorId, setSelectedColorId] = useState("");
  const [selectedSizeId, setSelectedSizeId] = useState("");
  const [selectedWilayaCode, setSelectedWilayaCode] = useState<number | "">("");
  const [selectedDaira, setSelectedDaira] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [deliveryOption, setDeliveryOption] = useState<"home" | "desk">("home");
    const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ orderNumber: string } | null>(null);

  const availableSizes = useMemo(
    () => getAvailableSizes(selectedColorId, sizes),
    [selectedColorId, sizes]
  );

  const filteredDairas = useMemo(() => {
    if (selectedWilayaCode === "") return [];
    const wilaya = WILAYA_DATA.find((w) => w.code === selectedWilayaCode);
    return wilaya ? wilaya.dairas : [];
  }, [selectedWilayaCode]);

  const { subtotal, shippingCost, total } = computeTotals({
    unitPrice: product ? Number(product.price) : 0,
    quantity,
    deliveryOption,
  });
  const selectedColorName = colors.find((c) => c.id === selectedColorId)?.name;
  const selectedWilayaName = selectedWilayaCode !== ""
    ? WILAYA_DATA.find((w) => w.code === selectedWilayaCode)?.name
    : undefined;

  

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const validationError = validateCheckout(
      {
        customerName,
        customerPhone,
        customerAddress,
        product,
        wilaya: selectedWilayaCode,
        daira: selectedDaira,
        colorId: selectedColorId,
        sizeId: selectedSizeId,
        sizes,
      },
      CHECKOUT_MESSAGES
    );

    if (validationError) {
      setError(validationError);
      return;
    }

    // validateCheckout already rejects a missing product; narrows for TS.
    if (!product) return;

    setSubmitting(true);

    try {
      const data = await submitCheckout(
        {
          slug: landingPageSlug,
          productId: product.id,
          quantity,
          color: selectedColorName || undefined,
          size: sizes.find((s) => s.id === selectedSizeId)?.sizeLabel || undefined,
          customerName,
          customerPhone,
          customerAddress,
          customerCity: selectedWilayaName,
          customerCommune: selectedDaira,
        },
        "حدث خطأ أثناء تقديم الطلب."
      );

      setSuccess({ orderNumber: data.order.orderNumber });
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ غير متوقع.");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <Card className="p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <Check className="h-8 w-8 text-green-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-950">تم تأكيد الطلب!</h3>
        <p className="mt-2 text-gray-500">تم استلام طلبك بنجاح.</p>
        <p className="mt-4 text-sm text-gray-600">
          رقم الطلب:{" "}
          <span className="font-bold text-gray-950">{success.orderNumber}</span>
        </p>
        <p className="mt-2 text-xs text-gray-400">
          سنتصل بك قريباً لتأكيد التوصيل.
        </p>
      </Card>
    );
  }

  if (!product) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
        <Package className="mx-auto mb-3 h-10 w-10 text-gray-300" />
        <p className="text-gray-500">لا توجد منتجات متاحة لهذه الصفحة.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Product Recap */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <div className="flex items-start gap-4">
          {product.images?.[0] && (
            <img
              src={product.images[0]}
              alt={product.name}
              className="h-16 w-16 rounded-lg object-cover"
            />
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-950 truncate">{product.name}</h3>
            <p className="text-lg font-bold text-indigo-600">
              {Number(product.price).toLocaleString()} د.ج
            </p>
            {selectedColorName && (
              <p className="text-sm text-gray-500">اللون: {selectedColorName}</p>
            )}
            {selectedSizeId && (
              <p className="text-sm text-gray-500">
                المقاس: {sizes.find((s) => s.id === selectedSizeId)?.sizeLabel}
              </p>
            )}
            <p className="text-sm text-gray-500">الكمية: {quantity}</p>
          </div>
        </div>
      </div>

      {/* Color Selection */}
      {product.type === "CLOTHING" && colors.length > 0 && (
        <div className="space-y-2">
          <Label>
            اللون <span className="text-red-500">*</span>
          </Label>
          <div className="flex flex-wrap gap-2">
            {colors.map((color) => (
              <button
                key={color.id}
                type="button"
                onClick={() => {
                  setSelectedColorId(color.id);
                  setSelectedSizeId("");
                }}
                className={cn(
                  "h-10 w-10 rounded-full border-2 transition-all",
                  selectedColorId === color.id
                    ? "border-gray-900 scale-110 ring-2 ring-offset-2 ring-gray-900"
                    : "border-gray-300 hover:border-gray-500"
                )}
                style={{ backgroundColor: `#${color.hexCode.replace("#", "")}` }}
                title={color.name}
                aria-label={color.name}
              />
            ))}
          </div>
        </div>
      )}

      {/* Size Selection */}
      {product.type === "CLOTHING" && selectedColorId && availableSizes.length > 0 && (
        <div className="space-y-2">
          <Label>
            المقاس <span className="text-red-500">*</span>
          </Label>
          <div className="flex flex-wrap gap-2">
            {availableSizes.map((size) => (
              <button
                key={size.id}
                type="button"
                onClick={() => setSelectedSizeId(size.id)}
                disabled={size.stockQuantity === 0}
                className={cn(
                  "min-w-[3rem] px-4 py-2 text-sm font-medium rounded-md border transition-all",
                  selectedSizeId === size.id
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-700 border-gray-200 hover:border-gray-400",
                  size.stockQuantity === 0 && "opacity-40 cursor-not-allowed line-through"
                )}
              >
                {size.sizeLabel}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quantity */}
      <div className="space-y-2">
        <Label htmlFor="quantity">الكمية</Label>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            disabled={quantity <= 1}
          >
            &minus;
          </Button>
          <span className="w-12 text-center font-medium">{quantity}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setQuantity(quantity + 1)}
            disabled={quantity >= 99}
          >
            +
          </Button>
        </div>
      </div>

      {/* Customer Info */}
      <div className="border-t pt-6 space-y-4">
        <h4 className="font-medium text-gray-900">معلومات التوصيل</h4>

        <div className="space-y-2">
          <Label htmlFor="name">
            الاسم الكامل <span className="text-red-500">*</span>
          </Label>
          <Input
            id="name"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="محمد أحمد"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">
            رقم الهاتف <span className="text-red-500">*</span>
          </Label>
          <Input
            id="phone"
            type="tel"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            placeholder="0555 12 34 56"
            required
          />
          <p className="text-xs text-gray-400">مثال: 0555 12 34 56</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">
            العنوان <span className="text-red-500">*</span>
          </Label>
          <Input
            id="address"
            value={customerAddress}
            onChange={(e) => setCustomerAddress(e.target.value)}
            placeholder="الشارع، الرقم، الحي، إلخ."
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="wilaya">
            الولاية <span className="text-red-500">*</span>
          </Label>
          <select
            id="wilaya"
            value={selectedWilayaCode}
            onChange={(e) => {
              setSelectedWilayaCode(e.target.value ? Number(e.target.value) : "");
              setSelectedDaira("");
            }}
            className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            required
          >
            <option value="">اختر ولاية</option>
            {WILAYA_DATA.map((w) => (
              <option key={w.code} value={w.code}>
                {w.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="daira">
            الدائرة <span className="text-red-500">*</span>
          </Label>
          <select
            id="daira"
            value={selectedDaira}
            onChange={(e) => setSelectedDaira(e.target.value)}
            disabled={selectedWilayaCode === ""}
            className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            required
          >
            <option value="">
              {selectedWilayaCode === "" ? "اختر الولاية أولا" : "اختر دائره"}
            </option>
            {filteredDairas.map((d) => (
              <option key={d.name} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        </div>

      {/* Delivery Option */}
      <div className="border-t pt-6 space-y-3">
        <h4 className="font-medium text-gray-900">طريقة التوصيل</h4>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setDeliveryOption("home")}
            className={cn(
              "flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-center transition-all",
              deliveryOption === "home"
                ? "border-indigo-500 bg-indigo-50"
                : "border-gray-200 hover:border-gray-300"
            )}
          >
            <Home
              className={cn(
                "h-6 w-6",
                deliveryOption === "home" ? "text-indigo-600" : "text-gray-400"
              )}
            />
            <span className="text-sm font-medium">توصيل إلى المنزل</span>
            <span className="text-xs text-gray-500">500 د.ج</span>
          </button>
          <button
            type="button"
            onClick={() => setDeliveryOption("desk")}
            className={cn(
              "flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-center transition-all",
              deliveryOption === "desk"
                ? "border-indigo-500 bg-indigo-50"
                : "border-gray-200 hover:border-gray-300"
            )}
          >
            <Building2
              className={cn(
                "h-6 w-6",
                deliveryOption === "desk" ? "text-indigo-600" : "text-gray-400"
              )}
            />
            <span className="text-sm font-medium">استلام من المكتب</span>
            <span className="text-xs text-green-600 font-medium">مجاني</span>
          </button>
        </div>
      </div>

      {/* Price Breakdown */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">المجموع الفرعي</span>
          <span className="font-medium">{subtotal.toLocaleString()} د.ج</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">الشحن</span>
          <span className={cn("font-medium", shippingCost === 0 && "text-green-600")}>
            {shippingCost === 0 ? "مجاني" : `${shippingCost.toLocaleString()} د.ج`}
          </span>
        </div>
        <div className="border-t pt-2 flex justify-between">
          <span className="font-bold text-gray-900">المجموع</span>
          <span className="font-bold text-indigo-600 text-lg">
            {total.toLocaleString()} د.ج
          </span>
        </div>
      </div>

      <Button
        type="submit"
        size="lg"
        className="w-full text-base"
        disabled={submitting}
      >
        {submitting ? (
          <>
            <Loader2 className="ml-2 h-5 w-5 animate-spin" />
            جاري المعالجة...
          </>
        ) : (
          <>
            <Truck className="ml-2 h-5 w-5" />
            تأكيد الطلب
          </>
        )}
      </Button>

      <p className="text-center text-xs text-gray-400">
        بتقديم الطلب، أنت توافق على شروط البيع العامة.
      </p>
    </form>
  );
}
