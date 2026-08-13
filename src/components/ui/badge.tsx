const STATUS_STYLES: Record<string, string> = {
  // Appointment / sample pipeline
  BOOKED: "bg-brand-tint text-brand-dark",
  SAMPLE_COLLECTED: "bg-gold-tint text-gold",
  IN_PROGRESS: "bg-purple-tint text-purple",
  COMPLETED: "bg-ok-tint text-ok",
  CANCELLED: "bg-background text-ink-faint",
  // Lab status
  PENDING: "bg-gold-tint text-gold",
  APPROVED: "bg-ok-tint text-ok",
  REJECTED: "bg-danger-tint text-danger",
  SUSPENDED: "bg-background text-ink-faint",
};

const FALLBACK = "bg-background text-ink-soft";

export function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? FALLBACK;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10.5px] font-bold whitespace-nowrap ${style}`}>
      {status.replaceAll("_", " ")}
    </span>
  );
}
