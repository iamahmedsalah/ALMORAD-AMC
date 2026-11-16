'use client';
import {useEffect,useState,type ReactNode} from 'react';
import {Dialog,DialogContent} from '@/components/ui/dialog';
import {SolarIcon} from '@/components/ui/solar-icon';

type IconName=Parameters<typeof SolarIcon>[0]['name'];

export function PageHeader({icon,title,description,action}:{icon:IconName;title:string;description?:string;action?:ReactNode}){
 return (
  <div className="dash-page-header">
   <div className="dash-page-header-main">
    <span className="dash-page-header-icon" aria-hidden="true"><SolarIcon name={icon}/></span>
    <div className="dash-page-header-text">
     <h2>{title}</h2>
     {description&&<p>{description}</p>}
    </div>
   </div>
   {action&&<div className="dash-page-header-action">{action}</div>}
  </div>
 );
}

export function StatCard({icon,value,label,trend,tone}:{icon:IconName;value:string|number;label:string;trend?:string;tone?:'accent'|'success'|'warn'}){
 const numeric=typeof value==='number'?value:null;
 const [display,setDisplay]=useState(numeric===null?value:0);

 useEffect(()=>{
  if(numeric===null)return;
  if(typeof window!=='undefined'&&window.matchMedia('(prefers-reduced-motion: reduce)').matches){
   const id=window.requestAnimationFrame(()=>setDisplay(numeric));
   return()=>window.cancelAnimationFrame(id);
  }
  const start=performance.now();
  const duration=380;
  let raf=0;
  const step=(now:number)=>{
   const progress=Math.min(1,(now-start)/duration);
   const eased=1-Math.pow(1-progress,3);
   setDisplay(Math.round(numeric*eased));
   if(progress<1)raf=window.requestAnimationFrame(step);
  };
  raf=window.requestAnimationFrame(step);
  return()=>window.cancelAnimationFrame(raf);
 },[numeric]);

 return (
  <div className="dash-stat-card" data-tone={tone}>
   <div className="dash-stat-head">
    <span className="dash-stat-icon" aria-hidden="true"><SolarIcon name={icon}/></span>
    {trend&&<span className="dash-stat-trend">{trend}</span>}
   </div>
   <strong className="dash-stat-value">{numeric===null?value:display}</strong>
   <span className="dash-stat-label">{label}</span>
  </div>
 );
}

export function SideDrawer({open,onOpenChange,locale,title,description,children}:{open:boolean;onOpenChange:(open:boolean)=>void;locale:string;title:string;description?:string;children:ReactNode}){
 return (
  <Dialog open={open} onOpenChange={onOpenChange}>
   <DialogContent locale={locale} title={title} description={description} className="dash-side-drawer">
    {children}
   </DialogContent>
  </Dialog>
 );
}

export function EmptyState({icon,title,description,action}:{icon:IconName;title:string;description?:string;action?:ReactNode}){
 return (
  <div className="dash-empty-state">
   <span className="dash-empty-icon" aria-hidden="true"><SolarIcon name={icon} className="dash-empty-svg"/></span>
   <h3>{title}</h3>
   {description&&<p>{description}</p>}
   {action}
  </div>
 );
}

export function SkeletonList({rows=4}:{rows?:number}){
 return (
  <div className="dash-skeleton-list" aria-busy="true" aria-hidden="true">
   {Array.from({length:rows},(_,index)=>(
    <div key={index} className="dash-skeleton-row">
     <span className="dash-skeleton-avatar"/>
     <div className="dash-skeleton-lines">
      <span className="dash-skeleton-line wide"/>
      <span className="dash-skeleton-line"/>
     </div>
    </div>
   ))}
  </div>
 );
}
