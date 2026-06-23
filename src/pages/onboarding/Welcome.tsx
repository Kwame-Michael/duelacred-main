import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { TrendingUp, Store } from "lucide-react";
import logo from "@/assets/duela_cred_logo.png";

const Welcome = () => (
  <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
    <div className="max-w-2xl w-full text-center">
      <img src={logo} alt="Duela Cred" className="h-14 mx-auto mb-8" />
      <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">Join Duela Cred</h1>
      <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
        Invest in local businesses and earn real returns while helping your community grow.
      </p>
      <div className="grid sm:grid-cols-2 gap-4 max-w-md mx-auto">
        <Button asChild size="lg" className="h-14 text-base bg-primary hover:bg-primary/90">
          <Link to="/onboarding/investor">
            <TrendingUp className="mr-2 h-5 w-5" /> I want to Invest
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="h-14 text-base border-2 border-accent text-foreground hover:bg-accent/10">
          <Link to="/onboarding/sme">
            <Store className="mr-2 h-5 w-5" /> I am a Business Owner
          </Link>
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mt-8">
        Duela Cred is in its early access phase. All investments carry risk including potential loss of capital.
      </p>
    </div>
  </div>
);

export default Welcome;
