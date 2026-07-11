import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchRecord, fetchRecords, createRecord, updateRecord, type RecordItem } from "@/lib/supabase";
import { emitDataRefresh } from "@/lib/refresh";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Spinner from "@/components/Spinner";
import { toast } from "sonner";
import { ArrowLeft, Target, TrendingUp, Clock, DollarSign } from "lucide-react";
import { Link } from "react-router-dom";
import { isInvestorVerificationPending } from "@/lib/onboarding";

interface ListingFields {
  "Business Name": string;
  Description: string;
  Category: string;
  "Funding Goal": number;
  "Amount Raised": number;
  "Return Multiple": number;
  "Repayment Months": number;
  "Repayment Progress %": number;
  Status: string;
  "Logo URL": string;
}

interface OnboardingFields {
  Status?: string;
}

const Opportunity = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [listing, setListing] = useState<RecordItem<ListingFields> | null>(null);
  const [loading, setLoading] = useState(true);
  const [investOpen, setInvestOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [investing, setInvesting] = useState(false);
  const [walletPending, setWalletPending] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchRecord<ListingFields>("Listings", id)
      .then(setListing)
      .catch(() => toast.error("Failed to load listing"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!user?.email || user.role !== "investor") {
      setWalletPending(false);
      return;
    }

    const checkPendingStatus = async () => {
      try {
        const onboarding = await fetchRecords<OnboardingFields>("Investor_Onboarding", `{Email} = '${user.email.toLowerCase()}'`);
        setWalletPending(onboarding.some((record) => isInvestorVerificationPending(record.fields.Status)));
      } catch {
        setWalletPending(false);
      }
    };

    checkPendingStatus();
  }, [user?.email, user?.role]);

  const handleInvest = async () => {
    if (!listing || !user) return;
    if (walletPending) {
      toast.error("Your wallet is still pending verification. Investments are temporarily disabled until your account is activated.");
      return;
    }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt < 10) {
      toast.error("Minimum investment is $10");
      return;
    }
    setInvesting(true);
    try {
      const f = listing.fields;
      await createRecord("Investments", {
        "Investor Email": user.email,
        "Listing ID": listing.id,
        "Business Name": f["Business Name"],
        "Amount Invested": amt,
        "Expected Return": amt * (f["Return Multiple"] || 1),
        Date: new Date().toISOString().split("T")[0],
      });
      await updateRecord("Listings", listing.id, {
        "Amount Raised": (f["Amount Raised"] || 0) + amt,
      });
      setListing({
        ...listing,
        fields: { ...f, "Amount Raised": (f["Amount Raised"] || 0) + amt },
      });
      emitDataRefresh("investment-created");
      setInvestOpen(false);
      setAmount("");
      toast.success("Investment confirmed! 🎉");
    } catch {
      toast.error("Investment failed. Please try again.");
    } finally {
      setInvesting(false);
    }
  };

  if (loading) return <Spinner />;
  if (!listing) return <div className="container py-20 text-center text-muted-foreground">Listing not found.</div>;

  const f = listing.fields;
  const pct = f["Funding Goal"] > 0 ? Math.min(100, Math.round(((f["Amount Raised"] || 0) / f["Funding Goal"]) * 100)) : 0;

  return (
    <div className="container py-10 max-w-3xl">
      <Link to="/marketplace" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Marketplace
      </Link>

      <div className="bg-card rounded-xl border border-border p-8 space-y-6">
        <div className="flex items-start gap-4">
          {f["Logo URL"] && <img src={f["Logo URL"]} alt="" className="h-16 w-16 rounded-xl object-cover" />}
          <div>
            <h1 className="text-2xl font-bold text-foreground">{f["Business Name"]}</h1>
            <Badge variant="secondary" className="mt-1">{f.Category}</Badge>
          </div>
        </div>

        <p className="text-muted-foreground leading-relaxed">{f.Description}</p>

        {/* Progress */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">{pct}% funded</span>
            <span className="font-medium">BWP {(f["Amount Raised"] || 0).toLocaleString()} / BWP {f["Funding Goal"].toLocaleString()}</span>
          </div>
          <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Target, label: "Goal", value: `BWP ${f["Funding Goal"].toLocaleString()}` },
            { icon: TrendingUp, label: "Return", value: `${f["Return Multiple"]}x` },
            { icon: Clock, label: "Duration", value: `${f["Repayment Months"]} mo` },
            { icon: DollarSign, label: "Raised", value: `BWP ${(f["Amount Raised"] || 0).toLocaleString()}` },
          ].map((s) => (
            <div key={s.label} className="bg-background rounded-lg p-4 text-center">
              <s.icon className="h-5 w-5 text-primary mx-auto mb-1" />
              <div className="text-xs text-muted-foreground">{s.label}</div>
              <div className="font-semibold text-foreground">{s.value}</div>
            </div>
          ))}
        </div>

        {/* Invest */}
        {!investOpen ? (
          <div className="space-y-2">
            <Button size="lg" className="w-full" disabled={walletPending || !user} onClick={() => {
              if (!user) { toast.error("Please sign in first"); return; }
              if (walletPending) {
                toast.error("Your wallet is still pending verification. Investments are temporarily disabled until your account is activated.");
                return;
              }
              setInvestOpen(true);
            }}>
              {walletPending ? "Wallet pending verification" : "Invest in This Business"}
            </Button>
            {walletPending && <p className="text-sm text-muted-foreground text-center">Your account is still being verified, so investing is temporarily disabled.</p>}
          </div>
        ) : (
          <div className="bg-background rounded-lg p-4 space-y-3 border border-border">
            <label className="text-sm font-medium text-foreground">Investment Amount (min $10)</label>
            <Input
              type="number"
              min={10}
              placeholder="100"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            {amount && parseFloat(amount) >= 10 && (
              <p className="text-sm text-muted-foreground">
                Expected return: <span className="font-semibold text-accent">BWP {(parseFloat(amount) * (f["Return Multiple"] || 1)).toFixed(2)}</span>
              </p>
            )}
            <div className="flex gap-2">
              <Button onClick={handleInvest} disabled={investing || walletPending} className="flex-1">
                {investing ? "Processing…" : walletPending ? "Wallet pending" : "Confirm Investment"}
              </Button>
              <Button variant="ghost" onClick={() => setInvestOpen(false)}>Cancel</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Opportunity;
