"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { FieldInput, UserIcon, WarningIcon } from "@/components/ui/FieldInput";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { loginUser } from "@/lib/api/auth";
import { persistSession } from "@/lib/auth/persistSession";

export function LoginForm() {
  const t = useTranslations("login");
  const router = useRouter();
  const shakeTimer = useRef<number | null>(null);
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  const canSubmit = login.trim().length > 0 && password.length > 0 && !submitting;

  useEffect(() => {
    return () => {
      if (shakeTimer.current) window.clearTimeout(shakeTimer.current);
    };
  }, []);

  function triggerShake() {
    setShake(false);
    window.requestAnimationFrame(() => {
      setShake(true);
      if (shakeTimer.current) window.clearTimeout(shakeTimer.current);
      shakeTimer.current = window.setTimeout(() => setShake(false), 380);
    });
  }

  function clearError() {
    if (error) setError(false);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError(false);

    try {
      const result = await loginUser({ login: login.trim(), password });
      await persistSession(result.token, result.parent);
      router.replace("/children");
    } catch {
      setError(true);
      triggerShake();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
      <div className={shake ? "login-shake" : undefined}>
        <label htmlFor="login" className="mb-1.5 block text-sm font-medium text-text-gray">
          {t("fields.login")}
        </label>
        <FieldInput
          id="login"
          name="login"
          autoComplete="username"
          value={login}
          placeholder={t("placeholders.login")}
          invalid={error}
          icon={<UserIcon />}
          onChange={(event) => {
            setLogin(event.target.value);
            clearError();
          }}
        />
      </div>

      <div className={shake ? "login-shake" : undefined}>
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-text-gray">
          {t("fields.password")}
        </label>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="current-password"
          value={password}
          placeholder={t("placeholders.password")}
          invalid={error}
          onChange={(value) => {
            setPassword(value);
            clearError();
          }}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <Link href="/forgot-password" className="font-bold text-primary-orange hover:underline">
          {t("forgotPassword")}
        </Link>
        <Link href="/forgot-account-id" className="font-medium text-text-navy/70 hover:text-text-navy hover:underline">
          {t("forgotAccountId")}
        </Link>
      </div>

      <Button type="submit" fullWidth disabled={!canSubmit} aria-busy={submitting}>
        {submitting ? (
          <>
            <span className="otp-spinner" aria-hidden="true" />
            {t("submitting")}
          </>
        ) : (
          t("submit")
        )}
      </Button>

      {error ? (
        <div
          role="alert"
          className="login-error-enter flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-600"
        >
          <WarningIcon />
          <p>{t("errors.invalid")}</p>
        </div>
      ) : null}

      <p className="pt-1 text-center text-sm text-text-gray">
        {t("noAccount")}{" "}
        <Link href="/register" className="font-bold text-primary-orange hover:underline">
          {t("createAccount")}
        </Link>
      </p>
    </form>
  );
}
