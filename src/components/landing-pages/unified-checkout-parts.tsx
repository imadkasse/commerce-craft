"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Building2, Home, Loader2, MapPin, Package, Truck } from "lucide-react";
import {
  CheckoutSuccessCard,
  ColorSwatch,
  DeliveryOptionButton,
  PriceRow,
  ProductSummaryCard,
  QuantityStepper,
  SizePill,
  TextField,
} from "./checkout-ui";

const SELECT_CLASS =
  "flex h-10 w-full rounded-md border border-gray-300 bg-white pl-9 pr-3 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50";

type Color = { id: string; name: string; hexCode: string };
type Size = {
  id: string;
  colorId: string;
  sizeLabel: string;
  stockQuantity: number;
};

function WilayaField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="wilaya">
        Wilaya <span className="text-red-500">*</span>
      </Label>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 z-10" />
        <select
          id="wilaya"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={SELECT_CLASS}
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
  );
}

export function CheckoutSuccessCardFr({ orderNumber }: { orderNumber: string }) {
  return (
    <CheckoutSuccessCard
      orderNumber={orderNumber}
      title="Commande confirmط·آ·ط¢آ£ط·آ¢ط¢آ©e !"
      description="Votre commande a ط·آ·ط¢آ£ط·آ¢ط¢آ©tط·آ·ط¢آ£ط·آ¢ط¢آ© reط·آ·ط¢آ£ط·آ¢ط¢آ§ue avec succط·آ·ط¢آ£ط·آ¢ط¢آ¨s."
      orderLabel="Numط·آ·ط¢آ£ط·آ¢ط¢آ©ro de commande :"
      note="Nous vous contacterons bientط·آ·ط¢آ£ط·آ¢ط¢آ´t pour confirmer la livraison."
    />
  );
}

export function CheckoutNoProductCard() {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
      <Package className="mx-auto mb-3 h-10 w-10 text-gray-300" />
      <p className="text-gray-500">Aucun produit disponible pour cette page.</p>
    </div>
  );
}

export function CheckoutProductRecap({
  name,
  image,
  price,
  selectedColorName,
  selectedSizeLabel,
  quantity,
}: {
  name: string;
  image?: string;
  price: string;
  selectedColorName?: string;
  selectedSizeLabel?: string;
  quantity: number;
}) {
  const details: string[] = [];
  if (selectedColorName) details.push(`Couleur: ${selectedColorName}`);
  if (selectedSizeLabel) details.push(`Taille: ${selectedSizeLabel}`);
  details.push(`Quantitط·آ·ط¢آ£ط·آ¢ط¢آ©: ${quantity}`);

  return (
    <ProductSummaryCard
      name={name}
      image={image}
      priceText={`${Number(price).toLocaleString()} DZD`}
      details={details}
    />
  );
}

