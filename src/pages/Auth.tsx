import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import logo from "@/assets/duela_cred_logo.png";
import { toast } from "sonner";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const defaultRole = searchParams.get("role") === "sme" ? "sme" : "investor";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"investor" | "sme">(defaultRole as "investor" | "sme");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { user, login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (window.location.search.includes("access_token") || window.location.search.includes("refresh_token")) {
      (async () => {
        const { data, error } = await supabase.auth.getSessionFromUrl();
        if (error) {
          toast.error("Unable to complete sign in.");
          return;
        }
        if (data?.session?.user) {
          toast.success("Signed in successfully!");
          navigate(searchParams.get("role") === "sme" ? "/dashboard/sme" : "/dashboard/investor");
        }
      })();
    }
  }, [navigate, searchParams]);

  useEffect(() => {
    if (user) {
      navigate(user.role === "sme" ? "/dashboard/sme" : "/dashboard/investor");
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    setLoading(true);
    try {
      await login(name.trim(), email.trim().toLowerCase(), role);
      setSent(true);
      toast.success("Check your email for the login link.");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <img src={logo} alt="Duela Cred" className="h-10 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground">Get Started</h1>
          <p className="text-muted-foreground text-sm mt-1">Sign in or create your account</p>
        </div>

        {sent ? (
          <div className="bg-card rounded-xl border border-border p-6 shadow-sm text-center">
            <h2 className="text-xl font-bold text-foreground">Email link sent</h2>
            <p className="text-muted-foreground mt-3">Check your inbox and click the magic link to complete sign in.</p>
            <p className="text-sm text-muted-foreground mt-4">If you don't see it, check spam or try again.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-card rounded-xl border border-border p-6 space-y-4 shadow-sm">
            <div>
              <label className="text-sm font-medium text-foreground">Full Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Amina Okafor" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Email</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="amina@example.com" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">I am an…</label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setRole("investor")}
                  className={`rounded-lg border-2 p-3 text-sm font-medium transition-all ${
                    role === "investor" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground"
                  }`}
                >
                  💰 Investor
                </button>
                <button
                  type="button"
                  onClick={() => setRole("sme")}
                  className={`rounded-lg border-2 p-3 text-sm font-medium transition-all ${
                    role === "sme" ? "border-accent bg-accent/10 text-foreground" : "border-border text-muted-foreground"
                  }`}
                >
                  🏪 SME Owner
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? "Sending link…" : "Continue"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Auth;
