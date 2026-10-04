import type { ApprovalStatus } from '../lib/api'

const LABELS: Record<ApprovalStatus, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
}

const CLASS_NAMES: Record<ApprovalStatus, string> = {
  PENDING: 'badge badge-pending',
  APPROVED: 'badge badge-approved',
  REJECTED: 'badge badge-rejected',
}

/** The only three approval states that exist — amber/green/red, matching the Pathora palette. */
export function StatusBadge({ status }: { status: ApprovalStatus }) {
  return <span className={CLASS_NAMES[status]}>{LABELS[status]}</span>
}
