import { MatchState } from "@privatepredict/contract";

interface MatchStateTimelineProps {
  current: MatchState;
}

const STATES: { value: MatchState; label: string }[] = [
  { value: MatchState.OPEN, label: "Open" },
  { value: MatchState.CLOSED, label: "Closed" },
  { value: MatchState.RESULT_PUBLISHED, label: "Result published" },
];

export function matchStateLabel(state: MatchState): string {
  return STATES.find((s) => s.value === state)?.label ?? "Unknown";
}

export function MatchStateTimeline({ current }: MatchStateTimelineProps) {
  return (
    <ol className="match-state-timeline" aria-label="Match progress">
      {STATES.map(({ value, label }) => {
        const isActive = value === current;
        return (
          <li
            key={label}
            className={
              isActive
                ? "match-state-timeline-node active"
                : "match-state-timeline-node"
            }
            aria-current={isActive ? "step" : undefined}
          >
            {label}
          </li>
        );
      })}
    </ol>
  );
}
