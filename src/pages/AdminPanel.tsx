import { useEffect, useState } from "react";
import { fetchRecords, updateRecord, createRecord, type AirtableRecord, autoInvest } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Spinner from "@/components/Spinner";
import { toast } from "sonner";
import { Users, BarChart3, FileText, List } from "lucide-react";

interface AppFields {
  "Business Name": string;
  Category: string;
  Description: string;
  "Funding Goal": number;
  Purpose: string;
  "Repayment Period": string;
  Status: string;
  "Submitted By Email": string;
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
}

interface UserFields {
  Name: string;
  Email: string;
  Role: string;
  "Created Date": string;
}

interface InvestmentFields {
  "Amount Invested": number;
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
  const [tab, setTab] = useState("applications");
  const [apps, setApps] = useState<AirtableRecord<AppFields>[]>([]);
  const [listings, setListings] = useState<AirtableRecord<ListingFields>[]>([]);
  const [users, setUsers] = useState<AirtableRecord<UserFields>[]>([]);
  const [investments, setInvestments] = useState<AirtableRecord<InvestmentFields>[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [progressEdits, setProgressEdits] = useState<Record<string, string>>({});
  const [autoInvestLoading, setAutoInvestLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      try {
        const [a, l, u, i] = await Promise.all([
          fetchRecords<AppFields>("SME_Applications"),
          fetchRecords<ListingFields>("Listings"),
          fetchRecords<UserFields>("Users"),
          fetchRecords<InvestmentFields>("Investments"),
        ]);
        setApps(a);
        setListings(l);
        setUsers(u);
        setInvestments(i);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const handleApprove = async (app: AirtableRecord<AppFields>) => {
    setActionLoading(app.id);
    try {
      await updateRecord("SME_Applications", app.id, { Status: "Approved" });
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
      toast.success(`${app.fields["Business Name"]} approved and listed!`);
    } catch {
      toast.error("Failed to approve");
    }
    setActionLoading(null);
  };

  const handleReject = async (app: AirtableRecord<AppFields>) => {
    setActionLoading(app.id);
    try {
      await updateRecord("SME_Applications", app.id, { Status: "Rejected" });
      setApps((prev) => prev.map((a) => a.id === app.id ? { ...a, fields: { ...a.fields, Status: "Rejected" } } : a));
      toast.success("Application rejected");
    } catch {
      toast.error("Failed to reject");
    }
    setActionLoading(null);
  };

  const handleProgressSave = async (listing: AirtableRecord<ListingFields>) => {
    const val = parseFloat(progressEdits[listing.id] ?? "");
    if (isNaN(val) || val < 0 || val > 100) {
      toast.error("Enter a value between 0 and 100");
      return;
    }
    setActionLoading(listing.id);
    try {
      await updateRecord("Listings", listing.id, { "Repayment Progress %": val });
      setListings((prev) => prev.map((l) => l.id === listing.id ? { ...l, fields: { ...l.fields, "Repayment Progress %": val } } : l));
      toast.success("Progress updated");
    } catch {
      toast.error("Failed to update");
    }
    setActionLoading(null);
  };

  const handleAutoInvest = async (listing: AirtableRecord<ListingFields>) => {
    setAutoInvestLoading((s) => ({ ...s, [listing.id]: true }));
    try {
      const res = await autoInvest(listing.id, 50); // allocate up to BWP 50 per investor as an example
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

  if (loading) return <Spinner />;

  const totalInvested = investments.reduce((s, i) => s + (i.fields["Amount Invested"] || 0), 0);

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold text-foreground mb-8">Admin Panel</h1>

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
                      <td className="py-3">${a.fields["Funding Goal"]?.toLocaleString()}</td>
                      <td className="py-3">{a.fields.Category}</td>
                      <td className="py-3">
                        <Badge variant={a.fields.Status === "Approved" ? "default" : a.fields.Status === "Rejected" ? "destructive" : "secondary"}>
                          {a.fields.Status}
                        </Badge>
                      </td>
                      <td className="py-3">
                        {a.fields.Status === "Pending" && (
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleApprove(a)} disabled={actionLoading === a.id}>
                              Approve
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleReject(a)} disabled={actionLoading === a.id}>
                              Reject
                            </Button>
                          </div>
                        )}
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
                  <p className="text-sm text-muted-foreground">
                    ${(l.fields["Amount Raised"] || 0).toLocaleString()} / ${l.fields["Funding Goal"]?.toLocaleString()} •{" "}
                    <Badge variant="secondary">{l.fields.Status}</Badge>
                  </p>
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
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Users Tab */}
      {tab === "users" && (
        <div className="overflow-x-auto">
          {users.length === 0 ? (
            <p className="text-muted-foreground text-center py-10">No users yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-3 font-medium text-muted-foreground">Name</th>
                  <th className="pb-3 font-medium text-muted-foreground">Email</th>
                  <th className="pb-3 font-medium text-muted-foreground">Role</th>
                  <th className="pb-3 font-medium text-muted-foreground">Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-border/50">
                    <td className="py-3 font-medium text-foreground">{u.fields.Name}</td>
                    <td className="py-3">{u.fields.Email}</td>
                    <td className="py-3"><Badge variant="secondary">{u.fields.Role}</Badge></td>
                    <td className="py-3">{u.fields["Created Date"]}</td>
                  </tr>
                ))}
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
            { label: "Total Invested", value: `$${totalInvested.toLocaleString()}` },
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
