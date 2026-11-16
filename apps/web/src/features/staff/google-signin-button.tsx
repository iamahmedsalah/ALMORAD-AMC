'use client';
import Script from 'next/script';
import {useTheme} from 'next-themes';
import {useCallback,useEffect,useRef,useState} from 'react';
import type {Locale} from '@amc/shared';
import {authCopy} from './auth-copy';

type GoogleApi={accounts:{id:{initialize:(options:{client_id:string;callback:(result:{credential:string})=>void;auto_select:boolean})=>void;renderButton:(element:HTMLElement,options:{type:string;theme:string;size:string;shape?:string;width?:number;text:string;locale:string})=>void}}};

export function GoogleSignInButton({locale,onCredential,disabled=false,link=false}:{locale:Locale;onCredential:(credential:string)=>Promise<void>;disabled?:boolean;link?:boolean}){
 const clientId=process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
 const {resolvedTheme}=useTheme();
 const container=useRef<HTMLDivElement>(null);
 const callback=useRef(onCredential);
 const locked=useRef(false);
 const disabledRef=useRef(disabled);
 const [error,setError]=useState('');

 useEffect(()=>{callback.current=onCredential;disabledRef.current=disabled;},[onCredential,disabled]);

 const render=useCallback(()=>{
  const google=(window as Window&{google?:GoogleApi}).google;
  if(!clientId||!google||!container.current)return;
  const width=Math.min(400,Math.max(240,Math.floor(container.current.clientWidth||320)));
  google.accounts.id.initialize({
   client_id:clientId,
   auto_select:false,
   callback:result=>{
    if(disabledRef.current||locked.current)return;
    locked.current=true;
    void callback.current(result.credential).catch(()=>setError(authCopy(locale).googleError)).finally(()=>{locked.current=false;});
   }
  });
  container.current.replaceChildren();
  google.accounts.id.renderButton(container.current,{
   type:'standard',
   theme:resolvedTheme==='dark'?'filled_black':'outline',
   size:'large',
   shape:'pill',
   width,
   text:link?'continue_with':'signin_with',
   locale
  });
 },[clientId,locale,link,resolvedTheme]);

 useEffect(()=>{
  render();
  const element=container.current;
  if(!element||typeof ResizeObserver==='undefined')return;
  const observer=new ResizeObserver(()=>render());
  observer.observe(element);
  return ()=>observer.disconnect();
 },[render]);

 if(!clientId)return null;
 return (
  <div className="google-signin" data-theme={resolvedTheme==='dark'?'dark':'light'}>
   <Script src="https://accounts.google.com/gsi/client" strategy="lazyOnload" onReady={render} onError={()=>setError(authCopy(locale).googleError)}/>
   <div ref={container} className="google-signin-slot" inert={disabled} aria-busy={disabled}/>
   {error&&<p role="alert">{error}</p>}
  </div>
 );
}
