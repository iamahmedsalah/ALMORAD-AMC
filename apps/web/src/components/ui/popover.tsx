'use client';
import * as Primitive from '@radix-ui/react-popover';
import type {ComponentProps} from 'react';
export const Popover=Primitive.Root;
export const PopoverTrigger=Primitive.Trigger;
export function PopoverContent({locale,...props}:ComponentProps<typeof Primitive.Content>&{locale:string}){return <Primitive.Portal><Primitive.Content sideOffset={8} collisionPadding={12} {...props} dir={locale==='ar'?'rtl':'ltr'} className={'amc-popover-content '+(props.className||'')}/></Primitive.Portal>;}
