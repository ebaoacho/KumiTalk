"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

type ProgressContextValue = {
  isLoading: boolean;
  start: () => void;
  done: () => void;
  track: <T>(operation: () => Promise<T>) => Promise<T>;
  fetchWithProgress: (
    input: RequestInfo | URL,
    init?: RequestInit,
  ) => Promise<Response>;
};

const ProgressContext = createContext<ProgressContextValue | null>(null);

export function useProgress() {
  const ctx = useContext(ProgressContext);
  if (!ctx) {
    throw new Error("useProgress must be used within <ProgressProvider />");
  }
  return ctx;
}

const SHOW_DELAY_MS = 120;

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const activeRequestCount = useRef(0);
  const [isLoading, setIsLoading] = useState(false);
  const timerRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    activeRequestCount.current += 1;

    if (timerRef.current == null) {
      timerRef.current = window.setTimeout(() => {
        setIsLoading(true);
      }, SHOW_DELAY_MS);
    }
  }, []);

  const done = useCallback(() => {
    activeRequestCount.current = Math.max(0, activeRequestCount.current - 1);

    if (activeRequestCount.current === 0) {
      clearTimer();
      setIsLoading(false);
    }
  }, [clearTimer]);

  const track = useCallback(
    async <T,>(operation: () => Promise<T>) => {
      start();
      try {
        return await operation();
      } finally {
        done();
      }
    },
    [done, start],
  );

  const fetchWithProgress = useCallback(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      return track(async () => {
        const finalInit: RequestInit = { cache: "no-store", ...init };
        return fetch(input, finalInit);
      });
    },
    [track],
  );

  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  return (
    <ProgressContext.Provider
      value={{ isLoading, start, done, track, fetchWithProgress }}
    >
      {children}
    </ProgressContext.Provider>
  );
}
