'use client';

import {useEffect, useRef, useState, useSyncExternalStore} from 'react';
import type {Locale} from '@amc/shared';

const scenes = [
  {code:'01', en:'BRAND ARCHITECTURE · SYSTEM TOKENS', ar:'بنية العلامة · نظام الهوية', file:'amc-01-brand-architecture'},
  {code:'02', en:'KINETIC TYPOGRAPHY · BILINGUAL GRID', ar:'الخطوط الحركية · شبكة ثنائية اللغة', file:'amc-02-kinetic-typography'},
  {code:'03', en:'OUTDOOR & CAMPAIGN DIRECTION', ar:'إخراج الحملات والإعلانات الخارجية', file:'amc-03-outdoor-campaign'},
  {code:'04', en:'INTERACTIVE WEB & 3D EXPERIENCES', ar:'تجارب الويب التفاعلية وثلاثية الأبعاد', file:'amc-04-web-3d'}
] as const;
const subscribeMotion=(listener:()=>void)=>{const q=matchMedia('(prefers-reduced-motion: reduce)');q.addEventListener('change',listener);return()=>q.removeEventListener('change',listener);};
const reducedMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const formatTime=(seconds:number)=>`00:${Math.floor(seconds).toString().padStart(2,'0')}.${Math.floor(seconds%1*10)}`;

export function StudioShowreel({locale}:{locale:Locale}) {
  const videoRef=useRef<HTMLVideoElement>(null);
  const screenRef=useRef<HTMLDivElement>(null);
  const [sceneIndex,setSceneIndex]=useState(0);
  const [paused,setPaused]=useState(false);
  const [muted,setMuted]=useState(true);
  const [visible,setVisible]=useState(false);
  const [elapsed,setElapsed]=useState(0);
  const [duration,setDuration]=useState(0);
  const [failed,setFailed]=useState(false);
  const reduced=useSyncExternalStore(subscribeMotion,reducedMotion,()=>true);
  const scene=scenes[sceneIndex]!;
  const ar=locale==='ar';
  useEffect(()=>{
    const screen=screenRef.current;if(!screen)return;
    const observer=new IntersectionObserver(([entry])=>setVisible(Boolean(entry?.isIntersecting)),{threshold:.12});
    observer.observe(screen);
    return()=>observer.disconnect();
  },[]);
  useEffect(()=>{
    const video=videoRef.current;if(!video)return;
    video.pause();video.load();setElapsed(0);setDuration(0);setFailed(false);
  },[sceneIndex]);
  useEffect(()=>{
    const video=videoRef.current;if(!video)return;
    const sync=()=>{if(document.hidden||paused||reduced||!visible)video.pause();else void video.play().catch(()=>setPaused(true));};
    document.addEventListener('visibilitychange',sync);
    sync();return()=>document.removeEventListener('visibilitychange',sync);
  },[paused,reduced,visible]);
  return <div className="lp-tv-unit">
    <div className="lp-showreel lp-tv-bezel glass-surface rounded-squircle-xl">
      <div className="lp-showreel-topbar">
        <div className="flex items-center gap-3 flex-wrap"><span className="lp-tv-rec-pill"><span className="lp-tv-rec-dot" aria-hidden="true"/>{ar?'عرض الاستوديو':'STUDIO MONITOR'}</span><span className="lp-showreel-scene-label">{scene.code} — {ar?scene.ar:scene.en}</span></div>
        <div className="flex items-center gap-3 flex-wrap"><span className="lp-showreel-timecode" aria-hidden="true">TC {formatTime(elapsed)} / {duration?formatTime(duration):'00:00.0'}</span>
          <button type="button" className="lp-showreel-btn rounded-squircle-sm" aria-label={muted?(ar?'تشغيل الصوت':'Turn sound on'):(ar?'كتم الصوت':'Mute sound')} aria-pressed={!muted} onClick={()=>setMuted(value=>!value)}>{muted?(ar?'صوت مغلق':'Sound off'):(ar?'صوت مفتوح':'Sound on')}</button>
          <button type="button" className="lp-showreel-btn rounded-squircle-sm" aria-pressed={paused||reduced} disabled={reduced} onClick={()=>setPaused(value=>!value)}>{paused||reduced?(ar?'تشغيل الشاشة':'Play Monitor'):(ar?'إيقاف مؤقت':'Pause Monitor')}</button>
        </div>
      </div>
      <div ref={screenRef} className="lp-showreel-viewport lp-tv-screen rounded-squircle-lg">
        <video ref={videoRef} className="lp-showreel-video" playsInline muted={muted} preload="metadata" poster={`/studio/monitor/posters/v${sceneIndex+1}.jpg`} onTimeUpdate={event=>setElapsed(event.currentTarget.currentTime)} onLoadedMetadata={event=>setDuration(event.currentTarget.duration)} onEnded={()=>setSceneIndex(index=>(index+1)%scenes.length)} onError={()=>{setFailed(true);setPaused(true);}} aria-label={ar?`فيديو الاستوديو: ${scene.ar}`:`Studio film: ${scene.en}`}><source src={`/studio/monitor/videos/${scene.file}.mp4`} type="video/mp4"/></video>
        {(paused||reduced||failed)&&<div className="lp-showreel-pause-poster" style={{backgroundImage:`url(/studio/monitor/posters/v${sceneIndex+1}.jpg)`}} aria-hidden="true"/>}
        {failed&&<p className="lp-showreel-error" role="status">{ar?'الفيديو غير متاح حاليًا':'Video unavailable'}</p>}
        <svg className="lp-tv-svg-overlay" viewBox="0 0 1280 680" preserveAspectRatio="none" aria-hidden="true"><rect x="2" y="2" width="1276" height="676" rx="18" fill="none" stroke="var(--studio-screen-border)" strokeWidth="2"/></svg>
      </div>
      <div className="lp-showreel-chapters" role="group" aria-label={ar?'مقاطع العرض':'Studio films'}>{scenes.map((item,index)=><button key={item.code} type="button" className="lp-showreel-chapter rounded-squircle-sm text-start cursor-pointer" aria-pressed={sceneIndex===index} data-active={sceneIndex===index} onClick={()=>setSceneIndex(index)}><strong>{item.code}</strong><span>{ar?item.ar:item.en}</span></button>)}</div>
    </div>
    <div className="lp-tv-pedestal" aria-hidden="true"><svg viewBox="0 0 360 42" className="lp-tv-stand-svg"><path d="M135 0 L225 0 L245 28 L115 28 Z" fill="var(--studio-stand)" stroke="var(--studio-screen-border)" strokeWidth="1.5"/><rect x="60" y="28" width="240" height="8" rx="4" fill="var(--studio-stand)" stroke="var(--studio-screen-border)" strokeWidth="1.5"/><circle cx="180" cy="14" r="3" fill="var(--accent)"/></svg></div>
  </div>;
}
