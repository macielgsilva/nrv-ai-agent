import { describe, expect, it } from "vitest";

import { NRV_SERVICES } from "../lib/nrv-catalog";
import { buildQuoteSummary, calculateQuoteTotal, formatCurrency } from "../lib/quote-utils";

describe("quote utilities", () => {
  it("sums quantities and service prices precisely", () => {
    const items = [
      { service: NRV_SERVICES[5], quantity: 1 },
      { service: NRV_SERVICES[6], quantity: 2 },
    ];

    expect(calculateQuoteTotal(items)).toBe(350);
  });

  it("formats a Brazilian currency value and includes it in the summary", () => {
    const items = [{ service: NRV_SERVICES[8], quantity: 1 }];

    expect(formatCurrency(130)).toContain("130,00");
    expect(buildQuoteSummary(items)).toContain("Total estimado");
    expect(buildQuoteSummary(items)).toContain("Sistema de Refrigeração");
  });
});
