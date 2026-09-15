interface BrandProps {
  tagline?: boolean;
}

/**
 * Shared logo mark + wordmark. Purely presentational.
 * Uses a custom minimal "PP" mark instead of a generic shield icon.
 */
export function Brand({ tagline = false }: BrandProps) {
  return (
    <div className="brand">
      <div className="brand-row">
        <div className="brand-logo" aria-hidden="true">
          {/* Simple geometric mark: two overlapping offset squares suggesting a ballot + lock */}
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <rect
              x="2"
              y="4"
              width="9"
              height="10"
              rx="1.5"
              fill="rgba(255,255,255,0.18)"
            />
            <rect
              x="5"
              y="2"
              width="9"
              height="10"
              rx="1.5"
              fill="rgba(255,255,255,0.55)"
            />
            <path
              d="M8 6.5 L9.4 9.5 L12 9.5 L9.8 11.2 L10.6 14 L8 12.2 L5.4 14 L6.2 11.2 L4 9.5 L6.6 9.5 Z"
              fill="rgba(255,255,255,0.90)"
            />
          </svg>
        </div>
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
