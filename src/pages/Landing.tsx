import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { TrendingUp, Store, BarChart3, Globe, Search, DollarSign, ArrowRight } from "lucide-react";
import heroImage from "@/assets/hero-sme-owner.jpg";

const steps = [
  { num: "01", icon: Search, title: "Browse Opportunities", desc: "Explore vetted SME investment opportunities on our marketplace." },
  { num: "02", icon: DollarSign, title: "Invest Any Amount", desc: "Fund a business with as little as $10 and watch it grow." },
  { num: "03", icon: TrendingUp, title: "Earn Returns", desc: "Receive returns as businesses repay their revenue-based funding." },
];

const benefits = [
  { icon: DollarSign, title: "Invest from Small Amounts", desc: "Start with as little as $10 — investing for everyone." },
  { icon: Store, title: "Support Local Businesses", desc: "Your capital goes directly to African SMEs creating jobs." },
  { icon: BarChart3, title: "Transparent Tracking", desc: "Track every repayment with real-time progress dashboards." },
  { icon: Globe, title: "African SME Growth", desc: "Be part of the fastest-growing entrepreneurial ecosystem." },
];

const Landing = () => (
  <div className="min-h-screen">
    {/* Hero */}
    <section className="relative overflow-hidden bg-card">
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/5" />
      <div className="absolute -bottom-20 -right-20 w-64 h-64 rounded-full bg-accent/10" />
      <div className="container relative py-20 md:py-32">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.08] text-foreground">
              Invest in Local Businesses.{" "}
              <span className="text-primary">Grow Together.</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-lg">
              Duela Cred lets everyday people fund African SMEs and earn returns while helping communities grow.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button size="lg" asChild>
                <Link to="/auth">Start Investing <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
              <Button variant="gold" size="lg" asChild>
                <Link to="/auth?role=sme">Apply for Funding</Link>
              </Button>
            </div>
          </div>
          <div className="flex justify-center md:justify-end">
            <img
              src={heroImage}
              alt="SME business owner in Botswana smiling while checking their phone"
              className="w-full max-w-md object-cover"
              style={{
                borderRadius: "16px",
                boxShadow: "0 8px 32px 0 rgba(255, 193, 7, 0.25)",
              }}
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </section>

    {/* How It Works */}
    <section id="how-it-works" className="py-20 bg-background">
      <div className="container">
        <h2 className="text-3xl font-bold text-center mb-12 text-foreground">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((s) => (
            <div key={s.num} className="bg-card rounded-xl p-8 border border-border hover:shadow-lg transition-shadow">
              <span className="text-sm font-bold text-accent">{s.num}</span>
              <div className="mt-3 mb-4 inline-flex items-center justify-center h-12 w-12 rounded-lg bg-primary/10">
                <s.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{s.title}</h3>
              <p className="text-muted-foreground text-sm">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Benefits */}
    <section className="py-20 bg-card">
      <div className="container">
        <h2 className="text-3xl font-bold text-center mb-12 text-foreground">Why Duela Cred?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {benefits.map((b) => (
            <div key={b.title} className="rounded-xl border-2 border-primary/10 p-6 hover:border-primary/30 transition-colors">
              <div className="inline-flex items-center justify-center h-10 w-10 rounded-lg bg-accent/20 mb-4">
                <b.icon className="h-5 w-5 text-accent" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">{b.title}</h3>
              <p className="text-sm text-muted-foreground">{b.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Waitlist Banner */}
    <section className="py-20 bg-foreground">
      <div className="container text-center max-w-2xl mx-auto space-y-6">
        <h2 className="text-3xl md:text-4xl font-bold text-background leading-tight">
          Be Part of Something Big From Day One
        </h2>
        <p className="text-muted-foreground text-lg">
          Duela Tech is gearing up to launch. We are currently onboarding our first wave of investors and SMEs. Sign up to the waitlist and be first in line when we go live.
        </p>
        <div className="flex flex-wrap justify-center gap-4 pt-2">
          {/* Signup buttons removed per product decision — waitlist remains */}
        </div>
        <p className="text-muted-foreground/60 text-sm pt-2">No commitment required. Just your spot in line.</p>
      </div>
    </section>
  </div>
);

export default Landing;
