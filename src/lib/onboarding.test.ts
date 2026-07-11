import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchRecords } from "@/lib/supabase";
import { clearNewInvestorSignup, isInvestorVerificationPending, markNewInvestorSignup, resolvePostAuthDestination, shouldRequireOtp } from "@/lib/onboarding";

vi.mock("@/lib/supabase", () => ({
  fetchRecords: vi.fn(),
}));

const mockedFetchRecords = vi.mocked(fetchRecords);

describe("resolvePostAuthDestination", () => {
  beforeEach(() => {
    mockedFetchRecords.mockReset();
    localStorage.clear();
    clearNewInvestorSignup();
  });

  it("routes a new investor to onboarding", async () => {
    mockedFetchRecords.mockResolvedValue([]);

    await expect(resolvePostAuthDestination("investor@example.com", "investor")).resolves.toBe("/onboarding/investor");
  });

  it("routes an existing user to the dashboard", async () => {
    mockedFetchRecords.mockResolvedValue([{ id: "1", fields: {} }]);

    await expect(resolvePostAuthDestination("investor@example.com", "investor")).resolves.toBe("/dashboard/investor");
  });

  it("keeps a new investor signup on onboarding after authentication", async () => {
    markNewInvestorSignup();
    mockedFetchRecords.mockResolvedValue([{ id: "1", fields: {} }]);

    await expect(resolvePostAuthDestination("investor@example.com", "investor")).resolves.toBe("/onboarding/investor");
  });

  it("routes a new SME owner to SME onboarding", async () => {
    mockedFetchRecords.mockResolvedValue([]);

    await expect(resolvePostAuthDestination("sme@example.com", "sme")).resolves.toBe("/onboarding/sme");
  });

  it("requires otp for a fresh email address", async () => {
    mockedFetchRecords.mockResolvedValue([]);

    await expect(shouldRequireOtp("new@example.com")).resolves.toBe(true);
  });

  it("skips otp for an existing user email", async () => {
    mockedFetchRecords.mockResolvedValue([{ id: "1", fields: {} }]);

    await expect(shouldRequireOtp("existing@example.com")).resolves.toBe(false);
  });
});
