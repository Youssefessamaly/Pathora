import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { EmptyView, ErrorView, LoadingView } from '../components/StateViews'
import { StatusBadge } from '../components/StatusBadge'
import { ApiError, getCompanyRequests, type AdminCompanyRequest, type ApprovalStatus } from '../lib/api'
import { formatDisplayDate } from '../lib/date'

const FILTERS: { label: string; value: ApprovalStatus }[] = [
  { label: 'Pending', value: 'PENDING' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Rejected', value: 'REJECTED' },
]

const EMPTY_COPY: Record<ApprovalStatus, string> = {
  PENDING: 'No pending company requests.',
  APPROVED: 'No approved companies yet.',
  REJECTED: 'No rejected companies yet.',
}

function isApprovalStatus(value: string | null): value is ApprovalStatus {
  return value === 'PENDING' || value === 'APPROVED' || value === 'REJECTED'
}

function RequestRow({ request, onOpen }: { request: AdminCompanyRequest; onOpen: () => void }) {
  const metaParts = [request.industry, request.location].filter((part): part is string => Boolean(part))

  return (
    <div className="card request-row" onClick={onOpen} role="button" tabIndex={0}>
      <div className="request-row-main">
        <strong>{request.companyName ?? 'Unnamed company'}</strong>
        <span className="text-secondary">{request.email ?? 'No email on file'}</span>
      </div>

      <div className="request-row-meta">
        {metaParts.length > 0 && <span>{metaParts.join(' · ')}</span>}
        <span>{request.onboardingCompleted ? 'Onboarding complete' : 'Onboarding incomplete'}</span>
      </div>

      <div className="request-row-status">
        <StatusBadge status={request.approvalStatus} />
        <span className="text-tertiary">Requested {formatDisplayDate(request.requestedAt)}</span>
      </div>
    </div>
  )
}

/** The review queue — defaults to PENDING, with tabs to browse APPROVED/REJECTED companies
 *  too. The active filter lives in the URL (?status=...) so it survives a refresh and is
 *  shareable, matching exactly what GET /admin/company-requests?status=... accepts. */
export function CompanyRequestsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const statusParam = searchParams.get('status')
  const status: ApprovalStatus = isApprovalStatus(statusParam) ? statusParam : 'PENDING'

  const [requests, setRequests] = useState<AdminCompanyRequest[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setRequests(null)
    setError(null)
    getCompanyRequests(status)
      .then(setRequests)
      .catch((loadError: unknown) => {
        setError(loadError instanceof ApiError ? loadError.message : 'Unable to load company requests.')
      })
  }, [status])

  useEffect(() => {
    load()
  }, [load])

  const handleFilterChange = (next: ApprovalStatus) => {
    setSearchParams(next === 'PENDING' ? {} : { status: next })
  }

  return (
    <div>
      <div className="page-header">
        <h1>Company Requests</h1>
      </div>

      <div className="filter-tabs">
        {FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            className={`filter-tab${filter.value === status ? ' active' : ''}`}
            onClick={() => handleFilterChange(filter.value)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {requests === null && !error && <LoadingView />}

      {error && <ErrorView message={error} onRetry={load} />}

      {requests !== null && !error && requests.length === 0 && (
        <EmptyView title={EMPTY_COPY[status]} />
      )}

      {requests !== null && !error && requests.length > 0 && (
        <div className="request-list">
          {requests.map((request) => (
            <RequestRow
              key={request.companyProfileId}
              request={request}
              onOpen={() => navigate(`/requests/${request.companyProfileId}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
