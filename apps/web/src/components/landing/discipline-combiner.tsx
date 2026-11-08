'use client';

import { useEffect, useRef, useState } from 'react';
import { pillars, services, type Locale } from '@amc/shared';
import { Link } from '@/i18n/navigation';
import { ArrowIcon } from './primitives';

interface DisciplineCombinerProps {
  locale: Locale;
  copy: {
    legend: string;
    result: string;
    empty: string;
    cta: string;
    centre: string;
  };
}

const ANIMATION_MODES = [
  { id: 'orbit', code: '01', en: '3D Orbit & Layer Depth', ar: 'مدار ثلاثي الأبعاد وطبقات' },
  { id: 'explode', code: '02', en: 'Exploded Architecture', ar: 'تفكيك هندسي للأبعاد' },
  { id: 'pulse', code: '03', en: 'Kinetic Signal Wave', ar: 'موجة الإشارة الحركية' },
  { id: 'spin', code: '04', en: '360° Dimensional Turn', ar: 'دوران كامل ٣٦٠ درجة' },
] as const;

export function DisciplineCombiner({ locale, copy }: DisciplineCombinerProps) {
  const [selected, setSelected] = useState<string[]>(() => pillars.map((p) => p.id));
  const [animMode, setAnimMode] = useState<number>(0);
  const [autoCycle, setAutoCycle] = useState<boolean>(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isAr = locale === 'ar';

  const togglePillar = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  // Auto-cycle through the 4 3D animation modes every 4.5 seconds
  useEffect(() => {
    if (!autoCycle) return;
    const timer = window.setInterval(() => {
      setAnimMode((prev) => (prev + 1) % ANIMATION_MODES.length);
    }, 4500);
    return () => window.clearInterval(timer);
  }, [autoCycle]);

  // Fixed-canvas 60FPS 3D extruded AMC Logo + Orbiting Pillar Nodes renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    const start = performance.now();

    const render3D = (now: number) => {
      const t = (now - start) / 1000;
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;

      ctx.clearRect(0, 0, w, h);

      // Deep Studio Canvas Backdrop with Gold Radial Halo
      const bg = ctx.createRadialGradient(cx, cy, 12, cx, cy, w * 0.48);
      bg.addColorStop(0, 'rgba(190, 157, 91, 0.22)');
      bg.addColorStop(0.55, 'rgba(20, 18, 14, 0.85)');
      bg.addColorStop(1, 'rgba(11, 10, 8, 0.98)');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // 3D Mode-dependent camera & layer parameters
      let rotY = Math.sin(t * 0.9) * 0.35;
      let rotX = Math.cos(t * 0.7) * 0.22;
      let layerSpread = 4.5;
      let ringScale = 1;

      if (animMode === 0) {
        rotY = Math.sin(t * 1.1) * 0.45;
        rotX = Math.cos(t * 0.8) * 0.25;
        layerSpread = 5 + Math.sin(t * 2) * 1.5;
      } else if (animMode === 1) {
        rotY = -0.48 + Math.sin(t * 0.7) * 0.15;
        rotX = 0.32;
        layerSpread = 11 + Math.sin(t * 2.4) * 3.5;
      } else if (animMode === 2) {
        rotY = Math.cos(t * 1.6) * 0.38;
        rotX = Math.sin(t * 1.6) * 0.3;
        ringScale = 1 + Math.sin(t * 3.5) * 0.08;
      } else {
        rotY = t * 1.35;
        rotX = Math.sin(t * 0.9) * 0.2;
        layerSpread = 6.5;
      }

      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);

      const project = (x: number, y: number, z: number) => {
        const x1 = x * cosY - z * sinY;
        const z1 = z * cosY + x * sinY;
        const y2 = y * cosX - z1 * sinX;
        const z2 = z1 * cosX + y * sinX;
        const fov = 520 / (520 + z2);
        return { x: cx + x1 * fov, y: cy + y2 * fov, scale: fov, z: z2 };
      };

      // Draw 3D Tilted Orbital Rings
      for (let ringIdx = 0; ringIdx < 2; ringIdx++) {
        const radius = (ringIdx === 0 ? 156 : 108) * ringScale;
        ctx.beginPath();
        for (let step = 0; step <= 64; step++) {
          const ang = (step / 64) * Math.PI * 2 + t * (ringIdx === 0 ? 0.25 : -0.4);
          const rx = Math.cos(ang) * radius;
          const ry = Math.sin(ang) * radius;
          const rz = Math.sin(ang * 2 + t) * (animMode === 2 ? 28 : 10);
          const p = project(rx, ry, rz);
          if (step === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.strokeStyle = ringIdx === 0 ? 'rgba(190, 157, 91, 0.45)' : 'rgba(245, 241, 231, 0.18)';
        ctx.lineWidth = ringIdx === 0 ? 1.8 : 1;
        ctx.stroke();
      }

      // Compute 4 Pillar 3D Node Positions
      const nodeAngles = [-Math.PI / 2, 0, Math.PI / 2, Math.PI];
      const nodes3D = nodeAngles.map((baseAng, idx) => {
        const ang = baseAng + (animMode === 2 ? Math.sin(t + idx) * 0.18 : t * 0.22);
        const r = 156 * ringScale;
        const nx = Math.cos(ang) * r;
        const ny = Math.sin(ang) * r;
        const nz = (idx % 2 === 0 ? 1 : -1) * (animMode === 1 ? 36 : 14);
        return { ...project(nx, ny, nz), pillar: pillars[idx], index: idx };
      });

      // Draw Chords & Spokes between Active Nodes and 3D Hub
      nodes3D.forEach((n1, i) => {
        const active1 = n1.pillar ? selected.includes(n1.pillar.id) : false;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(n1.x, n1.y);
        ctx.strokeStyle = active1 ? '#BE9D5B' : 'rgba(207, 203, 192, 0.15)';
        ctx.lineWidth = active1 ? 2.2 : 1;
        ctx.stroke();

        nodes3D.slice(i + 1).forEach((n2) => {
          const active2 = n2.pillar ? selected.includes(n2.pillar.id) : false;
          ctx.beginPath();
          ctx.moveTo(n1.x, n1.y);
          ctx.lineTo(n2.x, n2.y);
          ctx.strokeStyle = active1 && active2 ? 'rgba(216, 190, 134, 0.65)' : 'rgba(207, 203, 192, 0.1)';
          ctx.lineWidth = active1 && active2 ? 1.6 : 0.8;
          ctx.stroke();
        });
      });

      // Draw Multi-Layer Extruded 3D AMC Logo Mark in Center
      const totalLayers = 7;
      for (let l = totalLayers - 1; l >= 0; l--) {
        const zDepth = (l - (totalLayers - 1) / 2) * layerSpread;
        const waveZ = animMode === 2 ? Math.sin(t * 4 + l * 0.6) * 8 : 0;
        const pos = project(0, 0, zDepth + waveZ);
        const isFront = l === 0;
        const isGoldLayer = l === 1 || l === totalLayers - 1;

        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.scale(pos.scale, pos.scale);

        ctx.beginPath();
        ctx.roundRect(-56, -34, 112, 68, 18);
        ctx.fillStyle = isFront
          ? '#14120E'
          : isGoldLayer
            ? '#BE9D5B'
            : `rgba(34, 30, 22, ${0.88 - l * 0.08})`;
        ctx.fill();
        ctx.strokeStyle = isFront ? '#D8BE86' : 'rgba(190, 157, 91, 0.45)';
        ctx.lineWidth = isFront ? 2.4 : 1;
        ctx.stroke();

        if (isFront) {
          ctx.fillStyle = '#F5F1E7';
          ctx.font = '800 24px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(copy.centre || 'AMC', -4, 7);

          ctx.beginPath();
          ctx.arc(32, 0, 11, -Math.PI * 0.65, Math.PI * 0.65);
          ctx.strokeStyle = '#BE9D5B';
          ctx.lineWidth = 4;
          ctx.lineCap = 'round';
          ctx.stroke();
        }
        ctx.restore();
      }

      // Draw 4 Orbiting 3D Pillar Nodes
      nodes3D.forEach((node) => {
        const active = node.pillar ? selected.includes(node.pillar.id) : false;
        const r = 26 * node.scale;
        ctx.save();
        ctx.translate(node.x, node.y);

        ctx.beginPath();
        ctx.arc(0, 4, r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fillStyle = active ? '#BE9D5B' : '#14120E';
        ctx.fill();
        ctx.strokeStyle = active ? '#F5F1E7' : 'rgba(190, 157, 91, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = active ? '#0B0A08' : '#CFCBC0';
        ctx.font = `700 ${Math.round(13 * node.scale)}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(`0${node.index + 1}`, 0, 4);
        ctx.restore();
      });

      rafId = requestAnimationFrame(render3D);
    };

    rafId = requestAnimationFrame(render3D);
    return () => cancelAnimationFrame(rafId);
  }, [selected, animMode, copy.centre]);

  const activeServices = services.filter((s) => selected.includes(s.pillar));

  return (
    <div className="lp-combiner glass-surface rounded-squircle-xl">
      <div className="lp-combiner-controls">
        <p className="lp-combiner-legend">{copy.legend}</p>
        <div className="lp-combiner-pills" role="group" aria-label={copy.legend}>
          {pillars.map((pillar, idx) => {
            const active = selected.includes(pillar.id);
            return (
              <button
                key={pillar.id}
                type="button"
                className="lp-combiner-pill rounded-squircle-md"
                data-active={active ? 'true' : 'false'}
                aria-pressed={active}
                onClick={() => togglePillar(pillar.id)}
              >
                <span className="lp-combiner-pill-index">0{idx + 1}</span>
                <span>{pillar[locale]}</span>
              </button>
            );
          })}
        </div>

        {/* Fixed 3D Logo & Multi-Animation Stage */}
        <div className="lp-combiner-3d-stage rounded-squircle-lg">
          <div className="lp-combiner-3d-header">
            <span className="badge badge-accent rounded-squircle-sm">
              <span className="badge-dot" aria-hidden="true" />
              <span>{isAr ? 'نموذج 3D تفاعلي · ٤ حركات تلقائية' : '3D LOGO STAGE · 4 AUTO-ANIMATIONS'}</span>
            </span>
            <button
              type="button"
              onClick={() => setAutoCycle((prev) => !prev)}
              className="lp-combiner-cycle-btn"
            >
              {autoCycle ? (isAr ? 'تبديل تلقائي: مفعل' : 'Auto-Play: ON') : (isAr ? 'تبديل تلقائي: متوقف' : 'Auto-Play: OFF')}
            </button>
          </div>

          <canvas
            ref={canvasRef}
            width={480}
            height={400}
            className="lp-combiner-canvas"
            aria-label={isAr ? 'مجسم ثلاثي الأبعاد لشعار المراد AMC' : '3D interactive ALMORAD AMC logo canvas'}
          />

          <div className="lp-combiner-mode-bar" role="group" aria-label={isAr ? 'حركات المجسم' : '3D Animation Modes'}>
            {ANIMATION_MODES.map((m, idx) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setAutoCycle(false);
                  setAnimMode(idx);
                }}
                className="lp-combiner-mode-chip"
                data-active={animMode === idx ? 'true' : 'false'}
              >
                <strong>{m.code}</strong>
                <span>{isAr ? m.ar : m.en}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="lp-combiner-output">
        <div className="lp-combiner-count">
          <strong>{activeServices.length}</strong>
          <span>{copy.result}</span>
        </div>

        {activeServices.length === 0 ? (
          <p className="lp-combiner-empty">{copy.empty}</p>
        ) : (
          <ul className="lp-combiner-services">
            {activeServices.map((service) => {
              const parentPillar = pillars.find((p) => p.id === service.pillar);
              return (
                <li key={service.slug}>
                  <Link
                    href={`/services/${service.slug}`}
                    className="lp-combiner-service-link rounded-squircle-md"
                  >
                    <div>
                      <small>{parentPillar?.[locale]}</small>
                      <span>{service[locale]}</span>
                    </div>
                    <ArrowIcon />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        <div className="lp-combiner-cta">
          <Link href="/booking" className="button button-primary rounded-squircle-md">
            <span>{copy.cta}</span>
            <ArrowIcon />
          </Link>
        </div>
      </div>
    </div>
  );
}
