import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import logo from "@/assets/duela_cred_logo.png";
import { Menu, X, LogOut } from "lucide-react";
import { useState } from "react";

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const dashboardPath = user
    ? user.role === "admin"
      ? "/dashboard/admin"
      : user.role === "sme"
      ? "/dashboard/sme"
      : "/dashboard/investor"
    : null;

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="Duela Cred" className="h-9" />
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          <Link to="/#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">How It Works</Link>
          <Link to="/marketplace" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Marketplace</Link>
          {user && dashboardPath && (
            <Link to={dashboardPath} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Dashboard</Link>
          )}
          {user?.role === "admin" && (
            <Link to="/dashboard/admin" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Admin</Link>
          )}
          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Hi, {user.name.split(" ")[0]}</span>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-1" /> Logout
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="default" size="sm" onClick={() => navigate("/auth")}>Start Investing</Button>
              <Button variant="gold" size="sm" onClick={() => navigate("/auth?role=sme")}>Apply for Funding</Button>
            </div>
          )}
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden p-2" onClick={() => setOpen(!open)}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-border bg-card p-4 space-y-3">
          <Link to="/marketplace" className="block text-sm font-medium" onClick={() => setOpen(false)}>Marketplace</Link>
          {user && dashboardPath && (
            <Link to={dashboardPath} className="block text-sm font-medium" onClick={() => setOpen(false)}>Dashboard</Link>
          )}
          {user?.role === "admin" && (
            <Link to="/dashboard/admin" className="block text-sm font-medium" onClick={() => setOpen(false)}>Admin</Link>
          )}
          {user ? (
            <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => { handleLogout(); setOpen(false); }}>
              <LogOut className="h-4 w-4 mr-1" /> Logout
            </Button>
          ) : (
            <div className="flex flex-col gap-2">
              <Button variant="default" size="sm" onClick={() => { navigate("/auth"); setOpen(false); }}>Start Investing</Button>
              <Button variant="gold" size="sm" onClick={() => { navigate("/auth?role=sme"); setOpen(false); }}>Apply for Funding</Button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
