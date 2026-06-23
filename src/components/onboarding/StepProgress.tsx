interface StepProgressProps {
  current: number;
  total: number;
}

const StepProgress = ({ current, total }: StepProgressProps) => {
  const pct = Math.round((current / total) * 100);
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-muted-foreground mb-2">
        <span>Step {current} of {total}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-accent transition-all duration-500 ease-out rounded-full"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

export default StepProgress;
