/**
 * Small centralized API client for the Pathora backend, mirroring the mobile app's own
 * mobile/src/lib/api.ts pattern. Every request goes through `request()` below — never scatter
 * raw fetch calls across components. Never log a password, the JWT, or the Authorization
 * header anywhere in this module.
 */

import { clearStoredToken, getStoredToken } from './token'

// VITE_API_BASE_URL is public browser configuration, never a secret (see admin-web/.env.example
// and README). Empty/unset -> relative /api/v1, so dev traffic flows through the Vite proxy in
// vite.config.ts straight to the backend with no CORS setup needed. Configured -> that absolute
// base is used as-is (e.g. a future https://api.pathora.com/api/v1 in production).
const configuredBase = import.meta.env.VITE_API_BASE_URL?.trim()
const API_BASE_URL = configuredBase ? configuredBase.replace(/\/+$/, '') : '/api/v1'

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export class NetworkError extends Error {
  constructor(message = 'Unable to reach the server. Check your connection and try again.') {
    super(message)
    this.name = 'NetworkError'
  }
}

type UnauthorizedHandler = () => void

let unauthorizedHandler: UnauthorizedHandler | null = null

/** AuthProvider registers itself here on mount so a 401 from ANY request — not just a
 *  deliberate logout — clears the session and bounces the admin back to /login. */
export function registerUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler
}

function friendlyMessageForStatus(status: number): string {
  switch (status) {
    case 400:
      return 'That request was not valid. Please check the details and try again.'
    case 401:
      return 'Your session has expired. Please log in again.'
    case 403:
      return 'You do not have permission to do that.'
    case 404:
      return 'That could not be found.'
    case 409:
      return 'This company request has already been reviewed.'
    default:
      return status >= 500
        ? 'Something went wrong on our end. Please try again later.'
        : 'Something went wrong. Please try again.'
  }
}

type Method = 'GET' | 'POST' | 'PATCH'

async function request<TResponse>(method: Method, path: string, body?: unknown): Promise<TResponse> {
  const token = getStoredToken()
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new NetworkError()
  }

  if (!response.ok) {
    if (response.status === 401) {
      // A stale/invalid/expired token can never be partially trusted — drop it and let the
      // app fall back to the login screen, regardless of which request happened to fail.
      clearStoredToken()
      unauthorizedHandler?.()
    }
    throw new ApiError(response.status, friendlyMessageForStatus(response.status))
  }

  const text = await response.text()
  if (!text) {
    return undefined as TResponse
  }

  try {
    return JSON.parse(text) as TResponse
  } catch {
    throw new ApiError(response.status, 'Received an unexpected response from the server.')
  }
}

export type Role = 'INTERN' | 'COMPANY' | 'ADMIN'

export type LoginPayload = {
  email: string
  password: string
}

/** Mirrors the backend's LoginResponse exactly (com.internplatform.auth.LoginResponse). */
export type LoginResponse = {
  accessToken: string
  tokenType: string
  userId: string
  email: string
  role: Role
}

/** Mirrors the backend's CurrentUserResponse (GET /auth/me) — any authenticated role may call
 *  it; used here purely to re-validate a stored token (and its role) on page reload. */
export type CurrentUserResponse = {
  userId: string
  email: string
  role: Role
}

export function login(payload: LoginPayload): Promise<LoginResponse> {
  return request<LoginResponse>('POST', '/auth/login', payload)
}

export function getCurrentUser(): Promise<CurrentUserResponse> {
  return request<CurrentUserResponse>('GET', '/auth/me')
}

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

/** Mirrors the backend's AdminCompanyRequestResponse exactly
 *  (com.internplatform.admin.AdminCompanyRequestResponse) — field for field, nothing invented.
 *  Every business field is nullable because CompanyProfile's own columns are nullable until
 *  the company finishes onboarding; a PENDING request may well still have several of these
 *  unset. */
export type AdminCompanyRequest = {
  companyProfileId: string
  userId: string
  companyName: string | null
  email: string | null
  industry: string | null
  companySize: string | null
  location: string | null
  website: string | null
  description: string | null
  contactName: string | null
  contactPhone: string | null
  onboardingCompleted: boolean
  approvalStatus: ApprovalStatus
  requestedAt: string
  reviewedAt: string | null
}

/** Omitting `status` matches the backend default (GET /admin/company-requests with no query
 *  param) — the review queue, i.e. PENDING. */
export function getCompanyRequests(status?: ApprovalStatus): Promise<AdminCompanyRequest[]> {
  const query = status ? `?status=${status}` : ''
  return request<AdminCompanyRequest[]>('GET', `/admin/company-requests${query}`)
}

export function getCompanyRequest(companyId: string): Promise<AdminCompanyRequest> {
  return request<AdminCompanyRequest>('GET', `/admin/company-requests/${companyId}`)
}

/** The only two decisions an admin may submit — the backend separately rejects PENDING and any
 *  other value with a 400 (see AdminCompanyRequestStatusUpdateRequest). */
export type CompanyDecision = 'APPROVED' | 'REJECTED'

/** Throws ApiError with status 409 if the request was already decided (by this admin or
 *  another) — callers should check `error.status === 409`, refetch the detail, and show the
 *  real current status rather than retrying. */
export function decideCompanyRequest(
  companyId: string,
  status: CompanyDecision,
): Promise<AdminCompanyRequest> {
  return request<AdminCompanyRequest>('PATCH', `/admin/company-requests/${companyId}/status`, { status })
}
