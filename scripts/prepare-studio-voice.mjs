/** Split the supplied narration at silent boundaries; preserve film pictures. */
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {spawnSync} from 'node:child_process';

const ffmpeg=process.argv[2]||'ffmpeg';
const root=resolve(import.meta.dirname,'..');
const source=join(root,'docs/assets/ar-voice.wav');
const audioDirectory=join(root,'apps/web/public/studio/monitor/audio');
const reviewDirectory=join(root,'docs/reviews/arabic-voiceover');
const scenes=[
  {file:'amc-01-brand-architecture',title:'Brand architecture',start:0,end:5.34},
  {file:'amc-02-kinetic-typography',title:'Kinetic typography',start:5.34,end:9.99},
  {file:'amc-03-outdoor-campaign',title:'Outdoor campaigns',start:9.99,end:14.46},
  {file:'amc-04-web-3d',title:'Web and 3D',start:14.46,end:18.729796}
];
const cueSeconds=.4;
const filmSeconds=9.6;
for(const directory of [audioDirectory,reviewDirectory])mkdirSync(directory,{recursive:true});
function run(args){
  const result=spawnSync(ffmpeg,['-hide_banner','-loglevel','error','-y',...args],{stdio:'inherit'});
  if(result.error)throw result.error;
  if(result.status!==0)throw new Error(`FFmpeg exited ${result.status}`);
}
for(const scene of scenes){
  const duration=scene.end-scene.start;
  if(duration+cueSeconds>filmSeconds)throw new Error(`${scene.file}: narration exceeds film`);
  const audio=join(audioDirectory,`${scene.file}-ar.mp3`);
  // Cuts land inside inter-scene silence. Only the outer edges get tiny fades.
  run(['-i',source,'-af',`atrim=start=${scene.start}:end=${scene.end},asetpts=PTS-STARTPTS,afade=t=in:d=0.008,afade=t=out:st=${duration-.012}:d=0.012`,'-ac','1','-ar','44100','-c:a','libmp3lame','-b:a','128k',audio]);
  const preview=join(reviewDirectory,`${scene.file}-ar.mp4`);
  run(['-i',join(root,`apps/web/public/studio/monitor/videos/${scene.file}.mp4`),'-i',audio,'-filter_complex',`[1:a]adelay=${cueSeconds*1000}:all=1,apad[a]`,'-map','0:v:0','-map','[a]','-c:v','copy','-c:a','aac','-b:a','128k','-t',String(filmSeconds),'-movflags','+faststart',preview]);
  // Decode every exported audio and preview, catching truncated/invalid media.
  for(const file of [audio,preview])run(['-xerror','-i',file,'-f','null','-']);
  console.log(`${scene.file}: ${scene.start.toFixed(2)}–${scene.end.toFixed(2)}s; ${(duration+cueSeconds).toFixed(2)}s including cue`);
}
writeFileSync(join(reviewDirectory,'cuts.json'),JSON.stringify({source:'docs/assets/ar-voice.wav',order:'Owner confirmed film order: brand identity, typography, outdoor campaigns, web/3D. Audible cut quality review pending.',cueSeconds,filmSeconds,scenes},null,2)+'\n');
writeFileSync(join(reviewDirectory,'index.html'),`<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Arabic voiceover previews</title>
<style>body{margin:2rem auto;padding:0 1rem;max-width:1000px;background:#0B0A08;color:#F5F1E7;font:17px/1.6 system-ui}section{margin:2rem 0}video{display:block;width:100%;border-radius:16px}a{color:#D8BE86}</style>
<h1>Arabic voiceover previews</h1><p>Four cuts from the supplied recording, in film order. Narration begins 0.4 seconds into each film. Playback speed and original pictures are preserved. Please review the spoken boundaries and scene matching.</p>
${scenes.map(scene=>`<section><h2>${scene.title}</h2><p>Source: ${scene.start.toFixed(2)}–${scene.end.toFixed(2)} seconds</p><video controls preload="metadata" src="${scene.file}-ar.mp4"></video><p><a href="${scene.file}-ar.mp4" download>Download preview</a></p></section>`).join('\n')}
</html>\n`);
