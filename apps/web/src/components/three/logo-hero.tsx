'use client';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import {Component,useCallback,useEffect,useRef,useState} from 'react';
const Scene=dynamic(()=>import('./logo-scene'),{ssr:false});
class SceneBoundary extends Component<{children:React.ReactNode;onFailure:()=>void},{failed:boolean}> {
 state={failed:false};static getDerivedStateFromError(){return {failed:true};}componentDidCatch(){this.props.onFailure();}render(){return this.state.failed?null:this.props.children;}
}
export function LogoHero({pauseLabel,playLabel}:{pauseLabel:string;playLabel:string}) {
 const root=useRef<HTMLDivElement>(null);const [enabled,setEnabled]=useState(false);const [visible,setVisible]=useState(true);const [tabVisible,setTabVisible]=useState(true);const [ready,setReady]=useState(false);const [failed,setFailed]=useState(false);const [paused,setPaused]=useState(false);
 const onReady=useCallback(()=>setReady(true),[]);const onFailure=useCallback(()=>setFailed(true),[]);
 useEffect(()=>{const motion=matchMedia('(prefers-reduced-motion: reduce)');const connection=(navigator as Navigator & {connection?:{saveData?:boolean}}).connection;
 const apply=()=>{if(motion.matches||connection?.saveData){setEnabled(false);return;}const canvas=document.createElement('canvas');const context=canvas.getContext('webgl2')||canvas.getContext('webgl');if(context){context.getExtension('WEBGL_lose_context')?.loseContext();setEnabled(true);}};
 const timer=window.setTimeout(apply,400);motion.addEventListener('change',apply);const observer=new IntersectionObserver(entries=>setVisible(Boolean(entries[0]?.isIntersecting)),{threshold:.05});if(root.current)observer.observe(root.current);const visibility=()=>setTabVisible(!document.hidden);document.addEventListener('visibilitychange',visibility);
 return()=>{clearTimeout(timer);observer.disconnect();motion.removeEventListener('change',apply);document.removeEventListener('visibilitychange',visibility);};},[]);
 return <div ref={root} className={`logo-stage ${enabled&&ready&&!failed?'scene-ready':''}`} data-scene-state={failed?'fallback':enabled&&ready?'ready':enabled?'loading':'static'}><div className="stage-cross cross-one"/><div className="stage-cross cross-two"/><div className="logo-poster"><Image src="/brand/mc-logo.svg" width={850} height={310} alt="ALMORAD AMC logo" priority/></div>{enabled&&!failed&&<div className="scene-canvas"><SceneBoundary onFailure={onFailure}><Scene active={visible&&tabVisible&&!paused} onReady={onReady} onFailure={onFailure}/></SceneBoundary></div>}<span className="stage-caption" aria-hidden="true">AMC — IDENTITY IN MOTION</span>{enabled&&ready&&!failed&&<button type="button" className="scene-control" aria-pressed={paused} onClick={()=>setPaused(v=>!v)}>{paused?playLabel:pauseLabel}</button>}</div>;
}
