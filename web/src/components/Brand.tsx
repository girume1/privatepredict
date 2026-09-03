import { ShieldCheck } from "lucide-react";

interface BrandProps {
  tagline?: boolean;
}

/**
 * Shared logo mark + wordmark, shown at the top of both the participant app
 * and the organizer deploy tool. Purely presentational — carries no
 * match/wallet state of its own.
 */
export function Brand({ tagline = false }: BrandProps) {
  return (
    <div className="brand">
      <div className="brand-row">
        <ShieldCheck aria-hidden="true" size={22} />
        <span className="brand-wordmark">
          <span className="brand-wordmark-light">Private</span>
          <span className="brand-wordmark-accent">Predict</span>
        </span>
      </div>
      {tagline && (
        <p className="brand-tagline">Predict privately. Reveal verifiably.</p>
      )}
    </div>
  );
}
