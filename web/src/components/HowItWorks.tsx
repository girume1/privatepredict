import { useState } from "react";
import { EyeOff, LockKeyhole, Eye, ChevronDown, ChevronUp } from "lucide-react";

const STEPS = [
  {
    icon: EyeOff,
    title: "Choose privately",
    body: "Pick HOME, DRAW, or AWAY. Only you know it — nothing is submitted yet.",
  },
  {
    icon: LockKeyhole,
    title: "Commit a secret",
    body: "Your prediction is combined with a random salt and locked as a commitment. Only the commitment goes on-chain.",
  },
  {
    icon: Eye,
    title: "Reveal after the result",
    body: "Once the organizer publishes the result, reveal your prediction. Midnight verifies the commitment and awards your score.",
  },
];

/**
 * A truthful explainer of the real commit/reveal flow this app implements —
 * matches docs/privacy-model.md exactly, not an idealized or aspirational
 * version of it.
 *
 * Collapsed by default so first-time users see the prediction selector
 * immediately without scrolling past explanatory text. Content is kept in
 * the DOM (not conditionally unmounted) so tests and screen readers can
 * always find the text; the `data-collapsed` attribute drives the CSS
 * visibility toggle without `display:none`.
 */
export function HowItWorks() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="how-it-works" data-collapsed={!expanded}>
      <button
        type="button"
        className="how-it-works-toggle"
        aria-expanded={expanded}
        aria-controls="how-it-works-body"
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="how-it-works-toggle-label">How it works</span>
        {expanded ? (
          <ChevronUp aria-hidden="true" size={14} />
        ) : (
          <ChevronDown aria-hidden="true" size={14} />
        )}
      </button>
      <div
        id="how-it-works-body"
        className="how-it-works-body"
        aria-hidden={!expanded}
      >
        {/* role="list" restores list semantics in Safari + VoiceOver when
            list-style is removed via CSS (known Safari/VoiceOver behaviour). */}
        <ol role="list" className="how-it-works-steps">
          {STEPS.map(({ icon: Icon, title, body }) => (
            <li key={title}>
              <span className="how-it-works-step-icon" aria-hidden="true">
                <Icon size={15} />
              </span>
              <div>
                <strong>{title}</strong>
                <p>{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
