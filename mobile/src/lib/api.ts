/**
 * Small centralized API client for the Pathora backend.
 * Never log request bodies here — they may contain passwords.
 */

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
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
  method: 'GET' | 'POST',
  path: string,
  body: unknown,
  options?: RequestOptions,
): Promise<TResponse> {
  const url = `${getBaseUrl()}${path}`;
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (options?.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new NetworkError();
  }

  if (!response.ok) {
    throw new ApiError(response.status, friendlyMessageForStatus(response.status));
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
