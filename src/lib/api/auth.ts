import { ApiError, apiClient } from "./client";

export class AuthApiError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "EMAIL_TAKEN"
      | "VALIDATION"
      | "NETWORK"
      | "OTP_INVALID"
      | "OTP_EXPIRED"
      | "INVALID_CREDENTIALS",
    public readonly status = 400
  ) {
    super(message);
    this.name = "AuthApiError";
  }
}

export type RegisterPayload = {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
};

export type RegisterResult = {
  parentId: number;
  message: string;
};

function toAuthError(error: unknown): AuthApiError {
  if (error instanceof AuthApiError) return error;
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return new AuthApiError(error.message, "INVALID_CREDENTIALS", 401);
    }
    if (error.status === 422) {
      const body = error.body as {
        errors?: { email?: unknown; code?: string[] };
        message?: string;
      } | null;
      const message = body?.errors?.code?.[0] ?? body?.message ?? error.message;
      if (
        message.includes("انتهت صلاحية") ||
        message === "OTP_EXPIRED" ||
        /otp.*expir|code.*expir/i.test(message)
      ) {
        return new AuthApiError(message, "OTP_EXPIRED", 422);
      }
      if (
        message.includes("رمز غير صحيح") ||
        message === "OTP_INVALID" ||
        /otp.*invalid|code.*(invalid|incorrect)/i.test(message)
      ) {
        return new AuthApiError(message, "OTP_INVALID", 422);
      }
      const emailTaken =
        body?.message === "EMAIL_TAKEN" || Boolean(body?.errors?.email);
      return new AuthApiError(
        error.message,
        emailTaken ? "EMAIL_TAKEN" : "VALIDATION",
        422
      );
    }
    return new AuthApiError(error.message, "NETWORK", error.status);
  }
  return new AuthApiError("NETWORK", "NETWORK");
}

export async function registerUser(payload: RegisterPayload): Promise<RegisterResult> {
  try {
    const result = await apiClient.post<{ parent_id: number; message: string }>(
      "/register",
      {
        full_name: payload.fullName,
        email: payload.email,
        password: payload.password,
        phone: payload.phone,
      }
    );
    return {
      parentId: result.parent_id,
      message: result.message,
    };
  } catch (error) {
    throw toAuthError(error);
  }
}

export const OTP_TTL_MS = 5 * 60 * 1000;

export type ParentUser = {
  id: number;
  public_id?: string;
  email?: string;
  full_name?: string;
};

export type VerifyOtpResult = {
  token: string;
  parent: ParentUser;
  message: string;
};

export async function verifyOtp(parentId: number, code: string): Promise<VerifyOtpResult> {
  try {
    return await apiClient.post<VerifyOtpResult>("/verify-otp", {
      parent_id: parentId,
      code,
    });
  } catch (error) {
    throw toAuthError(error);
  }
}

export async function resendOtp(parentId: number): Promise<{ message: string }> {
  try {
    return await apiClient.post<{ message: string }>("/verify-otp/resend", {
      parent_id: parentId,
    });
  } catch (error) {
    throw toAuthError(error);
  }
}

export async function changeSignupEmail(
  parentId: number,
  email: string
): Promise<{ message: string; email: string }> {
  try {
    return await apiClient.post<{ message: string; email: string }>("/verify-otp/change-email", {
      parent_id: parentId,
      email,
    });
  } catch (error) {
    throw toAuthError(error);
  }
}

export type LoginPayload = {
  login: string;
  password: string;
};

export async function loginUser(payload: LoginPayload): Promise<VerifyOtpResult> {
  try {
    return await apiClient.post<VerifyOtpResult>("/login", {
      login: payload.login,
      password: payload.password,
    });
  } catch (error) {
    throw toAuthError(error);
  }
}

export async function requestPasswordReset(login: string): Promise<{ message: string }> {
  try {
    return await apiClient.post<{ message: string }>("/forgot-password", { login });
  } catch (error) {
    throw toAuthError(error);
  }
}

export type ResetPasswordPayload = {
  login: string;
  code: string;
  newPassword: string;
};

export async function resetPassword(payload: ResetPasswordPayload): Promise<VerifyOtpResult> {
  try {
    return await apiClient.post<VerifyOtpResult>("/reset-password", {
      login: payload.login,
      code: payload.code,
      new_password: payload.newPassword,
    });
  } catch (error) {
    throw toAuthError(error);
  }
}

export async function requestAccountId(email: string): Promise<{ message: string }> {
  try {
    return await apiClient.post<{ message: string }>("/forgot-account-id", { email });
  } catch (error) {
    throw toAuthError(error);
  }
}

export async function logout(): Promise<void> {
  const response = await fetch("/api/auth/session", { method: "DELETE" });
  if (!response.ok) {
    throw new AuthApiError("NETWORK", "NETWORK", response.status);
  }
}
