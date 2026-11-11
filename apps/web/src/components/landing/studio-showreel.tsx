'use client';

import {useEffect, useRef, useState, useSyncExternalStore} from 'react';
import type {Locale} from '@amc/shared';
import {PlaybackIcon,SoundIcon} from '@/components/ui/motion-control-icon';
import {arabicVoiceTracks} from './studio-voice-manifest';

const scenes = [
  {en:'BRAND ARCHITECTURE · SYSTEM TOKENS', ar:'بنية العلامة · نظام الهوية', file:'amc-01-brand-architecture'},
  {en:'KINETIC TYPOGRAPHY · BILINGUAL GRID', ar:'الخطوط الحركية · شبكة ثنائية اللغة', file:'amc-02-kinetic-typography'},
  {en:'OUTDOOR & CAMPAIGN DIRECTION', ar:'إخراج الحملات والإعلانات الخارجية', file:'amc-03-outdoor-campaign'},
  {en:'INTERACTIVE WEB & 3D EXPERIENCES', ar:'تجارب الويب التفاعلية وثلاثية الأبعاد', file:'amc-04-web-3d'}
] as const;
const subscribeMotion=(listener:()=>void)=>{const q=matchMedia('(prefers-reduced-motion: reduce)');q.addEventListener('change',listener);return()=>q.removeEventListener('change',listener);};
const reducedMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
let soundOnInMemory=false;
const subscribeSound=(listener:()=>void)=>{window.addEventListener('amc-studio-sound-change',listener);return()=>window.removeEventListener('amc-studio-sound-change',listener);};
const soundEnabled=()=>{try{return sessionStorage.getItem('amc-studio-sound')==='on';}catch{return soundOnInMemory;}};
const formatTime=(seconds:number)=>`00:${Math.floor(seconds).toString().padStart(2,'0')}.${Math.floor(seconds%1*10)}`;

