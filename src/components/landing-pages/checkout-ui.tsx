"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Color = { id: string; name: string; hexCode: string };
type Size = {
  id: string;
  colorId: string;
  sizeLabel: string;
  stockQuantity: number;
};

export function DeliveryOptionButton({
  value,
  active,
  onSelect,
  Icon,
  title,
  subtitle,
  subtitleClassName,
}: {
  value: "home" | "desk";
  active: boolean;
  onSelect: (value: "home" | "desk") => void;
  Icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  subtitleClassName?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={cn(
        "flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-center transition-all",
        active
          ? "border-indigo-500 bg-indigo-50"
          : "border-gray-200 hover:border-gray-300"
      )}
    >
      <Icon
        className={cn("h-6 w-6", active ? "text-indigo-600" : "text-gray-400")}
      />
      <span className="text-sm font-medium">{title}</span>
      <span className={cn("text-xs", subtitleClassName)}>{subtitle}</span>
    </button>
  );
}

export function PriceRow({
  label,
  value,
  labelClassName,
  valueClassName,
  className,
}: {
  label: string;
  value: string;
  labelClassName?: string;
  valueClassName?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex justify-between", className)}>
      <span className={labelClassName ?? "text-gray-600"}>{label}</span>
      <span className={valueClassName}>{value}</span>
    </div>
  );
}

export function TextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  type,
  required,
  hint,
}: {
  id: string;
  label: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
      />
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

export function ColorSwatch({
  color,
  selected,
  onSelect,
}: {
  color: Color;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(color.id)}
      className={cn(
        "h-10 w-10 rounded-full border-2 transition-all",
        selected
          ? "border-gray-900 scale-110 ring-2 ring-offset-2 ring-gray-900"
          : "border-gray-300 hover:border-gray-500"
      )}
      style={{ backgroundColor: `#${color.hexCode.replace("#", "")}` }}
      title={color.name}
      aria-label={color.name}
    />
  );
}

export function SizePill({
  size,
  selected,
  onSelect,
}: {
  size: Size;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(size.id)}
      disabled={size.stockQuantity === 0}
      className={cn(
        "min-w-[3rem] px-4 py-2 text-sm font-medium rounded-md border transition-all",
        selected
          ? "bg-gray-900 text-white border-gray-900"
          : "bg-white text-gray-700 border-gray-200 hover:border-gray-400",
        size.stockQuantity === 0 && "opacity-40 cursor-not-allowed line-through"
      )}
    >
      {size.sizeLabel}
    </button>
  );
}

export function QuantityStepper({
  label,
  quantity,
  onDecrement,
  onIncrement,
}: {
  label: React.ReactNode;
  quantity: number;
  onDecrement: () => void;
  onIncrement: () => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="quantity">{label}</Label>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onDecrement}
          disabled={quantity <= 1}
        >
          &minus;
        </Button>
        <span className="w-12 text-center font-medium">{quantity}</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onIncrement}
          disabled={quantity >= 99}
        >
          +
        </Button>
      </div>
    </div>
  );
}

export function CheckoutSuccessCard({
  orderNumber,
  title,
  description,
  orderLabel,
  note,
}: {
  orderNumber: string;
  title: string;
  description: string;
  orderLabel: string;
  note: string;
}) {
  return (
    <Card className="p-8 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
        <Check className="h-8 w-8 text-green-600" />
      </div>
      <h3 className="text-xl font-bold text-gray-950">{title}</h3>
      <p className="mt-2 text-gray-500">{description}</p>
      <p className="mt-4 text-sm text-gray-600">
        {orderLabel}{" "}
        <span className="font-bold text-gray-950">{orderNumber}</span>
      </p>
      <p className="mt-2 text-xs text-gray-400">{note}</p>
    </Card>
  );
}

export function ProductSummaryCard({
  name,
  image,
  priceText,
  details,
}: {
  name: string;
  image?: string;
  priceText: string;
  details: string[];
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="flex items-start gap-4">
        {image && (
          <img
            src={image}
            alt={name}
            className="h-16 w-16 rounded-lg object-cover"
          />
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-950 truncate">{name}</h3>
          <p className="text-lg font-bold text-indigo-600">{priceText}</p>
          {details.map((detail) => (
            <p key={detail} className="text-sm text-gray-500">
              {detail}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
