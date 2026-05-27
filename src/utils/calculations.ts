export function calcTotalQty(qtyPerSet: number, numberOfSets: number): number {
  return Math.round(qtyPerSet * numberOfSets)
}
