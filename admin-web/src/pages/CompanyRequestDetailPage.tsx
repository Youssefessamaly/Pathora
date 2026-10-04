import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ErrorView, LoadingView } from '../components/StateViews'
import { StatusBadge } from '../components/StatusBadge'
import {
  ApiError,
  decideCompanyRequest,
  getCompanyRequest,
  type AdminCompanyRequest,
  type CompanyDecision,
} from '../lib/api'
import { formatDisplayDate } from '../lib/date'

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="detail-field">
      <label>{label}</label>
      {value ? <p>{value}</p> : <p className="empty">Not provided</p>}
    </div>
  )
}

/**
 * One company's full approval review. GET .../company-requests/{companyId} is the only data
 * source; approve/reject PATCHes the same resource and the response becomes the new source of
 * truth — the backend is authoritative, nothing here is optimistically invented. Only fields
 * the backend's AdminCompanyRequestResponse actually returns are shown.
 */
export function CompanyRequestDetailPage() {
  const { companyId } = useParams<{ companyId: string }>()

  const [request, setRequest] = useState<AdminCompanyRequest | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [decisionMessage, setDecisionMessage] = useState<string | null>(null)
  const [decisionError, setDecisionError] = useState<string | null>(null)
  const [isDeciding, setIsDeciding] = useState(false)

  const load = useCallback(() => {
    if (!companyId) {
      return
    }
    setRequest(null)
    setLoadError(null)
    getCompanyRequest(companyId)
      .then(setRequest)
      .catch((error: unknown) => {
        setLoadError(error instanceof ApiError ? error.message : 'Unable to load this company request.')
      })
  }, [companyId])

  useEffect(() => {
    load()
  }, [load])

  const handleDecide = async (decision: CompanyDecision) => {
    if (!companyId || isDeciding) {
      return
    }

    const verb = decision === 'APPROVED' ? 'approve' : 'reject'
    const confirmed = window.confirm(`Are you sure you want to ${verb} this company?`)
    if (!confirmed) {
      return
    }

    setIsDeciding(true)
    setDecisionError(null)
    setDecisionMessage(null)

    try {
      const updated = await decideCompanyRequest(companyId, decision)
      setRequest(updated)
      setDecisionMessage(decision === 'APPROVED' ? 'Company approved.' : 'Company rejected.')
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        // Someone else (or this admin, from another tab) already decided it — refetch so the
        // page reflects the real current status rather than retrying blindly.
        setDecisionError('This company request has already been reviewed.')
        load()
      } else {
        setDecisionError(error instanceof ApiError ? error.message : 'Something went wrong. Please try again.')
      }
    } finally {
      setIsDeciding(false)
    }
  }

  return (
    <div>
      <Link to="/requests" className="back-link">
        ← Back to company requests
      </Link>

      {request === null && !loadError && <LoadingView />}

      {loadError && <ErrorView message={loadError} onRetry={load} />}

      {request && (
        <div className="card">
          <div className="detail-header">
            <h1>{request.companyName ?? 'Unnamed company'}</h1>
            <StatusBadge status={request.approvalStatus} />
          </div>
          <p className="text-secondary">{request.email ?? 'No email on file'}</p>

          <div className="detail-sections">
            <div className="detail-section">
              <h2>Company</h2>
              <div className="detail-grid">
                <Field label="Industry" value={request.industry} />
                <Field label="Company size" value={request.companySize} />
                <Field label="Location" value={request.location} />
                <Field label="Website" value={request.website} />
              </div>
              <div className="detail-field mt-4">
                <label>Description</label>
                {request.description ? <p>{request.description}</p> : <p className="empty">Not provided</p>}
              </div>
            </div>

            <div className="detail-section">
              <h2>Contact</h2>
              <div className="detail-grid">
                <Field label="Contact name" value={request.contactName} />
                <Field label="Contact phone" value={request.contactPhone} />
              </div>
            </div>

            <div className="detail-section">
              <h2>Status</h2>
              <div className="detail-grid">
                <Field label="Onboarding" value={request.onboardingCompleted ? 'Completed' : 'Incomplete'} />
                <Field label="Requested" value={formatDisplayDate(request.requestedAt)} />
                <Field
                  label="Reviewed"
                  value={request.reviewedAt ? formatDisplayDate(request.reviewedAt) : null}
                />
              </div>
            </div>
          </div>

          {decisionMessage && <div className="banner banner-success mt-6">{decisionMessage}</div>}

          {decisionError && <div className="banner banner-warning mt-6">{decisionError}</div>}

          {request.approvalStatus === 'PENDING' && (
            <div className="detail-actions">
              <button
                type="button"
                className="btn btn-danger"
                disabled={isDeciding}
                onClick={() => handleDecide('REJECTED')}
              >
                {isDeciding ? 'Please wait…' : 'Reject company'}
              </button>
              <button
                type="button"
                className="btn btn-success"
                disabled={isDeciding}
                onClick={() => handleDecide('APPROVED')}
              >
                {isDeciding ? 'Please wait…' : 'Approve company'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
