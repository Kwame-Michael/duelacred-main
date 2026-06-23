import { useRef, useState } from "react";
import { UploadCloud, CheckCircle2, X } from "lucide-react";
import { toast } from "sonner";

interface UploadBoxProps {
  label?: string;
  hint?: string;
  accept?: string;
  maxSizeMB?: number;
  onFileChange?: (file: File | null) => void;
}

const UploadBox = ({
  label = "Tap to upload or drag your proof of payment here",
  hint,
  accept = "application/pdf,image/png,image/jpeg",
  maxSizeMB = 5,
  onFileChange,
}: UploadBoxProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (f: File | null) => {
    if (!f) return;
    if (f.size > maxSizeMB * 1024 * 1024) {
      toast.error(`File must be smaller than ${maxSizeMB}MB`);
      return;
    }
    setFile(f);
    onFileChange?.(f);
  };

  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFile(e.dataTransfer.files?.[0] || null);
        }}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all ${
          dragOver ? "border-accent bg-accent/5" : "border-accent/60 bg-accent/[0.03] hover:bg-accent/5"
        }`}
      >
        {file ? (
          <div className="flex items-center justify-center gap-2 text-foreground">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <span className="font-medium truncate max-w-[200px]">{file.name}</span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setFile(null); onFileChange?.(null); }}
              className="ml-2 text-muted-foreground hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            <UploadCloud className="h-10 w-10 text-accent mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">{label}</p>
            {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
            <p className="text-xs text-muted-foreground mt-2">PDF, JPG, PNG · Max {maxSizeMB}MB</p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0] || null)}
        />
      </div>
    </div>
  );
};

export default UploadBox;
