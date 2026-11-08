'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { Locale } from '@amc/shared';

interface StudioShowreelProps {
  locale: Locale;
}

const REEL_SCENES = [
  {
    code: '01',
    en: 'BRAND ARCHITECTURE · SYSTEM TOKENS',
    ar: 'بنية العلامة · نظام الألوان والهوية',
    accent: '#F7761E',
  },
  {
    code: '02',
    en: 'KINETIC TYPOGRAPHY · BILINGUAL GRID',
    ar: 'تايبوغرافي حركي · شبكة ثنائية اللغة',
    accent: '#FA8A3A',
  },
  {
    code: '03',
    en: 'OUTDOOR & CAMPAIGN DIRECTION',
    ar: 'إخراج الحملات والإعلانات الخارجية',
    accent: '#EC5B13',
  },
  {
    code: '04',
    en: 'INTERACTIVE WEB & 3D EXPERIENCES',
    ar: 'تجارب الويب التفاعلية وثلاثية الأبعاد',
    accent: '#FFA666',
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const [userPaused, setPaused] = useState(false);
  const reducedMotion = useSyncExternalStore(subscribeMotion, getReducedMotion, () => true);
  const paused = userPaused || reducedMotion;
  const [sceneIndex, setSceneIndex] = useState(0);
  const [timecode, setTimecode] = useState('00:00.0');
  const isAr = locale === 'ar';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Attach real MediaStream to the <video> element when supported so the native <video> tag plays the live stream
    const videoEl = videoRef.current;
    if (
      videoEl &&
      typeof canvas.captureStream === 'function' &&
      !paused && !videoEl.srcObject
    ) {
      try {
        const stream = canvas.captureStream(30);
        videoEl.srcObject = stream;
        videoEl.play().catch(() => {
          /* Autoplay blocked or headless; canvas remains visible directly */
        });
      } catch {
        /* Fallback to direct canvas rendering */
      }
    }

    let rafId = 0;
    const duration = 8.0; // 8-second looping studio showreel
    const start = performance.now();

    const drawFrame = (now: number) => {
      const elapsed = ((now - start) / 1000) % duration;
      const currentScene = Math.min(3, Math.floor((elapsed / duration) * 4));
      setSceneIndex((prev) => (prev === currentScene ? prev : currentScene));
      setTimecode(`00:0${elapsed.toFixed(1)}`);

      const w = canvas.width;
      const h = canvas.height;

      // Deep Navy Studio Backdrop
      const bgGrad = ctx.createLinearGradient(0, 0, w, h);
      bgGrad.addColorStop(0, '#061430');
      bgGrad.addColorStop(0.55, '#0B1F44');
      bgGrad.addColorStop(1, '#162B54');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Animated Orange Radial Spotlight
      const spotX = w * (0.5 + Math.cos(elapsed * 0.9) * 0.24);
      const spotY = h * (0.46 + Math.sin(elapsed * 1.2) * 0.16);
      const radGrad = ctx.createRadialGradient(spotX, spotY, 10, spotX, spotY, w * 0.48);
      radGrad.addColorStop(0, 'rgba(247, 118, 30, 0.42)');
      radGrad.addColorStop(0.5, 'rgba(236, 91, 19, 0.12)');
      radGrad.addColorStop(1, 'rgba(6, 20, 48, 0)');
      ctx.fillStyle = radGrad;
      ctx.fillRect(0, 0, w, h);

      // Perspective Motion Grid
      ctx.strokeStyle = 'rgba(147, 163, 198, 0.14)';
      ctx.lineWidth = 1;
      const gridOffset = (elapsed * 48) % 64;
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
      ctx.translate(w * 0.5, h * 0.48);

      for (let i = 0; i < 3; i++) {
        ctx.save();
        ctx.rotate(elapsed * (0.35 + i * 0.18) * (i % 2 === 0 ? 1 : -1));
        ctx.strokeStyle = i === 0 ? '#F7761E' : 'rgba(251, 241, 230, 0.25)';
        ctx.lineWidth = i === 0 ? 2.5 : 1.2;
        ctx.beginPath();
        ctx.ellipse(0, 0, 190 + i * 55, 78 + i * 26, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // 5 Floating Studio Cards in Elliptical Orbit
      for (let k = 0; k < 5; k++) {
        const angle = elapsed * 0.85 + (k * Math.PI * 2) / 5;
        const cx = Math.cos(angle) * 220;
        const cy = Math.sin(angle) * 76;
        const scale = 0.78 + (Math.sin(angle) + 1) * 0.22;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(scale, scale);

        ctx.fillStyle = k === currentScene ? '#F7761E' : '#162B54';
        ctx.strokeStyle = '#FBF1E6';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(-52, -34, 104, 68, 14);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = k === currentScene ? '#061430' : '#FBF1E6';
        ctx.font = '700 13px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`AMC 0${k + 1}`, 0, 5);
        ctx.restore();
      }

      // Center AMC Emblem Pulse
      const pulse = 1 + Math.sin(elapsed * 3.2) * 0.05;
      ctx.scale(pulse, pulse);
      ctx.fillStyle = '#0B1F44';
      ctx.strokeStyle = '#F7761E';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(-64, -44, 128, 88, 22);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#FBF1E6';
      ctx.font = '800 26px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('AMC', 0, 9);
      ctx.restore();

      // Bottom Progress Scrubber Line inside Canvas
      const progress = elapsed / duration;
      ctx.fillStyle = 'rgba(251, 241, 230, 0.16)';
      ctx.fillRect(36, h - 22, w - 72, 4);
      ctx.fillStyle = '#F7761E';
      ctx.fillRect(36, h - 22, (w - 72) * progress, 4);

      if (!paused) {
        rafId = requestAnimationFrame(drawFrame);
      }
    };

    drawFrame(performance.now());
    return () => {
      cancelAnimationFrame(rafId);
      if (videoEl?.srcObject instanceof MediaStream) {
        videoEl.srcObject.getTracks().forEach(track => track.stop());
        videoEl.srcObject = null;
      }
    };
  }, [paused]);

  const activeScene = REEL_SCENES[sceneIndex] ?? REEL_SCENES[0];

  return (
    <div className="lp-showreel glass-surface rounded-squircle-xl">
      <div className="lp-showreel-topbar">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="badge badge-accent rounded-squircle-sm">
            <span className="badge-dot" aria-hidden="true" />
            <span>{isAr ? 'عرض فيديو تجريبي · 60FPS' : 'MOCK SHOWREEL VIDEO · 60FPS'}</span>
          </span>
          <span className="lp-showreel-scene-label">
            {activeScene.code} — {isAr ? activeScene.ar : activeScene.en}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="lp-showreel-timecode" aria-hidden="true">
            {timecode} / 00:08.0
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
                ? 'تشغيل الفيديو'
                : 'Play video'
              : isAr
                ? 'إيقاف مؤقت'
                : 'Pause video'}
          </button>
        </div>
      </div>

      <div className="lp-showreel-viewport rounded-squircle-lg">
        {/* Live 60FPS Procedural Studio Showreel Canvas + Mirrored <video> Element */}
        <canvas
          ref={canvasRef}
          width={960}
          height={520}
          className="lp-showreel-canvas"
          aria-label={
            isAr
              ? 'عرض فيديو تجريبي لاستوديو المراد AMC'
              : 'ALMORAD AMC interactive studio motion showreel preview'
          }
        />
        <video
          ref={videoRef}
          className="lp-showreel-video-mirror"
          poster="/studio/showreel-poster.svg"
          muted
          playsInline
          loop
          aria-hidden="true"
        />
      </div>

      <div className="lp-showreel-chapters" role="group" aria-label={isAr ? 'فصول العرض' : 'Showreel chapters'}>
        {REEL_SCENES.map((sc, idx) => (
          <div
            key={sc.code}
            className="lp-showreel-chapter rounded-squircle-sm"
            data-active={sceneIndex === idx ? 'true' : 'false'}
          >
            <strong>{sc.code}</strong>
            <span>{isAr ? sc.ar : sc.en}</span>
          </div>
        ))}
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
          data-scroll-card
          className={`lp-photo-card lp-photo-${photo.span} glass-surface rounded-squircle-lg`}
        >
          <div className="lp-photo-img-wrap rounded-squircle-md">
            <img
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
