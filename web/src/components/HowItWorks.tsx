import { EyeOff, LockKeyhole, Eye } from "lucide-react";

const STEPS = [
  {
    icon: EyeOff,
    title: "1. Choose privately",
    body: "Pick HOME, DRAW, or AWAY. Only you know it — nothing is submitted yet.",
  },
  {
    icon: LockKeyhole,
    title: "2. Commit a secret",
    body: "Your prediction is combined with a random secret and locked as a commitment. Only the commitment goes on-chain.",
  },
  {
    icon: Eye,
    title: "3. Reveal after the result",
    body: "Once the organizer publishes the result, reveal your prediction to verify it and see your score.",
  },
];

/**
 * A truthful explainer of the real commit/reveal flow this app implements —
 * matches docs/privacy-model.md exactly, not an idealized or aspirational
 * version of it.
 */
export function HowItWorks() {
  return (
    <div className="how-it-works">
      <h2>How it works</h2>
      <ol>
        {STEPS.map(({ icon: Icon, title, body }) => (
          <li key={title}>
            <Icon aria-hidden="true" size={18} />
            <div>
              <strong>{title}</strong>
              <p>{body}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
