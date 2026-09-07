import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  PENDING_THRESHOLD_MS,
  useTransactionFlow,
  type TransactionActionResult,
} from "./useTransactionFlow.js";

function deferredResult() {
  let resolve!: (value: TransactionActionResult) => void;
  const promise = new Promise<TransactionActionResult>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe("useTransactionFlow", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts in idle and is not busy", () => {
    const { result } = renderHook(() => useTransactionFlow());
    expect(result.current.phase).toBe("idle");
    expect(result.current.busy).toBe(false);
    expect(result.current.error).toBeUndefined();
  });

  it("goes submitting -> proving, then success only when the promise resolves", async () => {
    const { result } = renderHook(() => useTransactionFlow());
    const deferred = deferredResult();

    act(() => {
      void result.current.start(() => deferred.promise);
    });
    expect(result.current.phase).toBe("submitting");
    expect(result.current.busy).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(result.current.phase).toBe("proving");
    expect(result.current.busy).toBe(true);

    await act(async () => {
      deferred.resolve({ ok: true });
    });
    expect(result.current.phase).toBe("success");
    expect(result.current.busy).toBe(false);
    expect(result.current.error).toBeUndefined();
  });

  it("ignores a second start while one attempt is still in flight", async () => {
    const { result } = renderHook(() => useTransactionFlow());
    const first = deferredResult();
    const firstAction = vi.fn(() => first.promise);
    const secondAction = vi.fn(async (): Promise<TransactionActionResult> => ({
      ok: true,
    }));

    act(() => {
      void result.current.start(firstAction);
    });

    let secondResult: TransactionActionResult | undefined = { ok: false };
    await act(async () => {
      secondResult = await result.current.start(secondAction);
    });
    expect(secondResult).toBeUndefined();
    expect(firstAction).toHaveBeenCalledTimes(1);
    expect(secondAction).not.toHaveBeenCalled();

    await act(async () => {
      first.resolve({ ok: true });
    });
    expect(result.current.phase).toBe("success");
  });

  it("does not mark a 30s wait as failed: stays pending until a definitive result", async () => {
    const { result } = renderHook(() => useTransactionFlow());
    const deferred = deferredResult();
    const action = vi.fn(() => deferred.promise);

    act(() => {
      void result.current.start(action);
    });
    act(() => {
      vi.advanceTimersByTime(PENDING_THRESHOLD_MS);
    });

    expect(result.current.phase).toBe("pending");
    expect(result.current.busy).toBe(true);
    expect(result.current.error).toBeUndefined();

    // A second start is still refused while the original is unresolved.
    const duplicate = vi.fn(async (): Promise<TransactionActionResult> => ({
      ok: true,
    }));
    let duplicateResult: TransactionActionResult | undefined = { ok: false };
    await act(async () => {
      duplicateResult = await result.current.start(duplicate);
    });
    expect(duplicateResult).toBeUndefined();
    expect(duplicate).not.toHaveBeenCalled();

    // The eventual promise result still drives the terminal state.
    await act(async () => {
      deferred.resolve({ ok: true });
    });
    expect(result.current.phase).toBe("success");
    expect(result.current.busy).toBe(false);
  });

  it("surfaces a definitive failure and allows a retry afterwards", async () => {
    const { result } = renderHook(() => useTransactionFlow());
    const failing = vi.fn(async (): Promise<TransactionActionResult> => ({
      ok: false,
      error: "No funds",
    }));

    await act(async () => {
      await result.current.start(failing);
    });
    expect(result.current.phase).toBe("error");
    expect(result.current.error).toBe("No funds");
    expect(result.current.busy).toBe(false);

    // Retry is allowed after the failure.
    const succeeding = vi.fn(async (): Promise<TransactionActionResult> => ({
      ok: true,
    }));
    await act(async () => {
      await result.current.start(succeeding);
    });
    expect(succeeding).toHaveBeenCalledOnce();
    expect(result.current.phase).toBe("success");
    expect(result.current.error).toBeUndefined();
  });

  it("converts a thrown action into a definitive error", async () => {
    const { result } = renderHook(() => useTransactionFlow());
    const throwing = vi.fn(async (): Promise<TransactionActionResult> => {
      throw new Error("Failed to fetch");
    });

    await act(async () => {
      await result.current.start(throwing);
    });
    expect(result.current.phase).toBe("error");
    expect(result.current.error).toBe("Failed to fetch");
    expect(result.current.busy).toBe(false);
  });

  it("reset clears the phase and error back to idle", async () => {
    const { result } = renderHook(() => useTransactionFlow());
    await act(async () => {
      await result.current.start(
        async (): Promise<TransactionActionResult> => ({
          ok: false,
          error: "boom",
        }),
      );
    });
    expect(result.current.phase).toBe("error");

    act(() => {
      result.current.reset();
    });
    expect(result.current.phase).toBe("idle");
    expect(result.current.error).toBeUndefined();
    expect(result.current.busy).toBe(false);
  });
});
