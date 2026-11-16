import type {Locale} from '@amc/shared';
import {SolarIcon} from '@/components/ui/solar-icon';
import {authCopy} from './auth-copy';

export function AuthUtilities({locale}:{locale:Locale}){
 return (
  <div className="auth-utilities">
   <a href={'/'+locale} className="button button-secondary">
    <SolarIcon name="arrow-right-linear" className="directional-icon"/>
    <span>{authCopy(locale).back}</span>
   </a>
  </div>
 );
}
