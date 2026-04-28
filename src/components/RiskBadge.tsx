type Risk = "Green" | "Yellow" | "Red" | "LOW" | "MEDIUM" | "HIGH" | string;

interface RiskBadgeProps {
  risk: Risk;
  className?: string;
}

const COLORS: Record<string, string> = {
  Green: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  LOW: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  Yellow: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  MEDIUM: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  Red: "bg-red-500/15 text-red-300 border-red-500/30",
  HIGH: "bg-red-500/15 text-red-300 border-red-500/30",
};

const LABELS: Record<string, string> = {
  Green: "Safe",
  LOW: "Safe",
  Yellow: "Caution",
  MEDIUM: "Caution",
  Red: "High risk",
  HIGH: "High risk",
};

export function RiskBadge({ risk, className = "" }: RiskBadgeProps) {
  const color = COLORS[risk] ?? "bg-slate-500/15 text-slate-300 border-slate-500/30";
  const label = LABELS[risk] ?? risk;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wide ${color} ${className}`}
      aria-label={`Risk level: ${label}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden="true" />
      {label}
    </span>
  );
}
