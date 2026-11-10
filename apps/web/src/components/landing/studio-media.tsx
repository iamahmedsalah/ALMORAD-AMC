'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Image from 'next/image';
import type { Locale } from '@amc/shared';

interface StudioShowreelProps {
  locale: Locale;
}

const REEL_SCENES = [
  {
    code: '01',
    en: 'BRAND ARCHITECTURE · SYSTEM TOKENS',
    ar: 'بنية العلامة · نظام الألوان والهوية',
  },
  {
    code: '02',
    en: 'KINETIC TYPOGRAPHY · BILINGUAL GRID',
    ar: 'تايبوغرافي حركي · شبكة ثنائية اللغة',
  },
  {
    code: '03',
    en: 'OUTDOOR & CAMPAIGN DIRECTION',
    ar: 'إخراج الحملات والإعلانات الخارجية',
  },
  {
    code: '04',
    en: 'INTERACTIVE WEB & 3D EXPERIENCES',
    ar: 'تجارب الويب التفاعلية وثلاثية الأبعاد',
  },
] as const;

export const MOCK_STUDIO_PHOTOS = [
  {
    id: 'studio-01',
    src: '/studio/studio-01.svg',
    span: 'wide',
    tagEn: 'IDENTITY SYSTEM · MOCK 01',
    tagAr: 'نظام الهوية · نموذج ٠١',
    titleEn: 'Editorial Brand Book & Token Swatches',
    titleAr: 'دليل الهوية البصرية ونظام الألوان',
  },
  {
    id: 'studio-02',
    src: '/studio/studio-02.svg',
    span: 'tall',
    tagEn: 'OUTDOOR CAMPAIGN · MOCK 02',
    tagAr: 'حملة خارجية · نموذج ٠٢',
    titleEn: 'Architectural Billboard & Urban Direction',
    titleAr: 'لوحات الطرق والإعلانات العمرانية',
  },
  {
    id: 'studio-03',
    src: '/studio/studio-03.svg',
    span: 'standard',
    tagEn: 'DIGITAL FLAGSHIP · MOCK 03',
    tagAr: 'منصة رقمية · نموذج ٠٣',
    titleEn: 'Bilingual Typography & Web Flagship',
    titleAr: 'تصميم المواقع والتايبوغرافي ثنائي اللغة',
  },
  {
    id: 'studio-04',
    src: '/studio/studio-04.svg',
    span: 'standard',
    tagEn: 'STRATEGY BOARD · MOCK 04',
    tagAr: 'لوحة الاستراتيجية · نموذج ٠٤',
    titleEn: 'Market Research & Positioning Architecture',
    titleAr: 'أبحاث السوق وهندسة التموضع',
  },
  {
    id: 'studio-05',
    src: '/studio/studio-05.svg',
    span: 'tall',
    tagEn: 'COMMERCE EXPERIENCE · MOCK 05',
    tagAr: 'تجربة المتاجر · نموذج ٠٥',
    titleEn: 'Mobile & Omni-Channel Storefront',
    titleAr: 'تطبيقات الهواتف والمتاجر الإلكترونية',
  },
  {
    id: 'studio-06',
    src: '/studio/studio-06.svg',
    span: 'wide',
    tagEn: 'STAGE DIRECTION · MOCK 06',
    tagAr: 'إخراج الفعاليات · نموذج ٠٦',
    titleEn: 'Corporate Keynote & Lighting Design',
    titleAr: 'تصميم المسرح وإضاءة فعاليات الشركات',
  },
] as const;

