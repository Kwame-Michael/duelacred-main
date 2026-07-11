import { describe, expect, it } from "vitest";
import { buildPaymentGuideLines, generatePaymentGuideBlob, getDefaultPaymentGuideContent } from "./paymentGuide";

describe("payment guide PDF", () => {
  it("creates a downloadable PDF blob", async () => {
    const blob = await generatePaymentGuideBlob("Test User");

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("application/pdf");
    expect(blob.size).toBeGreaterThan(0);
  });

  it("preserves custom guide content and blank lines", () => {
    const content = ["Duela Cred Manual Payment Guide", "", "Bank Transfer", "Account: 123"].join("\n");

    expect(buildPaymentGuideLines(content)).toEqual([
      "Duela Cred Manual Payment Guide",
      "",
      "Bank Transfer",
      "Account: 123",
    ]);
  });

  it("falls back to the default guide when content is empty", () => {
    expect(buildPaymentGuideLines("")).toEqual(getDefaultPaymentGuideContent().split("\n"));
  });
});
