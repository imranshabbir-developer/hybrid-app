/**
 * Formula parity checks against ERP_FULL_PLAN.md §11.3
 * Run: node scripts/formula-parity.js
 */
const assert = require('assert');
const path = require('path');

// Compile-free copy of formula.util (keep in sync with apps/api/src/shared/formula.util.ts)
function daysBetween(a, b) {
  if (!a || !b) return null;
  return Math.round((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}
function addDays(d, days) {
  const out = new Date(d.getTime());
  out.setUTCDate(out.getUTCDate() + days);
  return out;
}
function startOfUtcDay(d) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
function elapsedLeadTime(today, ppc) {
  if (!ppc) return null;
  return daysBetween(startOfUtcDay(today), startOfUtcDay(ppc));
}
function remainingLeadTime(standard, elapsed) {
  if (elapsed == null) return null;
  return standard - elapsed;
}
function poTat(poDate, ppc) {
  if (!poDate || !ppc) return null;
  return daysBetween(startOfUtcDay(poDate), startOfUtcDay(ppc));
}
function supplierDeliveryDate(poDate, days) {
  if (!poDate || days == null) return null;
  return addDays(startOfUtcDay(poDate), days);
}
function delayAgainstSupplier(delivery, actual) {
  if (!delivery || !actual) return null;
  return daysBetween(startOfUtcDay(delivery), startOfUtcDay(actual));
}
function fetaDate(ppc, standard) {
  if (!ppc) return null;
  return addDays(startOfUtcDay(ppc), standard);
}
function totalAmount(qty, unit) {
  return Number((Number(qty || 0) * Number(unit || 0)).toFixed(4));
}

const ppc = new Date(Date.UTC(2020, 0, 1)); // 2020-01-01
const today = new Date(Date.UTC(2020, 0, 31)); // +30 days
const po = new Date(Date.UTC(2020, 0, 6)); // +5 from ppc
const standard = 85;
const supplierDays = 45;

const elapsed = elapsedLeadTime(today, ppc);
assert.strictEqual(elapsed, 30, 'Elapsed Lead Time');

const remaining = remainingLeadTime(standard, elapsed);
assert.strictEqual(remaining, 55, 'Remaining Lead Time');

const tat = poTat(po, ppc);
assert.strictEqual(tat, 5, 'PO TAT');

const delivery = supplierDeliveryDate(po, supplierDays);
assert.strictEqual(delivery.toISOString().slice(0, 10), '2020-02-20', 'Supplier Delivery Date');

const actualReady = new Date(Date.UTC(2020, 1, 25)); // 2020-02-25
const delay = delayAgainstSupplier(delivery, actualReady);
assert.strictEqual(delay, -5, 'Delay against supplier LT (delivery − actual)');

const feta = fetaDate(ppc, standard);
assert.strictEqual(feta.toISOString().slice(0, 10), '2020-03-26', 'FETA');

assert.strictEqual(totalAmount(100, 1.45), 145, 'Total Amount = qty × unit');

console.log('formula-parity: all checks passed');
console.log(`source util: ${path.resolve(__dirname, '../apps/api/src/shared/formula.util.ts')}`);
