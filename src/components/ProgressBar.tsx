type ProgressBarProps = {
  completed: number;
  total: number;
};

export function ProgressBar({ completed, total }: ProgressBarProps) {
  const safeTotal = Math.max(total, 0);
  const safeCompleted = Math.min(Math.max(completed, 0), safeTotal);
  const percentage = safeTotal === 0 ? 0 : Math.round((safeCompleted / safeTotal) * 100);

  return (
    <div aria-label="Jura chat progress" className="w-full">
      <div className="mb-2 flex items-center justify-between text-xs font-medium text-slate-200">
        <span className="uppercase tracking-wide text-white/80">Progress</span>
        <span>{percentage}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-white/10">
        <div
          className="h-2 rounded-full bg-gradient-to-r from-indigo-500 via-sky-400 to-cyan-300 transition-all duration-300 ease-in-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
