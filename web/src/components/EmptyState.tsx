import { CalendarX2 } from "lucide-react";

interface EmptyStateProps {
  message: string;
}

export function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className="empty-state" role="status">
      <span className="empty-state-icon" aria-hidden="true">
        <CalendarX2 size={32} />
      </span>
      <p>{message}</p>
    </div>
  );
}
