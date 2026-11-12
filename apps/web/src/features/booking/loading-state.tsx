import {SolarIcon} from '@/components/ui/solar-icon';
export function BookingLoading({label}:{label:string}){
 return <div className="booking-loading" role="status" aria-live="polite"><SolarIcon name="refresh-linear" className="booking-spinner"/><span>{label}</span><span className="booking-skeleton" aria-hidden="true"/></div>;
}
