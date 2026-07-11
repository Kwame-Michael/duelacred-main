import { describe, expect, it } from "vitest";
import { calculateInvestorWalletBalance } from "./investorBalance";

describe("calculateInvestorWalletBalance", () => {
  it("subtracts total invested from verified funding", () => {
    expect(calculateInvestorWalletBalance(1500, 350)).toBe(1150);
  });

  it("never reports a negative balance", () => {
    expect(calculateInvestorWalletBalance(100, 200)).toBe(0);
  });
});
