import type {HTMLAttributes} from 'react';
import {SolarIcon} from './solar-icon';

type AlertProps = HTMLAttributes<HTMLDivElement> & {variant: 'success' | 'destructive'; open?: boolean};

/** shadcn-style alert primitive using this site's semantic success/error tokens. */
export function Alert({variant, open = true, className = '', children, ...props}: AlertProps) {
  return <div {...props} data-slot="alert" data-variant={variant} data-state={open ? 'open' : 'closed'}
    role={open ? variant === 'destructive' ? 'alert' : 'status' : undefined} aria-hidden={!open}
    className={`form-alert form-alert-${variant} ${className}`.trim()}>
    <span className="form-alert-icon" aria-hidden="true">
      {variant === 'success' ? <SolarIcon name="check-circle-linear" /> : <span>!</span>}
    </span>
    <div className="form-alert-content">{children}</div>
  </div>;
}

export function AlertTitle({className = '', ...props}: HTMLAttributes<HTMLElement>) {
  return <strong {...props} data-slot="alert-title" className={`form-alert-title ${className}`.trim()} />;
}

export function AlertDescription({className = '', ...props}: HTMLAttributes<HTMLParagraphElement>) {
  return <p {...props} data-slot="alert-description" className={`form-alert-description ${className}`.trim()} />;
}
