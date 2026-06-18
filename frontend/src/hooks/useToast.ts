'use client';

import { useState, useCallback } from 'react';

export interface ToastState {
  msg: string;
  ok: boolean;
}

/**
 * Shared toast state management.
 * Returns { toast, showToast } where toast is the current notification or null.
 */
export function useToast(durationMs = 3000) {
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback(
    (msg: string, ok = true) => {
      setToast({ msg, ok });
      setTimeout(() => setToast(null), durationMs);
    },
    [durationMs],
  );

  return { toast, showToast };
}
