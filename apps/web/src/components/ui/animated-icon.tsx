import type {ButtonHTMLAttributes, Ref} from 'react';
import {SolarIcon, type SolarName} from './solar-icon';

type IconSize = 16 | 20 | 24 | 32;
/** Decorative layers; the owning control supplies the accessible action name. */
export function AnimatedIcon({name, alternate, active = false, size = 24, className = ''}: {
  name: SolarName; alternate?: SolarName; active?: boolean; size?: IconSize; className?: string;
}) {
  return <span aria-hidden="true" className={`animated-icon ${className}`} data-active={Boolean(alternate&&active)} style={{width:size,height:size}}>
    <span className="animated-icon-default"><SolarIcon name={name}/></span>
    {alternate && <span className="animated-icon-alternate"><SolarIcon name={alternate}/></span>}
  </span>;
}
export function IconButton({label, name, alternate, active, size, className = '', children, ...props}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> & {
  label: string; name: SolarName; alternate?: SolarName; active?: boolean; size?: IconSize;
}) {
  return <button type="button" {...props} className={`icon-button ${className}`} aria-label={label} title={label}>
    <AnimatedIcon name={name} alternate={alternate} active={active} size={size}/>{children}
  </button>;
}
export function MenuToggle({open, label, controls, onClick, buttonRef, className = ''}: {
  open: boolean; label: string; controls: string; onClick: () => void;
  buttonRef?: Ref<HTMLButtonElement>; className?: string;
}) {
  return <button ref={buttonRef} type="button" className={`icon-button menu-toggle ${className}`} data-open={open}
    aria-label={label} title={label} aria-expanded={open} aria-controls={controls} onClick={onClick}>
    <svg aria-hidden="true" focusable="false" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path className="menu-line-top" d="M4 6h16"/><path className="menu-line-middle" d="M4 12h16"/><path className="menu-line-bottom" d="M4 18h16"/>
    </svg>
  </button>;
}
