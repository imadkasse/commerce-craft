"use client";

import { useState } from "react";
import {
  computeTotals,
  getAvailableSizes,
  submitCheckout,
  validateCheckout,
  type CheckoutValidationMessages,
} from "@/services/checkout.service";
import {
  CheckoutColorPicker,
  CheckoutDeliveryDetails,
  CheckoutDeliveryOptionSection,
  CheckoutNoProductCard,
  CheckoutPriceBreakdown,
  CheckoutProductRecap,
  CheckoutQuantityPicker,
  CheckoutSizePicker,
  CheckoutSubmitButton,
  CheckoutSuccessCardFr,
} from "./unified-checkout-parts";

const CHECKOUT_MESSAGES: CheckoutValidationMessages = {
  required: "Veuillez remplir tous les champs obligatoires.",
  productUnavailable: "Aucun produit disponible.",
  color: "Veuillez sط·آ·ط¢آ£ط·آ¢ط¢آ©lectionner une couleur.",
  size: "Veuillez sط·آ·ط¢آ£ط·آ¢ط¢آ©lectionner une taille.",
  outOfStock: "Cette taille n'est plus disponible.",
};

interface UnifiedCheckoutFormProps {
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

const EMPTY_COLORS: NonNullable<UnifiedCheckoutFormProps["colors"]> = [];
const EMPTY_SIZES: NonNullable<UnifiedCheckoutFormProps["sizes"]> = [];

export function UnifiedCheckoutForm({
  product,
  landingPageSlug,
  colors = EMPTY_COLORS,
  sizes = EMPTY_SIZES,
}: UnifiedCheckoutFormProps) {
  const [selectedColorId, setSelectedColorId] = useState<string>("");
  const [selectedSizeId, setSelectedSizeId] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerCity, setCustomerCity] = useState("");
  const [customerCommune, setCustomerCommune] = useState("");
  const [deliveryOption, setDeliveryOption] = useState<"home" | "desk">("home");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ orderNumber: string } | null>(null);

  const availableSizes = getAvailableSizes(selectedColorId, sizes);

  const { subtotal, shippingCost, total } = computeTotals({
    unitPrice: product ? Number(product.price) : 0,
    quantity,
    deliveryOption,
  });
  const selectedColorName = colors.find((c) => c.id === selectedColorId)?.name;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const validationError = validateCheckout(
      {
        customerName,
        customerPhone,
        customerAddress,
        product,
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
          customerCity,
          customerCommune,
          deliveryOption,
        },
        "Erreur lors de la commande"
      );

      setSuccess({ orderNumber: data.order.orderNumber });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return <CheckoutSuccessCardFr orderNumber={success.orderNumber} />;
  }

  if (!product) {
    return <CheckoutNoProductCard />;
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
      <CheckoutProductRecap
        name={product.name}
        image={product.images?.[0]}
        price={product.price}
        selectedColorName={selectedColorName}
        selectedSizeLabel={selectedSizeId ? selectedSizeLabel : undefined}
        quantity={quantity}
      />

      {/* Options produit */}
      {product.type === "CLOTHING" && colors.length > 0 && (
        <CheckoutColorPicker
          colors={colors}
          selectedColorId={selectedColorId}
          onSelect={(colorId) => {
            setSelectedColorId(colorId);
            setSelectedSizeId("");
          }}
        />
      )}

      {product.type === "CLOTHING" && selectedColorId && availableSizes.length > 0 && (
        <CheckoutSizePicker
          sizes={availableSizes}
          selectedSizeId={selectedSizeId}
          onSelect={setSelectedSizeId}
        />
      )}

      <CheckoutQuantityPicker
        quantity={quantity}
        onDecrement={() => setQuantity(Math.max(1, quantity - 1))}
        onIncrement={() => setQuantity(quantity + 1)}
      />

      {/* Delivery Info */}
      <CheckoutDeliveryDetails
        customerName={customerName}
        onCustomerNameChange={setCustomerName}
        customerPhone={customerPhone}
        onCustomerPhoneChange={setCustomerPhone}
        customerAddress={customerAddress}
        onCustomerAddressChange={setCustomerAddress}
        customerCity={customerCity}
        onCustomerCityChange={setCustomerCity}
        customerCommune={customerCommune}
        onCustomerCommuneChange={setCustomerCommune}
      />

      {/* Delivery Option */}
      <CheckoutDeliveryOptionSection
        deliveryOption={deliveryOption}
        onSelect={setDeliveryOption}
      />

      {/* Price Breakdown */}
      <CheckoutPriceBreakdown
        subtotal={subtotal}
        shippingCost={shippingCost}
        total={total}
      />

      <CheckoutSubmitButton submitting={submitting} />

      <p className="text-center text-xs text-gray-400">
        En passant commande, vous acceptez nos conditions gط·آ·ط¢آ£ط·آ¢ط¢آ©nط·آ·ط¢آ£ط·آ¢ط¢آ©rales de vente.
      </p>
    </form>
  );
}
