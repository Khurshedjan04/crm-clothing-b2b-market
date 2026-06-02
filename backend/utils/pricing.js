/**
 * Resolves the unit price for a given quantity using tier pricing.
 * Falls back to pricePerUnit if no tier matches.
 *
 * tierPricing must be sorted ascending by minQty — highest qualifying tier wins.
 */
function resolveUnitPrice(quantity, pricePerUnit, tierPricing = []) {
  if (!tierPricing.length) return pricePerUnit;

  // Walk tiers from highest minQty down; first one that qualifies wins
  const sorted = [...tierPricing].sort((a, b) => b.minQty - a.minQty);
  const match = sorted.find((t) => quantity >= t.minQty);
  return match ? match.pricePerUnit : pricePerUnit;
}

/**
 * Calculates total for an array of { product, quantity } using the
 * product's tier pricing. Returns the line totals and grand total.
 */
function calculateOrderTotals(items) {
  let subtotal = 0;
  const resolvedItems = items.map((item) => {
    const unitPrice = resolveUnitPrice(
      item.quantity,
      item.product.pricePerUnit,
      item.product.tierPricing
    );
    const lineTotal = unitPrice * item.quantity;
    subtotal += lineTotal;
    return { ...item, unitPrice };
  });
  return { resolvedItems, subtotal, totalAmount: subtotal };
}

module.exports = { resolveUnitPrice, calculateOrderTotals };
