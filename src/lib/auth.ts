export const DEFAULT_AUTH_CALLBACK_PATH = "/auth/callback";
export const PENDING_OTP_KEY = "duelacred_pending_otp";
export const OTP_EXPIRY_MS = 10 * 60 * 1000;

export const getAuthRedirectUrl = (origin?: string) => {
  if (!origin) return DEFAULT_AUTH_CALLBACK_PATH;
  return `${origin}${DEFAULT_AUTH_CALLBACK_PATH}`;
};

export const isAuthCallbackPath = (pathname = typeof window !== "undefined" ? window.location.pathname : "") => pathname === DEFAULT_AUTH_CALLBACK_PATH;

export const generateOtpCode = () => Math.floor(100000 + Math.random() * 900000).toString();

export const storePendingOtp = (payload: { email: string; name: string; role: "investor" | "sme" | "admin"; otp: string; expiresAt: number }) => {
  localStorage.setItem(PENDING_OTP_KEY, JSON.stringify(payload));
};

export const getPendingOtp = () => {
  const stored = localStorage.getItem(PENDING_OTP_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as { email: string; name: string; role: "investor" | "sme" | "admin"; otp: string; expiresAt: number };
  } catch {
    localStorage.removeItem(PENDING_OTP_KEY);
    return null;
  }
};

export const clearPendingOtp = () => {
  localStorage.removeItem(PENDING_OTP_KEY);
};
