export function centsToEuros(cents: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format((cents || 0) / 100)
}
export function eurosToCents(input: string | number): number {
  if (typeof input === 'number') return Math.round(input * 100)
  const normalized = input.trim().replace(/\./g, '').replace(',', '.')
  return Math.round(Number(normalized || 0) * 100)
}
export function percentCents(baseCents: number, percent: number): number { return Math.round(baseCents * (percent / 100)) }
export function calcLiquidacion(preciosCents: number[], irpfPercent = 15) {
  const subtotal = preciosCents.reduce((a, b) => a + b, 0)
  const irpf = percentCents(subtotal, irpfPercent)
  return { subtotal, irpf, total: subtotal - irpf }
}
