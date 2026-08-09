import { useEffect, useRef, useState } from "react";

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export type TimerTone = "normal" | "warning" | "critical";

/**
 * Absolute-timestamp timer. Remaining time is always derived from `endsAt`,
 * so tab throttling, sleep or a page refresh can never rewind the clock.
 */
export function useSectionTimer(endsAt: number | null, onExpire?: () => void) {
  const [remaining, setRemaining] = useState(() =>
    endsAt ? Math.max(0, endsAt - Date.now()) : 0,
  );
  const expired = useRef(false);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    expired.current = false;
    if (!endsAt) {
      setRemaining(0);
      return;
    }
    const tick = () => {
      const left = Math.max(0, endsAt - Date.now());
      setRemaining(left);
      if (left <= 0 && !expired.current) {
        expired.current = true;
        onExpireRef.current?.();
      }
    };
    tick();
    const id = window.setInterval(tick, 250);
    const onVisible = () => tick();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [endsAt]);

  const tone: TimerTone =
    remaining <= 60_000 ? "critical" : remaining <= 5 * 60_000 ? "warning" : "normal";

  return { remaining, label: formatClock(remaining), tone, isExpired: remaining <= 0 };
}
