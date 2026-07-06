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
