import { fetchRecords } from "@/lib/supabase";

const LOCAL_USER_KEY = "duelacred_user";
const NEW_INVESTOR_SIGNUP_KEY = "duelacred_new_investor_signup";

const getStoredProfileEmail = () => {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(LOCAL_USER_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return typeof parsed?.email === "string" ? parsed.email.toLowerCase() : null;
  } catch {
    return null;
  }
};

const getStoredProfile = () => {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(LOCAL_USER_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as { email?: string; intent?: "sign-in" | "create-account" };
    return parsed;
  } catch {
    return null;
  }
};

export const markNewInvestorSignup = () => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(NEW_INVESTOR_SIGNUP_KEY, "true");
};

export const clearNewInvestorSignup = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(NEW_INVESTOR_SIGNUP_KEY);
};

const hasNewInvestorSignup = () => {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(NEW_INVESTOR_SIGNUP_KEY) === "true";
};

export const isInvestorVerificationPending = (status?: string | null) => {
  if (!status) return false;
  return /pending|review|verification/i.test(status);
};

export const shouldRequireOtp = async (email: string) => {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    return true;
  }

  const storedEmail = getStoredProfileEmail();
  if (storedEmail && storedEmail === normalizedEmail) {
    return false;
  }

  try {
    const existingUsers = await fetchRecords("Users", `{Email} = '${normalizedEmail}'`);
    return existingUsers.length === 0;
  } catch {
    return true;
  }
};

export const resolvePostAuthDestination = async (email: string, role: "investor" | "sme") => {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    return role === "sme" ? "/dashboard/sme" : "/dashboard/investor";
  }

  if (role === "investor" && hasNewInvestorSignup()) {
    return "/onboarding/investor";
  }

  const storedProfile = getStoredProfile();
  const storedEmail = getStoredProfileEmail();
  if (storedEmail && storedEmail === normalizedEmail) {
    return role === "sme" ? "/dashboard/sme" : "/dashboard/investor";
  }

  try {
    const existingUsers = await fetchRecords("Users", `{Email} = '${normalizedEmail}'`);
    if (existingUsers.length > 0) {
      return role === "sme" ? "/dashboard/sme" : "/dashboard/investor";
    }
  } catch {
    return role === "sme" ? "/onboarding/sme" : "/onboarding/investor";
  }

  return role === "sme" ? "/onboarding/sme" : "/onboarding/investor";
};
