import {solarIcons} from './solar-data';
export type SolarName = keyof typeof solarIcons;
export function SolarIcon({name, className = ''}: {name: SolarName; className?: string}) {
  return <svg className={`solar-icon ${className}`} width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false" dangerouslySetInnerHTML={{__html:solarIcons[name]}}/>;
}
