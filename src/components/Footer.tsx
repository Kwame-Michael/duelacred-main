import { Link } from "react-router-dom";
import logo from "@/assets/duela_cred_logo.png";

const Footer = () => (
  <footer className="bg-navy text-primary-foreground">
    <div className="container py-12">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="space-y-3">
          <img src={logo} alt="Duela Cred" className="h-8 brightness-0 invert" />
          <p className="text-sm text-primary-foreground/70">
            Empowering African entrepreneurs, one investment at a time.
          </p>
        </div>
        <div>
          <h4 className="font-semibold mb-3">Platform</h4>
          <ul className="space-y-2 text-sm text-primary-foreground/70">
            <li><Link to="/marketplace" className="hover:text-primary-foreground transition-colors">Marketplace</Link></li>
            <li><Link to="/auth" className="hover:text-primary-foreground transition-colors">Start Investing</Link></li>
            <li><Link to="/auth?role=sme" className="hover:text-primary-foreground transition-colors">Apply for Funding</Link></li>
            <li><Link to="/dashboard/admin" className="hover:text-primary-foreground transition-colors">Admin</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3">Company</h4>
          <ul className="space-y-2 text-sm text-primary-foreground/70">
            <li><a href="#" className="hover:text-primary-foreground transition-colors">About</a></li>
            <li><a href="#" className="hover:text-primary-foreground transition-colors">Contact</a></li>
            <li><a href="#" className="hover:text-primary-foreground transition-colors">Terms</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3">Connect</h4>
          <ul className="space-y-2 text-sm text-primary-foreground/70">
            <li><a href="#" className="hover:text-primary-foreground transition-colors">Twitter</a></li>
            <li><a href="#" className="hover:text-primary-foreground transition-colors">LinkedIn</a></li>
          </ul>
        </div>
      </div>
      <div className="mt-10 pt-6 border-t border-primary-foreground/20 text-center text-sm text-primary-foreground/50">
        © {new Date().getFullYear()} Duela Cred. All rights reserved.
      </div>
    </div>
  </footer>
);

export default Footer;
