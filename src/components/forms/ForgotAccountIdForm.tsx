"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { FieldInput, MailIcon } from "@/components/ui/FieldInput";
import { requestAccountId } from "@/lib/api/auth";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ForgotAccountIdForm() {
  const t = useTranslations("forgotAccountId");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const value = email.trim();
    if (!EMAIL_PATTERN.test(value) || sending) return;

    setSending(true);
    try {
      await requestAccountId(value);
    } catch {
      /* Same confirmation either way — never reveal whether the email exists. */
    } finally {
      setSent(true);
      setSending(false);
    }
  }

  return (
    <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
      <h1 className="text-center text-2xl font-extrabold text-text-navy md:text-[1.7rem]">
        {t("title")}
      </h1>
      <p className="text-center text-sm leading-6 text-text-gray">{t("subtitle")}</p>

      <div>
        <label htmlFor="recovery-email" className="mb-1.5 block text-sm font-medium text-text-gray">
          {t("fields.email")}
        </label>
        <FieldInput
          id="recovery-email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          placeholder={t("placeholders.email")}
          icon={<MailIcon />}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>

      <Button type="submit" fullWidth disabled={!EMAIL_PATTERN.test(email.trim()) || sending || sent}>
        {sending ? (
          <>
            <span className="otp-spinner" aria-hidden="true" />
            {t("sending")}
          </>
        ) : (
          t("send")
        )}
      </Button>

      {sent ? (
        <p
          role="status"
          className="login-error-enter rounded-xl bg-emerald-50 px-3 py-3 text-center text-sm leading-6 text-emerald-800"
        >
          {t("confirmation")}
        </p>
      ) : null}

      <p className="pt-2 text-center text-sm text-text-gray">
        {t("stillStuck")}{" "}
        <a href={`mailto:${t("supportEmail")}`} className="font-bold text-primary-orange hover:underline">
          {t("support")}
        </a>
      </p>
    </form>
  );
}
