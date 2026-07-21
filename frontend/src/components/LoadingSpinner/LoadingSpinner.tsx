export function LoadingSpinner(): JSX.Element {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-0">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-ink-200 border-t-ink-900"
        role="status"
        aria-label="Загрузка"
      />
    </div>
  );
}
