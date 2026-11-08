import 'reflect-metadata';
import {describe, expect, it} from 'vitest';
import {StaffController} from './staff.controller.js';
import type {StaffRequest} from './session.guard.js';

describe('StaffController unit tests', () => {
  it('returns verified staff identity from request', () => {
    const controller = new StaffController();
    const req = {
      staff: {
        id: 'usr_1',
        email: 'ceo@almorad.amc',
        name: 'CEO',
        role: 'CEO',
        permissions: ['appointments:read', 'appointments:write', 'analytics:read', 'settings:write']
      }
    } as unknown as StaffRequest;

    expect(controller.me(req)).toEqual(req.staff);
  });

  it('confirms settings access endpoint', () => {
    const controller = new StaffController();
    expect(controller.settingsAccess()).toEqual({allowed: true});
  });
});
