import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchRecords, type AirtableRecord } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Spinner from "@/components/Spinner";
import { Search } from "lucide-react";

interface ListingFields {
  "Business Name": string;
  Description: string;
  Category: string;
  "Funding Goal": number;
  "Amount Raised": number;
  "Return Multiple": number;
  "Repayment Months": number;
  Status: string;
  "Logo URL": string;
}

const categories = [
  "All",
  "Bakery",
  "Catering",
  "E-Commerce — Clothing",
  "E-Commerce — Tech and Accessories",
  "Nail Tech and Beauty",
  "General Retail",
  "Other",
];

const ELIGIBLE_CATEGORIES_BY_BAND: Record<string, string[]> = {
  Peo: ["Bakery", "General Retail", "Nail Tech and Beauty"],
  Kgolo: ["Bakery", "General Retail", "Nail Tech and Beauty", "Catering"],
  Khumo: [
    "Bakery",
    "General Retail",
    "Nail Tech and Beauty",
    "Catering",
    "E-Commerce — Clothing",
    "E-Commerce — Tech and Accessories",
    "Other",
  ],
};

const Marketplace = () => {
  const { user } = useAuth();
  const [listings, setListings] = useState<AirtableRecord<ListingFields>[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");

  const band = (typeof window !== "undefined" ? localStorage.getItem("duelacred_band") : null) || "Peo";
  const eligibleCategories = ELIGIBLE_CATEGORIES_BY_BAND[band] || ELIGIBLE_CATEGORIES_BY_BAND.Khumo;

  useEffect(() => {
    fetchRecords<ListingFields>("Listings", `{Status} = 'Open'`)
      .then(setListings)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filteredByCategory = filter === "All" ? listings : listings.filter((l) => l.fields.Category === filter);
  const filtered = user?.role === "investor"
    ? filteredByCategory.filter((l) => eligibleCategories.includes(l.fields.Category))
    : filteredByCategory;

  return (
    <div className="container py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Marketplace</h1>
        <p className="text-muted-foreground mt-1">Browse vetted SME investment opportunities</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              filter === c ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {loading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Search className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground">No opportunities yet</h3>
          <p className="text-muted-foreground text-sm mt-1">Check back soon for new SME listings.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((l) => {
            const f = l.fields;
            const pct = f["Funding Goal"] > 0 ? Math.min(100, Math.round((f["Amount Raised"] / f["Funding Goal"]) * 100)) : 0;
            return (
              <div key={l.id} className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-lg transition-shadow">
                <div className="p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground">{f["Business Name"]}</h3>
                      <Badge variant="secondary" className="mt-1 text-xs">{f.Category}</Badge>
                    </div>
                    {f["Logo URL"] && (
                      <img src={f["Logo URL"]} alt="" className="h-10 w-10 rounded-lg object-cover" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{f.Description}</p>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">{pct}% funded</span>
                      <span className="font-medium text-foreground">${(f["Amount Raised"] || 0).toLocaleString()} / ${f["Funding Goal"].toLocaleString()}</span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-accent">{f["Return Multiple"]}x return</span>
                    <span className="text-muted-foreground">{f["Repayment Months"]} months</span>
                  </div>
                  <Button variant="outline" className="w-full" asChild>
                    <Link to={`/opportunity/${l.id}`}>View Opportunity</Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Marketplace;