const subscribeMotion = (listener: () => void) => {
  const query = window.matchMedia('(prefers-reduced-motion: reduce)');
  query.addEventListener('change', listener);
  return () => query.removeEventListener('change', listener);
};
const getReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function StudioShowreel({ locale }: StudioShowreelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playbackRef = useRef(0);
  const [userPaused, setPaused] = useState(false);
  const reducedMotion = useSyncExternalStore(subscribeMotion, getReducedMotion, () => true);
  const paused = userPaused || reducedMotion;
  const [sceneIndex, setSceneIndex] = useState(0);
  const [manualScene, setManualScene] = useState<number | null>(null);
  const [timecode, setTimecode] = useState('00:00.0');
  const isAr = locale === 'ar';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let visible = false;
    let previous = performance.now();
    let lastDraw = 0;
    const duration = 12.0;

    const drawFrame = (now: number) => {
      rafId = 0;
      if (document.hidden) return;
      // Canvas work is bounded to 30fps; the clock pauses offscreen/hidden.
      if (now - lastDraw < 1000 / 30 && visible && !paused) {
        rafId = requestAnimationFrame(drawFrame);
        return;
      }
      if (!paused && visible) playbackRef.current += Math.min(.1, (now - previous) / 1000);
      previous = now;
      lastDraw = now;
      const elapsed = playbackRef.current % duration;
      const autoScene = Math.min(3, Math.floor((elapsed / duration) * 4));
      const currentScene = manualScene !== null ? manualScene : autoScene;
      setSceneIndex((prev) => (prev === currentScene ? prev : currentScene));
      setTimecode(`00:${elapsed < 10 ? '0' : ''}${elapsed.toFixed(1)}`);

      const w = canvas.width;
      const h = canvas.height;
      const dark = document.documentElement.classList.contains('dark') || document.documentElement.dataset.theme === 'dark';
      const colors = dark ? {
        start: '#061430', end: '#0B1F44', node: '#162B54', ink: '#FBF1E6',
        grid: 'rgba(188, 199, 222, 0.12)', orbit: 'rgba(188, 199, 222, 0.3)',
        spot: 'rgba(247, 118, 30, 0.3)', spotEdge: 'rgba(247, 118, 30, 0)',
        track: 'rgba(251, 241, 230, 0.2)',
      } : {
        start: '#FBF1E6', end: '#EEF1F7', node: '#FFFFFF', ink: '#0B1F44',
        grid: 'rgba(11, 31, 68, 0.1)', orbit: 'rgba(11, 31, 68, 0.26)',
        spot: 'rgba(247, 118, 30, 0.16)', spotEdge: 'rgba(247, 118, 30, 0)',
        track: 'rgba(11, 31, 68, 0.18)',
      };
      const orange = '#F7761E';

      // The canvas uses the same official navy/orange system as the DOM shell.
      const bgGrad = ctx.createLinearGradient(0, 0, w, h);
      bgGrad.addColorStop(0, colors.start);
      bgGrad.addColorStop(1, colors.end);
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      const spotX = w * (0.5 + Math.cos(elapsed * 0.7) * 0.28);
      const spotY = h * (0.48 + Math.sin(elapsed * 0.95) * 0.18);
      const radGrad = ctx.createRadialGradient(spotX, spotY, 15, spotX, spotY, w * 0.55);
      radGrad.addColorStop(0, colors.spot);
      radGrad.addColorStop(0.45, colors.spotEdge);
      radGrad.addColorStop(1, colors.spotEdge);
      ctx.fillStyle = radGrad;
      ctx.fillRect(0, 0, w, h);

      // Broadcast Architectural Perspective Grid
      ctx.strokeStyle = colors.grid;
      ctx.lineWidth = 1;
      const gridOffset = (elapsed * 42) % 64;
      for (let x = -64 + gridOffset; x < w + 64; x += 64) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 64) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Orbiting Premotio-style Rings & Kinetic Cards
      ctx.save();
      ctx.translate(w * 0.5, h * 0.47);

      for (let i = 0; i < 3; i++) {
        ctx.save();
        ctx.rotate(elapsed * (0.32 + i * 0.16) * (i % 2 === 0 ? 1 : -1));
        ctx.strokeStyle = i === 0 ? orange : colors.orbit;
        ctx.lineWidth = i === 0 ? 2.5 : 1.2;
        ctx.beginPath();
        ctx.ellipse(0, 0, 260 + i * 75, 96 + i * 32, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // 4 Floating Discipline Broadcast Nodes in Wide Elliptical Orbit
      const nodeTitles = ['01 BRANDING', '02 CAMPAIGNS', '03 STRATEGY', '04 WEB & 3D'];
      for (let k = 0; k < 4; k++) {
        const angle = elapsed * 0.72 + (k * Math.PI * 2) / 4;
        const cx = Math.cos(angle) * 310;
        const cy = Math.sin(angle) * 95;
        const scale = 0.84 + (Math.sin(angle) + 1) * 0.2;
        const isCurrent = k === currentScene;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(scale, scale);

        ctx.fillStyle = isCurrent ? orange : colors.node;
        ctx.strokeStyle = isCurrent ? colors.ink : orange;
        ctx.lineWidth = isCurrent ? 2 : 1.2;
        ctx.beginPath();
        ctx.roundRect(-72, -32, 144, 64, 14);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = isCurrent ? '#061430' : colors.ink;
        ctx.font = '700 13px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(nodeTitles[k]!, 0, 5);
        ctx.restore();
      }

      // Center AMC Monolith Broadcast Core
      const pulse = 1 + Math.sin(elapsed * 2.8) * 0.045;
      ctx.scale(pulse, pulse);
      ctx.fillStyle = colors.node;
      ctx.strokeStyle = orange;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(-86, -48, 172, 96, 24);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = colors.ink;
      ctx.font = '800 30px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('AMC', 0, 4);
      ctx.fillStyle = colors.ink;
      ctx.font = '600 10px monospace';
      ctx.fillText('STUDIO BROADCAST', 0, 24);
      ctx.restore();

      // Broadcast Corner Viewfinder Brackets
      ctx.strokeStyle = orange;
      ctx.lineWidth = 2;
      const bLen = 22;
      const pad = 28;
      // Top-left
      ctx.beginPath(); ctx.moveTo(pad, pad + bLen); ctx.lineTo(pad, pad); ctx.lineTo(pad + bLen, pad); ctx.stroke();
      // Top-right
      ctx.beginPath(); ctx.moveTo(w - pad - bLen, pad); ctx.lineTo(w - pad, pad); ctx.lineTo(w - pad, pad + bLen); ctx.stroke();
      // Bottom-left
      ctx.beginPath(); ctx.moveTo(pad, h - pad - bLen); ctx.lineTo(pad, h - pad); ctx.lineTo(pad + bLen, h - pad); ctx.stroke();
      // Bottom-right
      ctx.beginPath(); ctx.moveTo(w - pad - bLen, h - pad); ctx.lineTo(w - pad, h - pad); ctx.lineTo(w - pad, h - pad - bLen); ctx.stroke();

      // Bottom Progress Scrubber Line inside Canvas
      const progress = elapsed / duration;
      ctx.fillStyle = colors.track;
      ctx.fillRect(42, h - 18, w - 84, 4);
      ctx.fillStyle = orange;
      ctx.fillRect(42, h - 18, (w - 84) * progress, 4);

      if (!paused && visible) {
        rafId = requestAnimationFrame(drawFrame);
      }
    };

    const wake = () => {
      cancelAnimationFrame(rafId);
      previous = performance.now();
      lastDraw = 0;
      drawFrame(previous);
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? false;
      // The effect already paints a still frame. Observer delivery is asynchronous
      // and must not repaint a paused canvas after that frame has settled.
      if (!visible) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      } else if (!paused) wake();
    });
    observer.observe(canvas);
    const themeObserver = new MutationObserver(wake);
    themeObserver.observe(document.documentElement, {attributes: true, attributeFilter: ['class', 'data-theme']});
    document.addEventListener('visibilitychange', wake);
    drawFrame(performance.now());
    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
      themeObserver.disconnect();
      document.removeEventListener('visibilitychange', wake);
    };
  }, [paused, manualScene]);

  const activeScene = REEL_SCENES[sceneIndex] ?? REEL_SCENES[0];

  return (
    <div className="lp-tv-unit">
      {/* Realistic Cinema Studio TV Bezel & SVG Broadcast Frame */}
      <div className="lp-showreel lp-tv-bezel glass-surface rounded-squircle-xl">
        {/* Top Broadcast Telemetry Bar */}
        <div className="lp-showreel-topbar">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="lp-tv-rec-pill">
              <span className="lp-tv-rec-dot" aria-hidden="true" />
              <span>{isAr ? 'عرض الاستوديو' : 'STUDIO MONITOR'}</span>
            </span>
            <span className="lp-showreel-scene-label">
              {activeScene.code} — {isAr ? activeScene.ar : activeScene.en}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="lp-showreel-timecode" aria-hidden="true">
              TC {timecode} / 00:12.0
            </span>
            <button
              type="button"
              className="lp-showreel-btn rounded-squircle-sm"
              aria-pressed={paused}
              disabled={reducedMotion}
              onClick={() => setPaused((p) => !p)}
            >
              {paused
                ? isAr
                  ? 'تشغيل الشاشة'
                  : 'Play Monitor'
                : isAr
                  ? 'إيقاف مؤقت'
                  : 'Pause Monitor'}
            </button>
          </div>
        </div>

        {/* Wide 16:9 TV Screen Viewport with SVG Glass Glare & Hardware Bezel */}
        <div className="lp-showreel-viewport lp-tv-screen rounded-squircle-lg">
          <canvas
            ref={canvasRef}
            width={1280}
            height={680}
            className="lp-showreel-canvas"
            aria-label={
              isAr
                ? 'شاشة عرض استوديو المراد AMC التفاعلية'
                : 'ALMORAD AMC wide studio monitor broadcast showreel'
            }
          />
          {/* Authentic SVG Screen Glare & Broadcast Frame Overlay */}
          <svg
            className="lp-tv-svg-overlay"
            viewBox="0 0 1280 680"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="tvGlare" x1="0%" y1="0%" x2="65%" y2="100%">
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.06" />
                <stop offset="35%" stopColor="#FFFFFF" stopOpacity="0.015" />
                <stop offset="36%" stopColor="#FFFFFF" stopOpacity="0" />
                <stop offset="100%" stopColor="var(--studio-screen-shadow)" stopOpacity="0.12" />
              </linearGradient>
            </defs>
            <rect width="1280" height="680" fill="url(#tvGlare)" />
            <rect x="2" y="2" width="1276" height="676" rx="18" fill="none" stroke="var(--studio-screen-border)" strokeWidth="2" />
          </svg>
        </div>

        {/* Interactive Channel / Scene Switcher Buttons */}
        <div className="lp-showreel-chapters" role="group" aria-label={isAr ? 'قنوات العرض' : 'Broadcast channels'}>
          {REEL_SCENES.map((sc, idx) => (
            <button
              key={sc.code}
              type="button"
              onClick={() => setManualScene((prev) => (prev === idx ? null : idx))}
              className="lp-showreel-chapter rounded-squircle-sm text-start cursor-pointer"
              aria-pressed={sceneIndex === idx}
              data-active={sceneIndex === idx ? 'true' : 'false'}
            >
              <strong>{sc.code}</strong>
              <span>{isAr ? sc.ar : sc.en}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Realistic SVG TV Stand / Pedestal Neck */}
      <div className="lp-tv-pedestal" aria-hidden="true">
        <svg viewBox="0 0 360 42" className="lp-tv-stand-svg">
          <path d="M135 0 L225 0 L245 28 L115 28 Z" fill="var(--studio-stand)" stroke="var(--studio-screen-border)" strokeWidth="1.5" />
          <rect x="60" y="28" width="240" height="8" rx="4" fill="var(--studio-stand)" stroke="var(--studio-screen-border)" strokeWidth="1.5" />
          <circle cx="180" cy="14" r="3" fill="var(--accent)" />
        </svg>
      </div>
    </div>
  );
}

export function StudioPhotoShowcase({ locale }: { locale: Locale }) {
  const isAr = locale === 'ar';

  return (
    <div className="lp-photo-grid">
      {MOCK_STUDIO_PHOTOS.map((photo) => (
        <figure
          key={photo.id}
          data-portfolio-card
          className={`lp-photo-card lp-photo-${photo.span} glass-surface rounded-squircle-lg`}
        >
          <div className="lp-photo-img-wrap rounded-squircle-md">
            <Image
              unoptimized
              src={photo.src}
              alt={isAr ? photo.titleAr : photo.titleEn}
              width={600}
              height={400}
              loading="lazy"
              className="lp-photo-img"
            />
          </div>
          <figcaption className="lp-photo-caption">
            <span className="badge badge-accent rounded-squircle-sm">
              {isAr ? photo.tagAr : photo.tagEn}
            </span>
            <strong>{isAr ? photo.titleAr : photo.titleEn}</strong>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
