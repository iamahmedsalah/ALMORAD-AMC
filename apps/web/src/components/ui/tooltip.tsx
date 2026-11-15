'use client';
import * as Primitive from '@radix-ui/react-tooltip';
import type {ReactNode} from 'react';
export function Tooltip({label,children,locale}:{label:string;children:ReactNode;locale:string}){return <Primitive.Provider delayDuration={300}><Primitive.Root><Primitive.Trigger asChild>{children}</Primitive.Trigger><Primitive.Portal><Primitive.Content className="amc-tooltip" sideOffset={6} dir={locale==='ar'?'rtl':'ltr'}>{label}</Primitive.Content></Primitive.Portal></Primitive.Root></Primitive.Provider>;}
