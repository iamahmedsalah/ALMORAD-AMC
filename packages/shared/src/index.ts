import {z} from 'zod';
export const locales = ['en', 'ar'] as const;
export type Locale = (typeof locales)[number];
export const localeSchema = z.enum(locales);
export const roles = ['RECEPTIONIST', 'MANAGER', 'CEO'] as const;
export type StaffRole = (typeof roles)[number];
export const permissions = ['appointments:read', 'appointments:write', 'analytics:read', 'settings:write'] as const;
export type Permission = (typeof permissions)[number];
export function can(role: StaffRole, permission: Permission): boolean {
  return role === 'MANAGER' || role === 'CEO' || (role === 'RECEPTIONIST' && (permission === 'appointments:read' || permission === 'appointments:write'));
}
// Shared validation boundary for bilingual contact forms.
export const inquirySchema = z.object({locale: localeSchema, name: z.string().trim().min(2).max(120), email: z.email().max(254), message: z.string().trim().min(10).max(2000)});
export const contactSubmissionSchema = inquirySchema.extend({
  email: z.email().max(254).transform(value => value.toLowerCase()),
  consent: z.literal(true), website: z.string().max(200).default(''), idempotencyKey: z.uuid()
}).strict();
export const pillars = [
  {id: 'marketing', en: 'Marketing', ar: 'التسويق'},
  {id: 'advertising', en: 'Advertising', ar: 'الإعلان'},
  {id: 'consulting', en: 'Consulting', ar: 'الاستشارات'},
  {id: 'web-development', en: 'Web Development', ar: 'تطوير المواقع'}
] as const;
export const services = [
  {slug: 'social-media-management', pillar: 'marketing', en: 'Social Media Management', ar: 'إدارة منصات التواصل الاجتماعي'},
  {slug: 'personal-branding', pillar: 'marketing', en: 'Personal Branding', ar: 'بناء العلامة الشخصية'},
  {slug: 'market-research-analysis', pillar: 'marketing', en: 'Market Research & Analysis', ar: 'أبحاث السوق وتحليلها'},
  {slug: 'branding', pillar: 'marketing', en: 'Branding', ar: 'بناء الهوية والعلامة التجارية'},
  {slug: 'media-buying', pillar: 'advertising', en: 'Media Buying', ar: 'شراء المساحات الإعلانية'},
  {slug: 'outdoor-advertising', pillar: 'advertising', en: 'Billboards & Outdoor Advertising', ar: 'اللوحات والإعلانات الخارجية'},
  {slug: 'corporate-events', pillar: 'advertising', en: 'Corporate Events', ar: 'فعاليات الشركات'},
  {slug: 'ecommerce-consulting', pillar: 'consulting', en: 'E-commerce Consulting', ar: 'استشارات التجارة الإلكترونية'},
  {slug: 'management-consulting', pillar: 'consulting', en: 'Management Consulting', ar: 'الاستشارات الإدارية'},
  {slug: 'ecommerce-website-development', pillar: 'web-development', en: 'E-commerce Websites', ar: 'مواقع التجارة الإلكترونية'},
  {slug: 'company-websites-landing-pages', pillar: 'web-development', en: 'Company Websites & Landing Pages', ar: 'مواقع الشركات وصفحات الهبوط'}
] as const;

export * from './booking.js';
export * from './banner.js';
export * from './calendar.js';

