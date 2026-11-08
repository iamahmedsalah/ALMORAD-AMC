'use client';

import { useState } from 'react';
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

const NODE_POSITIONS: Array<[number, number]> = [
  [210, 62],
  [358, 210],
  [210, 358],
  [62, 210],
];

export function DisciplineCombiner({ locale, copy }: DisciplineCombinerProps) {
  const [selected, setSelected] = useState<string[]>(() => pillars.map((p) => p.id));

  const togglePillar = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

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

        <div className="lp-combiner-diagram" aria-hidden="true">
          <svg viewBox="0 0 420 420" className="lp-combiner-svg">
            <circle cx="210" cy="210" r="148" className="lp-comb-orbit" />
            <circle cx="210" cy="210" r="96" className="lp-comb-orbit lp-comb-orbit-inner" />

            {/* Pairwise chord connections between active disciplines */}
            {NODE_POSITIONS.map(([x1, y1], i) =>
              NODE_POSITIONS.slice(i + 1).map(([x2, y2], jOffset) => {
                const j = i + 1 + jOffset;
                const p1 = pillars[i];
                const p2 = pillars[j];
                const bothActive =
                  p1 && p2 && selected.includes(p1.id) && selected.includes(p2.id);
                return (
                  <line
                    key={`${i}-${j}`}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    className={bothActive ? 'lp-comb-chord-active' : 'lp-comb-chord'}
                  />
                );
              }),
            )}

            {/* Radial spokes to AMC hub */}
            {NODE_POSITIONS.map(([x, y], i) => {
              const p = pillars[i];
              const active = p ? selected.includes(p.id) : false;
              return (
                <line
                  key={`spoke-${i}`}
                  x1="210"
                  y1="210"
                  x2={x}
                  y2={y}
                  className={active ? 'lp-comb-spoke-active' : 'lp-comb-spoke'}
                />
              );
            })}

            {/* Center AMC Hub */}
            <circle cx="210" cy="210" r="38" className="lp-comb-hub" />
            <text
              x="210"
              y="215"
              textAnchor="middle"
              className="lp-comb-hub-text"
            >
              {copy.centre}
            </text>

            {/* 4 Discipline Nodes */}
            {NODE_POSITIONS.map(([x, y], i) => {
              const p = pillars[i];
              const active = p ? selected.includes(p.id) : false;
              return (
                <g key={`node-${i}`} transform={`translate(${x}, ${y})`}>
                  <circle
                    r="26"
                    className={active ? 'lp-comb-node-active' : 'lp-comb-node'}
                  />
                  <text
                    y="5"
                    textAnchor="middle"
                    className={active ? 'lp-comb-node-text-active' : 'lp-comb-node-text'}
                  >
                    0{i + 1}
                  </text>
                </g>
              );
            })}
          </svg>
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
