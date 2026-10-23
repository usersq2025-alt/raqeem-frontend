"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useLocale } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { apiClient, ApiError } from "@/lib/api/client";
import { fetchOtpChannels, type VerifyOtpResult } from "@/lib/api/auth";
import { persistSession } from "@/lib/auth/persistSession";
import { Button } from "@/components/ui/Button";
import { FieldInput, MailIcon, PhoneIcon, UserIcon } from "@/components/ui/FieldInput";
import { PasswordInput } from "@/components/ui/PasswordInput";

export function SmsPhoneLoginForm({ mode = "login", channelAvailable = false }: { mode?: "login" | "register"; channelAvailable?: boolean }) {
  const registering = mode === "register";
  const ar = useLocale() === "ar";
  const router = useRouter();
  const [enabled, setEnabled] = useState(channelAvailable);
  const [open, setOpen] = useState(registering);
  const [fullName, setFullName] = useState("");
  const [terms, setTerms] = useState(false);
  const [supportRequired, setSupportRequired] = useState(false);
  const [binding, setBinding] = useState(false);
  const [phone, setPhone] = useState("");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [challenge, setChallenge] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [retryAt, setRetryAt] = useState(0);
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (channelAvailable) return;
    let active = true;
    fetchOtpChannels().then((r) => {
      if (active) setEnabled(r.sms === true);
    }).catch(() => {});
    return () => { active = false; };
  }, [channelAvailable]);

  useEffect(() => {
    const tick = () => setRemaining(Math.max(0, Math.ceil((retryAt - Date.now()) / 1000)));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [retryAt]);

  async function requestCode(event?: FormEvent) {
    event?.preventDefault();
    if (busy || remaining > 0 || supportRequired) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await apiClient.post<{ challenge_id: string; message?: string; resend_after: number; support_required?: boolean }>(
        registering ? (challenge ? "/register/phone/resend" : "/register/phone") : "/login/sms/request",
        registering ? (challenge ? { challenge_id: challenge } : { phone, full_name: fullName.trim(), password, accepted_terms: terms }) : { phone, ...(binding ? { login: login.trim(), password } : {}) },
        { signal: AbortSignal.timeout(25_000) },
      );
      setChallenge(result.challenge_id); setCode("");
      setRetryAt(Date.now() + result.resend_after * 1000);
      setSupportRequired(Boolean(result.support_required));
      if (registering) setPassword("");
      setMessage(ar ? (result.message ?? "تم طلب رمز جديد. صالح لخمس دقائق.") : "If the details are valid, you will receive a code. It expires in 5 minutes.");
    } catch (e) {
      const details = e instanceof ApiError ? e.body as {retry_after?: number; support_required?: boolean; message?: string} | null : null;
      if (details?.support_required) {
        setSupportRequired(true);
        setError(ar ? "توقف إرسال الرموز لهذا الرقم. تواصل مع دعم رقيم لاستعادة الإرسال." : "Code requests are paused. Contact Raqeem support.");
      } else if (e instanceof ApiError && e.status === 429) {
        setRetryAt(Date.now() + (details?.retry_after ?? 60) * 1000);
        setError(ar ? "يرجى الانتظار حتى انتهاء العدّاد قبل طلب رمز جديد." : "Wait for the countdown before requesting another code.");
      } else {
        setError(ar ? "تعذر إرسال الرمز. تحقق من الرقم وحاول لاحقًا." : "Unable to send a code. Check the number and try again later.");
      }
    } finally { setBusy(false); }
  }

  async function verify(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError("");
    try {
      const result = await apiClient.post<VerifyOtpResult>("/login/sms/verify", { challenge_id: challenge, code });
      await persistSession(result.token, result.parent);
      router.replace(registering ? "/account-success" : "/children");
    } catch {
      setError(ar ? "الرمز غير صحيح أو منتهي الصلاحية. تحقق منه أو اطلب رمزًا جديدًا." : "Invalid or expired code. Check it or request a new one.");
    } finally { setBusy(false); }
  }

  if (!enabled) return null;
  return (
    <section className="mt-6 rounded-2xl border border-gray-200 p-4">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="w-full font-bold text-text-navy">
        {registering ? (ar ? "إنشاء حساب برقم الهاتف" : "Create an account with your phone") : (ar ? "الدخول برقم الهاتف ورسالة SMS" : "Sign in with your phone and SMS")}
      </button>
      {open && <div className="mt-4 space-y-4">
        {!challenge ? <form onSubmit={requestCode} className="space-y-4">
          {registering && <div>
            <label htmlFor="sms-full-name" className="mb-1.5 block text-start text-sm font-semibold text-text-gray">{ar ? "اسم ولي الأمر" : "Parent name"}</label>
            <FieldInput
              id="sms-full-name"
              name="fullName"
              variant="soft"
              autoComplete="name"
              icon={<UserIcon />}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              minLength={3}
              maxLength={120}
              disabled={busy}
            />
          </div>}
          <div>
            <label htmlFor="sms-phone" className="mb-1.5 block text-start text-sm font-semibold text-text-gray">{ar ? "رقم الهاتف السوري" : "Syrian mobile number"}</label>
            <FieldInput
              id="sms-phone"
              name="phone"
              variant="soft"
              type="tel"
              dir="ltr"
              autoComplete="tel"
              icon={<PhoneIcon />}
              placeholder="09xxxxxxxx"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              maxLength={40}
              disabled={busy}
            />
          </div>
          {!registering && <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={binding} onChange={(e) => setBinding(e.target.checked)} disabled={busy} />
            {ar ? "أربط رقم هاتفي بحسابي للمرة الأولى" : "Link my phone to my account for the first time"}
          </label>}
          {(binding || registering) && <>
            {!registering && <>
            <p className="text-sm text-text-gray">{ar ? "أدخل بيانات حسابك الحالي مرة واحدة، ثم تحقق برسالة الهاتف. لن تحتاج رمز بريد إلكتروني." : "Enter your current account details once, then verify by SMS. No email code is needed."}</p>
            <div>
              <label htmlFor="sms-login" className="mb-1.5 block text-start text-sm font-semibold text-text-gray">{ar ? "البريد أو معرّف الحساب RQMP" : "Email or RQMP account ID"}</label>
              <FieldInput
                id="sms-login"
                name="login"
                variant="soft"
                autoComplete="username"
                icon={<MailIcon />}
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                required
                disabled={busy}
              />
            </div>
            </>}
            <div>
              <label htmlFor="sms-password" className="mb-1.5 block text-start text-sm font-semibold text-text-gray">{ar ? "كلمة سر الحساب" : "Account password"}</label>
              <PasswordInput
                id="sms-password"
                name="password"
                variant="soft"
                value={password}
                placeholder={ar ? "كلمة السر" : "Password"}
                autoComplete={registering ? "new-password" : "current-password"}
                showStrength={registering}
                onChange={setPassword}
              />
            </div>
          </>}
          {registering && <>
            <label className="flex gap-2 text-sm"><input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} required /><span>{ar ? "أوافق على " : "I agree to the "}<Link href="/terms" target="_blank" className="underline">{ar ? "شروط الاستخدام" : "terms"}</Link>{ar ? " و" : " and "}<Link href="/privacy" target="_blank" className="underline">{ar ? "سياسة الخصوصية" : "privacy policy"}</Link></span></label>
          </>}
          <Button type="submit" fullWidth disabled={busy || remaining > 0 || supportRequired}>{busy ? (ar ? "جارٍ الإرسال…" : "Sending…") : remaining > 0 ? `${remaining}s` : (ar ? "إرسال رمز التحقق" : "Send verification code")}</Button>
        </form> : <form onSubmit={verify} className="space-y-4">
          <p className="text-sm" dir="ltr">{phone}</p>
          <label className="block text-sm">{ar ? "رمز الرسالة — صالح لخمس دقائق" : "SMS code — valid for 5 minutes"}
            <input className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-text-navy" dir="ltr" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value.replace(/[٠-٩۰-۹]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".includes(d) ? "٠١٢٣٤٥٦٧٨٩".indexOf(d) : "۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/\D/g, "").slice(0, 4))} required pattern="[0-9]{4}" maxLength={4} disabled={busy} />
          </label>
          <Button type="submit" fullWidth disabled={busy || code.length !== 4}>{busy ? (ar ? "جارٍ التحقق…" : "Verifying…") : (ar ? "تحقق وادخل" : "Verify and sign in")}</Button>
          <button type="button" disabled={busy || remaining > 0 || supportRequired} onClick={() => void requestCode()} className="text-sm text-primary-orange disabled:opacity-50">{remaining > 0 ? (ar ? `إعادة الإرسال بعد ${remaining} ثانية` : `Resend in ${remaining}s`) : (ar ? "إعادة إرسال الرمز" : "Resend code")}</button>
          <button type="button" disabled={busy} onClick={() => { setChallenge(""); setMessage(""); setError(""); setCode(""); setSupportRequired(false); }} className="mx-3 text-sm underline">{ar ? "تغيير الرقم أو بيانات الحساب" : "Change number or account details"}</button>
        </form>}
        {message && <p role="status" className="text-sm text-text-gray">{message}</p>}
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        {supportRequired && <a className="block font-bold text-primary-orange underline" href="https://wa.me/963946794390" target="_blank" rel="noopener noreferrer">{ar ? "التواصل مع دعم رقيم" : "Contact Raqeem support"}</a>}
      </div>}
    </section>
  );
}
