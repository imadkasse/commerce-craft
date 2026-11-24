export interface Daira {
  name: string;
  communes: { name: string }[];
}

export interface WilayaDairaCommune {
  code: number;
  name: string;
  dairas: Daira[];
}

export interface CustomField {
  id: string;
  label: string;
  type: "text" | "textarea" | "number";
  required: boolean;
  value: string;
}

import rawData from "./algeria-wilayas.json";

// Codes 59–69 (أفلو، بريكة، القنطرة، بئر العاتر، العريشة، قصر الشلالة، عين وسارة، مسعد، قصر البخاري، بوسعادة، الأبيض سيدي الشيخ)
// are dairas mistakenly listed at the top level of the JSON. Filter them out so only the 58 real wilayas remain.
export const WILAYA_DATA: WilayaDairaCommune[] = (rawData as WilayaDairaCommune[]).filter((w) => w.code <= 58);

export function getDairas(wilayaCode: number): Daira[] {
  const wilaya = WILAYA_DATA.find((w) => w.code === wilayaCode);
  return wilaya ? wilaya.dairas : [];
}

export function getWilayaByCode(code: number): WilayaDairaCommune | undefined {
  return WILAYA_DATA.find((w) => w.code === code);
}

export function getWilayaByName(name: string): WilayaDairaCommune | undefined {
  return WILAYA_DATA.find((w) => w.name === name);
}
