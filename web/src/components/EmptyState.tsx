import { CalendarX2 } from "lucide-react";

interface EmptyStateProps {
  message: string;
}

export function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className="empty-state" role="status">
      <CalendarX2 aria-hidden="true" size={32} />
      <p>{message}</p>
    </div>
  );
}
