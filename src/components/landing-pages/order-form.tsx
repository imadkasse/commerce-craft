"use client";

import { useState, useMemo } from "react";
import { WILAYA_DATA } from "@/lib/data";
import {
  computeTotals,
  getAvailableSizes,
  submitCheckout,
  validateCheckout,
  type CheckoutValidationMessages,
} from "@/services/checkout.service";
import {
  ColorPicker,
  DeliveryDetails,
  DeliveryOptionSection,
  NoProductCard,
  OrderSuccessCard,
  PriceBreakdown,
  ProductRecap,
  QuantityPicker,
  SizePicker,
  SubmitOrderButton,
} from "./order-form-parts";

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

const EMPTY_COLORS: NonNullable<OrderFormProps["colors"]> = [];
const EMPTY_SIZES: NonNullable<OrderFormProps["sizes"]> = [];

export function OrderForm({
  product,
  landingPageSlug,
  colors = EMPTY_COLORS,
  sizes = EMPTY_SIZES,
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
    return <OrderSuccessCard orderNumber={success.orderNumber} />;
  }

  if (!product) {
    return <NoProductCard />;
  }

  const selectedSizeLabel = sizes.find((s) => s.id === selectedSizeId)?.sizeLabel;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Product Recap */}
      <ProductRecap
        name={product.name}
        image={product.images?.[0]}
        price={product.price}
        selectedColorName={selectedColorName}
        selectedSizeLabel={selectedSizeId ? selectedSizeLabel : undefined}
        quantity={quantity}
      />

      {/* Color Selection */}
      {product.type === "CLOTHING" && colors.length > 0 && (
        <ColorPicker
          colors={colors}
          selectedColorId={selectedColorId}
          onSelect={(colorId) => {
            setSelectedColorId(colorId);
            setSelectedSizeId("");
          }}
        />
      )}

      {/* Size Selection */}
      {product.type === "CLOTHING" && selectedColorId && availableSizes.length > 0 && (
        <SizePicker
          sizes={availableSizes}
          selectedSizeId={selectedSizeId}
          onSelect={setSelectedSizeId}
        />
      )}

      {/* Quantity */}
      <QuantityPicker
        quantity={quantity}
        onDecrement={() => setQuantity(Math.max(1, quantity - 1))}
        onIncrement={() => setQuantity(quantity + 1)}
      />

      {/* Customer Info */}
      <DeliveryDetails
        customerName={customerName}
        onCustomerNameChange={setCustomerName}
        customerPhone={customerPhone}
        onCustomerPhoneChange={setCustomerPhone}
        customerAddress={customerAddress}
        onCustomerAddressChange={setCustomerAddress}
        selectedWilayaCode={selectedWilayaCode}
        onWilayaChange={setSelectedWilayaCode}
        selectedDaira={selectedDaira}
        onDairaChange={setSelectedDaira}
        dairas={filteredDairas}
      />

      {/* Delivery Option */}
      <DeliveryOptionSection
        deliveryOption={deliveryOption}
        onSelect={setDeliveryOption}
      />

      {/* Price Breakdown */}
      <PriceBreakdown
        subtotal={subtotal}
        shippingCost={shippingCost}
        total={total}
      />

      <SubmitOrderButton submitting={submitting} />

      <p className="text-center text-xs text-gray-400">
        بتقديم الطلب، أنت توافق على شروط البيع العامة.
      </p>
    </form>
  );
}
