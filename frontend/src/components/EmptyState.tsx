interface EmptyStateProps {
  message: string;
}

export function EmptyState({
  message,
}: EmptyStateProps) {
  return (
    <div className="text-center py-12">
      <p className="text-slate-400">
        {message}
      </p>
    </div>
  );
}