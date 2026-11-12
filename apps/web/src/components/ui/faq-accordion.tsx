'use client';
import {useEffect, useRef, useState, useSyncExternalStore} from 'react';
import {SolarIcon} from './solar-icon';
import {motion} from '@/lib/motion';
const subscribe=()=>()=>{};

export function FaqAccordion({items}: {items: readonly (readonly [string,string])[]; locale: string}) {
  return <div className="faq-accordion">{items.map(([question,answer])=><FaqItem key={question} question={question} answer={answer}/>)}</div>;
}
function FaqItem({question,answer}: {question:string;answer:string}) {
  const hydrated=useSyncExternalStore(subscribe,()=>true,()=>false);
  const details=useRef<HTMLDetailsElement>(null), body=useRef<HTMLDivElement>(null);
  const animation=useRef<Animation|null>(null), expanded=useRef(false);
  const [open,setOpen]=useState(false);
  useEffect(()=>{
    const media=matchMedia('(prefers-reduced-motion: reduce)');
    const settle=()=>{if(media.matches){animation.current?.cancel();animation.current=null;if(details.current)details.current.open=expanded.current;}};
    media.addEventListener('change',settle);
    return()=>{animation.current?.cancel();media.removeEventListener('change',settle);};
  },[]);
  function toggle(){
    const node=details.current, content=body.current;if(!node||!content)return;
    expanded.current=!expanded.current;const next=expanded.current;setOpen(next);
    animation.current?.cancel();animation.current=null;
    if(matchMedia('(prefers-reduced-motion: reduce)').matches||!content.animate){node.open=next;return;}
    node.open=true;
    const anim=content.animate(next?[
      {opacity:0,transform:'translateY(-6px)'},{opacity:1,transform:'translateY(0)'},
    ]:[{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(-6px)'}],
    {duration:motion.disclosure,easing:motion.enter});
    animation.current=anim;
    anim.onfinish=()=>{if(animation.current===anim){node.open=next;animation.current=null;}};
  }
  return <details ref={details} className="faq-accordion-item" data-expanded={hydrated?open:undefined}>
    <summary aria-expanded={hydrated?open:undefined} onClick={event=>{event.preventDefault();toggle();}}>
      <span className="faq-accordion-question">{question}</span>
      <span className="faq-accordion-toggle" aria-hidden="true"><SolarIcon name="alt-arrow-down-linear"/></span>
    </summary>
    <div ref={body} className="faq-accordion-answer"><p>{answer}</p></div>
  </details>;
}
