import type { Product } from "@/store/productStore";

function parseDate(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val;
  }
  
  // Handle Firestore Timestamp objects (with prototype)
  if (typeof val.toDate === 'function') {
    return val.toDate();
  }
  
  // Handle plain objects from Firestore (e.g. stripped of prototype)
  if (typeof val === 'object' && 'seconds' in val) {
    return new Date(val.seconds * 1000);
  }
  
  // Handle milliseconds (number) or valid date strings
  const d = new Date(val);
  if (!isNaN(d.getTime())) return d;
  
  return null;
}

export function isDiscountActive(product: Product): boolean {
  if (!product.discount || product.discount <= 0) return false;
  
  const now = Date.now();
  
  const startDate = parseDate(product.discountStartDate);
  const endDate = parseDate(product.discountEndDate);
  
  if (startDate && now < startDate.getTime()) return false;
  if (endDate && now > endDate.getTime()) return false;
  
  return true;
}

export function getEffectivePrice(product: Product, basePrice: number): number {
  if (!isDiscountActive(product) || !product.discount) return basePrice;
  return Math.round(basePrice * (1 - product.discount / 100));
}

export function formatDiscountPeriod(product: Product): string | null {
  const start = parseDate(product.discountStartDate);
  const end = parseDate(product.discountEndDate);
    
  if (!start || !end) return null;
  
  const fmt = (d: Date) => `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
  return `${fmt(start)}–${fmt(end)}`;
}
