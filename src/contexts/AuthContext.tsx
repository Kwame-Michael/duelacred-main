import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase, fetchRecords, createRecord, backfillAuthOwnershipForCurrentUser, SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase";
import { clearPendingOtp, generateOtpCode, getPendingOtp, getAuthRedirectUrl, isAuthCallbackPath, OTP_EXPIRY_MS, storePendingOtp } from "@/lib/auth";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface User {
  email: string;
  name: string;
  role: "investor" | "sme" | "admin";
  recordId?: string;
  wallet?: number;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (name: string, email: string, role: "investor" | "sme" | "admin") => Promise<void>;
  verifyOtp: (email: string, otp: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  verifyOtp: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

const PENDING_PROFILE_KEY = "duelacred_pending_profile";
const LOCAL_USER_KEY = "duelacred_user";
const OTP_THROTTLE_KEY = "duelacred_otp_last_sent";
const OTP_THROTTLE_MS = 60_000;

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const setCurrentUser = (profile: User | null) => {
    if (profile) {
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(profile));
    } else {
      localStorage.removeItem(LOCAL_USER_KEY);
    }
    setUser(profile);
  };

  const getPendingProfile = () => {
    const stored = localStorage.getItem(PENDING_PROFILE_KEY);
    if (!stored) return null;
    try {
      return JSON.parse(stored) as { name: string; email: string; role: "investor" | "sme" };
    } catch {
      return null;
    }
  };

  const clearPendingProfile = () => {
    localStorage.removeItem(PENDING_PROFILE_KEY);
  };

  const ensureUserProfile = async (supabaseUser: SupabaseUser | null) => {
    if (!supabaseUser?.email) return;
    const normalizedEmail = supabaseUser.email.toLowerCase();
    try {
      const records = await fetchRecords("Users", `{Email} = '${normalizedEmail}'`);
      if (records.length > 0) {
        const profileRecord = records[0];
        const profileRole = ((profileRecord.fields as Record<string, unknown>)["Role"] as string || "investor").toLowerCase() as "investor" | "sme" | "admin";
        const profileName = ((profileRecord.fields as Record<string, unknown>)["Name"] as string) || normalizedEmail;
        const walletBal = Number((profileRecord.fields as Record<string, unknown>)["Wallet Balance"] || 0);
        await backfillAuthOwnershipForCurrentUser(normalizedEmail);
        setCurrentUser({
          email: normalizedEmail,
          name: profileName,
          role: profileRole,
          recordId: profileRecord.id,
          wallet: isNaN(walletBal) ? 0 : walletBal,
        });
        return;
      }

      const pending = getPendingProfile();
      const name = pending?.name || supabaseUser.user_metadata?.full_name || normalizedEmail.split("@")[0];
      const role = pending?.role || "investor";
      const created = await createRecord("Users", {
        Name: name,
        Email: normalizedEmail,
        Role: role.charAt(0).toUpperCase() + role.slice(1),
        "Created Date": new Date().toISOString().split("T")[0],
        "Wallet Balance": 0,
      });
      clearPendingProfile();
      await backfillAuthOwnershipForCurrentUser(normalizedEmail);
      setCurrentUser({
        email: normalizedEmail,
        name,
        role,
        recordId: created.id,
        wallet: 0,
      });
    } catch {
      const stored = localStorage.getItem(LOCAL_USER_KEY);
      if (stored) {
        try {
          setUser(JSON.parse(stored));
        } catch {
          setCurrentUser(null);
        }
      }
    }
  };

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user) {
        await ensureUserProfile(data.session.user);
      } else if (isAuthCallbackPath(window.location.pathname)) {
        const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(window.location.href);
        if (session?.user) {
          await ensureUserProfile(session.user);
        } else if (error) {
          console.error("Auth callback exchange failed", error);
        }
      } else {
        const stored = localStorage.getItem(LOCAL_USER_KEY);
        if (stored) {
          try {
            setUser(JSON.parse(stored));
          } catch {
            setCurrentUser(null);
          }
        }
      }
      setLoading(false);
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await ensureUserProfile(session.user);
      } else {
        setCurrentUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (name: string, email: string, role: "investor" | "sme" | "admin") => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) {
      throw new Error("Please enter a valid email address.");
    }

    const lastSent = Number(localStorage.getItem(OTP_THROTTLE_KEY) || "0");
    if (Date.now() - lastSent < OTP_THROTTLE_MS) {
      throw new Error("A sign-in code was already sent recently. Please wait a minute and try again.");
    }

    localStorage.setItem(PENDING_PROFILE_KEY, JSON.stringify({ name, email: normalizedEmail, role }));

    const otp = generateOtpCode();
    const expiresAt = Date.now() + OTP_EXPIRY_MS;
    storePendingOtp({ email: normalizedEmail, name: name.trim(), role, otp, expiresAt });
    localStorage.setItem(OTP_THROTTLE_KEY, String(Date.now()));

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/sendOtp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ email: normalizedEmail, otp }),
      });

      const data = await response.json();
      if (!response.ok) {
        clearPendingOtp();
        throw new Error(data.error || "Unable to send sign-in code. Please try again.");
      }
    } catch (error) {
      clearPendingOtp();
      const message = error instanceof Error ? error.message : "Unable to send sign-in code. Please try again.";
      throw new Error(message);
    }
  };

  const verifyOtp = async (email: string, otp: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    const pending = getPendingOtp();

    if (!pending || pending.email !== normalizedEmail) {
      throw new Error("No pending sign-in request found.");
    }

    if (Date.now() > pending.expiresAt) {
      clearPendingOtp();
      throw new Error("The sign-in code has expired. Please request a new one.");
    }

    if (pending.otp !== otp.trim()) {
      throw new Error("The sign-in code is incorrect.");
    }

    clearPendingOtp();
    const fallbackUser = {
      email: normalizedEmail,
      name: pending.name.trim() || normalizedEmail.split("@")[0],
      role: pending.role,
      wallet: 0,
    } as User;
    setCurrentUser(fallbackUser);
    localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(fallbackUser));
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, verifyOtp, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
