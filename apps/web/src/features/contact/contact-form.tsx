'use client';
import {useEffect, useRef, useState, type FormEvent} from 'react';
import {contactSubmissionSchema, type Locale} from '@amc/shared';
import {Button} from '@/components/ui/button';

export function ContactForm({locale}: {locale: Locale}) {
  const ar = locale === 'ar';
  const c = ar ? {
    title: 'لنبدأ الحديث', intro: 'أخبرنا عن مشروعك وما ترغب في تحقيقه.', name: 'الاسم', email: 'البريد الإلكتروني', message: 'كيف يمكننا مساعدتك؟',
    consent: 'أوافق على استخدام بياناتي للرد على هذا الاستفسار.', send: 'إرسال الرسالة', pending: 'جارٍ الإرسال…',
    success: 'تم استلام رسالتك. شكرًا لتواصلك معنا.', again: 'إرسال رسالة أخرى', invalid: 'يرجى مراجعة الحقول وإدخال بيانات صحيحة والموافقة على التواصل.',
    failed: 'تعذر إرسال الرسالة الآن. بياناتك محفوظة هنا؛ حاول مرة أخرى.', limited: 'أرسلت عدة رسائل مؤخرًا. يرجى الانتظار دقيقة ثم المحاولة.',
    hint: 'من ١٠ إلى ٢٠٠٠ حرف. لا ترسل كلمات مرور أو معلومات حساسة.', required: 'جميع الحقول مطلوبة.',
    errName: 'يرجى كتابة الاسم (حرفين على الأقل).', errEmail: 'يرجى إدخال بريد إلكتروني صحيح.', errMessage: 'يرجى كتابة رسالة واضحة (١٠ أحرف على الأقل).', errConsent: 'يرجى الموافقة على استخدام البيانات للرد.'
  } : {
    title: 'Start a conversation', intro: 'Tell us about your project and where you want to go.', name: 'Name', email: 'Email', message: 'How can we help?',
    consent: 'I agree to my details being used to respond to this inquiry.', send: 'Send message', pending: 'Sending…',
    success: 'Your message has been received. Thank you for getting in touch.', again: 'Send another message', invalid: 'Please review the fields, enter valid information, and agree to be contacted.',
    failed: 'We couldn’t send your message. Your details are still here; please try again.', limited: 'You’ve sent several messages recently. Please wait a minute before trying again.',
    hint: '10–2,000 characters. Please leave out passwords and sensitive information.', required: 'All fields are required.',
    errName: 'Name must be at least 2 characters.', errEmail: 'Please enter a valid email address.', errMessage: 'Message must be at least 10 characters.', errConsent: 'You must agree to be contacted.'
  };
  const [state, setState] = useState<'idle'|'pending'|'success'|'error'>('idle');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const attempt = useRef<{fingerprint: string; key: string} | null>(null);
  const busy = useRef(false);
  const status = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (state === 'success') status.current?.focus();
  }, [state]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const fields = {locale, name: String(data.get('name') || ''), email: String(data.get('email') || ''), message: String(data.get('message') || ''), consent: data.get('consent') === 'on', website: String(data.get('website') || '')};
    const fingerprint = JSON.stringify(fields);
    if (attempt.current?.fingerprint !== fingerprint) attempt.current = {fingerprint, key: crypto.randomUUID()};
    const parsed = contactSubmissionSchema.safeParse({...fields, idempotencyKey: attempt.current.key});
    if (!parsed.success) {
      const issues: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0]);
        if (!issues[key]) {
          if (key === 'name') issues[key] = c.errName;
          else if (key === 'email') issues[key] = c.errEmail;
          else if (key === 'message') issues[key] = c.errMessage;
          else if (key === 'consent') issues[key] = c.errConsent;
          else issues[key] = issue.message;
        }
      }
      setFieldErrors(issues);
      setError(c.invalid);
      setState('error');
      form.querySelector<HTMLElement>(`[name="${String(parsed.error.issues[0]?.path[0])}"]`)?.focus();
      return;
    }
    busy.current = true; setFieldErrors({}); setError(''); setState('pending');
    try {
      const response = await fetch('/api/contact/submit', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(parsed.data), signal: AbortSignal.timeout(20000)});
      if (!response.ok) {
        let serverMsg = response.status === 429 ? c.limited : c.failed;
        try {
          const body = await response.json();
          if (body?.message && typeof body.message === 'string') serverMsg = `${serverMsg} (${body.message})`;
        } catch {}
        setError(serverMsg);
        setState('error');
        return;
      }
      const result: unknown = await response.json();
      if (!result || typeof result !== 'object' || !('accepted' in result) || result.accepted !== true) throw new Error('Invalid acknowledgement');
      form.reset(); attempt.current = null; setState('success');
    } catch { setError(c.failed); setState('error'); }
    finally { busy.current = false; }
  }
  return <section className="contact-form-panel glass-surface" aria-labelledby="contact-form-title">
    <p className="badge">{ar ? 'رسالتك التالية' : 'Your next move'}</p>
    <h2 id="contact-form-title">{c.title}</h2><p>{c.intro}</p>
    {state === 'success' ? <div ref={status} tabIndex={-1} role="status" className="contact-success"><p>{c.success}</p><Button type="button" variant="secondary" onClick={() => setState('idle')}>{c.again}</Button></div> :
    <form onSubmit={submit} noValidate aria-busy={state === 'pending'}>
      <p className="contact-form-note">{c.required}</p>
      <fieldset disabled={state === 'pending'}>
        <div className="contact-form-fields">{(['name', 'email'] as const).map(field => <div className="contact-field" key={field}>
          <label htmlFor={`contact-${field}`}>{c[field]}</label>
          <input id={`contact-${field}`} name={field} type={field === 'email' ? 'email' : 'text'} dir={field === 'email' ? 'ltr' : undefined} autoComplete={field} required minLength={field === 'name' ? 2 : undefined} maxLength={field === 'name' ? 120 : 254} aria-invalid={Boolean(fieldErrors[field])} aria-describedby={fieldErrors[field] ? `contact-err-${field}` : undefined}/>
          {fieldErrors[field] && <p className="field-error" id={`contact-err-${field}`} role="alert" style={{color: '#BE9D5B', fontSize: '0.875rem', marginTop: '4px'}}>{fieldErrors[field]}</p>}
        </div>)}</div>
        <div className="contact-field"><label htmlFor="contact-message">{c.message}</label><textarea id="contact-message" name="message" required minLength={10} maxLength={2000} rows={6} aria-invalid={Boolean(fieldErrors.message)} aria-describedby={`contact-hint${fieldErrors.message ? ' contact-err-message' : ''}`}/><small id="contact-hint">{c.hint}</small>
        {fieldErrors.message && <p className="field-error" id="contact-err-message" role="alert" style={{color: '#BE9D5B', fontSize: '0.875rem', marginTop: '4px'}}>{fieldErrors.message}</p>}</div>
        <div className="contact-honeypot" aria-hidden="true"><label htmlFor="contact-website">Website</label><input id="contact-website" name="website" tabIndex={-1} autoComplete="off"/></div>
        <label className="contact-consent"><input type="checkbox" name="consent" required aria-invalid={Boolean(fieldErrors.consent)} aria-describedby={fieldErrors.consent ? 'contact-err-consent' : undefined}/><span>{c.consent}</span></label>
        {fieldErrors.consent && <p className="field-error" id="contact-err-consent" role="alert" style={{color: '#BE9D5B', fontSize: '0.875rem', marginTop: '4px'}}>{fieldErrors.consent}</p>}
        {state === 'error' && <p role="alert" id="contact-error">{error}</p>}
        <Button type="submit">{state === 'pending' ? c.pending : c.send}<span aria-hidden="true">↗</span></Button>
      </fieldset>
    </form>}
  </section>;
}
