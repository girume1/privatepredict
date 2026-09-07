import type { ReactNode } from "react";

type StatusCardVariant = "info" | "success" | "warning" | "muted";

interface StatusCardProps {
  icon: ReactNode;
  title: string;
  body?: ReactNode;
  variant?: StatusCardVariant;
}

/**
 * A consistent visual treatment for lifecycle state messages — replaces the
 * bare <p> tags that previously communicated key match states. Each card
 * carries an icon, a title, and an optional body for additional context.
 */
export function StatusCard({
  icon,
  title,
  body,
  variant = "info",
}: StatusCardProps) {
  return (
    <div className={`status-card status-card--${variant}`}>
      <span className="status-card-icon" aria-hidden="true">
        {icon}
      </span>
      <div className="status-card-content">
        <p className="status-card-title">{title}</p>
        {body && <p className="status-card-body">{body}</p>}
      </div>
    </div>
  );
}
