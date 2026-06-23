import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchRecords, createRecord, uploadFile, getPublicFileUrl, STORAGE_BUCKET, type AirtableRecord } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import Spinner from "@/components/Spinner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import UploadBox from "@/components/onboarding/UploadBox";
import Disclaimer from "@/components/onboarding/Disclaimer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wallet, TrendingUp, ArrowDownToLine, Briefcase, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface InvestmentFields {
  "Investor Email": string;
  "Listing ID": string;
  "Business Name": string;
  "Amount Invested": number;
  "Expected Return": number;
  Date: string;
  Status?: string;
  Category?: string;
  "Repayment Progress"?: number;
  "Next Repayment Date"?: string;
}

interface OnboardingFields {
  Band: string;
  Email: string;
  "Amount Transferred": number;
  Status: string;
}

const bandStyles: Record<string, string> = {
  Peo: "bg-accent/20 text-foreground border-accent",
  Kgolo: "bg-primary/15 text-primary border-primary",
  Khumo: "bg-foreground text-background border-foreground",
};

const InvestorDashboard = () => {
  const { user } = useAuth();
  const [investments, setInvestments] = useState<AirtableRecord<InvestmentFields>[]>([]);
  const [loading, setLoading] = useState(true);
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [topUpFile, setTopUpFile] = useState<File | null>(null);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletStatus, setWalletStatus] = useState("Pending verification");
  const [band, setBand] = useState((typeof window !== "undefined" ? localStorage.getItem("duelacred_band") : null) || "Peo");

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [inv, onboarding] = await Promise.all([
          fetchRecords<InvestmentFields>("Investments", `{Investor Email} = '${user.email}'`),
          fetchRecords<OnboardingFields>("Investor_Onboarding", `{Email} = '${user.email}'`),
        ]);

        setInvestments(inv);
        if (onboarding.length > 0) {
          const latest = onboarding[0];
          const onboardingBand = latest.fields.Band;
          if (onboardingBand) {
            setBand(onboardingBand);
            localStorage.setItem("duelacred_band", onboardingBand);
          }

          const status = latest.fields.Status?.toLowerCase() || "pending verification";
          if (status.includes("pending")) {
            setWalletBalance(0);
            setWalletStatus("Pending verification");
          } else {
            setWalletBalance(latest.fields["Amount Transferred"] || 0);
            setWalletStatus("Active");
          }
        }
      } catch {
        setWalletBalance(0);
        setWalletStatus("Pending verification");
      }
      setLoading(false);
    })();
  }, [user]);

  if (loading) return <Spinner />;

  const totalInvested = investments.reduce((s, i) => s + (i.fields["Amount Invested"] || 0), 0);
  const totalReturned = investments.reduce((s, i) => s + ((i.fields["Expected Return"] || 0) * ((i.fields["Repayment Progress"] || 0) / 100)), 0);
  const active = investments.filter((i) => (i.fields.Status || "Active") !== "Completed").length;
  const wallet = user?.wallet ?? 0;

  const submitTopUp = () => {
    if (!topUpFile || !topUpAmount) { toast.error("Add file and amount"); return; }
    toast.success("Top-up proof submitted for review");
    setTopUpFile(null); setTopUpAmount(""); setTopUpOpen(false);
  };

  return (
    <div className="container py-10 px-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <h1 className="text-3xl font-bold text-foreground">Investor Dashboard</h1>
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border-2 ${bandStyles[band] || bandStyles.Peo}`}>
          <Sparkles className="h-3 w-3" /> {band} band
        </span>
      </div>
      <p className="text-muted-foreground mb-8">Track your investments and returns</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { icon: Wallet, label: "Wallet Balance", value: `BWP ${wallet.toLocaleString()}`, color: "text-accent" },
          { icon: TrendingUp, label: "Total Invested", value: `BWP ${totalInvested.toLocaleString()}`, color: "text-primary" },
          { icon: ArrowDownToLine, label: "Total Returned", value: `BWP ${Math.round(totalReturned).toLocaleString()}`, color: "text-accent" },
          { icon: Briefcase, label: "Active Campaigns", value: active.toString(), color: "text-primary" },
        ].map((c) => (
          <div key={c.label} className="bg-card rounded-xl border border-border p-5">
            <c.icon className={`h-5 w-5 ${c.color} mb-2`} />
            <div className="text-xs text-muted-foreground">{c.label}</div>
            <div className="text-xl md:text-2xl font-bold text-foreground mt-0.5">{c.value}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-foreground">Active Campaigns</h2>
        <Button size="sm" variant="outline" onClick={() => setTopUpOpen((v) => !v)}>
          <Plus className="h-4 w-4 mr-1" /> Upload Additional Proof
        </Button>
      </div>

      {topUpOpen && (
        <div className="bg-card rounded-xl border border-border p-5 mb-6 space-y-4">
          <UploadBox onFileChange={setTopUpFile} />
          <div>
            <Label>Amount Transferred (BWP)</Label>
            <Input type="number" className="mt-1" value={topUpAmount} onChange={(e) => setTopUpAmount(e.target.value)} />
          </div>
          <Button onClick={submitTopUp} className="w-full">Submit Proof</Button>
          </div>
        )}

      {investments.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-xl border border-border">
          <Briefcase className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground">Your wallet is being activated</h3>
          <p className="text-muted-foreground text-sm mt-2 max-w-md mx-auto">
            Once confirmed you will be matched to campaigns that fit your Peo / Kgolo / Khumo band automatically.
          </p>
          <Button asChild className="mt-5"><Link to="/marketplace">Browse Marketplace</Link></Button>
        </div>
      ) : (
        <div className="space-y-3">
          {investments.map((inv) => {
            const f = inv.fields;
            const progress = f["Repayment Progress"] || 0;
            const status = f.Status || "Active";
            const statusColor = status === "Late" ? "destructive" : status === "Completed" ? "secondary" : "default";
            return (
              <div key={inv.id} className="bg-card rounded-xl border border-border p-5">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                  <div>
                    <h3 className="font-semibold text-foreground">{f["Business Name"]}</h3>
                    {f.Category && <span className="text-xs px-2 py-0.5 rounded bg-muted mt-1 inline-block">{f.Category}</span>}
                  </div>
                  <Badge variant={statusColor as "default" | "destructive" | "secondary"}>{status}</Badge>
                </div>
                <div className="text-sm text-muted-foreground mb-2">
                  Invested: <span className="font-semibold text-foreground">BWP {(f["Amount Invested"] || 0).toLocaleString()}</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-1.5">
                  <div className="h-full bg-accent rounded-full" style={{ width: `${progress}%` }} />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{progress}% repaid</span>
                  {f["Next Repayment Date"] && <span>Next: {f["Next Repayment Date"]}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Disclaimer />
    </div>
  );
};

export default InvestorDashboard;
