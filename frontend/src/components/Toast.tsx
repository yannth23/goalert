'use client';

import type { ToastState } from '../hooks/useToast';

interface ToastProps {
  toast: ToastState | null;
  successColor?: string;
}

/**
 * Shared floating toast notification component.
 * Renders at the bottom-center of the viewport.
 */
export function Toast({ toast, successColor = 'bg-green-600' }: ToastProps) {
  if (!toast) return null;

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full text-sm font-medium shadow-xl transition-all text-white ${
        toast.ok ? successColor : 'bg-red-600'
      }`}
    >
      {toast.msg}
    </div>
  );
}
