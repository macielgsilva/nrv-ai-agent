import type { NrvService } from "./nrv-catalog";

export type QuoteItem = {
  service: NrvService;
  quantity: number;
};

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function calculateQuoteTotal(items: QuoteItem[]) {
  return items.reduce((total, item) => total + item.service.price * item.quantity, 0);
}

export function getQuoteItemCount(items: QuoteItem[]) {
  return items.reduce((total, item) => total + item.quantity, 0);
}

export function buildQuoteSummary(items: QuoteItem[]) {
  const total = calculateQuoteTotal(items);
  const lines = items.map(
    (item) =>
      `• ${item.quantity}x ${item.service.item} — ${formatCurrency(item.service.price * item.quantity)}`,
  );

  return [
    "Pré-orçamento — NRV Informática",
    "",
    ...lines,
    "",
    `Total estimado: ${formatCurrency(total)}`,
    "Valores sujeitos à confirmação após avaliação técnica.",
  ].join("\n");
}
