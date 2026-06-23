import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase, fetchRecords, createRecord } from "@/lib/supabase";
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
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

const PENDING_PROFILE_KEY = "duelacred_pending_profile";
const LOCAL_USER_KEY = "duelacred_user";

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
    const normalizedEmail = email.toLowerCase();
    localStorage.setItem(PENDING_PROFILE_KEY, JSON.stringify({ name, email: normalizedEmail, role }));
    const redirectTo = `${window.location.origin}/auth?role=${encodeURIComponent(role)}`;
    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        emailRedirectTo: redirectTo,
      },
    });
    if (error) throw error;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
