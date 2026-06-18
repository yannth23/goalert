'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { api } from '../lib/api';
import type { FootballMatch } from '../types';

const POLL_INTERVAL = 30_000; // 30 seconds

export function useGoalNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [enabled, setEnabled] = useState(false);
  const prevMatchesRef = useRef<Map<string, FootballMatch>>(new Map());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
      const stored = localStorage.getItem('goalert_browser_notifications');
      if (stored === 'true' && Notification.permission === 'granted') {
        setEnabled(true);
      }
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return;
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === 'granted') {
      setEnabled(true);
      localStorage.setItem('goalert_browser_notifications', 'true');
    }
  }, []);

  const toggle = useCallback(async () => {
    if (enabled) {
      setEnabled(false);
      localStorage.setItem('goalert_browser_notifications', 'false');
      return;
    }

    if (permission !== 'granted') {
      await requestPermission();
    } else {
      setEnabled(true);
      localStorage.setItem('goalert_browser_notifications', 'true');
    }
  }, [enabled, permission, requestPermission]);

  const sendNotification = useCallback((title: string, body: string) => {
    if (Notification.permission !== 'granted') return;
    try {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: `goal-${Date.now()}`,
      });
    } catch {
      // Fallback for environments where Notification constructor fails
    }
  }, []);

  const checkForGoals = useCallback(async () => {
    if (!enabled) return;

    try {
      const matches = await api.getTodayMatches();
      const prevMap = prevMatchesRef.current;

      for (const match of matches) {
        const prev = prevMap.get(match.id);
        if (!prev) continue;

        const prevHome = prev.team1Score ?? null;
        const prevAway = prev.team2Score ?? null;
        const currHome = match.team1Score ?? null;
        const currAway = match.team2Score ?? null;

        if (currHome === null || currAway === null) continue;

        if (currHome !== prevHome || currAway !== prevAway) {
          const scorer = currHome !== prevHome ? match.team1 : match.team2;
          sendNotification(
            `GOL! ${match.team1} ${currHome} x ${currAway} ${match.team2}`,
            `${scorer} marcou! ${match.championship}`,
          );
        }
      }

      const newMap = new Map<string, FootballMatch>();
      for (const m of matches) {
        newMap.set(m.id, m);
      }
      prevMatchesRef.current = newMap;
    } catch {
      // Silently ignore polling errors
    }
  }, [enabled, sendNotification]);

  // Initial load of matches (seed the ref without notifications)
  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    api.getTodayMatches().then((matches) => {
      if (cancelled) return;
      const map = new Map<string, FootballMatch>();
      for (const m of matches) {
        map.set(m.id, m);
      }
      prevMatchesRef.current = map;
    }).catch(() => {});

    return () => { cancelled = true; };
  }, [enabled]);

  // Polling loop
  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(checkForGoals, POLL_INTERVAL);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, checkForGoals]);

  return {
    enabled,
    permission,
    toggle,
    supported: typeof window !== 'undefined' && 'Notification' in window,
  };
}
