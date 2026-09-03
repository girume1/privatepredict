import { useEffect, useRef, type ReactNode } from "react";

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

interface DialogProps {
  open: boolean;
  onDismiss: () => void;
  /** When false, Escape and backdrop clicks do nothing (e.g. mid-transaction). */
  dismissible?: boolean;
  labelledBy: string;
  children: ReactNode;
}

/**
 * Minimal accessible modal: traps Tab focus inside while open, restores
 * focus to the triggering element on close. Built on plain DOM APIs, not a
 * third-party dialog library.
 */
export function Dialog({
  open,
  onDismiss,
  dismissible = true,
  labelledBy,
  children,
}: DialogProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    triggerRef.current = document.activeElement as HTMLElement | null;
    const container = containerRef.current;
    const firstFocusable =
      container?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    firstFocusable?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (dismissible) {
          onDismiss();
        }
        return;
      }
      if (event.key !== "Tab" || !container) {
        return;
      }
      const focusables = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => !el.hasAttribute("disabled"));
      if (focusables.length === 0) {
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      triggerRef.current?.focus();
    };
  }, [open, dismissible, onDismiss]);

  if (!open) {
    return null;
  }

  return (
    <div className="dialog-backdrop" role="presentation">
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className="dialog"
      >
        {children}
      </div>
    </div>
  );
}
