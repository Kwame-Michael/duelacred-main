import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Landing from "./pages/Landing";
import Marketplace from "./pages/Marketplace";
import Opportunity from "./pages/Opportunity";
import Auth from "./pages/Auth";
import InvestorDashboard from "./pages/InvestorDashboard";
import SmeDashboard from "./pages/SmeDashboard";
import AdminPanel from "./pages/AdminPanel";
import Welcome from "./pages/onboarding/Welcome";
import InvestorOnboarding from "./pages/onboarding/InvestorOnboarding";
import SmeOnboarding from "./pages/onboarding/SmeOnboarding";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true }}>
        <AuthProvider>
          <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/marketplace" element={<Marketplace />} />
                <Route path="/opportunity/:id" element={<Opportunity />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/signup" element={<Welcome />} />
                <Route path="/onboarding" element={<Welcome />} />
                <Route path="/onboarding/investor" element={<InvestorOnboarding />} />
                <Route path="/onboarding/sme" element={<SmeOnboarding />} />
                <Route path="/dashboard/investor" element={<InvestorDashboard />} />
                <Route path="/dashboard/sme" element={<SmeDashboard />} />
                <Route path="/dashboard/admin" element={<AdminPanel />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
