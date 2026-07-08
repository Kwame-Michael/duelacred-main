import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import StepProgress from "@/components/onboarding/StepProgress";
import UploadBox from "@/components/onboarding/UploadBox";
import Disclaimer from "@/components/onboarding/Disclaimer";
import SuccessScreen from "@/components/onboarding/SuccessScreen";
import { Sprout, TreeDeciduous, Flame, ArrowLeft, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { createRecord, uploadFile, getSignedStorageUrl, STORAGE_BUCKET } from "@/lib/supabase";
import { toast } from "sonner";

type Band = "Peo" | "Kgolo" | "Khumo";

const BANDS = [
  {
    id: "Peo" as Band,
    name: "Peo",
    sub: "Seed",
    tag: "Conservative",
    returns: "up to 1.15x",
    desc: "Lower risk campaigns. Established businesses with strong track records. Steady and predictable returns.",
    Icon: Sprout,
    borderClass: "border-accent",
    accentClass: "text-accent",
  },
  {
    id: "Kgolo" as Band,
    name: "Kgolo",
    sub: "Growth",
    tag: "Balanced",
    returns: "up to 1.20x",
    desc: "A mix of established and newer businesses. A balance between safety and stronger returns.",
    Icon: TreeDeciduous,
    borderClass: "border-primary",
    accentClass: "text-primary",
  },
  {
    id: "Khumo" as Band,
    name: "Khumo",
    sub: "Wealth",
    tag: "Growth",
    returns: "up to 1.25x",
    desc: "Higher potential returns from a wider range of businesses. Best for investors comfortable with some risk.",
    Icon: Flame,
    borderClass: "border-foreground",
    accentClass: "text-foreground",
  },
];

const SUITABILITY_QS = [
  "Do you understand that you may lose part or all of your investment if a business cannot repay?",
  "Are the funds you plan to invest money you can afford to have locked away for up to 6 months?",
  "Are you investing your own money and not funds borrowed from someone else?",
];

const TOTAL_STEPS = 4;

const InvestorOnboarding = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [step, setStep] = useState(1);

  // Step 2
  const [personal, setPersonal] = useState({ fullName: "", email: "", phone: "", nationalId: "" });

  // Step 3
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<("Yes" | "No" | null)[]>([null, null, null]);
  const [showWarning, setShowWarning] = useState(false);

  // Step 4
  const [band, setBand] = useState<Band | null>(null);

  // Step 5
  const [file, setFile] = useState<File | null>(null);
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const next = () => setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  const back = () => setStep((s) => Math.max(1, s - 1));

  const handlePersonalNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!personal.fullName || !personal.email || !personal.phone || !personal.nationalId) {
      toast.error("Please complete all fields");
      return;
    }
    next();
  };

  const handleAnswer = (a: "Yes" | "No") => {
    const newAnswers = [...answers];
    newAnswers[qIndex] = a;
    setAnswers(newAnswers);
    setTimeout(() => {
      if (qIndex < SUITABILITY_QS.length - 1) {
        setQIndex(qIndex + 1);
      } else {
        if (newAnswers.includes("No")) setShowWarning(true);
        else next();
      }
    }, 250);
  };

  const submit = async () => {
    if (!file) { toast.error("Please upload proof of payment"); return; }
    if (!amount) { toast.error("Enter the amount transferred"); return; }
    setSubmitting(true);
    try {
      await login(personal.fullName, personal.email.toLowerCase(), "investor");
      if (band) {
        localStorage.setItem("duelacred_band", band);
      }
      try {
        const proofPath = `investor-onboarding/${personal.email}/${Date.now()}-${file.name}`;
        await uploadFile(STORAGE_BUCKET, proofPath, file, { cacheControl: 3600, upsert: true });
        const proofUrl = await getSignedStorageUrl(STORAGE_BUCKET, proofPath);
        await createRecord("Investor_Onboarding", {
          "Full Name": personal.fullName,
          Email: personal.email,
          Phone: personal.phone,
          "National ID": personal.nationalId,
          Band: band,
          "Amount Transferred": parseFloat(amount),
          "Proof File": file.name,
          "Proof File Url": proofUrl,
          "Proof File Path": proofPath,
          Status: "Pending Verification",
          "Created Date": new Date().toISOString().split("T")[0],
        });
      } catch (error) {
        console.error(error);
        toast.error("Unable to save your payment proof. Please try again.");
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
        title="Proof of payment received"
        message="We will verify your transfer and activate your wallet within 24 hours. You will receive a confirmation by email and SMS."
        ctaLabel="Go to Dashboard"
        ctaTo="/dashboard/investor"
      />
    );
  }

  return (
    <div className="container max-w-2xl py-10 px-4">
      <div className="mb-8">
        <StepProgress current={step} total={TOTAL_STEPS} />
      </div>

      {step > 1 && step !== 3 && (
        <button onClick={back} className="flex items-center gap-1 text-sm text-muted-foreground mb-4 hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
      )}

      {/* STEP 1 was Welcome — start at Personal Details since user already chose Investor */}
      {step === 1 && (
        <div className="bg-card rounded-2xl border border-border p-6 md:p-8">
          <h2 className="text-2xl font-bold text-foreground mb-1">Let's get to know you</h2>
          <p className="text-muted-foreground text-sm mb-6">Your details are kept private and secure.</p>
          <form onSubmit={handlePersonalNext} className="space-y-4">
            <div>
              <Label>Full Name</Label>
              <Input className="mt-1" value={personal.fullName} onChange={(e) => setPersonal({ ...personal, fullName: e.target.value })} />
            </div>
            <div>
              <Label>Email Address</Label>
              <Input type="email" className="mt-1" value={personal.email} onChange={(e) => setPersonal({ ...personal, email: e.target.value })} />
            </div>
            <div>
              <Label>Phone Number</Label>
              <Input className="mt-1" placeholder="+267..." value={personal.phone} onChange={(e) => setPersonal({ ...personal, phone: e.target.value })} />
            </div>
            <div>
              <Label>National ID (Omang or Passport)</Label>
              <Input className="mt-1" value={personal.nationalId} onChange={(e) => setPersonal({ ...personal, nationalId: e.target.value })} />
            </div>
            <Button type="submit" size="lg" className="w-full mt-2">Continue</Button>
          </form>
        </div>
      )}

      {step === 2 && (
        <div className="bg-card rounded-2xl border border-border p-6 md:p-8">
          <h2 className="text-2xl font-bold text-foreground mb-1">Quick suitability check</h2>
          <p className="text-muted-foreground text-sm mb-8">A few quick questions to make sure we are the right fit.</p>

          {!showWarning ? (
            <div className="min-h-[200px] flex flex-col justify-center">
              <p className="text-xs text-muted-foreground mb-3">Question {qIndex + 1} of {SUITABILITY_QS.length}</p>
              <h3 className="text-lg font-medium text-foreground mb-8 leading-relaxed">{SUITABILITY_QS[qIndex]}</h3>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => handleAnswer("Yes")} className="rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 py-4 text-lg font-medium transition-all">Yes</button>
                <button onClick={() => handleAnswer("No")} className="rounded-xl border-2 border-border hover:border-destructive hover:bg-destructive/5 py-4 text-lg font-medium transition-all">No</button>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <AlertCircle className="h-12 w-12 text-accent mx-auto mb-4" />
              <p className="text-foreground leading-relaxed mb-6">
                Based on your answers, we want to make sure Duela Cred is the right fit for you. Please read our risk disclosure carefully before continuing.
              </p>
              <Button size="lg" onClick={next}>I understand, continue</Button>
            </div>
          )}
        </div>
      )}

      {step === 3 && (
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-1 text-center">How would you like to invest?</h2>
          <p className="text-muted-foreground text-sm mb-8 text-center">Pick the band that matches your style. You can change later.</p>
          <div className="grid md:grid-cols-3 gap-4">
            {BANDS.map((b) => {
              const selected = band === b.id;
              return (
                <button
                  key={b.id}
                  onClick={() => setBand(b.id)}
                  className={`text-left rounded-2xl border-2 p-5 bg-card transition-all ${b.borderClass} ${selected ? "ring-4 ring-accent/40 scale-[1.02]" : "hover:scale-[1.01]"}`}
                >
                  <b.Icon className={`h-8 w-8 ${b.accentClass} mb-3`} />
                  <div className="flex items-baseline justify-between mb-1">
                    <h3 className="text-lg font-bold text-foreground">{b.name}</h3>
                    <span className="text-xs text-muted-foreground">({b.sub})</span>
                  </div>
                  <span className="inline-block text-[10px] uppercase tracking-wide font-semibold bg-muted px-2 py-0.5 rounded mb-3">{b.tag}</span>
                  <p className="text-sm font-semibold text-accent mb-2">Returns {b.returns}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{b.desc}</p>
                </button>
              );
            })}
          </div>
          <Button onClick={next} size="lg" disabled={!band} className="w-full mt-8 max-w-sm mx-auto block">Continue</Button>
          <Disclaimer />
        </div>
      )}

      {step === 4 && (
        <div className="bg-card rounded-2xl border border-border p-6 md:p-8">
          <h2 className="text-2xl font-bold text-foreground mb-1">Fund Your Wallet</h2>
          <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
            Because we are currently in our early access phase, we process investments manually. Transfer your investment amount to the Duela Cred account below and upload your proof of payment.
          </p>

          <div className="bg-foreground text-background rounded-xl p-5 mb-6 space-y-2 text-sm">
            <div className="flex justify-between"><span className="opacity-70">Bank</span><span className="font-semibold">First National Bank Botswana</span></div>
            <div className="flex justify-between"><span className="opacity-70">Account Name</span><span className="font-semibold">Duela Cred (Pty) Ltd</span></div>
            <div className="flex justify-between"><span className="opacity-70">Account Number</span><span className="font-semibold">62812345678</span></div>
            <div className="flex justify-between"><span className="opacity-70">Reference</span><span className="font-semibold text-accent">{personal.fullName || "Your full name"}</span></div>
          </div>

          <Label className="block mb-2">Upload Proof of Payment</Label>
          <UploadBox onFileChange={setFile} />

          <div className="mt-5">
            <Label>Amount Transferred (BWP)</Label>
            <Input type="number" className="mt-1" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
          </div>

          <Button onClick={submit} size="lg" className="w-full mt-6" disabled={submitting}>
            {submitting ? "Submitting…" : "Submit for Review"}
          </Button>
          <Disclaimer />
        </div>
      )}

      {step === 5 && null /* unreachable — submit shows SuccessScreen */}
    </div>
  );
};

export default InvestorOnboarding;
