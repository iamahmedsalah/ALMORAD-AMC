import {describe, expect, it} from 'vitest';
import {can, inquirySchema, pillars, services} from './index';
describe('foundation contracts', () => {
  it('keeps the approved four pillars and eleven unique services', () => {
    expect(pillars).toHaveLength(4); expect(services).toHaveLength(11);
    expect(new Set(services.map(s => s.slug)).size).toBe(11);
    expect(services.every(s => pillars.some(p => p.id === s.pillar) && s.ar && s.en)).toBe(true);
  });
  it('denies management permissions to receptionists', () => {
    expect(can('RECEPTIONIST', 'analytics:read')).toBe(false);
    expect(can('RECEPTIONIST', 'settings:write')).toBe(false);
    expect(can('RECEPTIONIST', 'appointments:write')).toBe(true);
    expect(can('CEO', 'analytics:read')).toBe(true);
    expect(can('MANAGER', 'settings:write')).toBe(true);
    expect(can('CEO', 'staff:manage')).toBe(true);
    expect(can('MANAGER', 'staff:manage')).toBe(false);
    expect(can('RECEPTIONIST', 'staff:manage')).toBe(false);
  });
  it('rejects invalid form input at the shared boundary', () => {
    expect(inquirySchema.safeParse({locale:'fr',name:'a',email:'invalid',message:''}).success).toBe(false);
  });
});
