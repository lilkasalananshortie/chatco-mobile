import type { Transaction } from "./types";

/** Match web: settled server fares plus locally recorded cash awaiting sync. */
export function transactionSummary(transactions: Transaction[]) {
  return transactions.reduce((sum, transaction) => {
    if (transaction.status !== undefined && transaction.status !== "PAID") return sum;
    sum.total += transaction.finalAmount;
    if (transaction.paymentMethod === "Cash") sum.cash += transaction.finalAmount;
    else if (transaction.paymentMethod === "Voucher") sum.voucher += transaction.finalAmount;
    else sum.gcash += transaction.finalAmount;
    return sum;
  }, { total: 0, cash: 0, gcash: 0, voucher: 0 });
}
