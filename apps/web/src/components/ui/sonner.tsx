'use client';
import {useTheme} from 'next-themes';
import {Toaster as SonnerToaster} from 'sonner';

export function Toaster({dir}:{dir:'rtl'|'ltr'}){
 const {resolvedTheme}=useTheme();
 return (
  <SonnerToaster
   theme={resolvedTheme==='dark'?'dark':'light'}
   dir={dir}
   position={dir==='rtl'?'bottom-left':'bottom-right'}
   richColors
   closeButton
   toastOptions={{
    style:{
     background:'var(--surface)',
     color:'var(--foreground)',
     border:'1px solid var(--border)',
     borderRadius:'var(--radius-md)',
    },
   }}
  />
 );
}
