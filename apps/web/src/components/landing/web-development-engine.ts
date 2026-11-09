import * as THREE from 'three';
import type { Locale } from '@amc/shared';
import type { SceneEngine } from './service-scene-types';

// Layered-device geometry and screen artwork adapted from the supplied scene.
interface ScreenOptions { rtl: boolean; headline: string; sub: string; cta: string; fs: number; colW: number; cardsY: number; cardsX?: number; gap: number; cols: number; rows: number; cardH: number; }
  const COPY = {
    en: {
      desk:   { rtl: false, headline: 'Built for Arabic and English.', sub: 'Layouts that mirror, type that fits.', cta: 'Launch' },
      tablet: { rtl: false, headline: 'Shop in your language.', sub: 'Catalogue, cart and checkout.', cta: 'Shop now' },
      phone:  { rtl: true,  headline: 'متجرك بلغتك.', sub: 'تجربة متجاوبة لكل شاشة.', cta: 'تسوّق' }
    },
    ar: {
      desk:   { rtl: true,  headline: 'مبني للعربية والإنجليزية.', sub: 'تخطيطات تنعكس وخطوط تناسب.', cta: 'ابدأ' },
      tablet: { rtl: true,  headline: 'تسوّق بلغتك.', sub: 'الكتالوج والسلة والدفع.', cta: 'تسوّق الآن' },
      phone:  { rtl: false, headline: 'Shop on any phone.', sub: 'A responsive experience.', cta: 'Shop' }
    }
  };

  function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number) {
    const words = text.split(' '), lines: string[] = []; let cur = '';
    words.forEach(function (w) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; });
    if (cur) lines.push(cur); return lines;
  }

  function drawUI(ctx: CanvasRenderingContext2D, w: number, h: number, o: ScreenOptions, englishFamily: string) {
    const rtl = o.rtl, pad = w * 0.07;
    const X = function (x: number, wid = 0) { return rtl ? w - x - (wid || 0) : x; };
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0F2147'; ctx.fillRect(0, 0, w, h);
    const bar = Math.max(h * 0.075, 34);
    ctx.fillStyle = '#17295A'; ctx.fillRect(0, 0, w, bar);
    ['#F7761E', '#F7761E', '#6C7FB0'].forEach(function (c, i) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(X(pad + i * bar * 0.42), bar / 2, bar * 0.13, 0, 6.3); ctx.fill(); });
    const ny = bar + h * 0.035, nh = Math.max(h * 0.022, 12);
    for (let i = 0; i < 3; i++) { ctx.fillStyle = 'rgba(251,241,230,' + (i === 0 ? 0.9 : 0.28) + ')'; rr(ctx, X(pad + i * w * 0.14, w * 0.11), ny, w * 0.11, nh, nh / 2); ctx.fill(); }
    const fs = o.fs, fam = rtl ? 'Cairo, sans-serif' : englishFamily, lh = fs * (rtl ? 1.35 : 1.12);
    ctx.direction = rtl ? 'rtl' : 'ltr';
    ctx.textAlign = rtl ? 'right' : 'left'; ctx.textBaseline = 'top';
    ctx.font = '700 ' + fs + 'px ' + fam; ctx.fillStyle = '#FBF1E6';
    const tx = rtl ? w - pad : pad, ty = ny + nh + h * 0.06;
    const lines = wrapText(ctx, o.headline, o.colW);
    lines.forEach(function (l, i) { ctx.fillText(l, tx, ty + i * lh); });
    let yy = ty + lines.length * lh + fs * 0.35;
    ctx.font = '400 ' + (fs * 0.36) + 'px ' + fam; ctx.fillStyle = 'rgba(251,241,230,.7)';
    wrapText(ctx, o.sub, o.colW).forEach(function (l, i) { ctx.fillText(l, tx, yy + i * fs * 0.5); });
    yy += fs * 0.5 * 2 + fs * 0.45;
    const bw = fs * 3.1, bh = fs * 0.85;
    ctx.fillStyle = '#F7761E'; rr(ctx, X(pad, bw), yy, bw, bh, bh * 0.28); ctx.fill();
    ctx.fillStyle = '#0B1F44'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '700 ' + (fs * 0.34) + 'px ' + fam;
    ctx.fillText(o.cta, X(pad, bw) + bw / 2, yy + bh / 2 + 1);
    const cy = o.cardsY * h, ch = o.cardH * h; let cw = (w - pad * 2 - o.gap * (o.cols - 1)) / o.cols;
    if (o.cardsX) cw = (w - o.cardsX - pad - o.gap * (o.cols - 1)) / o.cols;
    for (let r = 0; r < o.rows; r++) for (let c = 0; c < o.cols; c++) {
      const cx = (o.cardsX || pad) + c * (cw + o.gap), y2 = cy + r * (ch + o.gap);
      ctx.fillStyle = (r + c) % 3 === 1 ? '#F7761E' : '#1B3270'; rr(ctx, X(cx, cw), y2, cw, ch, ch * 0.1); ctx.fill();
      ctx.fillStyle = 'rgba(251,241,230,.85)'; rr(ctx, X(cx + cw * 0.12, cw * 0.5), y2 + ch * 0.68, cw * 0.5, ch * 0.07, ch * 0.035); ctx.fill();
      ctx.fillStyle = 'rgba(251,241,230,.35)'; rr(ctx, X(cx + cw * 0.12, cw * 0.7), y2 + ch * 0.8, cw * 0.7, ch * 0.05, ch * 0.025); ctx.fill();
    }
  }


