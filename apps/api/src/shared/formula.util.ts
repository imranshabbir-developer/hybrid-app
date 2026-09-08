/** Shared Excel formula helpers for ITS / histories / reports / parity tests. */

export function daysBetween(a?: Date | null, b?: Date | null): number | null {
  if (!a || !b) return null;
  const ms = a.getTime() - b.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

export function addDays(d: Date, days: number): Date {
  const out = new Date(d.getTime());
  out.setUTCDate(out.getUTCDate() + days);
  return out;
}

export function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Elapsed Lead Time = TODAY − PPC Demand date */
export function elapsedLeadTime(today: Date, ppcDemandDate: Date | null | undefined) {
  if (!ppcDemandDate) return null;
  return daysBetween(startOfUtcDay(today), startOfUtcDay(ppcDemandDate));
}

/** Remaining Lead Time = Standard Lead Time − Elapsed */
export function remainingLeadTime(standard: number, elapsed: number | null) {
  if (elapsed == null) return null;
  return standard - elapsed;
}

/** PO TAT = PO Date − PPC Demand date */
export function poTat(poDate: Date | null | undefined, ppcDemandDate: Date | null | undefined) {
  if (!poDate || !ppcDemandDate) return null;
  return daysBetween(startOfUtcDay(poDate), startOfUtcDay(ppcDemandDate));
}

/** Supplier Delivery Date = PO Date + Supplier Delivery time (days) */
export function supplierDeliveryDate(
  poDate: Date | null | undefined,
  supplierDeliveryTimeDays: number | null | undefined,
) {
  if (!poDate || supplierDeliveryTimeDays == null) return null;
  return addDays(startOfUtcDay(poDate), supplierDeliveryTimeDays);
}

/** Delay against supplier LT = Supplier Delivery Date − Actual Ready */
export function delayAgainstSupplier(
  delivery: Date | null | undefined,
  actualReady: Date | null | undefined,
) {
  if (!delivery || !actualReady) return null;
  return daysBetween(startOfUtcDay(delivery), startOfUtcDay(actualReady));
}

/** FETA = Standard Lead Time + PPC Demand date */
export function fetaDate(ppcDemandDate: Date | null | undefined, standardLeadTime: number) {
  if (!ppcDemandDate) return null;
  return addDays(startOfUtcDay(ppcDemandDate), standardLeadTime);
}

/** Total Amount = Quantity shipped × Unit Value */
export function totalAmount(qtyShipped: number, unitValue: number) {
  return Number((Number(qtyShipped || 0) * Number(unitValue || 0)).toFixed(4));
}

export function delayBucket(delayDays: number | null | undefined, from: number, to: number) {
  if (delayDays == null) return null;
  const above = -delayDays;
  if (above >= from && above <= to) return above;
  return null;
}