export function StudioShowreel({locale}:{locale:Locale}) {
  const videoRef=useRef<HTMLVideoElement>(null);
  const audioRef=useRef<HTMLAudioElement>(null);
  const screenRef=useRef<HTMLDivElement>(null);
  const [sceneIndex,setSceneIndex]=useState(0);
  const [paused,setPaused]=useState(false);
  const [visible,setVisible]=useState(false);
  const [elapsed,setElapsed]=useState(0);
  const [duration,setDuration]=useState(0);
  const [failed,setFailed]=useState(false);
  const [voiceFailed,setVoiceFailed]=useState(false);
  const reduced=useSyncExternalStore(subscribeMotion,reducedMotion,()=>true);
  const muted=!useSyncExternalStore(subscribeSound,soundEnabled,()=>false);
  const scene=scenes[sceneIndex]!;
  const ar=locale==='ar';
  const voiceSrc=ar?arabicVoiceTracks[sceneIndex]:null;
  const voiceover=Boolean(voiceSrc)&&!voiceFailed;
  const syncVoice=(video:HTMLVideoElement)=>{
    const audio=audioRef.current;
    if(!audio||!voiceover)return;
    if(muted||paused||reduced||!visible||document.hidden||video.paused){audio.pause();return;}
    const cueTime=video.currentTime-.4;
    if(cueTime<0){audio.pause();return;}
    if(audio.readyState<1)return;
    if(cueTime>=audio.duration){audio.pause();return;}
    if(Math.abs(audio.currentTime-cueTime)>.3)audio.currentTime=cueTime;
    if(audio.paused)void audio.play().catch(()=>{/* User interaction may be required by the browser. */});
  };
  useEffect(()=>{
    const screen=screenRef.current;if(!screen)return;
    const observer=new IntersectionObserver(([entry])=>setVisible(Boolean(entry?.isIntersecting)),{threshold:.12});
    observer.observe(screen);
    return()=>observer.disconnect();
  },[]);
  useEffect(()=>{
    const video=videoRef.current;if(!video)return;
    video.pause();audioRef.current?.pause();video.load();audioRef.current?.load();setElapsed(0);setDuration(0);setFailed(false);setVoiceFailed(false);
  },[sceneIndex]);
  useEffect(()=>{
    const video=videoRef.current;if(!video)return;
    const sync=()=>{
      if(document.hidden||paused||reduced||!visible){video.pause();audioRef.current?.pause();return;}
      void video.play().catch((error:unknown)=>{
        if(error instanceof DOMException && error.name==='NotAllowedError')setPaused(true);
      });
    };
    document.addEventListener('visibilitychange',sync);
    sync();return()=>document.removeEventListener('visibilitychange',sync);
  },[sceneIndex,paused,reduced,visible]);
  const toggleSound=()=>{
    if(muted&&voiceover&&audioRef.current&&videoRef.current&&videoRef.current.currentTime>=.4&&audioRef.current.readyState>=1){
      audioRef.current.currentTime=Math.max(0,videoRef.current.currentTime-.4);
      void audioRef.current.play().catch(()=>{/* User interaction may be required by the browser. */});
    }
    if(!muted)audioRef.current?.pause();
    soundOnInMemory=muted;
    try{sessionStorage.setItem('amc-studio-sound',muted?'on':'off');}catch{/* Keep the in-memory setting. */}
    window.dispatchEvent(new Event('amc-studio-sound-change'));
  };
  return <div className="lp-tv-unit">
    <div className="lp-showreel lp-tv-bezel glass-surface rounded-squircle-xl">
      <div className="lp-showreel-topbar">
        <div className="flex items-center gap-3 flex-wrap"><span className="lp-tv-rec-pill"><span className="lp-tv-rec-dot" aria-hidden="true"/>{ar?'عرض الاستوديو':'STUDIO MONITOR'}</span><span className="lp-showreel-scene-label">{ar?scene.ar:scene.en}</span></div>
        <div className="flex items-center gap-3 flex-wrap"><span className="lp-showreel-timecode" aria-hidden="true">TC {formatTime(elapsed)} / {duration?formatTime(duration):'00:00.0'}</span>
          <button type="button" className="lp-showreel-btn rounded-squircle-sm" aria-label={muted?(ar?'تشغيل الصوت':'Turn sound on'):(ar?'كتم الصوت':'Mute sound')} aria-pressed={!muted} onClick={toggleSound}><SoundIcon muted={muted}/></button>
          <button type="button" className="lp-showreel-btn rounded-squircle-sm" aria-label={paused||reduced?(ar?'تشغيل الشاشة':'Play monitor'):(ar?'إيقاف الشاشة مؤقتًا':'Pause monitor')} aria-pressed={paused||reduced} disabled={reduced} onClick={()=>setPaused(value=>!value)}><PlaybackIcon paused={paused||reduced}/></button>
        </div>
      </div>
      <div ref={screenRef} className="lp-showreel-viewport lp-tv-screen rounded-squircle-lg">
        <video ref={videoRef} className="lp-showreel-video" playsInline muted={muted||voiceover} preload="metadata" poster={`/studio/monitor/posters/v${sceneIndex+1}.jpg`} onTimeUpdate={event=>{setElapsed(event.currentTarget.currentTime);syncVoice(event.currentTarget);}} onLoadedMetadata={event=>setDuration(event.currentTarget.duration)} onPlaying={event=>syncVoice(event.currentTarget)} onEnded={()=>setSceneIndex(index=>(index+1)%scenes.length)} onError={()=>{setFailed(true);setPaused(true);}} aria-label={ar?`فيديو الاستوديو: ${scene.ar}`:`Studio film: ${scene.en}`}><source src={`/studio/monitor/videos/${scene.file}.mp4`} type="video/mp4"/></video>
        {voiceover&&<audio ref={audioRef} src={voiceSrc??undefined} preload="metadata" onLoadedMetadata={()=>{if(videoRef.current)syncVoice(videoRef.current);}} onError={()=>setVoiceFailed(true)} hidden/>}
        {(paused||reduced||failed)&&<div className="lp-showreel-pause-poster" style={{backgroundImage:`url(/studio/monitor/posters/v${sceneIndex+1}.jpg)`}} aria-hidden="true"/>}
        {failed&&<p className="lp-showreel-error" role="status">{ar?'الفيديو غير متاح حاليًا':'Video unavailable'}</p>}
        <svg className="lp-tv-svg-overlay" viewBox="0 0 1280 680" preserveAspectRatio="none" aria-hidden="true"><rect x="2" y="2" width="1276" height="676" rx="18" fill="none" stroke="var(--studio-screen-border)" strokeWidth="2"/></svg>
      </div>
      <div className="lp-showreel-chapters" role="group" aria-label={ar?'مقاطع العرض':'Studio films'}>{scenes.map((item,index)=><button key={item.file} type="button" className="lp-showreel-chapter rounded-squircle-sm text-start cursor-pointer" aria-pressed={sceneIndex===index} data-active={sceneIndex===index} onClick={()=>setSceneIndex(index)}><span>{ar?item.ar:item.en}</span></button>)}</div>
    </div>
    <div className="lp-tv-pedestal" aria-hidden="true"><svg viewBox="0 0 360 42" className="lp-tv-stand-svg"><path d="M135 0 L225 0 L245 28 L115 28 Z" fill="var(--studio-stand)" stroke="var(--studio-screen-border)" strokeWidth="1.5"/><rect x="60" y="28" width="240" height="8" rx="4" fill="var(--studio-stand)" stroke="var(--studio-screen-border)" strokeWidth="1.5"/><circle cx="180" cy="14" r="3" fill="var(--accent)"/></svg></div>
  </div>;
}
