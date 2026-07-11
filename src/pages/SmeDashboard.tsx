import { useEffect, useState } from "react";
import { fetchRecords, createRecord, type RecordItem } from "@/lib/supabase";
import { emitDataRefresh, subscribeToDataRefresh } from "@/lib/refresh";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import Spinner from "@/components/Spinner";
import { Link } from "react-router-dom";
import UploadBox from "@/components/onboarding/UploadBox";
import Disclaimer from "@/components/onboarding/Disclaimer";
import { toast } from "sonner";
import { Clock, CheckCircle2, XCircle, Eye, Plus } from "lucide-react";

interface AppFields {
  "Business Name": string;
  Category: string;
  "Funding Goal": number;
  Status: string;
  "Submitted By Email": string;
  "Submitted Date"?: string;
}

interface ListingFields {
  "Business Name": string;
  "Funding Goal": number;
  "Amount Raised": number;
  "Investor Count"?: number;
  "SME Application ID": string;
}

interface RepaymentFields {
  "Listing ID": string;
  "Month Number": number;
  "Amount Due": number;
  "Amount Paid": number;
  Status: string;
}

const STATUS_MAP: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; tone: string; msg: string }> = {
  Pending: { label: "Pending Review", icon: Clock, tone: "bg-muted text-foreground", msg: "Your application is in the queue. We will begin review shortly." },
  "Under Review": { label: "Under Review", icon: Eye, tone: "bg-primary/15 text-primary", msg: "Our team is reviewing your application. We may contact you for additional information." },
  Approved: { label: "Approved", icon: CheckCircle2, tone: "bg-accent/20 text-foreground", msg: "Congratulations. Your listing is being prepared for the marketplace." },
  Rejected: { label: "Rejected", icon: XCircle, tone: "bg-destructive/15 text-destructive", msg: "We were unable to approve your application at this time. See below for details and next steps." },
};

