import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import StepProgress from "@/components/onboarding/StepProgress";
import UploadBox from "@/components/onboarding/UploadBox";
import Disclaimer from "@/components/onboarding/Disclaimer";
import SuccessScreen from "@/components/onboarding/SuccessScreen";
import { ArrowLeft, Pencil } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { createRecord, uploadFile, getSignedStorageUrl, STORAGE_BUCKET } from "@/lib/supabase";
import { toast } from "sonner";

const CATEGORIES = [
  "Bakery",
  "Catering",
  "E-Commerce — Clothing",
  "E-Commerce — Tech and Accessories",
  "Nail Tech and Beauty",
  "General Retail",
  "Other",
];
const OPERATING = ["Less than 6 months", "6–12 months", "1–2 years", "Over 2 years"];

const TOTAL = 6;

const SmeOnboarding = () => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const [owner, setOwner] = useState({ fullName: "", email: "", phone: "", omang: "" });
  const [biz, setBiz] = useState({ name: "", category: CATEGORIES[0], address: "", operating: OPERATING[0] });
  const [fin, setFin] = useState({ sales: "", costs: "", funding: "", useOf: "" });
  const [docs, setDocs] = useState<{ premises: File | null; stock: File | null; selfie: File | null }>({
    premises: null, stock: null, selfie: null,
  });
  const [statement, setStatement] = useState<File | null>(null);
  const [agreed, setAgreed] = useState(false);

  const next = () => setStep((s) => Math.min(TOTAL, s + 1));
  const back = () => setStep((s) => Math.max(1, s - 1));

  const goTo = (s: number) => setStep(s);

  const submit = async () => {
    if (!user?.email) { toast.error("Please complete sign-in first."); return; }
    if (!agreed) { toast.error("Please confirm and agree to terms"); return; }
    setSubmitting(true);
    try {
      const applicantEmail = user.email.toLowerCase();
      try {
        const premisesPath = `sme-applications/${applicantEmail}/${Date.now()}-${docs.premises?.name}`;
        const stockPath = `sme-applications/${applicantEmail}/${Date.now()}-${docs.stock?.name}`;
        const selfiePath = `sme-applications/${applicantEmail}/${Date.now()}-${docs.selfie?.name}`;
        const statementPath = `sme-applications/${applicantEmail}/${Date.now()}-${statement?.name}`;

        if (docs.premises) {
          await uploadFile(STORAGE_BUCKET, premisesPath, docs.premises, { cacheControl: 3600, upsert: true });
        }
        if (docs.stock) {
          await uploadFile(STORAGE_BUCKET, stockPath, docs.stock, { cacheControl: 3600, upsert: true });
        }
        if (docs.selfie) {
          await uploadFile(STORAGE_BUCKET, selfiePath, docs.selfie, { cacheControl: 3600, upsert: true });
        }
        if (statement) {
          await uploadFile(STORAGE_BUCKET, statementPath, statement, { cacheControl: 3600, upsert: true });
        }

        const premisesUrl = docs.premises ? await getSignedStorageUrl(STORAGE_BUCKET, premisesPath) : "";
        const stockUrl = docs.stock ? await getSignedStorageUrl(STORAGE_BUCKET, stockPath) : "";
        const selfieUrl = docs.selfie ? await getSignedStorageUrl(STORAGE_BUCKET, selfiePath) : "";
        const statementUrl = statement ? await getSignedStorageUrl(STORAGE_BUCKET, statementPath) : "";

        await createRecord("SME_Applications", {
          "Business Name": biz.name,
          Category: biz.category,
          Description: fin.useOf,
          "Funding Goal": parseFloat(fin.funding || "0"),
          Purpose: fin.useOf,
          "Repayment Period": "6 months",
          Status: "Pending",
          "Submitted By Email": applicantEmail,
          "Owner Name": owner.fullName,
          "Owner Phone": owner.phone,
          Omang: owner.omang,
          "Trading Address": biz.address,
          "Operating History": biz.operating,
          "Monthly Sales": parseFloat(fin.sales || "0"),
          "Monthly Costs": parseFloat(fin.costs || "0"),
          "Premises Photo": docs.premises?.name || "",
          "Premises Photo Url": premisesUrl,
          "Stock Photo": docs.stock?.name || "",
          "Stock Photo Url": stockUrl,
          "Selfie Photo": docs.selfie?.name || "",
          "Selfie Photo Url": selfieUrl,
          "Mobile Money Statement": statement?.name || "",
          "Mobile Money Statement Url": statementUrl,
          "Submitted Date": new Date().toISOString().split("T")[0],
        });
      } catch (error) {
        console.error(error);
        toast.error("Unable to submit your application. Please try again.");
        setSubmitting(false);
        return;
      }
      setDone(true);
    } catch {
      toast.error("Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <SuccessScreen
        title="Application received"
        message="Our team will review it within 3 to 5 business days and contact you by phone and email. In the meantime you can check your application status from your dashboard."
        ctaLabel="Go to Dashboard"
        ctaTo="/dashboard/sme"
      />
    );
  }

  return (
    <div className="container max-w-2xl py-10 px-4">
      <div className="mb-8"><StepProgress current={step} total={TOTAL} /></div>
      {step > 1 && (
        <button onClick={back} className="flex items-center gap-1 text-sm text-muted-foreground mb-4 hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
      )}

      {step === 1 && (
        <div className="bg-card rounded-2xl border border-border p-6 md:p-8">
          <h2 className="text-2xl font-bold text-foreground mb-1">Business owner details</h2>
          <p className="text-muted-foreground text-sm mb-6">Tell us about yourself.</p>
          <div className="space-y-4">
            <div><Label>Full Name</Label><Input className="mt-1" value={owner.fullName} onChange={(e) => setOwner({ ...owner, fullName: e.target.value })} /></div>
            <div><Label>Email</Label><Input type="email" className="mt-1" value={owner.email} onChange={(e) => setOwner({ ...owner, email: e.target.value })} /></div>
            <div><Label>Phone Number</Label><Input className="mt-1" placeholder="+267..." value={owner.phone} onChange={(e) => setOwner({ ...owner, phone: e.target.value })} /></div>
            <div><Label>Omang Number</Label><Input className="mt-1" value={owner.omang} onChange={(e) => setOwner({ ...owner, omang: e.target.value })} /></div>
            <Button size="lg" className="w-full" onClick={() => {
              if (!owner.fullName || !owner.email || !owner.phone || !owner.omang) { toast.error("Please complete all fields"); return; }
              next();
            }}>Continue</Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="bg-card rounded-2xl border border-border p-6 md:p-8 space-y-4">
          <h2 className="text-2xl font-bold text-foreground mb-1">Business details</h2>
          <div><Label>Business Name</Label><Input className="mt-1" value={biz.name} onChange={(e) => setBiz({ ...biz, name: e.target.value })} /></div>
          <div>
            <Label>Business Category</Label>
            <select className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={biz.category} onChange={(e) => setBiz({ ...biz, category: e.target.value })}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div><Label>Trading Address</Label><Input className="mt-1" value={biz.address} onChange={(e) => setBiz({ ...biz, address: e.target.value })} /></div>
          <div>
            <Label>How long have you been operating?</Label>
            <select className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={biz.operating} onChange={(e) => setBiz({ ...biz, operating: e.target.value })}>
              {OPERATING.map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
          <Button size="lg" className="w-full" onClick={() => {
            if (!biz.name || !biz.address) { toast.error("Please complete all fields"); return; }
            next();
          }}>Continue</Button>
        </div>
      )}

      {step === 3 && (
        <div className="bg-card rounded-2xl border border-border p-6 md:p-8 space-y-4">
          <h2 className="text-2xl font-bold text-foreground mb-1">Financial profile</h2>
          <div><Label>What are your average monthly sales in BWP?</Label><Input type="number" className="mt-1" value={fin.sales} onChange={(e) => setFin({ ...fin, sales: e.target.value })} /></div>
          <div><Label>What are your main monthly costs in BWP?</Label><Input type="number" className="mt-1" value={fin.costs} onChange={(e) => setFin({ ...fin, costs: e.target.value })} /></div>
          <div>
            <Label>How much funding are you applying for?</Label>
            <Input type="number" className="mt-1" value={fin.funding} onChange={(e) => setFin({ ...fin, funding: e.target.value })} />
            <p className="text-xs text-muted-foreground mt-1">Maximum BWP 8,000 for first-time applicants</p>
          </div>
          <div>
            <Label>What exactly will you use this funding for?</Label>
            <textarea rows={4} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
              placeholder="Be specific. For example: I will use BWP 6,000 to purchase flour, butter, eggs and packaging from Choppies Cash and Carry to fulfil confirmed school catering orders."
              value={fin.useOf} onChange={(e) => setFin({ ...fin, useOf: e.target.value })} />
          </div>
          <Button size="lg" className="w-full" onClick={() => {
            if (!fin.sales || !fin.costs || !fin.funding || !fin.useOf) { toast.error("Please complete all fields"); return; }
            next();
          }}>Continue</Button>
          <Disclaimer />
        </div>
      )}

      {step === 4 && (
        <div className="bg-card rounded-2xl border border-border p-6 md:p-8 space-y-5">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-1">Help us verify your business</h2>
            <p className="text-muted-foreground text-sm">Upload three quick photos.</p>
          </div>
          <div>
            <Label className="mb-2 block">Photo of your business premises or working location</Label>
            <UploadBox accept="image/png,image/jpeg" label="Tap to upload photo" hint="Show the front of your shop, salon, kitchen, or workspace" onFileChange={(f) => setDocs({ ...docs, premises: f })} />
          </div>
          <div>
            <Label className="mb-2 block">Photo of your current stock or products</Label>
            <UploadBox accept="image/png,image/jpeg" label="Tap to upload photo" hint="Show what you currently sell or work with" onFileChange={(f) => setDocs({ ...docs, stock: f })} />
          </div>
          <div>
            <Label className="mb-2 block">Photo of yourself at your business</Label>
            <UploadBox accept="image/png,image/jpeg" label="Tap to upload photo" hint="Stand in front of your business or workspace" onFileChange={(f) => setDocs({ ...docs, selfie: f })} />
          </div>
          <Button size="lg" className="w-full" onClick={() => {
            if (!docs.premises || !docs.stock || !docs.selfie) { toast.error("Please upload all three photos"); return; }
            next();
          }}>Continue</Button>
        </div>
      )}

      {step === 5 && (
        <div className="bg-card rounded-2xl border border-border p-6 md:p-8 space-y-4">
          <h2 className="text-2xl font-bold text-foreground mb-1">Upload your mobile money statement</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            We use your last 3 months of Orange Money or Mascom MyZaka transaction history to assess your application. This is not a credit check — it is how we understand your business cash flow.
          </p>
          <div className="flex gap-2">
            <span className="text-xs px-2 py-1 rounded bg-muted font-medium">Orange Money</span>
            <span className="text-xs px-2 py-1 rounded bg-muted font-medium">Mascom MyZaka</span>
          </div>
          <UploadBox label="Tap to upload your statement" onFileChange={setStatement} />
          <p className="text-xs text-muted-foreground">
            Don't have a digital statement?{" "}
            <a href="https://wa.me/26771234567" target="_blank" rel="noreferrer" className="text-primary font-medium underline">
              Contact us on WhatsApp
            </a>{" "}
            and we will help you get one.
          </p>
          <Button size="lg" className="w-full" onClick={() => {
            if (!statement) { toast.error("Please upload your statement"); return; }
            next();
          }}>Continue</Button>
        </div>
      )}

      {step === 6 && (
        <div className="bg-card rounded-2xl border border-border p-6 md:p-8">
          <h2 className="text-2xl font-bold text-foreground mb-1">Review & submit</h2>
          <p className="text-muted-foreground text-sm mb-6">Please confirm everything looks correct.</p>

          {[
            { title: "Owner", step: 1, lines: [`${owner.fullName}`, owner.email, owner.phone, `Omang: ${owner.omang}`] },
            { title: "Business", step: 2, lines: [biz.name, biz.category, biz.address, biz.operating] },
            { title: "Financials", step: 3, lines: [`Sales: BWP ${fin.sales}`, `Costs: BWP ${fin.costs}`, `Funding: BWP ${fin.funding}`, fin.useOf] },
            { title: "Verification photos", step: 4, lines: [docs.premises?.name || "—", docs.stock?.name || "—", docs.selfie?.name || "—"] },
            { title: "Mobile money statement", step: 5, lines: [statement?.name || "—"] },
          ].map((sec) => (
            <div key={sec.title} className="border-t border-border py-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold text-foreground text-sm mb-1">{sec.title}</h3>
                {sec.lines.map((l, i) => <p key={i} className="text-sm text-muted-foreground">{l}</p>)}
              </div>
              <button onClick={() => goTo(sec.step)} className="text-primary text-xs font-medium flex items-center gap-1 hover:underline">
                <Pencil className="h-3 w-3" /> Edit
              </button>
            </div>
          ))}

          <label className="flex items-start gap-3 mt-6 cursor-pointer">
            <input type="checkbox" className="mt-1 h-4 w-4 accent-[hsl(var(--primary))]" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
            <span className="text-sm text-foreground leading-relaxed">
              I confirm that all information provided is accurate and I agree to Duela Cred's terms and conditions.
            </span>
          </label>

          <Button size="lg" className="w-full mt-6" onClick={submit} disabled={submitting}>
            {submitting ? "Submitting…" : "Submit My Application"}
          </Button>
          <Disclaimer />
        </div>
      )}
    </div>
  );
};

export default SmeOnboarding;
