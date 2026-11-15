'use client';
import Script from 'next/script';
import {useCallback,useEffect,useRef,useState} from 'react';
import type {Locale} from '@amc/shared';
import {authCopy} from './auth-copy';
type GoogleApi={accounts:{id:{initialize:(options:{client_id:string;callback:(result:{credential:string})=>void;auto_select:boolean})=>void;renderButton:(element:HTMLElement,options:{type:string;theme:string;size:string;text:string;locale:string})=>void}}};
export function GoogleSignInButton({locale,onCredential,disabled=false,link=false}:{locale:Locale;onCredential:(credential:string)=>Promise<void>;disabled?:boolean;link?:boolean}){
 const clientId=process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;const container=useRef<HTMLDivElement>(null);const callback=useRef(onCredential);const locked=useRef(false);const disabledRef=useRef(disabled);const [error,setError]=useState('');
 useEffect(()=>{callback.current=onCredential;disabledRef.current=disabled;},[onCredential,disabled]);
 const render=useCallback(()=>{const google=(window as Window&{google?:GoogleApi}).google;if(!clientId||!google||!container.current)return;google.accounts.id.initialize({client_id:clientId,auto_select:false,callback:result=>{if(disabledRef.current||locked.current)return;locked.current=true;void callback.current(result.credential).catch(()=>setError(authCopy(locale).googleError)).finally(()=>{locked.current=false;});}});container.current.replaceChildren();google.accounts.id.renderButton(container.current,{type:'standard',theme:'outline',size:'large',text:link?'continue_with':'signin_with',locale});},[clientId,locale,link]);
 useEffect(()=>{render();},[render]);
 if(!clientId)return null;
 return <div className="google-signin"><Script src="https://accounts.google.com/gsi/client" strategy="lazyOnload" onReady={render} onError={()=>setError(authCopy(locale).googleError)}/><div ref={container} inert={disabled} aria-busy={disabled}/>{error&&<p role="alert">{error}</p>}</div>;
}