export function createDeviceScene(canvas: HTMLCanvasElement, locale: Locale): SceneEngine {
  const renderer = new THREE.WebGLRenderer({canvas,antialias:false,alpha:true,powerPreference:'low-power'});
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40,1,.1,100);
  camera.position.set(0,.2,8.3);
  const group = new THREE.Group();scene.add(group);
  const englishFamily=getComputedStyle(canvas).getPropertyValue('--font-english').trim()||'sans-serif';
  const resources = new Set<{dispose():void}>();
  const redraws: (()=>void)[] = [];
  let dead=false;
  const destroy=()=>{if(dead)return;dead=true;resources.forEach(r=>r.dispose());renderer.dispose();renderer.forceContextLoss();};
  try {
    renderer.setClearColor(0x061430,1);
    const texture=(width: number,height: number,key: keyof typeof COPY.en,base: Omit<ScreenOptions,'rtl'|'headline'|'sub'|'cta'>)=>{
      const cv=document.createElement('canvas');cv.width=width;cv.height=height;
      const ctx=cv.getContext('2d');if(!ctx)throw new Error('Screen canvas unavailable');
      const map=new THREE.CanvasTexture(cv);map.colorSpace=THREE.SRGBColorSpace;resources.add(map);
      const redraw=()=>{if(dead)return;drawUI(ctx,width,height,{...base,...COPY[locale][key]},englishFamily);map.needsUpdate=true;};
      redraw();redraws.push(redraw);return map;
    };
    const devices: {object:THREE.Group;baseline:number}[]=[];
    const device=(w:number,h:number,map:THREE.Texture,x:number,y:number,z:number,rotation:number)=>{
      const object=new THREE.Group();
      const geometry=new THREE.BoxGeometry(w,h,.07);resources.add(geometry);
      const edge=new THREE.MeshBasicMaterial({color:0xF7761E});
      const back=new THREE.MeshBasicMaterial({color:0x0B1F44});
      const front=new THREE.MeshBasicMaterial({map});[edge,back,front].forEach(m=>resources.add(m));
      object.add(new THREE.Mesh(geometry,[edge,edge,edge,edge,front,back]));
      object.position.set(x,y,z);object.rotation.y=rotation;group.add(object);devices.push({object,baseline:y});return object;
    };
    device(4.2,2.62,texture(1280,800,'desk',{fs:84,colW:560,cardsY:.2,cardsX:700,gap:28,cols:2,rows:2,cardH:.3}),-.35,.35,0,.12);
    device(1.7,2.27,texture(768,1024,'tablet',{fs:70,colW:560,cardsY:.56,gap:22,cols:2,rows:2,cardH:.17}),2.35,.1,1.1,-.3);
    device(1.05,2.27,texture(585,1266,'phone',{fs:64,colW:420,cardsY:.56,gap:18,cols:2,rows:2,cardH:.15}),-2.7,-.1,1.5,.3);
    const grid=new THREE.GridHelper(14,28,0x27407A,0x14234B);grid.position.set(0,-1.9,-1);group.add(grid);
    resources.add(grid.geometry);(Array.isArray(grid.material)?grid.material:[grid.material]).forEach(m=>resources.add(m));
    // Textures redraw after the site's existing fonts settle, guarded against late unmount.
    void document.fonts.ready.then(()=>{if(!dead)redraws.forEach(redraw=>redraw());});
    let targetX=0,targetY=0;
    return {
      resize(w,h,dpr){renderer.setPixelRatio(dpr);renderer.setSize(w,h,false);camera.aspect=w/h;camera.fov=w/h<1.4?46:44;camera.updateProjectionMatrix();},
      pointer(x,y,active){targetX=active?(x-.5)*.7:0;targetY=active?(y-.5)*.36:0;},
      render(seconds){if(dead)return;group.rotation.y+=(targetX-group.rotation.y)*.12;group.rotation.x+=(targetY-group.rotation.x)*.12;devices.forEach(({object,baseline},i)=>{object.position.y=baseline+Math.sin(seconds*.9+i*1.7)*.08;});renderer.render(scene,camera);},
      destroy,
    };
  } catch(error){destroy();throw error;}
}
