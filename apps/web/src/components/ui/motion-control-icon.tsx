export function SoundIcon({muted}:{muted:boolean}){
  return <svg className="motion-control-icon" data-muted={muted} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 9v6h4l5 4V5L8 9H4Z"/>
    <g className="motion-control-sound-waves"><path d="M17 9a4 4 0 0 1 0 6"/><path d="M19.5 6.5a7.5 7.5 0 0 1 0 11"/></g>
    <path className="motion-control-sound-off" d="m17 9 4 6m0-6-4 6"/>
  </svg>;
}

export function PlaybackIcon({paused}:{paused:boolean}){
  return <svg className="motion-control-icon" data-paused={paused} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path className="motion-control-play" d="m8 5 11 7-11 7V5Z"/>
    <g className="motion-control-pause"><path d="M7 5v14"/><path d="M17 5v14"/></g>
  </svg>;
}
