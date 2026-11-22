'use client';
import * as Primitive from '@radix-ui/react-dialog';
import type {ComponentProps, ReactNode} from 'react';
import {IconButton} from './animated-icon';

export const Dialog = Primitive.Root;
export const DialogTrigger = Primitive.Trigger;

export function DialogContent({
  title,
  description,
  locale,
  children,
  ...props
}: Omit<ComponentProps<typeof Primitive.Content>, 'title'> & {
  title: string;
  description?: string;
  locale: string;
  children: ReactNode;
}) {
  return (
    <Primitive.Portal>
      <Primitive.Overlay className="amc-dialog-overlay" />
      <Primitive.Content
        {...props}
        dir={locale === 'ar' ? 'rtl' : 'ltr'}
        className={'amc-dialog-content ' + (props.className || '')}
      >
        <span className="amc-dialog-handle" aria-hidden="true" />
        <div className="staff-heading amc-dialog-header">
          <div className="amc-dialog-heading-text">
            <Primitive.Title>{title}</Primitive.Title>
            {description ? (
              <Primitive.Description className="amc-dialog-description">
                {description}
              </Primitive.Description>
            ) : (
              <Primitive.Description className="sr-only">{title}</Primitive.Description>
            )}
          </div>
          <Primitive.Close asChild>
            <IconButton
              name="close-linear"
              label={locale === 'ar' ? 'إغلاق' : 'Close'}
              className="button button-secondary amc-dialog-close"
            />
          </Primitive.Close>
        </div>
        {children}
      </Primitive.Content>
    </Primitive.Portal>
  );
}
