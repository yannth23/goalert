'use client';

export function ApiDebug() {
  if (process.env.NODE_ENV !== 'development') return null;

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'undefined (localhost)';
  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-green-400 text-xs p-2 rounded z-50 max-w-xs break-all">
      API: {apiUrl}
    </div>
  );
}
