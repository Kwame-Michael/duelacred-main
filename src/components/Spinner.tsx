import { Loader2 } from "lucide-react";

const Spinner = () => (
  <div className="flex items-center justify-center py-20">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

export default Spinner;
