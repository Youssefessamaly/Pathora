/**
 * Small centralized API client for the Pathora backend.
 * Never log request bodies here — they may contain passwords.
 */

import { File, Paths } from 'expo-file-system';
import { fetch as expoFetch } from 'expo/fetch';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

export class ApiError extends Error {
  status: number;
  /** Best-effort parsed JSON error body, when the server sent one. Never contains secrets. */
  body: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

export class NetworkError extends Error {
  constructor(message = 'Unable to reach the server. Check your connection and try again.') {
    super(message);
    this.name = 'NetworkError';
  }
}

function getBaseUrl(): string {
  if (!API_BASE_URL) {
    throw new Error(
      'EXPO_PUBLIC_API_BASE_URL is not set. Add it to mobile/.env.local (see mobile/.env.example) and restart Metro.',
    );
  }
  return API_BASE_URL;
}

function friendlyMessageForStatus(status: number): string {
  switch (status) {
    case 400:
      return 'Please check your information and try again.';
    case 401:
      return 'Invalid email or password.';
    case 403:
      return 'This account cannot do that right now.';
    case 409:
      return 'An account with this email already exists.';
    default:
      return status >= 500
        ? 'Something went wrong on our end. Please try again later.'
        : 'Something went wrong. Please try again.';
  }
}

type RequestOptions = {
  /** Bearer token for authenticated requests. Never logged. */
  token?: string;
};

async function request<TResponse>(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  body: unknown,
  options?: RequestOptions,
): Promise<TResponse> {
  const url = `${getBaseUrl()}${path}`;
  const isFormData = body instanceof FormData;
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (body !== undefined && !isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  // For FormData bodies, deliberately do NOT set Content-Type — fetch/React Native
  // must generate the multipart boundary itself; setting it manually breaks uploads.
  if (options?.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : isFormData ? (body as FormData) : JSON.stringify(body),
    });
  } catch {
    throw new NetworkError();
  }

  if (!response.ok) {
    let errorBody: unknown;
    try {
      const errorText = await response.text();
      errorBody = errorText ? JSON.parse(errorText) : undefined;
    } catch {
      errorBody = undefined;
    }
    throw new ApiError(response.status, friendlyMessageForStatus(response.status), errorBody);
  }

  const text = await response.text();
  if (!text) {
    return undefined as TResponse;
  }

  try {
    return JSON.parse(text) as TResponse;
  } catch {
    throw new ApiError(response.status, 'Received an unexpected response from the server.');
  }
}

/**
 * POSTs JSON to the API and parses a JSON response.
 * Throws NetworkError on connection failure, ApiError on a non-2xx response.
 */
export function apiPost<TResponse>(path: string, body: unknown, options?: RequestOptions): Promise<TResponse> {
  return request<TResponse>('POST', path, body, options);
}

/**
 * GETs JSON from the API, optionally with a bearer token, and parses a JSON response.
 * Throws NetworkError on connection failure, ApiError on a non-2xx response.
 */
export function apiGet<TResponse>(path: string, options?: RequestOptions): Promise<TResponse> {
  return request<TResponse>('GET', path, undefined, options);
}

/**
 * PATCHes JSON to the API and parses a JSON response.
 * Throws NetworkError on connection failure, ApiError on a non-2xx response.
 */
export function apiPatch<TResponse>(path: string, body: unknown, options?: RequestOptions): Promise<TResponse> {
  return request<TResponse>('PATCH', path, body, options);
}

/**
 * DELETEs a resource. Throws NetworkError on connection failure, ApiError on a non-2xx
 * response (including 409 — callers that need to distinguish "locked" conflicts should check
 * `error.status === 409` themselves rather than relying on the generic message).
 */
export function apiDelete<TResponse = void>(path: string, options?: RequestOptions): Promise<TResponse> {
  return request<TResponse>('DELETE', path, undefined, options);
}

/**
 * POSTs a FormData body (multipart/form-data) and parses a JSON response.
 * Throws NetworkError on connection failure, ApiError on a non-2xx response.
 */
export function apiPostForm<TResponse>(
  path: string,
  formData: FormData,
  options?: RequestOptions,
): Promise<TResponse> {
  return request<TResponse>('POST', path, formData, options);
}

