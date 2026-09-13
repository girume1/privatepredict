import { Check } from "lucide-react";
import { MatchState } from "@privatepredict/contract";

interface MatchStateTimelineProps {
  current: MatchState;
}

const STATES: { value: MatchState; label: string; shortLabel: string }[] = [
  { value: MatchState.OPEN, label: "Open", shortLabel: "Open" },
  { value: MatchState.CLOSED, label: "Closed", shortLabel: "Closed" },
  {
    value: MatchState.RESULT_PUBLISHED,
    label: "Result published",
    shortLabel: "Result out",
  },
];

export function matchStateLabel(state: MatchState): string {
  return STATES.find((s) => s.value === state)?.label ?? "Unknown";
}

/**
 * Horizontal lifecycle tracker (Version B): three connected dots where:
 * - Past steps show a check icon in gray
 * - The current step shows a filled accent dot
 * - Future steps show an outlined gray dot
 *
 * Collapses to a vertical stepper on narrow screens via CSS (≤480px).
 */
export function MatchStateTimeline({ current }: MatchStateTimelineProps) {
  const currentIndex = STATES.findIndex((s) => s.value === current);

  return (
    <ol className="match-state-timeline" aria-label="Match progress">
      {STATES.map(({ value, label }, index) => {
        const isPast = index < currentIndex;
        const isActive = value === current;
        const stepClass = isPast ? "past" : isActive ? "active" : "future";

        return (
          <>
            <li
              key={label}
              className={`match-state-timeline-step ${stepClass}`}
              aria-current={isActive ? "step" : undefined}
            >
              <div className="match-state-timeline-dot" aria-hidden="true">
                {isPast && <Check size={14} strokeWidth={3} />}
              </div>
              <span className="match-state-timeline-label">{label}</span>
            </li>
            {/* Connector line between steps — not after the last step */}
            {index < STATES.length - 1 && (
              <li
                key={`line-${index}`}
                className={`match-state-timeline-line${isPast || isActive ? " completed" : ""}`}
                aria-hidden="true"
              />
            )}
          </>
        );
      })}
    </ol>
  );
}
