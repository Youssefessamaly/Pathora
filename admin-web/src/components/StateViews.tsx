/** Shared loading/error/empty presentation for list and detail pages — consistent spinner,
 *  consistent retry affordance, never a raw backend error message on screen. */

export function LoadingView() {
  return (
    <div className="state-view" role="status" aria-live="polite">
      <div className="spinner" />
      <span>Loading…</span>
    </div>
  )
}

export function ErrorView({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="state-view">
      <h3>Something went wrong</h3>
      <p className="text-secondary">{message}</p>
      <button type="button" className="btn btn-secondary" onClick={onRetry}>
        Try again
      </button>
    </div>
  )
}

export function EmptyView({ title, body }: { title: string; body?: string }) {
  return (
    <div className="state-view">
      <h3>{title}</h3>
      {body && <p className="text-secondary">{body}</p>}
    </div>
  )
}