export function CheckoutColorPicker({
  colors,
  selectedColorId,
  onSelect,
}: {
  colors: Color[];
  selectedColorId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>
        Couleur <span className="text-red-500">*</span>
      </Label>
      <div className="flex flex-wrap gap-2">
        {colors.map((color) => (
          <ColorSwatch
            key={color.id}
            color={color}
            selected={selectedColorId === color.id}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}

export function CheckoutSizePicker({
  sizes,
  selectedSizeId,
  onSelect,
}: {
  sizes: Size[];
  selectedSizeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>
        Taille <span className="text-red-500">*</span>
      </Label>
      <div className="flex flex-wrap gap-2">
        {sizes.map((size) => (
          <SizePill
            key={size.id}
            size={size}
            selected={selectedSizeId === size.id}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}

export function CheckoutQuantityPicker({
  quantity,
  onDecrement,
  onIncrement,
}: {
  quantity: number;
  onDecrement: () => void;
  onIncrement: () => void;
}) {
  return (
    <QuantityStepper
      label="Quantitط·آ·ط¢آ£ط·آ¢ط¢آ©"
      quantity={quantity}
      onDecrement={onDecrement}
      onIncrement={onIncrement}
    />
  );
}

export function CheckoutDeliveryDetails({
  customerName,
  onCustomerNameChange,
  customerPhone,
  onCustomerPhoneChange,
  customerAddress,
  onCustomerAddressChange,
  customerCity,
  onCustomerCityChange,
  customerCommune,
  onCustomerCommuneChange,
}: {
  customerName: string;
  onCustomerNameChange: (value: string) => void;
  customerPhone: string;
  onCustomerPhoneChange: (value: string) => void;
  customerAddress: string;
  onCustomerAddressChange: (value: string) => void;
  customerCity: string;
  onCustomerCityChange: (value: string) => void;
  customerCommune: string;
  onCustomerCommuneChange: (value: string) => void;
}) {
  return (
    <div className="border-t pt-6 space-y-4">
      <h4 className="font-medium text-gray-900">Informations de livraison</h4>

      <TextField
        id="name"
        label={
          <>
            Nom complet <span className="text-red-500">*</span>
          </>
        }
        value={customerName}
        onChange={onCustomerNameChange}
        placeholder="Mohamed Ahmed"
        required
      />

      <TextField
        id="phone"
        type="tel"
        label={
          <>
            Numط·آ·ط¢آ£ط·آ¢ط¢آ©ro de tط·آ·ط¢آ£ط·آ¢ط¢آ©lط·آ·ط¢آ£ط·آ¢ط¢آ©phone{" "}
            <span className="text-red-500">*</span>
          </>
        }
        value={customerPhone}
        onChange={onCustomerPhoneChange}
        placeholder="0555 12 34 56"
        required
        hint="Exemple: 0555 12 34 56"
      />

      <TextField
        id="address"
        label={
          <>
            Adresse complط·آ·ط¢آ£ط·آ¢ط¢آ¨te <span className="text-red-500">*</span>
          </>
        }
        value={customerAddress}
        onChange={onCustomerAddressChange}
        placeholder="Rue, numط·آ·ط¢آ£ط·آ¢ط¢آ©ro, quartier, etc."
        required
      />

      <WilayaField value={customerCity} onChange={onCustomerCityChange} />

      <TextField
        id="commune"
        label={<>Commune / Ville</>}
        value={customerCommune}
        onChange={onCustomerCommuneChange}
        placeholder="Ex: Hydra, Bir Mourad Rais..."
      />
    </div>
  );
}

export function CheckoutDeliveryOptionSection({
  deliveryOption,
  onSelect,
}: {
  deliveryOption: "home" | "desk";
  onSelect: (value: "home" | "desk") => void;
}) {
  return (
    <div className="border-t pt-6 space-y-3">
      <h4 className="font-medium text-gray-900">Mode de livraison</h4>
      <div className="grid grid-cols-2 gap-3">
        <DeliveryOptionButton
          value="home"
          active={deliveryOption === "home"}
          onSelect={onSelect}
          Icon={Home}
            title="Livraison ط·آ·ط¢آ£ط·آ¢ط¢آ  domicile"
          subtitle="500 DZD"
          subtitleClassName="text-gray-500"
        />
        <DeliveryOptionButton
          value="desk"
          active={deliveryOption === "desk"}
          onSelect={onSelect}
          Icon={Building2}
          title="Rط·آ·ط¢آ£ط·آ¢ط¢آ©cupط·آ·ط¢آ£ط·آ¢ط¢آ©ration au bureau"
          subtitle="Gratuit"
          subtitleClassName="text-green-600 font-medium"
        />
      </div>
    </div>
  );
}

export function CheckoutPriceBreakdown({
  subtotal,
  shippingCost,
  total,
}: {
  subtotal: number;
  shippingCost: number;
  total: number;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-2">
      <PriceRow
        className="text-sm"
        label="Sous-total"
        value={`${subtotal.toLocaleString()} DZD`}
        valueClassName="font-medium"
      />
      <PriceRow
        className="text-sm"
        label="Livraison"
        value={
          shippingCost === 0 ? "Gratuit" : `${shippingCost.toLocaleString()} DZD`
        }
        valueClassName={
          shippingCost === 0 ? "font-medium text-green-600" : "font-medium"
        }
      />
      <PriceRow
        className="border-t pt-2"
        label="Total"
        value={`${total.toLocaleString()} DZD`}
        labelClassName="font-bold text-gray-900"
        valueClassName="font-bold text-indigo-600 text-lg"
      />
    </div>
  );
}

export function CheckoutSubmitButton({ submitting }: { submitting: boolean }) {
  return (
    <Button type="submit" size="lg" className="w-full text-base" disabled={submitting}>
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
  );
}
