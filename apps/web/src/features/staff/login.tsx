'use client';

import {useEffect, useRef, useState, useSyncExternalStore, type FormEvent} from 'react';
import {useRouter} from 'next/navigation';
import {emailRegex, type Locale} from '@amc/shared';
import {staffCopy} from './copy';
import {SolarIcon} from '@/components/ui/solar-icon';
import {Alert, AlertDescription, AlertTitle} from '@/components/ui/alert';

const subscribe = () => () => {};
const ready = () => true;
const notReady = () => false;

export function StaffLogin({locale}: {locale: Locale}) {
  const hydrated = useSyncExternalStore(subscribe, ready, notReady);
  const c = staffCopy(locale);
  const router = useRouter();
  const emailRef = useRef<HTMLInputElement>(null);
  const redirectTimer = useRef<number | null>(null);
  const [pending, setPending] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  useEffect(() => () => {if (redirectTimer.current !== null) window.clearTimeout(redirectTimer.current);}, []);
  const emailValid = email.length <= 254 && emailRegex.test(email.trim());
  const emailState = emailTouched ? emailValid ? 'valid' : 'invalid' : 'idle';
  const feedback = locale === 'ar' ? {
    valid: 'صيغة البريد الإلكتروني صحيحة', invalid: 'أدخل بريدًا إلكترونيًا صحيحًا',
    password: 'أدخل كلمة المرور', problem: 'تعذّر تسجيل الدخول',
    showPassword: 'إظهار كلمة المرور', hidePassword: 'إخفاء كلمة المرور', success: 'تم تسجيل الدخول', continuing: 'جارٍ فتح مساحة العمل…',
  } : {
    valid: 'Email format looks good', invalid: 'Enter a valid email address',
    password: 'Enter your password', problem: 'Sign in failed',
    showPassword: 'Show password', hidePassword: 'Hide password', success: 'Signed in', continuing: 'Opening your workspace…',
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || signedIn) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const password = String(data.get('password') ?? '');
    setEmailTouched(true);
    if (!emailValid) {setError(feedback.invalid); emailRef.current?.focus(); return;}
    if (!password) {setError(feedback.password); form.querySelector<HTMLInputElement>('input[name="password"]')?.focus(); return;}
    setError(''); setPending(true);
    try {
      const response = await fetch('/api/staff/auth/login', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({email: email.trim(), password}), cache: 'no-store',
      });
      if (response.ok) {
        form.reset(); setSignedIn(true);
        redirectTimer.current = window.setTimeout(() => {router.replace(`/${locale}/staff`); redirectTimer.current = null;}, 650);
      }
      else setError(response.status === 503 ? c.unavailable : c.failed);
    } catch {setError(c.unavailable);}
    finally {setPending(false);}
  }

  return <section className="staff-login container">
    <div className="staff-login-emblem"><SolarIcon name="users-group-rounded-linear"/></div>
    <p className="eyebrow">ALMORAD AMC</p><h1>{c.signIn}</h1><p>{c.intro}</p>
    <form method="post" action="/api/staff/auth/login" onSubmit={submit} noValidate className="staff-form">
      <label>{c.email}
        <input ref={emailRef} disabled={!hydrated || pending || signedIn} name="email" type="email" autoComplete="username" dir="ltr" required maxLength={254}
          value={email} onChange={event => {setEmail(event.target.value); setError('');}} onBlur={() => setEmailTouched(true)}
          aria-invalid={emailState === 'invalid'} data-valid={emailState === 'valid'} aria-describedby={emailState !== 'idle' ? 'staff-email-feedback' : undefined}/>
      </label>
      {emailState !== 'idle' && <p id="staff-email-feedback" className="field-feedback" data-state={emailState}>
        <span className="field-feedback-symbol" aria-hidden="true">{emailValid ? '✓' : '!'}</span>{emailValid ? feedback.valid : feedback.invalid}
      </p>}
      <div className="staff-password-field"><label htmlFor="staff-password">{c.password}</label><div className="staff-password-wrap">
        <input id="staff-password" disabled={!hydrated || pending || signedIn} name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" dir="ltr" required maxLength={128}/>
        <button type="button" className="staff-password-toggle" disabled={!hydrated || pending || signedIn}
          aria-label={showPassword ? feedback.hidePassword : feedback.showPassword} aria-pressed={showPassword}
          onClick={() => setShowPassword(value => !value)}>
          <span key={showPassword ? 'visible' : 'hidden'} className="staff-password-icon"><SolarIcon name={showPassword ? 'eye-closed-linear' : 'eye-linear'} /></span>
        </button>
      </div></div>
      <Alert variant="destructive" open={Boolean(error)}><AlertTitle>{feedback.problem}</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>
      <Alert variant="success" open={signedIn}><AlertTitle>{feedback.success}</AlertTitle><AlertDescription>{feedback.continuing}</AlertDescription></Alert>
      <button className="button button-primary" disabled={!hydrated || pending || signedIn} type="submit">{pending ? c.pending : c.submit}</button>
    </form>
    <noscript>{locale === 'ar' ? 'يلزم تفعيل جافاسكريبت لتسجيل الدخول الآمن.' : 'JavaScript is required for secure sign in.'}</noscript>
  </section>;
}
