import { ApiError, apiClient } from "./client";
import { clearLastVisit } from "@/lib/navigation/lastVisit";
import { clearAllChildrenLocalData } from "@/lib/offline/clearChildCache";

export class AuthApiError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "EMAIL_TAKEN"
      | "VALIDATION"
      | "NETWORK"
      | "OTP_INVALID"
      | "OTP_EXPIRED"
      | "VERIFICATION_REQUIRED"
      | "INVALID_CREDENTIALS",
    public readonly status = 400,
    public readonly retryAfter = 0,
    public readonly supportRequired = false
  ) {
    super(message);
    this.name = "AuthApiError";
  }
  verification?: { parentId: number; email: string };
}

export type RegisterPayload = {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  otpChannel?: OtpChannel;
};

export type OtpChannel = "email" | "whatsapp";

export type RegisterResult = {
  parentId: number;
  message: string;
  /** The channel the code was actually sent through (falls back to email if WhatsApp failed). */
  channel: OtpChannel;
  phoneMasked: string | null;
};

export async function fetchOtpChannels(): Promise<{ whatsapp: boolean; sms?: boolean }> {
  try {
    const response = await fetch("/api/auth/channels", { cache: "no-store" });
    if (!response.ok) return { whatsapp: false, sms: false };
    return await response.json();
  } catch {
    return { whatsapp: false };
  }
}

function toAuthError(error: unknown): AuthApiError {
  if (error instanceof AuthApiError) return error;
  if (error instanceof ApiError) {
    const verification = error.body as { code?: string; parent_id?: number; email?: string } | null;
    if (error.status === 403 && verification?.code === "VERIFICATION_REQUIRED" && verification.parent_id) {
      const result = new AuthApiError(error.message, "VERIFICATION_REQUIRED", 403);
      result.verification = { parentId: verification.parent_id, email: verification.email ?? "" };
      return result;
    }
    if (error.status === 429 || error.status === 423) {
      const details = error.body as { retry_after?: number; support_required?: boolean } | null;
      return new AuthApiError(error.message, "NETWORK", error.status, details?.retry_after ?? 60, details?.support_required === true);
    }
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
    const result = await apiClient.post<{
      parent_id: number;
      message: string;
      channel?: OtpChannel;
      phone_masked?: string | null;
    }>("/register", {
      full_name: payload.fullName,
      email: payload.email,
      password: payload.password,
      phone: payload.phone,
      otp_channel: payload.otpChannel,
    });
    return {
      parentId: result.parent_id,
      message: result.message,
      channel: result.channel ?? "email",
      phoneMasked: result.phone_masked ?? null,
    };
  } catch (error) {
    throw toAuthError(error);
  }
}

export const OTP_TTL_MS = 5 * 60 * 1000;

export type ParentUser = {
  id: number;
  public_id?: string;
  email?: string | null;
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

export async function resendOtp(
  parentId: number,
  channel: OtpChannel = "email"
): Promise<{ message: string; channel?: OtpChannel; resend_after?: number; support_required?: boolean }> {
  try {
    return await apiClient.post<{ message: string; channel?: OtpChannel; resend_after?: number; support_required?: boolean }>("/verify-otp/resend", {
      parent_id: parentId,
      channel,
    });
  } catch (error) {
    throw toAuthError(error);
  }
}

export async function changeSignupEmail(
  parentId: number,
  email: string,
  password: string
): Promise<{ message: string; email: string }> {
  try {
    return await apiClient.post<{ message: string; email: string }>("/verify-otp/change-email", {
      parent_id: parentId,
      email,
      password,
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
  clearLastVisit();
  void clearAllChildrenLocalData();
}
