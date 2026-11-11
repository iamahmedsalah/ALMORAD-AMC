'use client';

import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import Image from 'next/image';
import type {Locale} from '@amc/shared';
import type {DisciplineId} from '@/features/services/discipline-content';
import type {SceneEngine} from './service-scene-types';
import {registerMotion} from './service-motion-budget';
import {PlaybackIcon} from '@/components/ui/motion-control-icon';

const subscribeMotion=(listener:()=>void)=>{const q=matchMedia('(prefers-reduced-motion: reduce)');q.addEventListener('change',listener);return()=>q.removeEventListener('change',listener);};
const snapshot=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
interface Props {scene:DisciplineId|'devices';locale:Locale;label:string;fallback?:string;}

export function ServiceMotionStage({scene,locale,label,fallback='/studio/studio-03.svg'}:Props){
  const ref=useRef<HTMLDivElement>(null);
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const [paused,setPaused]=useState(false);
  const [visible,setVisible]=useState(false);
  const [selected,setSelected]=useState(false);
  const [hidden,setHidden]=useState(false);
  const [failed,setFailed]=useState(false);
  const [failedPoster,setFailedPoster]=useState<string|null>(null);
  const reduced=useSyncExternalStore(subscribeMotion,snapshot,()=>true);
  const eligible=visible&&!hidden&&!reduced&&!failed;
  const [ready,setReady]=useState(false);

  useEffect(()=>{
    const element=ref.current;if(!element)return;
    const registration=registerMotion(setSelected);
    let ratio=0;
    let scrollFrame=0,settleTimer=0;
    const update=()=>{
      scrollFrame=0;
      const box=element.getBoundingClientRect();
      const top=Math.max(0,box.top),bottom=Math.min(innerHeight,box.bottom);
      const x=Math.min(innerWidth-1,Math.max(0,box.left+box.width/2));
      const y=(top+bottom)/2;
      // Sticky cards can intersect while covered by a later card. Only animate exposed artwork.
      const exposed=bottom>top&&element.contains(document.elementFromPoint(x,y));
      const centered=1/(1+Math.abs((top+bottom)/2-innerHeight/2)/innerHeight);
      registration.update(eligible&&exposed?ratio*centered:0);
    };
    const schedule=()=>{if(!scrollFrame)scrollFrame=requestAnimationFrame(update);window.clearTimeout(settleTimer);settleTimer=window.setTimeout(update,900);};
    window.addEventListener('scroll',schedule,{passive:true});
    window.addEventListener('resize',schedule);
    document.addEventListener('focusin',schedule);
    document.addEventListener('transitionend',schedule);
    document.addEventListener('animationend',schedule);
    const observer=new IntersectionObserver(([entry])=>{ratio=entry?.intersectionRatio??0;setVisible(ratio>0);update();schedule();},{threshold:[0,.1,.25,.5,.75,1]});
    observer.observe(element);
    const visibility=()=>setHidden(document.hidden);
    visibility();document.addEventListener('visibilitychange',visibility);
    return()=>{observer.disconnect();registration.destroy();cancelAnimationFrame(scrollFrame);window.clearTimeout(settleTimer);document.removeEventListener('transitionend',schedule);document.removeEventListener('animationend',schedule);window.removeEventListener('scroll',schedule);window.removeEventListener('resize',schedule);document.removeEventListener('focusin',schedule);document.removeEventListener('visibilitychange',visibility);};
  },[eligible]);

  useEffect(()=>{
    if(!selected||!eligible)return;
    const element=ref.current,canvas=canvasRef.current;if(!element||!canvas)return;
    let dead=false,engine:SceneEngine|undefined,raf=0,last=0,seconds=0,first=true;
    let resize:ResizeObserver|undefined;
    const themeObserver=new MutationObserver(()=>{if(paused&&engine)engine.render(seconds);});
    const stop=()=>{cancelAnimationFrame(raf);resize?.disconnect();themeObserver.disconnect();engine?.destroy();engine=undefined;};
    const fail=()=>{if(dead)return;stop();setReady(false);setFailed(true);};
    const lost=(event:Event)=>{event.preventDefault();fail();};
    canvas.addEventListener('webglcontextlost',lost);
    const pointer=(event:PointerEvent)=>{if(event.pointerType==='touch')return;const box=element.getBoundingClientRect();engine?.pointer((event.clientX-box.left)/box.width,(event.clientY-box.top)/box.height,true);};
    const leave=()=>engine?.pointer(.5,.5,false);
    element.addEventListener('pointermove',pointer);element.addEventListener('pointerleave',leave);
    const frame=(now:number)=>{
      if(dead||document.hidden)return;
      if(paused||now-last>=1000/30){if(!paused)seconds+=Math.min(.1,(now-last)/1000);last=now;
        try{engine?.render(seconds);if(first){setReady(true);first=false;}}catch{fail();return;}
      }
      if(!paused)raf=requestAnimationFrame(frame);
    };
    const start=async()=>{
      setReady(false);
      try{
        if(scene==='devices'){
          const {createDeviceScene}=await import('./web-development-engine');
          if(dead)return;engine=createDeviceScene(canvas,locale);
        }else{
          const {createFlatScene}=await import('./service-motion-engine');
          if(dead)return;engine=createFlatScene(canvas,scene==='web-development'?'web':scene);
        }
        const fit=()=>{if(!engine||dead)return;engine.resize(element.clientWidth,element.clientHeight,Math.min(devicePixelRatio||1,1.5));};
        resize=new ResizeObserver(fit);resize.observe(element);fit();
        themeObserver.observe(document.documentElement,{attributes:true,attributeFilter:['class','data-theme']});
        last=performance.now();raf=requestAnimationFrame(frame);
      }catch{fail();}
    };
    void start();
    return()=>{dead=true;setReady(false);canvas.removeEventListener('webglcontextlost',lost);stop();element.removeEventListener('pointermove',pointer);element.removeEventListener('pointerleave',leave);};
  },[selected,eligible,scene,locale,paused]);
  const running=selected&&eligible&&ready;
  const poster=scene==='devices'?fallback:`/studio/services/${scene}.webp`;
  const posterSource=failedPoster===poster?fallback:poster;
  return <div ref={ref} className={`service-motion-stage ${scene==='devices'?'service-device-scene':''}`} data-scene={scene} data-active={running?'true':'false'} data-failed={failed?'true':'false'}>
    <Image className="service-motion-poster" src={posterSource} width={1000} height={800} sizes="(max-width: 767px) 100vw, 50vw" unoptimized={posterSource.endsWith('.svg')} alt="" loading="lazy" decoding="async" onError={()=>{if(posterSource!==fallback)setFailedPoster(poster);}}/>
    <canvas key={`${scene}-${selected}-${eligible}-${paused}`} ref={canvasRef} className="service-motion-canvas" aria-hidden="true" style={{opacity:ready&&selected&&eligible?1:0}}/>
    <button type="button" className="service-motion-toggle" aria-label={`${locale==='ar'?(reduced||failed?'معاينة ثابتة':paused?'تشغيل الحركة':'إيقاف الحركة'):(reduced||failed?'Still preview':paused?'Play motion':'Pause motion')}: ${label}`} aria-pressed={paused||reduced} disabled={reduced||failed} onClick={()=>setPaused(value=>!value)}>
      <PlaybackIcon paused={paused||reduced||failed}/>
    </button>
  </div>;
}
