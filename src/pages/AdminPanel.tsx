import { useEffect, useState } from "react";
import { fetchRecords, updateRecord, createRecord, deleteRecord, type RecordItem, autoInvest } from "@/lib/supabase";
import { emitDataRefresh } from "@/lib/refresh";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import Spinner from "@/components/Spinner";
import { toast } from "sonner";
import { Users, BarChart3, FileText, List, Download, ShieldCheck, Eye, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { isAdminPasswordValid } from "@/lib/admin";
import { generatePaymentGuideBlob, getStoredPaymentGuideContent, savePaymentGuideContent } from "@/lib/paymentGuide";

interface AppFields {
  "Business Name": string;
  Category: string;
  Description: string;
  "Funding Goal": number;
  Purpose: string;
  "Repayment Period": string;
  Status: string;
  "Submitted By Email": string;
  "Review Notes"?: string;
  "Owner Name"?: string;
  "Owner Phone"?: string;
  Omang?: string;
  "Trading Address"?: string;
  "Operating History"?: string;
  "Monthly Sales"?: number;
  "Monthly Costs"?: number;
  "Premises Photo"?: string;
  "Premises Photo Url"?: string;
  "Stock Photo"?: string;
  "Stock Photo Url"?: string;
  "Selfie Photo"?: string;
  "Selfie Photo Url"?: string;
  "Mobile Money Statement"?: string;
  "Mobile Money Statement Url"?: string;
  "Submitted Date"?: string;
}

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
  "SME Application ID": string;
  "Investor Count"?: number;
}

interface UserFields {
  Name: string;
  Email: string;
  Role: string;
  "Created Date": string;
  "Wallet Balance"?: number;
}

interface InvestorOnboardingFields {
  Email: string;
  Status?: string;
  Band?: string;
  "Full Name"?: string;
  "National ID"?: string;
  Phone?: string;
  "Amount Transferred"?: number;
  "Proof File"?: string;
  "Proof File Url"?: string;
  "Created Date"?: string;
}

interface InvestmentFields {
  "Amount Invested": number;
  Status?: string;
  "Investor Email": string;
  "Business Name": string;
  "Listing ID": string;
}

interface RepaymentFields {
  "Listing ID": string;
  "Month Number": number;
  "Amount Due": number;
  "Amount Paid": number;
  Status: string;
  "Due Date"?: string;
}

interface RepaymentProofFields {
  "Listing ID": string;
  "Month Number": number;
  "Amount Paid": number;
  Status: string;
  "Proof File"?: string;
  "Proof File Url"?: string;
}

const CATEGORY_SETTINGS: Record<string, { returnMultiple: number; firstCampaignCap: number }> = {
  Bakery: { returnMultiple: 1.15, firstCampaignCap: 5000 },
  Catering: { returnMultiple: 1.15, firstCampaignCap: 8000 },
  "E-Commerce — Clothing": { returnMultiple: 1.25, firstCampaignCap: 5000 },
  "E-Commerce — Tech and Accessories": { returnMultiple: 1.25, firstCampaignCap: 15000 },
  "Nail Tech and Beauty": { returnMultiple: 1.15, firstCampaignCap: 4000 },
  "General Retail": { returnMultiple: 1.15, firstCampaignCap: 5000 },
  Other: { returnMultiple: 1.20, firstCampaignCap: 5000 },
};

const getCategorySettings = (category: string) => {
  return CATEGORY_SETTINGS[category] ?? { returnMultiple: 1.20, firstCampaignCap: 5000 };
};

const createRepaymentSchedule = async (
  listingId: string,
  fundingGoal: number,
  returnMultiple: number,
  repaymentMonths: number
) => {
  const totalRepayment = fundingGoal * returnMultiple;
  const monthlyAmount = Math.round((totalRepayment / repaymentMonths) * 100) / 100;
  const disbursementDate = new Date();

  for (let month = 1; month <= repaymentMonths; month += 1) {
    const dueDate = new Date(disbursementDate);
    dueDate.setDate(dueDate.getDate() + 30 * month);
    await createRecord("Repayments", {
      "Listing ID": listingId,
      "Month Number": month,
      "Amount Due": monthlyAmount,
      "Amount Paid": 0,
      Status: "Pending",
      "Due Date": dueDate.toISOString().split("T")[0],
    });
  }
};