export type UserRole = 'INTERN' | 'COMPANY' | 'ADMIN';

export type RegisterPayload = {
  email: string;
  password: string;
};

export type RegisterResponse = {
  id: string;
  email: string;
  role: UserRole;
  enabled: boolean;
  createdAt: string;
};

export function registerIntern(payload: RegisterPayload): Promise<RegisterResponse> {
  return apiPost<RegisterResponse>('/auth/register/intern', payload);
}

export function registerCompany(payload: RegisterPayload): Promise<RegisterResponse> {
  return apiPost<RegisterResponse>('/auth/register/company', payload);
}

export type LoginPayload = {
  email: string;
  password: string;
};

export type LoginResponse = {
  accessToken: string;
  tokenType: string;
  userId: string;
  email: string;
  role: UserRole;
};

export type CurrentUserResponse = {
  userId: string;
  email: string;
  role: UserRole;
};

export function login(payload: LoginPayload): Promise<LoginResponse> {
  return apiPost<LoginResponse>('/auth/login', payload);
}

export function getCurrentUser(token: string): Promise<CurrentUserResponse> {
  return apiGet<CurrentUserResponse>('/auth/me', { token });
}

export type ForgotPasswordPayload = {
  email: string;
};

export type ForgotPasswordResponse = {
  message: string;
};

export type VerifyOtpPayload = {
  email: string;
  code: string;
};

export type VerifyOtpResponse = {
  resetToken: string;
  expiresAt: string;
};

export type ResetPasswordPayload = {
  resetToken: string;
  newPassword: string;
};

export type ResetPasswordResponse = {
  message: string;
};

export function forgotPassword(payload: ForgotPasswordPayload): Promise<ForgotPasswordResponse> {
  return apiPost<ForgotPasswordResponse>('/auth/forgot-password', payload);
}

export function verifyOtp(payload: VerifyOtpPayload): Promise<VerifyOtpResponse> {
  return apiPost<VerifyOtpResponse>('/auth/verify-otp', payload);
}

export function resetPassword(payload: ResetPasswordPayload): Promise<ResetPasswordResponse> {
  return apiPost<ResetPasswordResponse>('/auth/reset-password', payload);
}

export type AcademicLevel = 'HIGH_SCHOOL' | 'UNIVERSITY';

export type InternProfileSkill = {
  id: string;
  name: string;
};

export type InternProfile = {
  id: string;
  userId: string;
  firstName: string | null;
  lastName: string | null;
  dateOfBirth: string | null;
  phoneNumber: string | null;
  institutionName: string | null;
  academicLevel: AcademicLevel | null;
  academicYear: number | null;
  major: string | null;
  expectedGraduationYear: number | null;
  skills: InternProfileSkill[];
  careerInterests: string | null;
  linkedinUrl: string | null;
  onboardingCompleted: boolean;
  cvFileName: string | null;
  cvUploadedAt: string | null;
  /** Pathora catalog skills the backend detected in the most recently uploaded CV —
   * distinct from the intern's manually selected `skills`. Never raw CV text. */
  cvDetectedSkills: InternProfileSkill[];
  createdAt: string;
  updatedAt: string;
};

/**
 * Partial update payload for PATCH /intern/profile.
 * Matching the backend's PATCH semantics: only include the fields you want to change.
 * Omitted fields are left untouched server-side; there is currently no way to clear a
 * field back to null once set (the backend treats an omitted/null field identically).
 */
export type InternProfileUpdatePayload = Partial<{
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  phoneNumber: string;
  institutionName: string;
  academicLevel: AcademicLevel;
  academicYear: number;
  major: string;
  expectedGraduationYear: number;
  skillIds: string[];
  careerInterests: string;
  linkedinUrl: string;
}>;

export function getInternProfile(token: string): Promise<InternProfile> {
  return apiGet<InternProfile>('/intern/profile', { token });
}

/**
 * Same as getInternProfile, but treats a 404 ("no profile started yet") as `null`
 * instead of throwing, since that is an expected, normal state for this endpoint.
 */
