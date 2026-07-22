"use client";

import { useEffect, useRef, useState } from "react";

interface TimerProps {
  durationSeconds: number;
  isRunning: boolean;
  onExpire: () => void;
}

/** Chronomètre décroissant. Appelle onExpire une seule fois à zéro. */
export function Timer({ durationSeconds, isRunning, onExpire }: TimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(durationSeconds);
  const hasExpired = useRef(false);

  useEffect(() => {
    setSecondsLeft(durationSeconds);
    hasExpired.current = false;
  }, [durationSeconds]);

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          clearInterval(interval);
          if (!hasExpired.current) {
            hasExpired.current = true;
            onExpire();
          }
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning, onExpire]);

  const isUrgent = secondsLeft <= 5;

  return (
    <div
      className={`rounded-full px-5 py-2 text-center font-display text-2xl font-semibold tabular-nums ${
        isUrgent ? "bg-red-600 text-white" : "bg-blue-deep text-cream"
      }`}
    >
      {secondsLeft}s
    </div>
  );
}
