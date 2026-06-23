import { CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface SuccessScreenProps {
  title: string;
  message: string;
  ctaLabel?: string;
  ctaTo?: string;
}

const SuccessScreen = ({ title, message, ctaLabel = "Go to Dashboard", ctaTo = "/" }: SuccessScreenProps) => (
  <div className="min-h-[80vh] flex items-center justify-center px-4" style={{ backgroundColor: "hsl(var(--navy))" }}>
    <div className="max-w-lg w-full text-center text-white py-16">
      <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-accent/15 mb-6">
        <CheckCircle2 className="h-12 w-12 text-accent" />
      </div>
      <h1 className="text-3xl font-bold mb-3">{title}</h1>
      <p className="text-white/80 leading-relaxed mb-8">{message}</p>
      <Button asChild size="lg" className="bg-accent text-foreground hover:bg-accent/90">
        <Link to={ctaTo}>{ctaLabel}</Link>
      </Button>
    </div>
  </div>
);

export default SuccessScreen;
