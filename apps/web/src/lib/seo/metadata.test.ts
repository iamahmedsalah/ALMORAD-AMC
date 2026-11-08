import {afterEach, expect, it, vi} from 'vitest';
import {pageMetadata, siteOrigin} from './metadata';
afterEach(() => vi.unstubAllEnvs());
it('does not invent a public domain or index local previews', () => {
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', undefined);
  expect(siteOrigin()).toBeNull();
  expect(pageMetadata('en','','Home','Description').robots).toEqual({index:false,follow:true});
});
it('builds reciprocal canonical and language pairs for equivalent routes', () => {
  vi.stubEnv('NEXT_PUBLIC_SITE_URL','https://example.invalid');
  const metadata = pageMetadata('ar','/services','خدماتنا','وصف');
  expect(metadata.alternates).toEqual({canonical:'https://example.invalid/ar/services',languages:{en:'https://example.invalid/en/services',ar:'https://example.invalid/ar/services','x-default':'https://example.invalid/en/services'}});
});
it('rejects URLs with paths or embedded credentials', () => {
  vi.stubEnv('NEXT_PUBLIC_SITE_URL','https://secret@example.invalid/path'); expect(siteOrigin).toThrow();
});
it('keeps editorial drafts noindex even with a configured domain',()=>{vi.stubEnv('NEXT_PUBLIC_SITE_URL','https://example.invalid');vi.stubEnv('NEXT_PUBLIC_CONTENT_APPROVED',undefined);expect(pageMetadata('en','/services/branding','Branding','Description').robots).toEqual({index:false,follow:true});vi.stubEnv('NEXT_PUBLIC_CONTENT_APPROVED','true');expect(pageMetadata('en','/services/branding','Branding','Description').robots).toEqual({index:true,follow:true});});
