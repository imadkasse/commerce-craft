"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Check, Truck, Package, Loader2, MapPin, Home, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  computeTotals,
  getAvailableSizes,
  submitCheckout,
  validateCheckout,
  type CheckoutValidationMessages,
} from "@/services/checkout.service";

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

export function UnifiedCheckoutForm({
  product,
  landingPageSlug,
  colors = [],
  sizes = [],
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
    return (
      <Card className="p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <Check className="h-8 w-8 text-green-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-950">Commande confirmط·آ·ط¢آ£ط·آ¢ط¢آ©e !</h3>
        <p className="mt-2 text-gray-500">
          Votre commande a ط·آ·ط¢آ£ط·آ¢ط¢آ©tط·آ·ط¢آ£ط·آ¢ط¢آ© reط·آ·ط¢آ£ط·آ¢ط¢آ§ue avec succط·آ·ط¢آ£ط·آ¢ط¢آ¨s.
        </p>
        <p className="mt-4 text-sm text-gray-600">
          Numط·آ·ط¢آ£ط·آ¢ط¢آ©ro de commande :{" "}
          <span className="font-bold text-gray-950">{success.orderNumber}</span>
        </p>
        <p className="mt-2 text-xs text-gray-400">
          Nous vous contacterons bientط·آ·ط¢آ£ط·آ¢ط¢آ´t pour confirmer la livraison.
        </p>
      </Card>
    );
  }

  if (!product) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
        <Package className="mx-auto mb-3 h-10 w-10 text-gray-300" />
        <p className="text-gray-500">Aucun produit disponible pour cette page.</p>
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
            <p className="text-lg font-bold text-indigo-600">{Number(product.price).toLocaleString()} DZD</p>
            {selectedColorName && (
              <p className="text-sm text-gray-500">Couleur: {selectedColorName}</p>
            )}
            {selectedSizeId && (
              <p className="text-sm text-gray-500">
                Taille: {sizes.find((s) => s.id === selectedSizeId)?.sizeLabel}
              </p>
            )}
            <p className="text-sm text-gray-500">Quantitط·آ·ط¢آ£ط·آ¢ط¢آ©: {quantity}</p>
          </div>
        </div>
      </div>

      {/* Options produit */}
      {product.type === "CLOTHING" && colors.length > 0 && (
        <div className="space-y-2">
          <Label>Couleur <span className="text-red-500">*</span></Label>
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

      {product.type === "CLOTHING" && selectedColorId && availableSizes.length > 0 && (
        <div className="space-y-2">
          <Label>Taille <span className="text-red-500">*</span></Label>
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

      <div className="space-y-2">
        <Label htmlFor="quantity">Quantitط·آ·ط¢آ£ط·آ¢ط¢آ©</Label>
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

      {/* Delivery Info */}
      <div className="border-t pt-6 space-y-4">
        <h4 className="font-medium text-gray-900">Informations de livraison</h4>

        <div className="space-y-2">
          <Label htmlFor="name">
            Nom complet <span className="text-red-500">*</span>
          </Label>
          <Input
            id="name"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Mohamed Ahmed"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">
            Numط·آ·ط¢آ£ط·آ¢ط¢آ©ro de tط·آ·ط¢آ£ط·آ¢ط¢آ©lط·آ·ط¢آ£ط·آ¢ط¢آ©phone <span className="text-red-500">*</span>
          </Label>
          <Input
            id="phone"
            type="tel"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            placeholder="0555 12 34 56"
            required
          />
          <p className="text-xs text-gray-400">Exemple: 0555 12 34 56</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">
            Adresse complط·آ·ط¢آ£ط·آ¢ط¢آ¨te <span className="text-red-500">*</span>
          </Label>
          <Input
            id="address"
            value={customerAddress}
            onChange={(e) => setCustomerAddress(e.target.value)}
            placeholder="Rue, numط·آ·ط¢آ£ط·آ¢ط¢آ©ro, quartier, etc."
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="wilaya">
            Wilaya <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 z-10" />
            <select
              id="wilaya"
              value={customerCity}
              onChange={(e) => setCustomerCity(e.target.value)}
              className="flex h-10 w-full rounded-md border border-gray-300 bg-white pl-9 pr-3 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
              required
            >
              <option value="">Sط·آ£ط¢آ©lectionnez une wilaya</option>
              <option value="Adrar">01 - Adrar</option>
              <option value="Chlef">02 - Chlef</option>
              <option value="Laghouat">03 - Laghouat</option>
              <option value="Oum El Bouaghi">04 - Oum El Bouaghi</option>
              <option value="Batna">05 - Batna</option>
              <option value="Bejaia">06 - Bejaia</option>
              <option value="Biskra">07 - Biskra</option>
              <option value="Bechar">08 - Bechar</option>
              <option value="Blida">09 - Blida</option>
              <option value="Bouira">10 - Bouira</option>
              <option value="Tamanrasset">11 - Tamanrasset</option>
              <option value="Tebessa">12 - Tebessa</option>
              <option value="Tlemcen">13 - Tlemcen</option>
              <option value="Tiaret">14 - Tiaret</option>
              <option value="Tizi Ouzou">15 - Tizi Ouzou</option>
              <option value="Alger">16 - Alger</option>
              <option value="Djelfa">17 - Djelfa</option>
              <option value="Jijel">18 - Jijel</option>
              <option value="Setif">19 - Setif</option>
              <option value="Saida">20 - Saida</option>
              <option value="Skikda">21 - Skikda</option>
              <option value="Sidi Bel Abbes">22 - Sidi Bel Abbes</option>
              <option value="Annaba">23 - Annaba</option>
              <option value="Guelma">24 - Guelma</option>
              <option value="Constantine">25 - Constantine</option>
              <option value="Medea">26 - Medea</option>
              <option value="Mostaganem">27 - Mostaganem</option>
              <option value="M'Sila">28 - M'Sila</option>
              <option value="Mascara">29 - Mascara</option>
              <option value="Ouargla">30 - Ouargla</option>
              <option value="Oran">31 - Oran</option>
              <option value="El Bayadh">32 - El Bayadh</option>
              <option value="Illizi">33 - Illizi</option>
              <option value="Bordj Bou Arreridj">34 - Bordj Bou Arreridj</option>
              <option value="Boumerdes">35 - Boumerdes</option>
              <option value="El Tarf">36 - El Tarf</option>
              <option value="Tindouf">37 - Tindouf</option>
              <option value="Tissemsilt">38 - Tissemsilt</option>
              <option value="El Oued">39 - El Oued</option>
              <option value="Khenchela">40 - Khenchela</option>
              <option value="Souk Ahras">41 - Souk Ahras</option>
              <option value="Tipaza">42 - Tipaza</option>
              <option value="Mila">43 - Mila</option>
              <option value="Ain Defla">44 - Ain Defla</option>
              <option value="Naama">45 - Naama</option>
              <option value="Ain Temouchent">46 - Ain Temouchent</option>
              <option value="Ghardaia">47 - Ghardaia</option>
              <option value="Relizane">48 - Relizane</option>
              <option value="Timimoun">49 - Timimoun</option>
              <option value="Bordj Badji Mokhtar">50 - Bordj Badji Mokhtar</option>
              <option value="Ouled Djellal">51 - Ouled Djellal</option>
              <option value="Beni Abbes">52 - Beni Abbes</option>
              <option value="In Salah">53 - In Salah</option>
              <option value="In Guezzam">54 - In Guezzam</option>
              <option value="Touggourt">55 - Touggourt</option>
              <option value="Djanet">56 - Djanet</option>
              <option value="El Meghaier">57 - El Meghaier</option>
              <option value="El Meniaa">58 - El Meniaa</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="commune">
            Commune / Ville
          </Label>
          <Input
            id="commune"
            value={customerCommune}
            onChange={(e) => setCustomerCommune(e.target.value)}
            placeholder="Ex: Hydra, Bir Mourad Rais..."
          />
        </div>
      </div>

      {/* Delivery Option */}
      <div className="border-t pt-6 space-y-3">
        <h4 className="font-medium text-gray-900">Mode de livraison</h4>
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
            <Home className={cn("h-6 w-6", deliveryOption === "home" ? "text-indigo-600" : "text-gray-400")} />
            <span className="text-sm font-medium">Livraison ط·آ·ط¢آ£ط·آ¢ط¢آ  domicile</span>
            <span className="text-xs text-gray-500">500 DZD</span>
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
            <Building2 className={cn("h-6 w-6", deliveryOption === "desk" ? "text-indigo-600" : "text-gray-400")} />
            <span className="text-sm font-medium">Rط·آ·ط¢آ£ط·آ¢ط¢آ©cupط·آ·ط¢آ£ط·آ¢ط¢آ©ration au bureau</span>
            <span className="text-xs text-green-600 font-medium">Gratuit</span>
          </button>
        </div>
      </div>

      {/* Price Breakdown */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Sous-total</span>
          <span className="font-medium">{subtotal.toLocaleString()} DZD</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Livraison</span>
          <span className={cn("font-medium", shippingCost === 0 && "text-green-600")}>
            {shippingCost === 0 ? "Gratuit" : `${shippingCost.toLocaleString()} DZD`}
          </span>
        </div>
        <div className="border-t pt-2 flex justify-between">
          <span className="font-bold text-gray-900">Total</span>
          <span className="font-bold text-indigo-600 text-lg">{total.toLocaleString()} DZD</span>
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
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Traitement en cours...
          </>
        ) : (
          <>
            <Truck className="mr-2 h-5 w-5" />
            Passer la commande
          </>
        )}
      </Button>

      <p className="text-center text-xs text-gray-400">
        En passant commande, vous acceptez nos conditions gط·آ·ط¢آ£ط·آ¢ط¢آ©nط·آ·ط¢آ£ط·آ¢ط¢آ©rales de vente.
      </p>
    </form>
  );
}
