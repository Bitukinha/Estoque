/**
 * Formats a stock value with dual unit display for kg/ton.
 * If unit is "kg/ton", shows both: "1.250 kg / 1,25 ton"
 * Otherwise shows: "1.250 unit"
 */
export function formatStock(value: number, unit: string): string {
  const formatted = value.toLocaleString('pt-BR');
  if (unit === 'kg/ton') {
    const tons = (value / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${formatted} kg / ${tons} ton`;
  }
  return `${formatted} ${unit}`;
}

interface WeighableProduct {
  unit: string;
  current_stock: number;
  bag_weight: number | null;
}

export const isWeightUnit = (unit: string) => unit === 'kg' || unit === 'kg/ton';

/**
 * Stock weight in kg. Weight units already store kg; counted units
 * (bag, unidade) need a per-piece weight to convert. Returns null when unknown.
 */
export function stockInKg(product: WeighableProduct): number | null {
  if (isWeightUnit(product.unit)) return product.current_stock;
  if (product.unit === 'ton') return product.current_stock * 1000;
  if (product.bag_weight) return product.current_stock * product.bag_weight;
  return null;
}

/** Number of bags/sacos, when the stock is stored in kg and the bag weight is known. */
export function stockInBags(product: WeighableProduct): number | null {
  if (isWeightUnit(product.unit) && product.bag_weight) return product.current_stock / product.bag_weight;
  return null;
}

export function formatKg(kg: number): string {
  return `${kg.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg`;
}
