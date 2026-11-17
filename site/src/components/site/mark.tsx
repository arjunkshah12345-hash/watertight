export function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <path
        d="M3 9h26l-3.5 14.5a3 3 0 0 1-2.9 2.3H9.4a3 3 0 0 1-2.9-2.3L3 9Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M11.5 9v16.6M20.5 9v16.6" stroke="currentColor" strokeWidth="2" />
      <path d="M4.6 15.5h22.8" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2 2" />
    </svg>
  );
}