const SmeDashboard = () => {
  const { user } = useAuth();
  const [application, setApplication] = useState<RecordItem<AppFields> | null>(null);
  const [listing, setListing] = useState<RecordItem<ListingFields> | null>(null);
  const [repayments, setRepayments] = useState<RecordItem<RepaymentFields>[]>([]);
  const [loading, setLoading] = useState(true);

  const [repayOpen, setRepayOpen] = useState(false);
  const [repayMonth, setRepayMonth] = useState("1");
  const [repayAmount, setRepayAmount] = useState("");
  const [repayFile, setRepayFile] = useState<File | null>(null);

  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      let emailToQuery: string | undefined = user?.email;

      if (!emailToQuery) {
        const stored = localStorage.getItem("duelacred_user");
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            emailToQuery = parsed?.email;
          } catch {
            emailToQuery = undefined;
          }
        }
      }

      if (!emailToQuery) {
        setLoading(false);
        return;
      }

      try {
        const apps = await fetchRecords<AppFields>("SME_Applications", `{Submitted By Email} = '${emailToQuery}'`);
        if (apps.length > 0) {
          setApplication(apps[0]);
          if (apps[0].fields.Status === "Approved") {
            const listings = await fetchRecords<ListingFields>("Listings", `{SME Application ID} = '${apps[0].id}'`);
            if (listings.length > 0) {
              setListing(listings[0]);
              const reps = await fetchRecords<RepaymentFields>("Repayments", `{Listing ID} = '${listings[0].id}'`);
              setRepayments(reps);
            }
          }
        }
      } catch (err) {
        console.error("Error loading SME dashboard:", err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
    const unsubscribe = subscribeToDataRefresh(loadDashboardData);
    return unsubscribe;
  }, [user]);

  const submitRepayment = async () => {
    if (!repayAmount || !repayFile) { toast.error("Add amount and proof file"); return; }
    try {
      await createRecord("Repayment_Proofs", {
        "Listing ID": listing?.id || "",
        "Month Number": parseInt(repayMonth),
        "Amount Paid": parseFloat(repayAmount),
        "Proof File": repayFile.name,
        Status: "Pending",
      });
      emitDataRefresh("repayment-proof");
    } catch {}
    toast.success("Repayment proof submitted");
    setRepayOpen(false); setRepayAmount(""); setRepayFile(null);
  };

  if (loading) return <Spinner />;

  if (!application) {
    return (
      <div className="container py-16 max-w-xl text-center px-4">
        <h1 className="text-2xl font-bold text-foreground mb-2">No application yet</h1>
        <p className="text-muted-foreground mb-6">Apply for funding to get started.</p>
        <Button asChild size="lg"><Link to="/onboarding/sme">Start application</Link></Button>
      </div>
    );
  }

  const status = STATUS_MAP[application.fields.Status] || STATUS_MAP.Pending;
  const StatusIcon = status.icon;
  const submittedDate = application.fields["Submitted Date"] || application.createdTime.split("T")[0];
  const expectedDate = (() => {
    const d = new Date(submittedDate); d.setDate(d.getDate() + 5); return d.toISOString().split("T")[0];
  })();

  return (
    <div className="container py-10 max-w-3xl px-4">
      <h1 className="text-3xl font-bold text-foreground mb-6">SME Dashboard</h1>

      {/* Status card */}
      <div className="bg-card rounded-2xl border border-border p-6 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">{application.fields["Business Name"]}</h2>
            <p className="text-xs text-muted-foreground mt-1">Submitted {submittedDate} · Expected review by {expectedDate}</p>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${status.tone}`}>
            <StatusIcon className="h-3.5 w-3.5" /> {status.label}
          </span>
        </div>
        <p className="text-sm text-foreground/80 leading-relaxed">{status.msg}</p>
      </div>

      {listing && (
        <>
          <div className="bg-card rounded-2xl border border-border p-6 mb-6">
            <h3 className="font-bold text-foreground mb-4">Campaign progress</h3>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">
                {Math.round(((listing.fields["Amount Raised"] || 0) / listing.fields["Funding Goal"]) * 100)}% funded
              </span>
              <span className="font-medium">BWP {(listing.fields["Amount Raised"] || 0).toLocaleString()} / {listing.fields["Funding Goal"].toLocaleString()}</span>
            </div>
            <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-accent rounded-full" style={{ width: `${Math.min(100, ((listing.fields["Amount Raised"] || 0) / listing.fields["Funding Goal"]) * 100)}%` }} />
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              {listing.fields["Investor Count"] || 0} investors have contributed
            </p>
          </div>

          <div className="bg-card rounded-2xl border border-border p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-foreground">Repayment schedule</h3>
              <Button size="sm" onClick={() => setRepayOpen((v) => !v)}>
                <Plus className="h-4 w-4 mr-1" /> Upload Monthly Repayment Proof
              </Button>
            </div>

            {repayOpen && (
              <div className="border border-dashed border-border rounded-xl p-4 mb-4 space-y-3">
                <div>
                  <Label>Month Number</Label>
                  <select className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={repayMonth} onChange={(e) => setRepayMonth(e.target.value)}>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Amount Paid (BWP)</Label>
                  <Input type="number" className="mt-1" value={repayAmount} onChange={(e) => setRepayAmount(e.target.value)} />
                </div>
                <UploadBox label="Upload Monthly Repayment Proof" onFileChange={setRepayFile} />
                <Button onClick={submitRepayment} className="w-full">Submit Proof</Button>
              </div>
            )}

            {repayments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No repayments scheduled yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="pb-2 font-medium text-muted-foreground">Month</th>
                      <th className="pb-2 font-medium text-muted-foreground">Due</th>
                      <th className="pb-2 font-medium text-muted-foreground">Paid</th>
                      <th className="pb-2 font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {repayments.sort((a, b) => a.fields["Month Number"] - b.fields["Month Number"]).map((r) => (
                      <tr key={r.id} className="border-b border-border/50">
                        <td className="py-2">{r.fields["Month Number"]}</td>
                        <td className="py-2">BWP {r.fields["Amount Due"]?.toLocaleString()}</td>
                        <td className="py-2">BWP {r.fields["Amount Paid"]?.toLocaleString()}</td>
                        <td className="py-2">
                          <Badge variant={r.fields.Status === "Paid" ? "default" : r.fields.Status === "Late" ? "destructive" : "secondary"}>
                            {r.fields.Status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      <Disclaimer />
    </div>
  );
};

export default SmeDashboard;
