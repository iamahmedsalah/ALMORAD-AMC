'use client';
import * as Primitive from '@radix-ui/react-dialog';
import type {ComponentProps,ReactNode} from 'react';
import {IconButton} from './animated-icon';
export const Dialog=Primitive.Root;
export const DialogTrigger=Primitive.Trigger;
export function DialogContent({title,description,locale,children,...props}:Omit<ComponentProps<typeof Primitive.Content>,'title'>&{title:string;description?:string;locale:string;children:ReactNode}){
 return <Primitive.Portal><Primitive.Overlay className="amc-dialog-overlay"/><Primitive.Content {...props} dir={locale==='ar'?'rtl':'ltr'} className={'amc-dialog-content '+(props.className||'')}>
 <div className="staff-heading"><Primitive.Title>{title}</Primitive.Title><Primitive.Close asChild><IconButton name="close-linear" label={locale==='ar'?'\u0625\u063a\u0644\u0627\u0642':'Close'} className="button button-secondary"/></Primitive.Close></div>
 {description?<Primitive.Description>{description}</Primitive.Description>:<Primitive.Description className="sr-only">{title}</Primitive.Description>}{children}</Primitive.Content></Primitive.Portal>;
}
