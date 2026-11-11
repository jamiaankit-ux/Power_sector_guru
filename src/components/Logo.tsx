export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-bold tracking-tight ${className}`}>
      <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden>
        <rect width="32" height="32" rx="9" fill="#1d4ed8" />
        <path d="M18 4 8 18h7l-2 10 11-15h-7l1-9z" fill="#fbbf24" />
      </svg>
      <span>Power<span className="text-brand-600 dark:text-volt-400">Academy</span></span>
    </span>
  );
}
