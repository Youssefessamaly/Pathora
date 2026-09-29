/**
 * Small centralized API client for the Pathora backend.
 * Never log request bodies here — they may contain passwords.
 */

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
  method: 'GET' | 'POST' | 'PATCH',
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
};

export type CvFileToUpload = {
  uri: string;
  name: string;
  mimeType: string;
};

export function uploadInternCv(token: string, file: CvFileToUpload): Promise<CvUploadResponse> {
  const formData = new FormData();
  // React Native's networking layer special-cases this {uri, name, type} shape to stream
  // the local file by URI — it is not a real Blob, hence the cast.
  formData.append(
    'file',
    { uri: file.uri, name: file.name, type: file.mimeType } as unknown as Blob,
  );

  return apiPostForm<CvUploadResponse>('/intern/profile/cv', formData, { token });
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
