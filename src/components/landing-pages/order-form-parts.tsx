"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Building2, Home, Loader2, Package, Truck } from "lucide-react";
import { WILAYA_DATA } from "@/lib/data";
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
  "flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50";

type Color = { id: string; name: string; hexCode: string };
type Size = {
  id: string;
  colorId: string;
  sizeLabel: string;
  stockQuantity: number;
};

export function OrderSuccessCard({ orderNumber }: { orderNumber: string }) {
  return (
    <CheckoutSuccessCard
      orderNumber={orderNumber}
      title="تم تأكيد الطلب!"
      description="تم استلام طلبك بنجاح."
      orderLabel="رقم الطلب:"
      note="سنتصل بك قريباً لتأكيد التوصيل."
    />
  );
}

export function NoProductCard() {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
      <Package className="mx-auto mb-3 h-10 w-10 text-gray-300" />
      <p className="text-gray-500">لا توجد منتجات متاحة لهذه الصفحة.</p>
    </div>
  );
}

export function ProductRecap({
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
  if (selectedColorName) details.push(`اللون: ${selectedColorName}`);
  if (selectedSizeLabel) details.push(`المقاس: ${selectedSizeLabel}`);
  details.push(`الكمية: ${quantity}`);

  return (
    <ProductSummaryCard
      name={name}
      image={image}
      priceText={`${Number(price).toLocaleString()} د.ج`}
      details={details}
    />
  );
}

export function ColorPicker({
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
        اللون <span className="text-red-500">*</span>
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

export function SizePicker({
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
        المقاس <span className="text-red-500">*</span>
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

export function QuantityPicker({
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
      label="الكمية"
      quantity={quantity}
      onDecrement={onDecrement}
      onIncrement={onIncrement}
    />
  );
}

export function DeliveryDetails({
  customerName,
  onCustomerNameChange,
  customerPhone,
  onCustomerPhoneChange,
  customerAddress,
  onCustomerAddressChange,
  selectedWilayaCode,
  onWilayaChange,
  selectedDaira,
  onDairaChange,
  dairas,
}: {
  customerName: string;
  onCustomerNameChange: (value: string) => void;
  customerPhone: string;
  onCustomerPhoneChange: (value: string) => void;
  customerAddress: string;
  onCustomerAddressChange: (value: string) => void;
  selectedWilayaCode: number | "";
  onWilayaChange: (code: number | "") => void;
  selectedDaira: string;
  onDairaChange: (value: string) => void;
  dairas: { name: string }[];
}) {
  return (
    <div className="border-t pt-6 space-y-4">
      <h4 className="font-medium text-gray-900">معلومات التوصيل</h4>

      <TextField
        id="name"
        label={
          <>
            الاسم الكامل <span className="text-red-500">*</span>
          </>
        }
        value={customerName}
        onChange={onCustomerNameChange}
        placeholder="محمد أحمد"
        required
      />

      <TextField
        id="phone"
        type="tel"
        label={
          <>
            رقم الهاتف <span className="text-red-500">*</span>
          </>
        }
        value={customerPhone}
        onChange={onCustomerPhoneChange}
        placeholder="0555 12 34 56"
        required
        hint="مثال: 0555 12 34 56"
      />

      <TextField
        id="address"
        label={
          <>
            العنوان <span className="text-red-500">*</span>
          </>
        }
        value={customerAddress}
        onChange={onCustomerAddressChange}
        placeholder="الشارع، الرقم، الحي، إلخ."
        required
      />

      <div className="space-y-2">
        <Label htmlFor="wilaya">
          الولاية <span className="text-red-500">*</span>
        </Label>
        <select
          id="wilaya"
          value={selectedWilayaCode}
          onChange={(e) => {
            onWilayaChange(e.target.value ? Number(e.target.value) : "");
            onDairaChange("");
          }}
          className={SELECT_CLASS}
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
          onChange={(e) => onDairaChange(e.target.value)}
          disabled={selectedWilayaCode === ""}
          className={SELECT_CLASS}
          required
        >
          <option value="">
            {selectedWilayaCode === "" ? "اختر الولاية أولا" : "اختر دائره"}
          </option>
          {dairas.map((d) => (
            <option key={d.name} value={d.name}>
              {d.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export function DeliveryOptionSection({
  deliveryOption,
  onSelect,
}: {
  deliveryOption: "home" | "desk";
  onSelect: (value: "home" | "desk") => void;
}) {
  return (
    <div className="border-t pt-6 space-y-3">
      <h4 className="font-medium text-gray-900">طريقة التوصيل</h4>
      <div className="grid grid-cols-2 gap-3">
        <DeliveryOptionButton
          value="home"
          active={deliveryOption === "home"}
          onSelect={onSelect}
          Icon={Home}
          title="توصيل إلى المنزل"
          subtitle="500 د.ج"
          subtitleClassName="text-gray-500"
        />
        <DeliveryOptionButton
          value="desk"
          active={deliveryOption === "desk"}
          onSelect={onSelect}
          Icon={Building2}
          title="استلام من المكتب"
          subtitle="مجاني"
          subtitleClassName="text-green-600 font-medium"
        />
      </div>
    </div>
  );
}

export function PriceBreakdown({
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
        label="المجموع الفرعي"
        value={`${subtotal.toLocaleString()} د.ج`}
        valueClassName="font-medium"
      />
      <PriceRow
        className="text-sm"
        label="الشحن"
        value={shippingCost === 0 ? "مجاني" : `${shippingCost.toLocaleString()} د.ج`}
        valueClassName={
          shippingCost === 0 ? "font-medium text-green-600" : "font-medium"
        }
      />
      <PriceRow
        className="border-t pt-2"
        label="المجموع"
        value={`${total.toLocaleString()} د.ج`}
        labelClassName="font-bold text-gray-900"
        valueClassName="font-bold text-indigo-600 text-lg"
      />
    </div>
  );
}

export function SubmitOrderButton({ submitting }: { submitting: boolean }) {
  return (
    <Button type="submit" size="lg" className="w-full text-base" disabled={submitting}>
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
  );
}
