import {describe,expect,it} from 'vitest';
import {settingsInput} from './booking.js';

const officeSettings={
  version:0,enabled:true,timezone:'Africa/Cairo',durationMinutes:30,stepMinutes:30,
  bufferBeforeMinutes:0,bufferAfterMinutes:0,leadMinutes:30,lookaheadDays:30,
  changeCutoffMinutes:30,onlineEnabled:true,inPersonEnabled:true,
  officeAddressEn:'18 Zaki Ragab Street, Smouha, Alexandria',
  officeAddressAr:'18 شارع زكي رجب، سموحة، الإسكندرية',
  directionsUrl:null,weeklyHours:[{day:1,open:'09:00',close:'17:00'}],
  blackoutDates:[],serviceSlugs:['branding']
};

describe('office booking settings',()=>{
  it('accepts a verified bilingual address while the directions link is pending',()=>{
    expect(settingsInput.safeParse(officeSettings).success).toBe(true);
  });
  it('refuses to enable office meetings without the Arabic address',()=>{
    expect(settingsInput.safeParse({...officeSettings,officeAddressAr:null}).success).toBe(false);
  });
});