export async function getInternProfileOrNull(token: string): Promise<InternProfile | null> {
  try {
    return await getInternProfile(token);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

export function updateInternProfile(
  token: string,
  payload: InternProfileUpdatePayload,
): Promise<InternProfile> {
  return apiPatch<InternProfile>('/intern/profile', payload, { token });
}

export function getInternSkills(token: string): Promise<InternProfileSkill[]> {
  return apiGet<InternProfileSkill[]>('/intern/skills', { token });
}

export function completeInternOnboarding(token: string): Promise<InternProfile> {
  return apiPost<InternProfile>('/intern/profile/complete', undefined, { token });
}

export type CvUploadResponse = {
  fileName: string;
  contentType: string;
  sizeBytes: number;
  uploadedAt: string;
  /** Pathora catalog skills detected in this CV by the backend — may be empty if none
   * were recognized. Detection happens server-side only; never computed on-device. */
  detectedSkills: InternProfileSkill[];
};

export type CvFileToUpload = {
  uri: string;
  name: string;
  mimeType: string;
};

/**
 * Uploads the intern's CV. Uses expo-file-system's File (a reference to the picked file,
 * not read into JS memory) and expo/fetch (spec-compliant FormData/streaming support) —
 * the legacy React Native {uri, name, type} FormData part shape is not supported by the
 * current networking stack. Content-Type is intentionally left unset so the multipart
 * boundary is generated automatically.
 */
export async function uploadInternCv(token: string, file: CvFileToUpload): Promise<CvUploadResponse> {
  const url = `${getBaseUrl()}/intern/profile/cv`;
  const selectedFile = new File(file.uri);

  const formData = new FormData();
  formData.append('file', selectedFile);

  let response: Awaited<ReturnType<typeof expoFetch>>;
  try {
    response = await expoFetch(url, {
      method: 'POST',
      body: formData,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    throw new NetworkError();
  }

  if (!response.ok) {
    let errorBody: unknown;
    try {
      const errorText = await response.text();
      errorBody = errorText ? JSON.parse(errorText) : undefined;
    } catch {
      errorBody = undefined;
    }
    throw new ApiError(response.status, friendlyMessageForStatus(response.status), errorBody);
  }

  const text = await response.text();
  if (!text) {
    return undefined as unknown as CvUploadResponse;
  }

  try {
    return JSON.parse(text) as CvUploadResponse;
  } catch {
    throw new ApiError(response.status, 'Received an unexpected response from the server.');
  }
}

export type CompanyProfile = {
  id: string;
  userId: string;
  companyName: string | null;
  industry: string | null;
  companySize: string | null;
  location: string | null;
  website: string | null;
  description: string | null;
  contactName: string | null;
  contactPhone: string | null;
  onboardingCompleted: boolean;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * Partial update payload for PATCH /company/profile.
 * Matching the backend's PATCH semantics: only include the fields you want to change.
 * Omitted fields are left untouched server-side.
 */
export type CompanyProfileUpdatePayload = Partial<{
  companyName: string;
  industry: string;
  companySize: string;
  location: string;
  website: string;
  description: string;
  contactName: string;
  contactPhone: string;
}>;

export function getCompanyProfile(token: string): Promise<CompanyProfile> {
  return apiGet<CompanyProfile>('/company/profile', { token });
}

/**
 * Same as getCompanyProfile, but treats a 404 ("no profile started yet") as `null`
 * instead of throwing, since that is an expected, normal state for this endpoint.
 */
export async function getCompanyProfileOrNull(token: string): Promise<CompanyProfile | null> {
  try {
    return await getCompanyProfile(token);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

export function updateCompanyProfile(
  token: string,
  payload: CompanyProfileUpdatePayload,
): Promise<CompanyProfile> {
  return apiPatch<CompanyProfile>('/company/profile', payload, { token });
}

export function completeCompanyOnboarding(token: string): Promise<CompanyProfile> {
  return apiPost<CompanyProfile>('/company/profile/complete', undefined, { token });
}

export type CompanyApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

/** Mirrors the backend's CompanyApprovalStatusResponse exactly. Deliberately minimal — no
 *  rejection reason or reviewer identity is returned by the backend, so none is shown here. */
export type CompanyApprovalStatusResponse = {
  status: CompanyApprovalStatus;
  reviewedAt: string | null;
};

/** PENDING and REJECTED companies can still authenticate (see AuthService.login) — this
 *  endpoint is how the app tells them apart from APPROVED once signed in. Never implies
 *  marketplace access on its own; the backend's CompanyApprovalGuard is what actually enforces
 *  that on every marketplace request regardless of what this returns. */
export function getCompanyApprovalStatus(token: string): Promise<CompanyApprovalStatusResponse> {
  return apiGet<CompanyApprovalStatusResponse>('/company/approval-status', { token });
}

export type InternshipWorkMode = 'ONSITE' | 'HYBRID' | 'REMOTE';
export type InternshipStatus = 'OPEN' | 'CLOSED';

/**
 * INTERNAL = applicants complete their application inside Pathora (optionally answering
 * company-configured questions). EXTERNAL = applicants are redirected to the company's own
 * application page at externalApplicationUrl. Never shown to users as this raw enum label —
 * see APPLICATION_METHOD_LABELS in @/lib/internship-options.
 */
export type ApplicationMethod = 'INTERNAL' | 'EXTERNAL';

export type CompanyInternship = {
  id: string;
  companyName: string;
  title: string;
  description: string;
  location: string;
  workMode: InternshipWorkMode;
  applicationDeadline: string;
  startDate: string | null;
  durationMonths: number | null;
  status: InternshipStatus;
  skills: InternProfileSkill[];
  targetMajors: string[];
  minimumAcademicYear: number | null;
  applicationMethod: ApplicationMethod;
  /** Always null for INTERNAL; a validated http(s) URL for EXTERNAL. */
  externalApplicationUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CompanyInternshipCreatePayload = {
  title: string;
  description: string;
  location: string;
  workMode: InternshipWorkMode;
  applicationDeadline: string;
  startDate?: string;
  durationMonths?: number;
  skillIds: string[];
  targetMajors?: string[];
  minimumAcademicYear?: number | null;
  applicationMethod: ApplicationMethod;
  /** Required (and only meaningful) when applicationMethod is EXTERNAL; omit for INTERNAL. */
  externalApplicationUrl?: string;
};

/**
 * Partial update payload for PATCH /company/internships/{id}.
 * Matching the backend's PATCH semantics: only include the fields you want to change.
 * Omitted fields are left untouched server-side; skillIds/targetMajors, when included,
 * fully replace the internship's skill set / target-major set.
 * minimumAcademicYear is intentionally NOT folded into the Partial<> below: the backend
 * distinguishes omitted (preserve), a number (replace), and explicit null (clear) — Partial<>
 * alone can only express "omitted vs a value," never "present but null." Omit this key from
 * the request object entirely to preserve the existing value; include it as `null` to clear.
 * externalApplicationUrl needs no such null-clearing from the client: the backend already
 * auto-clears it whenever the final applicationMethod resolves to INTERNAL, so switching to
 * INTERNAL only needs `applicationMethod: 'INTERNAL'` with externalApplicationUrl omitted.
 */
export type CompanyInternshipUpdatePayload = Partial<{
  title: string;
  description: string;
  location: string;
  workMode: InternshipWorkMode;
  applicationDeadline: string;
  startDate: string;
  durationMonths: number;
  skillIds: string[];
  targetMajors: string[];
  applicationMethod: ApplicationMethod;
  externalApplicationUrl: string;
}> & {
  minimumAcademicYear?: number | null;
};

export function createCompanyInternship(
  token: string,
  payload: CompanyInternshipCreatePayload,
): Promise<CompanyInternship> {
  return apiPost<CompanyInternship>('/company/internships', payload, { token });
}

export function getCompanyInternships(token: string): Promise<CompanyInternship[]> {
  return apiGet<CompanyInternship[]>('/company/internships', { token });
}

export function getCompanyInternship(token: string, internshipId: string): Promise<CompanyInternship> {
  return apiGet<CompanyInternship>(`/company/internships/${internshipId}`, { token });
}

export function updateCompanyInternship(
  token: string,
  internshipId: string,
  payload: CompanyInternshipUpdatePayload,
): Promise<CompanyInternship> {
  return apiPatch<CompanyInternship>(`/company/internships/${internshipId}`, payload, { token });
}

export function closeCompanyInternship(token: string, internshipId: string): Promise<CompanyInternship> {
  return apiPost<CompanyInternship>(`/company/internships/${internshipId}/close`, undefined, { token });
}

/**
 * A company-configured application question shown to interns applying to an INTERNAL
 * internship. Never shown to users as this raw enum label — see
 * APPLICATION_QUESTION_TYPE_LABELS in @/lib/internship-options.
 */
export type ApplicationQuestionType = 'SHORT_TEXT' | 'LONG_TEXT';

export type ApplicationQuestion = {
  id: string;
  internshipId: string;
  questionText: string;
  questionType: ApplicationQuestionType;
  required: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type ApplicationQuestionCreatePayload = {
  questionText: string;
  questionType: ApplicationQuestionType;
  required: boolean;
  displayOrder: number;
};

/**
 * Partial update payload for PATCH .../application-questions/{questionId}.
 * Matching the backend's PATCH semantics: only include the fields you want to change.
 */
export type ApplicationQuestionUpdatePayload = Partial<ApplicationQuestionCreatePayload>;

/** Questions are returned in the order the backend considers canonical — never re-sort. */
export function getCompanyApplicationQuestions(
  token: string,
  internshipId: string,
): Promise<ApplicationQuestion[]> {
  return apiGet<ApplicationQuestion[]>(`/company/internships/${internshipId}/application-questions`, { token });
}

/**
 * Throws ApiError with status 409 if this internship has already received its first
 * application — questions are frozen at that point. Callers should check
 * `error.status === 409` to show a specific "locked" message rather than a generic one.
 */
export function createCompanyApplicationQuestion(
  token: string,
  internshipId: string,
  payload: ApplicationQuestionCreatePayload,
): Promise<ApplicationQuestion> {
  return apiPost<ApplicationQuestion>(
    `/company/internships/${internshipId}/application-questions`,
    payload,
    { token },
  );
}

/** Same 409-when-locked behavior as createCompanyApplicationQuestion. */
export function updateCompanyApplicationQuestion(
  token: string,
  internshipId: string,
  questionId: string,
  payload: ApplicationQuestionUpdatePayload,
): Promise<ApplicationQuestion> {
  return apiPatch<ApplicationQuestion>(
    `/company/internships/${internshipId}/application-questions/${questionId}`,
    payload,
    { token },
  );
}

/** Same 409-when-locked behavior as createCompanyApplicationQuestion. */
export function deleteCompanyApplicationQuestion(
  token: string,
  internshipId: string,
  questionId: string,
): Promise<void> {
  return apiDelete<void>(`/company/internships/${internshipId}/application-questions/${questionId}`, { token });
}

/**
 * The single backend ApplicationStatus enum, as seen from the company side — identical values
 * to InternApplicationStatus (there is only one status model; see PART 10 of the applicant
 * management milestone), named separately so company-side call sites don't borrow an
 * intern-named type.
 */
export type CompanyApplicationStatus = 'APPLIED' | 'ACCEPTED' | 'REJECTED';

/**
 * The company's view of one applicant for one of its own internships. Mirrors the backend's
 * CompanyApplicationListItemResponse field-for-field — deliberately lighter than
 * CompanyApplicationDetail (no CV, cover letter, or answers; see getCompanyInternshipApplications).
 */
export type CompanyApplicationListItem = {
  applicationId: string;
  internshipId: string;
  applicantName: string | null;
  status: CompanyApplicationStatus;
  appliedAt: string;
  institutionName: string | null;
  academicLevel: AcademicLevel | null;
  academicYear: number | null;
  major: string | null;
};

/** Mirrors the backend's CompanyApplicationDetailResponse.Applicant nested record. Deliberately
 *  excludes date of birth and phone number — the backend never sends them to this endpoint. */
export type CompanyApplicationApplicant = {
  internProfileId: string;
  firstName: string | null;
  lastName: string | null;
  institutionName: string | null;
  academicLevel: AcademicLevel | null;
  academicYear: number | null;
  major: string | null;
  expectedGraduationYear: number | null;
  skills: InternProfileSkill[];
  /** Pathora catalog skills the backend detected in the applicant's CV — distinct from the
   *  applicant's manually selected `skills`, shown separately in the UI. */
  cvDetectedSkills: InternProfileSkill[];
};

/** Mirrors the backend's CompanyApplicationDetailResponse.CvSnapshot nested record — metadata
 *  only. The backend deliberately never sends a storageKey; use downloadCompanyApplicationCv
 *  to fetch the actual bytes through the authenticated endpoint. */
export type CompanyApplicationCvSnapshot = {
  fileName: string;
  contentType: string;
  sizeBytes: number;
  uploadedAt: string;
};

export type CompanyApplicationAnswer = {
  questionId: string;
  questionText: string;
  questionType: ApplicationQuestionType;
  required: boolean;
  displayOrder: number;
  answer: string;
};

/**
 * The company's full view of a single application, including the immutable question/answer
 * snapshots as submitted — never the internship's current live questions (see
 * getCompanyApplicationDetail). Mirrors the backend's CompanyApplicationDetailResponse.
 */
export type CompanyApplicationDetail = {
  applicationId: string;
  internshipId: string;
  internshipTitle: string | null;
  status: CompanyApplicationStatus;
  appliedAt: string;
  updatedAt: string;
  /** Null only if the underlying intern profile can no longer be resolved. */
  applicant: CompanyApplicationApplicant | null;
  coverLetter: string | null;
  linkedinUrl: string | null;
  portfolioUrl: string | null;
  cv: CompanyApplicationCvSnapshot;
  answers: CompanyApplicationAnswer[];
};

/** Newest application first — same ordering rule as the backend's own default, never re-sort client-side. */
export function getCompanyInternshipApplications(
  token: string,
  internshipId: string,
): Promise<CompanyApplicationListItem[]> {
  return apiGet<CompanyApplicationListItem[]>(`/company/internships/${internshipId}/applications`, { token });
}

/** Full detail — including applicant info, CV snapshot metadata, and answer snapshots — for
 *  one application to one of the company's own internships. 404s if the internship or
 *  application doesn't belong to the authenticated company. */
export function getCompanyApplicationDetail(
  token: string,
  internshipId: string,
  applicationId: string,
): Promise<CompanyApplicationDetail> {
  return apiGet<CompanyApplicationDetail>(
    `/company/internships/${internshipId}/applications/${applicationId}`,
    { token },
  );
}

/** The only two decisions a company may submit — the backend separately rejects APPLIED and
 *  any other value with a 400. */
export type CompanyApplicationDecision = 'ACCEPTED' | 'REJECTED';

/**
 * Applies the company's accept/reject decision. Throws ApiError with status 409 if the
 * application has already been decided (APPLIED -> ACCEPTED/REJECTED is one-way) — callers
 * should check `error.status === 409` and refresh the application detail to show the real
 * current status rather than assuming their own requested status was ignored.
 */
export function updateCompanyApplicationStatus(
  token: string,
  internshipId: string,
  applicationId: string,
  status: CompanyApplicationDecision,
): Promise<CompanyApplicationDetail> {
  return apiPatch<CompanyApplicationDetail>(
    `/company/internships/${internshipId}/applications/${applicationId}/status`,
    { status },
    { token },
  );
}

/**
 * Downloads the APPLICATION's own immutable CV snapshot (never the intern's current profile
 * CV — the backend endpoint itself enforces that distinction) to a local cache file, using
 * expo-file-system's authenticated download (same File-based networking primitive already
 * used by uploadInternCv) so the bearer token never leaves this module as a bare query param
 * or public URL. The backend never exposes a storageKey — this only ever talks to the
 * dedicated CV endpoint. Returns the downloaded File; callers can read its `.uri` to open or
 * share it (see the applicant detail screen's "View CV" action).
 */
export async function downloadCompanyApplicationCv(
  token: string,
  internshipId: string,
  applicationId: string,
  fileName: string,
): Promise<File> {
  const url = `${getBaseUrl()}/company/internships/${internshipId}/applications/${applicationId}/cv`;
  const destination = new File(Paths.cache, `application-cv-${applicationId}-${fileName}`);

  try {
    return await File.downloadFileAsync(url, destination, {
      headers: { Authorization: `Bearer ${token}` },
      idempotent: true,
    });
  } catch {
    throw new NetworkError('Unable to download this CV. Please try again.');
  }
}

/**
 * An internship as seen by the authenticated INTERN's personalized feed/detail view.
 * Includes the same core internship fields as CompanyInternship plus backend-computed,
 * explainable relevance facts. The relevance numbers are never recalculated client-side —
 * they are used exactly as returned.
 */
export type InternInternship = {
  id: string;
  companyName: string;
  title: string;
  description: string;
  location: string;
  workMode: InternshipWorkMode;
  applicationDeadline: string;
  startDate: string | null;
  durationMonths: number | null;
  status: InternshipStatus;
  skills: InternProfileSkill[];
  targetMajors: string[];
  /** Eligibility requirement only — does not contribute to relevancePercentage. */
  minimumAcademicYear: number | null;
  applicationMethod: ApplicationMethod;
  /** Always null for INTERNAL; a validated http(s) URL for EXTERNAL. */
  externalApplicationUrl: string | null;
  relevancePercentage: number;
  matchedSkillCount: number;
  totalRequiredSkillCount: number;
  matchedSkills: InternProfileSkill[];
  majorMatch: boolean;
  createdAt: string;
  updatedAt: string;
};

/** Personalized feed, already sorted by relevance by the backend — never re-sort client-side. */
export function getInternInternships(token: string): Promise<InternInternship[]> {
  return apiGet<InternInternship[]>('/intern/internships', { token });
}

export function getInternInternship(token: string, internshipId: string): Promise<InternInternship> {
  return apiGet<InternInternship>(`/intern/internships/${internshipId}`, { token });
}

export type InternApplicationStatus = 'APPLIED' | 'ACCEPTED' | 'REJECTED';

export type InternApplicationAnswer = {
  questionId: string;
  questionText: string;
  questionType: ApplicationQuestionType;
  required: boolean;
  displayOrder: number;
  answer: string;
};

/**
 * One of the authenticated INTERN's own internal Pathora applications. companyName/
 * internshipTitle may be null if the underlying internship can no longer be resolved.
 * answers is empty on the compact list endpoint — only the single-application GET
 * populates it.
 */
export type InternApplication = {
  applicationId: string;
  internshipId: string;
  internshipTitle: string | null;
  companyName: string | null;
  status: InternApplicationStatus;
  coverLetter: string | null;
  linkedinUrl: string | null;
  portfolioUrl: string | null;
  cvFileName: string;
  appliedAt: string;
  updatedAt: string;
  answers: InternApplicationAnswer[];
};

/** Most recently applied first — never re-sort client-side. */
export function getInternApplications(token: string): Promise<InternApplication[]> {
  return apiGet<InternApplication[]>('/intern/applications', { token });
}

/** Full detail — including the answers snapshot — for one of the intern's own applications. */
export function getInternApplication(token: string, applicationId: string): Promise<InternApplication> {
  return apiGet<InternApplication>(`/intern/applications/${applicationId}`, { token });
}

/**
 * The INTERNAL internship's company-configured application questions, in the same
 * displayOrder/createdAt order the company management screen shows them in — render exactly
 * as returned, never reordered or hardcoded client-side.
 */
export function getInternApplicationQuestions(
  token: string,
  internshipId: string,
): Promise<ApplicationQuestion[]> {
  return apiGet<ApplicationQuestion[]>(`/intern/internships/${internshipId}/application-questions`, { token });
}

export type InternshipApplicationAnswerSubmission = {
  questionId: string;
  answer: string;
};

/**
 * The internal Pathora application form. Deliberately carries no status/userId/
 * internProfileId/internshipId/question metadata — identity and internship come from the
 * authenticated token and the path, and every answer's question text/type/required/order is
 * owned and snapshotted by the backend from its own question records, never sent by the client.
 */
export type InternshipApplicationSubmitPayload = {
  coverLetter?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  answers?: InternshipApplicationAnswerSubmission[];
};

export function submitInternshipApplication(
  token: string,
  internshipId: string,
  payload: InternshipApplicationSubmitPayload,
): Promise<InternApplication> {
  return apiPost<InternApplication>(`/intern/internships/${internshipId}/applications`, payload, { token });
}
