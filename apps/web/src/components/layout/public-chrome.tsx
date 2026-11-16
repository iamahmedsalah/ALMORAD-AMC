'use client';
import {usePathname} from 'next/navigation';
import type {ReactNode} from 'react';

export function PublicChrome({header,footer,children}:{header:ReactNode;footer:ReactNode;children:ReactNode}){
 const pathname=usePathname()||'';
 const isStaffRoute=/^\/(en|ar)\/staff(\/|$)/.test(pathname);
 if(isStaffRoute){
  return <main id="main" tabIndex={-1}>{children}</main>;
 }
 return (
  <>
   {header}
   <main id="main" tabIndex={-1}>{children}</main>
   {footer}
  </>
 );
}