const tabs = [
  { id: "applications", label: "Applications", icon: FileText },
  { id: "listings", label: "Listings", icon: List },
  { id: "users", label: "Users", icon: Users },
  { id: "stats", label: "Stats", icon: BarChart3 },
];

const AdminPanel = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState("applications");
  const [apps, setApps] = useState<RecordItem<AppFields>[]>([]);
  const [listings, setListings] = useState<RecordItem<ListingFields>[]>([]);
  const [users, setUsers] = useState<RecordItem<UserFields>[]>([]);
  const [derivedUsers, setDerivedUsers] = useState<RecordItem<UserFields>[]>([]);
  const [investments, setInvestments] = useState<RecordItem<InvestmentFields>[]>([]);
  const [repayments, setRepayments] = useState<RecordItem<RepaymentFields>[]>([]);
  const [repaymentProofs, setRepaymentProofs] = useState<RecordItem<RepaymentProofFields>[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [progressEdits, setProgressEdits] = useState<Record<string, string>>({});
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [autoInvestLoading, setAutoInvestLoading] = useState<Record<string, boolean>>({});
  const [adminPassword, setAdminPassword] = useState("");
  const [adminReady, setAdminReady] = useState(false);
  const [paymentGuideContent, setPaymentGuideContent] = useState(getStoredPaymentGuideContent());
  const [isEditingGuide, setIsEditingGuide] = useState(false);
  const [onboarding, setOnboarding] = useState<RecordItem<InvestorOnboardingFields>[]>([]);

  useEffect(() => {
    if (!adminReady) return;
    (async () => {
      try {
        const [a, l, u, i, o, r, p] = await Promise.all([
          fetchRecords<AppFields>("SME_Applications"),
          fetchRecords<ListingFields>("Listings"),
          fetchRecords<UserFields>("Users"),
          fetchRecords<InvestmentFields>("Investments"),
          fetchRecords<InvestorOnboardingFields>("Investor_Onboarding"),
          fetchRecords<RepaymentFields>("Repayments"),
          fetchRecords<RepaymentProofFields>("Repayment_Proofs"),
        ]);
        setApps(a);
        setListings(l);
        setUsers(u);
        setInvestments(i);
        setOnboarding(o);
        setRepayments(r);
        setRepaymentProofs(p);

        const normalizedEmail = (value: unknown) => String(value || "").trim().toLowerCase();
        const fallbackByEmail = new Map<string, RecordItem<UserFields>>();

        o.forEach((row) => {
          const email = normalizedEmail(row.fields.Email);
          if (!email) return;
          if (!fallbackByEmail.has(email)) {
            fallbackByEmail.set(email, {
              id: `investor-${row.id}`,
              fields: {
                Name: row.fields["Full Name"] || email.split("@")[0],
                Email: email,
                Role: "Investor",
                "Created Date": row.fields["Created Date"] || "",
              },
            });
          }
        });

        a.forEach((row) => {
          const email = normalizedEmail(row.fields["Submitted By Email"]);
          if (!email) return;
          if (!fallbackByEmail.has(email)) {
            fallbackByEmail.set(email, {
              id: `sme-${row.id}`,
              fields: {
                Name: row.fields["Owner Name"] || row.fields["Business Name"] || email.split("@")[0],
                Email: email,
                Role: "SME",
                "Created Date": row.fields["Submitted Date"] || "",
              },
            });
          }
        });

        setDerivedUsers(Array.from(fallbackByEmail.values()));
        setPaymentGuideContent(getStoredPaymentGuideContent());
        setFetchError(null);
      } catch (error) {
        console.error("AdminPanel fetch failed", error);
        setFetchError(error instanceof Error ? error.message : String(error));
      }
      setLoading(false);
    })();
  }, [adminReady]);

  const handleAdminLogin = (event: React.FormEvent) => {
    event.preventDefault();
    if (isAdminPasswordValid(adminPassword)) {
      setAdminReady(true);
      setAdminPassword("");
      toast.success("Admin access enabled");
    } else {
      toast.error("Invalid password");
    }
  };

  const handleAdminLogout = () => {
    setAdminReady(false);
    navigate("/", { replace: true });
  };

  const handleApprove = async (app: RecordItem<AppFields>) => {
    setActionLoading(app.id);
    try {
      await updateRecord("SME_Applications", app.id, { Status: "Approved", "Review Notes": reviewNotes[app.id] || "Approved by admin" });
      const periodNum = parseInt(app.fields["Repayment Period"]) || 12;
      const settings = getCategorySettings(app.fields.Category);
      const listing = await createRecord("Listings", {
        "Business Name": app.fields["Business Name"],
        Description: app.fields.Description,
        Category: app.fields.Category,
        "Funding Goal": app.fields["Funding Goal"],
        "Amount Raised": 0,
        "Return Multiple": settings.returnMultiple,
        "Repayment Months": periodNum,
        "Repayment Progress %": 0,
        Status: "Open",
        "SME Application ID": app.id,
      });
      await createRepaymentSchedule(
        listing.id,
        app.fields["Funding Goal"],
        settings.returnMultiple,
        periodNum
      );
      setApps((prev) => prev.map((a) => a.id === app.id ? { ...a, fields: { ...a.fields, Status: "Approved" } } : a));
      emitDataRefresh("admin-approval");
      toast.success(`${app.fields["Business Name"]} approved and listed!`);
    } catch {
      toast.error("Failed to approve");
    }
    setActionLoading(null);
  };

  const handleRequestDocs = async (app: RecordItem<AppFields>) => {
    setActionLoading(app.id);
    try {
      await updateRecord("SME_Applications", app.id, { Status: "Needs More Documents", "Review Notes": reviewNotes[app.id] || "Please provide additional documentation." });
      setApps((prev) => prev.map((a) => a.id === app.id ? { ...a, fields: { ...a.fields, Status: "Needs More Documents", "Review Notes": reviewNotes[app.id] || "Please provide additional documentation." } } : a));
      emitDataRefresh("admin-review");
      toast.success("Request sent for additional documents");
    } catch {
      toast.error("Failed to request documents");
    }
    setActionLoading(null);
  };

  const handleReject = async (app: RecordItem<AppFields>) => {
    setActionLoading(app.id);
    try {
      await updateRecord("SME_Applications", app.id, { Status: "Rejected", "Review Notes": reviewNotes[app.id] || "Rejected by admin" });
      setApps((prev) => prev.map((a) => a.id === app.id ? { ...a, fields: { ...a.fields, Status: "Rejected" } } : a));
      emitDataRefresh("admin-review");
      toast.success("Application rejected");
    } catch {
      toast.error("Failed to reject");
    }
    setActionLoading(null);
  };

  const handleProgressSave = async (listing: RecordItem<ListingFields>) => {
    const val = parseFloat(progressEdits[listing.id] ?? "");
    if (isNaN(val) || val < 0 || val > 100) {
      toast.error("Enter a value between 0 and 100");
      return;
    }
    setActionLoading(listing.id);
    try {
      await updateRecord("Listings", listing.id, { "Repayment Progress %": val });
      setListings((prev) => prev.map((l) => l.id === listing.id ? { ...l, fields: { ...l.fields, "Repayment Progress %": val } } : l));
      emitDataRefresh("listing-progress");
      toast.success("Progress updated");
    } catch {
      toast.error("Failed to update");
    }
    setActionLoading(null);
  };

  const handleAutoInvest = async (listing: RecordItem<ListingFields>) => {
    setAutoInvestLoading((s) => ({ ...s, [listing.id]: true }));
    try {
      const res = await autoInvest(listing.id, 50); // allocate up to BWP 50 per investor as an example
      emitDataRefresh("auto-invest");
      toast.success(`Auto-invest completed — remaining: BWP ${res.remaining}`);
      // refresh listings
      const updated = await fetchRecords<ListingFields>("Listings");
      setListings(updated);
    } catch (e) {
      console.error(e);
      toast.error("Auto-invest failed");
    }
    setAutoInvestLoading((s) => ({ ...s, [listing.id]: false }));
  };

  const handleDeleteListing = async (listing: RecordItem<ListingFields>) => {
    const confirmed = window.confirm(`Delete listing "${listing.fields["Business Name"]}"?`);
    if (!confirmed) return;

    setActionLoading(listing.id);
    try {
      await deleteRecord("Listings", listing.id);
      setListings((prev) => prev.filter((item) => item.id !== listing.id));
      emitDataRefresh("listing-delete");
      toast.success("Listing deleted");
    } catch {
      toast.error("Failed to delete listing");
    }
    setActionLoading(null);
  };

  const handleConfirmInvestorProof = async (onboardingRecord: RecordItem<InvestorOnboardingFields>) => {
    setActionLoading(onboardingRecord.id);
    try {
      await updateRecord("Investor_Onboarding", onboardingRecord.id, { Status: "Verified" });
      setOnboarding((prev) => prev.map((item) => item.id === onboardingRecord.id ? { ...item, fields: { ...item.fields, Status: "Verified" } } : item));
      toast.success("Investor proof confirmed");
    } catch {
      toast.error("Failed to confirm investor proof");
    }
    setActionLoading(null);
  };

  const handleRejectInvestorProof = async (onboardingRecord: RecordItem<InvestorOnboardingFields>) => {
    setActionLoading(onboardingRecord.id);
    try {
      await updateRecord("Investor_Onboarding", onboardingRecord.id, { Status: "Rejected" });
      setOnboarding((prev) => prev.map((item) => item.id === onboardingRecord.id ? { ...item, fields: { ...item.fields, Status: "Rejected" } } : item));
      toast.success("Investor proof rejected");
    } catch {
      toast.error("Failed to reject investor proof");
    }
    setActionLoading(null);
  };

  const handleConfirmRepaymentProof = async (proof: RecordItem<RepaymentProofFields>) => {
    setActionLoading(proof.id);
    try {
      await updateRecord("Repayment_Proofs", proof.id, { Status: "Approved" });
      setRepaymentProofs((prev) => prev.map((item) => item.id === proof.id ? { ...item, fields: { ...item.fields, Status: "Approved" } } : item));
      const matchingRepayment = repayments.find((item) => item.fields["Listing ID"] === proof.fields["Listing ID"] && item.fields["Month Number"] === proof.fields["Month Number"]);
      if (matchingRepayment) {
        await updateRecord("Repayments", matchingRepayment.id, { Status: "Paid", "Amount Paid": proof.fields["Amount Paid"] || matchingRepayment.fields["Amount Paid"] });
        setRepayments((prev) => prev.map((item) => item.id === matchingRepayment.id ? { ...item, fields: { ...item.fields, Status: "Paid", "Amount Paid": proof.fields["Amount Paid"] || matchingRepayment.fields["Amount Paid"] } } : item));
      }
      toast.success("Repayment proof confirmed");
    } catch {
      toast.error("Failed to confirm repayment proof");
    }
    setActionLoading(null);
  };

  const handleRejectRepaymentProof = async (proof: RecordItem<RepaymentProofFields>) => {
    setActionLoading(proof.id);
    try {
      await updateRecord("Repayment_Proofs", proof.id, { Status: "Rejected" });
      setRepaymentProofs((prev) => prev.map((item) => item.id === proof.id ? { ...item, fields: { ...item.fields, Status: "Rejected" } } : item));
      toast.success("Repayment proof rejected");
    } catch {
      toast.error("Failed to reject repayment proof");
    }
    setActionLoading(null);
  };

  const handleGuideSave = () => {
    savePaymentGuideContent(paymentGuideContent);
    setIsEditingGuide(false);
    toast.success("Payment guide updated");
  };

  const handleGuideEdit = () => {
    setIsEditingGuide(true);
  };

  const openPaymentMethodsPdf = async () => {
    try {
      const blob = await generatePaymentGuideBlob("Admin", paymentGuideContent);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer,popup=yes,width=900,height=1200");
    } catch {
      toast.error("Unable to open the payment guide right now.");
    }
  };

  const downloadPaymentMethodsPdf = async () => {
    try {
      const blob = await generatePaymentGuideBlob("Admin", paymentGuideContent);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "duela-cred-payment-methods.pdf";
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Payment guide downloaded");
    } catch {
      toast.error("Unable to download the payment guide right now.");
    }
  };

  const renderApplicationDocs = (app: RecordItem<AppFields>) => {
    const docItems = [
      { label: "Premises photo", fileName: app.fields["Premises Photo"], url: app.fields["Premises Photo Url"] },
      { label: "Stock photo", fileName: app.fields["Stock Photo"], url: app.fields["Stock Photo Url"] },
      { label: "Selfie photo", fileName: app.fields["Selfie Photo"], url: app.fields["Selfie Photo Url"] },
      { label: "Mobile money statement", fileName: app.fields["Mobile Money Statement"], url: app.fields["Mobile Money Statement Url"] },
    ].filter((item) => item.fileName || item.url);

    if (docItems.length === 0) {
      return <p className="text-sm text-muted-foreground">No uploaded documents recorded.</p>;
    }

    return (
      <div className="flex flex-wrap gap-2">
        {docItems.map((item) => {
          const hasValidUrl = Boolean(item.url && /^https?:\/\//i.test(item.url));

          if (hasValidUrl) {
            return (
              <a
                key={item.label}
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs font-medium text-primary"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {item.label}
                {item.fileName ? ` · ${item.fileName}` : ""}
              </a>
            );
          }

          return (
            <span key={item.label} className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
              {item.label}
              {item.fileName ? ` · ${item.fileName}` : ""}
            </span>
          );
        })}
      </div>
    );
  };

  const adminUsers = [...users, ...derivedUsers].filter((u, index, all) => {
    const role = (u.fields.Role || "").toLowerCase();
    const email = (u.fields.Email || "").toLowerCase();
    return !!email && (role.includes("investor") || role.includes("sme") || role.includes("owner"));
  }).filter((u, index, all) => {
    const email = (u.fields.Email || "").toLowerCase();
    return all.findIndex((item) => (item.fields.Email || "").toLowerCase() === email) === index;
  });

  const renderDocumentLink = (label: string, url?: string, fileName?: string) => {
    const hasValidUrl = Boolean(url && /^https?:\/\//i.test(url));

    if (!hasValidUrl) {
      return (
        <span className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
          {label}
          {fileName ? ` · ${fileName}` : ""}
        </span>
      );
    }

    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs font-medium text-primary"
      >
        <ExternalLink className="h-3.5 w-3.5" />
        {label}
        {fileName ? ` · ${fileName}` : ""}
      </a>
    );
  };

  if (!adminReady) {
    return (
      <div className="container py-20 max-w-md">
        <form className="bg-card rounded-xl border border-border p-6 space-y-4" onSubmit={handleAdminLogin}>
          <div className="flex items-center gap-2 text-primary"><ShieldCheck className="h-5 w-5" /> <h1 className="text-xl font-semibold">Admin Access</h1></div>
          <p className="text-sm text-muted-foreground">Enter the password to continue.</p>
          <Input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} placeholder="Password" />
          <Button className="w-full" type="submit">Continue</Button>
        </form>
      </div>
    );
  }

  if (loading) return <Spinner />;

  const totalInvested = investments.reduce((s, i) => s + (i.fields["Amount Invested"] || 0), 0);

  return (
    <div className="container py-10">
      <div className="flex items-center justify-between mb-8 gap-3 flex-wrap">
        <h1 className="text-3xl font-bold text-foreground">Admin Panel</h1>
        <Button variant="outline" size="sm" onClick={handleAdminLogout}>Exit admin</Button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-8 border-b border-border pb-4">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-card rounded-xl border border-border p-4 mb-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-medium text-foreground">Manual review tools</p>
            <p className="text-sm text-muted-foreground">Approve, reject, or request more documentation for applications and uploaded proofs.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={openPaymentMethodsPdf}>
              <Eye className="h-4 w-4 mr-2" /> View payment guide
            </Button>
            <Button variant="outline" size="sm" onClick={downloadPaymentMethodsPdf}>
              <Download className="h-4 w-4 mr-2" /> Download payment guide
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <label className="text-sm font-medium text-foreground">Payment guide content</label>
            {!isEditingGuide && (
              <Button size="sm" variant="outline" onClick={handleGuideEdit}>Edit guide</Button>
            )}
          </div>

          {isEditingGuide ? (
            <>
              <Textarea rows={8} value={paymentGuideContent} onChange={(e) => setPaymentGuideContent(e.target.value)} />
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={handleGuideSave}>Save guide</Button>
                <Button size="sm" variant="outline" onClick={openPaymentMethodsPdf}>Preview PDF</Button>
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <div className="whitespace-pre-wrap text-sm text-muted-foreground">{paymentGuideContent}</div>
            </div>
          )}
        </div>
      </div>

      {/* Applications Tab */}
      {tab === "applications" && (
        <div className="space-y-4">
          {apps.length === 0 ? (
            <p className="text-muted-foreground text-center py-10">No applications yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-3 font-medium text-muted-foreground">Business</th>
                    <th className="pb-3 font-medium text-muted-foreground">Goal</th>
                    <th className="pb-3 font-medium text-muted-foreground">Category</th>
                    <th className="pb-3 font-medium text-muted-foreground">Status</th>
                    <th className="pb-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {apps.map((a) => (
                    <tr key={a.id} className="border-b border-border/50">
                      <td className="py-3 font-medium text-foreground">{a.fields["Business Name"]}</td>
                      <td className="py-3">BWP {a.fields["Funding Goal"]?.toLocaleString()}</td>
                      <td className="py-3">{a.fields.Category}</td>
                      <td className="py-3">
                        <Badge variant={a.fields.Status === "Approved" ? "default" : a.fields.Status === "Rejected" ? "destructive" : "secondary"}>
                          {a.fields.Status}
                        </Badge>
                      </td>
                      <td className="py-3">
                        <div className="space-y-3 max-w-xl">
                          <div className="rounded-lg border border-border/70 bg-muted/30 p-3 text-sm text-muted-foreground space-y-1">
                            <p><span className="font-medium text-foreground">Owner:</span> {a.fields["Owner Name"] || "—"}</p>
                            <p><span className="font-medium text-foreground">Email:</span> {a.fields["Submitted By Email"] || "—"}</p>
                            <p><span className="font-medium text-foreground">Phone:</span> {a.fields["Owner Phone"] || "—"}</p>
                            <p><span className="font-medium text-foreground">Omang:</span> {a.fields.Omang || "—"}</p>
                            <p><span className="font-medium text-foreground">Trading address:</span> {a.fields["Trading Address"] || "—"}</p>
                            <p><span className="font-medium text-foreground">Operating history:</span> {a.fields["Operating History"] || "—"}</p>
                            <p><span className="font-medium text-foreground">Monthly sales:</span> {a.fields["Monthly Sales"] ? `BWP ${a.fields["Monthly Sales"].toLocaleString()}` : "—"}</p>
                            <p><span className="font-medium text-foreground">Monthly costs:</span> {a.fields["Monthly Costs"] ? `BWP ${a.fields["Monthly Costs"].toLocaleString()}` : "—"}</p>
                            <p><span className="font-medium text-foreground">Purpose:</span> {a.fields.Purpose || "—"}</p>
                            <p><span className="font-medium text-foreground">Submitted:</span> {a.fields["Submitted Date"] || "—"}</p>
                          </div>
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-foreground">Uploaded documents</p>
                            {renderApplicationDocs(a)}
                          </div>
                          <Input
                            value={reviewNotes[a.id] || ""}
                            onChange={(e) => setReviewNotes((prev) => ({ ...prev, [a.id]: e.target.value }))}
                            placeholder="Review note"
                            className="w-52"
                          />
                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" onClick={() => handleApprove(a)} disabled={actionLoading === a.id}>
                              Approve
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleRequestDocs(a)} disabled={actionLoading === a.id}>
                              Request docs
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleReject(a)} disabled={actionLoading === a.id}>
                              Reject
                            </Button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Listings Tab */}
      {tab === "listings" && (
        <div className="space-y-4">
          {listings.length === 0 ? (
            <p className="text-muted-foreground text-center py-10">No listings yet.</p>
          ) : (
            listings.map((l) => (
              <div key={l.id} className="bg-card rounded-xl border border-border p-5 flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">{l.fields["Business Name"]}</h3>
                  <div className="text-sm text-muted-foreground">
                    BWP {(l.fields["Amount Raised"] || 0).toLocaleString()} / BWP {l.fields["Funding Goal"]?.toLocaleString()} •{" "}
                    <Badge variant="secondary">{l.fields.Status}</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder={String(l.fields["Repayment Progress %"] || 0)}
                    value={progressEdits[l.id] ?? ""}
                    onChange={(e) => setProgressEdits({ ...progressEdits, [l.id]: e.target.value })}
                    className="w-24"
                    min={0}
                    max={100}
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                  <Button size="sm" onClick={() => handleProgressSave(l)} disabled={actionLoading === l.id}>
                    Save
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDeleteListing(l)} disabled={actionLoading === l.id}>
                    Delete
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Users Tab */}
      {tab === "users" && (
        <div className="overflow-x-auto">
          {adminUsers.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground">No users yet.</p>
              {fetchError ? (
                <p className="text-xs text-destructive mt-2">Fetch error: {fetchError}</p>
              ) : (
                <p className="text-xs text-muted-foreground mt-2">Check the Users table or Supabase read policies.</p>
              )}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-3 font-medium text-muted-foreground">Name</th>
                  <th className="pb-3 font-medium text-muted-foreground">Email</th>
                  <th className="pb-3 font-medium text-muted-foreground">Role</th>
                  <th className="pb-3 font-medium text-muted-foreground">Status</th>
                  <th className="pb-3 font-medium text-muted-foreground">Details</th>
                </tr>
              </thead>
              <tbody>
                {adminUsers.map((u) => {
                  const email = (u.fields.Email || "").toLowerCase();
                  const onboardingRecord = onboarding.find((entry) => (entry.fields.Email || "").toLowerCase() === email);
                  const applicationRecord = apps.find((entry) => (entry.fields["Submitted By Email"] || "").toLowerCase() === email);
                  const role = (u.fields.Role || "").toLowerCase();
                  const isInvestor = role.includes("investor");
                  const isSmeOwner = role.includes("sme") || role.includes("owner");
                  const status = onboardingRecord?.fields.Status || applicationRecord?.fields.Status || "No submission yet";
                  const statusVariant = status === "Approved" || status === "Verified" || status === "Active" ? "default" : status === "Rejected" || status === "Needs More Documents" ? "destructive" : "secondary";
                  const detailText = onboardingRecord ? (
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p>Band: {onboardingRecord.fields.Band || "—"}</p>
                      <p>Amount transferred: {onboardingRecord.fields["Amount Transferred"] ? `BWP ${onboardingRecord.fields["Amount Transferred"].toLocaleString()}` : "—"}</p>
                      <p>Proof file: {onboardingRecord.fields["Proof File"] || "—"}</p>
                      {onboardingRecord.fields["Proof File Url"] && renderDocumentLink("Open proof", onboardingRecord.fields["Proof File Url"], onboardingRecord.fields["Proof File"])}
                      {isInvestor && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          <Button size="sm" onClick={() => handleConfirmInvestorProof(onboardingRecord)} disabled={actionLoading === onboardingRecord.id}>Confirm proof</Button>
                          <Button size="sm" variant="outline" onClick={() => handleRejectInvestorProof(onboardingRecord)} disabled={actionLoading === onboardingRecord.id}>Reject proof</Button>
                        </div>
                      )}
                    </div>
                  ) : applicationRecord ? (
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p>Business: {applicationRecord.fields["Business Name"] || "—"}</p>
                      <p>Funding: {applicationRecord.fields["Funding Goal"] ? `BWP ${applicationRecord.fields["Funding Goal"].toLocaleString()}` : "—"}</p>
                      <p>Category: {applicationRecord.fields.Category || "—"}</p>
                      {isSmeOwner && (() => {
                        const listing = listings.find((item) => item.fields["SME Application ID"] === applicationRecord.id);
                        const listingRepayments = repayments.filter((item) => item.fields["Listing ID"] === listing?.id);
                        const listingProofs = repaymentProofs.filter((item) => item.fields["Listing ID"] === listing?.id);
                        return (
                          <div className="space-y-2 pt-2">
                            <p className="font-medium text-foreground">Repayment schedule</p>
                            {listingRepayments.length === 0 ? (
                              <p>No repayments found.</p>
                            ) : (
                              <div className="space-y-2">
                                {listingRepayments.sort((a, b) => a.fields["Month Number"] - b.fields["Month Number"]).map((repayment) => (
                                  <div key={repayment.id} className="rounded-md border border-border/70 p-2">
                                    <p>Month {repayment.fields["Month Number"]} · Due BWP {repayment.fields["Amount Due"]?.toLocaleString()} · Paid BWP {repayment.fields["Amount Paid"]?.toLocaleString()}</p>
                                    <p className="text-xs">Status: {repayment.fields.Status}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                            <p className="font-medium text-foreground">Repayment proofs</p>
                            {listingProofs.length === 0 ? (
                              <p>No repayment proofs submitted.</p>
                            ) : (
                              <div className="space-y-2">
                                {listingProofs.map((proof) => (
                                  <div key={proof.id} className="rounded-md border border-border/70 p-2 space-y-2">
                                    <p>Month {proof.fields["Month Number"]} · Paid BWP {proof.fields["Amount Paid"]?.toLocaleString()}</p>
                                    <p className="text-xs">Status: {proof.fields.Status}</p>
                                    {proof.fields["Proof File Url"] && renderDocumentLink("Open proof", proof.fields["Proof File Url"], proof.fields["Proof File"])}
                                    <div className="flex flex-wrap gap-2">
                                      <Button size="sm" onClick={() => handleConfirmRepaymentProof(proof)} disabled={actionLoading === proof.id}>Confirm proof</Button>
                                      <Button size="sm" variant="outline" onClick={() => handleRejectRepaymentProof(proof)} disabled={actionLoading === proof.id}>Reject proof</Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  ) : <span className="text-sm text-muted-foreground">No onboarding or application data yet.</span>;

                  return (
                    <tr key={u.id} className="border-b border-border/50">
                      <td className="py-3 font-medium text-foreground">{u.fields.Name}</td>
                      <td className="py-3">{u.fields.Email}</td>
                      <td className="py-3"><Badge variant="secondary">{u.fields.Role}</Badge></td>
                      <td className="py-3"><Badge variant={statusVariant}>{status}</Badge></td>
                      <td className="py-3">{detailText}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Stats Tab */}
      {tab === "stats" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Listings", value: listings.length },
            { label: "Total Users", value: users.length },
            { label: "Total Invested", value: `BWP ${totalInvested.toLocaleString()}` },
            { label: "Pending Applications", value: apps.filter((a) => a.fields.Status === "Pending").length },
          ].map((s) => (
            <div key={s.label} className="bg-card rounded-xl border border-border p-6">
              <div className="text-sm text-muted-foreground">{s.label}</div>
              <div className="text-3xl font-bold text-foreground mt-1">{s.value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
