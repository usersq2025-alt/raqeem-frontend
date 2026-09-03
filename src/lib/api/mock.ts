import { ApiError } from "./client";

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

const TAKEN_EMAILS = new Set(["exists@raqeem.test", "taken@example.com"]);

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTaken(email: string) {
  return TAKEN_EMAILS.has(email.trim().toLowerCase());
}

/** In-memory stand-in for Laravel until NEXT_PUBLIC_USE_MOCK_AUTH=false. */
export async function mockRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();
  const body = options.body as Record<string, unknown> | undefined;

  if (endpoint === "/register" && method === "POST") {
    await wait(700);
    const email = String(body?.email ?? "");
    if (isTaken(email)) {
      throw new ApiError("EMAIL_TAKEN", 422, {
        message: "EMAIL_TAKEN",
        errors: { email: ["taken"] },
      });
    }
    return { parent_id: 1, message: "registered" } as T;
  }

  if (endpoint === "/verify-otp" && method === "POST") {
    await wait(600);
    const code = String(body?.code ?? "");
    // Mock codes until Laravel is wired: 1234 success, 0000 expired, anything else invalid.
    if (code === "0000") {
      throw new ApiError("انتهت صلاحية الرمز", 422, { message: "انتهت صلاحية الرمز" });
    }
    if (code !== "1234") {
      throw new ApiError("رمز غير صحيح", 422, { message: "رمز غير صحيح" });
    }
    return {
      message: "تم التحقق بنجاح",
      token: "mock-token-1",
      parent: {
        id: Number(body?.parent_id ?? 1),
        // Laravel unique parent public_id (RQMP-XXXXXX). Value below is mock-only.
        public_id: "RQMP-482910",
        email: "example@gmail.com",
        full_name: "ولي الأمر",
      },
    } as T;
  }

  if (endpoint === "/verify-otp/resend" && method === "POST") {
    await wait(450);
    return { message: "resent" } as T;
  }

  if (endpoint === "/students" && method === "POST") {
    await wait(520);
    return {
      id: Date.now() % 100000,
      full_name: String(body?.full_name ?? ""),
    } as T;
  }

  if (endpoint === "/login" && method === "POST") {
    await wait(500);
    const login = String(body?.login ?? "").trim();
    const password = String(body?.password ?? "");
    const known =
      (login === "parent@example.com" || login === "RQMP-482910") && password === "Password123";
    if (!known) {
      throw new ApiError("البيانات المدخلة غير صحيحة", 401, {
        message: "البيانات المدخلة غير صحيحة",
      });
    }
    return {
      token: "mock-token-1",
      parent: {
        id: 1,
        public_id: "RQMP-482910",
        email: "parent@example.com",
        full_name: "ولي الأمر",
      },
    } as T;
  }

  if (endpoint === "/forgot-password" && method === "POST") {
    await wait(450);
    return {
      message:
        "إن كان البريد مسجلاً لدينا، ستصلك رسالة تحتوي رمز إعادة تعيين كلمة السر قريبًا",
    } as T;
  }

  if (endpoint === "/reset-password" && method === "POST") {
    await wait(600);
    const code = String(body?.code ?? "");
    if (code === "0000") {
      throw new ApiError("انتهت صلاحية الرمز", 422, { message: "انتهت صلاحية الرمز" });
    }
    if (code !== "1234") {
      throw new ApiError("رمز غير صحيح", 422, { message: "رمز غير صحيح" });
    }
    return {
      message: "تم تحديث كلمة السر بنجاح",
      token: "mock-token-1",
      parent: {
        id: 1,
        public_id: "RQMP-482910",
        email: "parent@example.com",
        full_name: "ولي الأمر",
      },
    } as T;
  }

  if (endpoint === "/forgot-account-id" && method === "POST") {
    await wait(450);
    return {
      message: "إن كان البريد مسجلاً لدينا، ستصلك رسالة تحتوي معرّف حسابك قريبًا",
    } as T;
  }

  throw new ApiError(`No mock for ${method} ${endpoint}`, 404);
}
