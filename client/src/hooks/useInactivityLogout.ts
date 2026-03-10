import { useEffect, useRef, useState, useCallback } from "react";
import { useSupabaseAuth } from "@/lib/supabase-auth";
import { performLogout } from "@/lib/logout";

interface UseInactivityLogoutOptions {
  timeoutMs?: number;
  warningMs?: number;
  enabled?: boolean;
}

interface UseInactivityLogoutResult {
  showWarning: boolean;
  secondsRemaining: number;
  stayLoggedIn: () => void;
}

const ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
  "click",
] as const;

export function useInactivityLogout({
  timeoutMs = 30 * 60 * 1000,
  warningMs = 2 * 60 * 1000,
  enabled = true,
}: UseInactivityLogoutOptions = {}): UseInactivityLogoutResult {
  const { signOut } = useSupabaseAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(Math.floor(warningMs / 1000));

  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isLoggingOutRef = useRef(false);
  const showWarningRef = useRef(false);

  const clearAllTimers = useCallback(() => {
    if (warningTimerRef.current) { clearTimeout(warningTimerRef.current); warningTimerRef.current = null; }
    if (logoutTimerRef.current) { clearTimeout(logoutTimerRef.current); logoutTimerRef.current = null; }
    if (countdownIntervalRef.current) { clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null; }
  }, []);

  const startTimers = useCallback(() => {
    clearAllTimers();
    warningTimerRef.current = setTimeout(() => {
      showWarningRef.current = true;
      setShowWarning(true);
      const totalSeconds = Math.floor(warningMs / 1000);
      setSecondsRemaining(totalSeconds);
      countdownIntervalRef.current = setInterval(() => {
        setSecondsRemaining(prev => {
          if (prev <= 1) {
            if (countdownIntervalRef.current) { clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null; }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      logoutTimerRef.current = setTimeout(() => {
        if (!isLoggingOutRef.current) {
          isLoggingOutRef.current = true;
          performLogout(signOut);
        }
      }, warningMs);
    }, timeoutMs - warningMs);
  }, [clearAllTimers, signOut, timeoutMs, warningMs]);

  const stayLoggedIn = useCallback(() => {
    showWarningRef.current = false;
    setShowWarning(false);
    setSecondsRemaining(Math.floor(warningMs / 1000));
    startTimers();
  }, [warningMs, startTimers]);

  useEffect(() => {
    if (!enabled) return;

    const handleActivity = () => {
      if (isLoggingOutRef.current || showWarningRef.current) return;
      startTimers();
    };

    ACTIVITY_EVENTS.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });
    startTimers();

    return () => {
      ACTIVITY_EVENTS.forEach(event => document.removeEventListener(event, handleActivity));
      clearAllTimers();
    };
  }, [enabled, startTimers, clearAllTimers]);

  return { showWarning, secondsRemaining, stayLoggedIn };
}
